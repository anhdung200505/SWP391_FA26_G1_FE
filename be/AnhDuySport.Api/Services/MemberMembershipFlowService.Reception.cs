using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;
using PayOS;
using PayOS.Exceptions;

namespace AnhDuySport.Api.Services;

// Lễ tân mua gói hội viên riêng (không kèm lớp) giùm học viên. Gọi từ ReceptionCheckoutFlowService.
// Giống luồng lớp: tạo đơn pending + QR payOS → học viên quét QR, hoặc lễ tân thu tại quầy rồi xác nhận.
// Dùng chung luật gia hạn (PlanRenewalAsync) và kích hoạt (ActivateAsync) với luồng học viên tự mua.
// Khác luồng học viên: máy chưa cấu hình payOS vẫn tạo được đơn để thu tại quầy.
public partial class MemberMembershipFlowService
{
    public async Task<MembershipCheckoutDto> CreateMembershipOrderForMemberAsync(
        string memberUserId,
        string packageId,
        int performerUserId)
    {
        var member = await FindActiveMemberAsync(memberUserId);
        var package = await FindActivePackageAsync(packageId);
        var amount = RequirePayableAmount(package.Fee);
        var performerName = await PerformerNameAsync(performerUserId);

        // Đơn cũ học viên tự mua có thể vừa được trả tiền: kích hoạt, không tạo đơn thu tiền lần nữa.
        if (await SyncPendingPaymentsAsync(member.UserId, CancellationToken.None) > 0)
        {
            throw new InvalidOperationException(
                "Học viên vừa thanh toán xong một đơn gói qua payOS và gói đã được kích hoạt. Tải lại để xem gói mới.");
        }

        var now = DateTime.Now;
        var today = DateOnly.FromDateTime(now);
        await ClassMembershipBonus.PromoteAsync(db, member.UserId, today);

        // Mỗi học viên chỉ có 1 đơn gói pending (UX_membership_one_pending).
        // Cùng gói, còn hạn → trả lại đơn cũ. Khác gói → hủy đơn cũ rồi tạo đơn mới.
        var waiting = await db.Memberships
            .Include(item => item.Payment!)
            .ThenInclude(payment => payment.Invoice)
            .Where(item => item.UserId == member.UserId && item.Status == "pending")
            .ToListAsync();
        foreach (var item in waiting)
        {
            var oldPayment = item.Payment ?? throw new InvalidOperationException("Đơn gói thiếu thanh toán.");
            if (CanReuseAtCounter(item, oldPayment, package, amount))
            {
                var reusePlan = await PlanRenewalAsync(member.UserId, package, today);
                return ToCheckoutDto(item, oldPayment, reusePlan.Type,
                    $"Học viên đang có đơn {oldPayment.Invoice?.InvoiceCode} chờ thanh toán cho gói này. " +
                    "Cho học viên quét QR hoặc thu tiền tại quầy rồi xác nhận.");
            }

            await CancelPaymentAsync(oldPayment, "Lễ tân tạo đơn gói mới, đóng đơn gói cũ");
            item.Status = "cancelled";
        }

        await db.SaveChangesAsync();

        var plan = await PlanRenewalAsync(member.UserId, package, today);
        Payment payment;
        Membership membership;
        try
        {
            await using var transaction = await db.Database.BeginTransactionAsync();
            var invoice = new Invoice
            {
                UserId = member.UserId,
                InvoiceCode = await NextInvoiceCodeAsync(now),
                IssuedAt = now,
                TotalAmount = amount,
                Status = "issued",
            };
            payment = new Payment
            {
                Invoice = invoice,
                UserId = member.UserId,
                ClassId = null, // payment gói hội viên không gắn lớp
                Amount = amount,
                PaymentMethod = PayOsMethod,
                Status = "pending",
                RegisteredByUserId = performerUserId,
            };
            // Ngày tạm tính, ActivateAsync tính lại theo ngày thanh toán.
            membership = new Membership
            {
                UserId = member.UserId,
                Payment = payment,
                MembershipPackageId = package.MembershipPackageId,
                PlanName = package.PackageName,
                StartDate = plan.StartDate,
                EndDate = plan.EndDate,
                Status = "pending",
            };
            db.Invoices.Add(invoice);
            db.Payments.Add(payment);
            db.Memberships.Add(membership);
            await db.SaveChangesAsync();

            // Cùng cách tạo mã đơn payOS với SelectMembershipPackageAsync.
            payment.PayosOrderCode = long.Parse(now.ToString("yyMMddHHmmss")) * 1000 + payment.PaymentId % 1000;
            AddHistory(payment, "pending", Trim($"Lễ tân {performerName} tạo đơn gói", 300));
            db.ActivityLogs.Add(new ActivityLog
            {
                ActorUserId = performerUserId,
                Action = Trim($"Tạo đơn gói giùm {member.FullName}", 100),
                EntityName = "payment",
                EntityId = payment.PaymentId,
                Detail = $"{plan.Type} {package.PackageName} · {Money(amount)} · hóa đơn {invoice.InvoiceCode}",
                CreatedAt = now,
            });
            await db.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (DbUpdateException exception) when (IsUniqueViolation(exception, "UX_membership_one_pending"))
        {
            throw new InvalidOperationException("Học viên đang có một đơn gói khác chờ thanh toán. Hãy thử lại sau giây lát.");
        }

        // Có payOS thì tạo mã QR cho học viên quét; không có thì chỉ thu tại quầy.
        if (PayOsClient is not null)
        {
            await CreateLinkAsync(payment, membership);
        }

        return ToCheckoutDto(membership, payment, plan.Type,
            $"Đã tạo đơn {payment.Invoice?.InvoiceCode}: {plan.Type} {package.PackageName}, {Money(amount)}.{PlanNote(plan, package)} " +
            "Cho học viên quét QR hoặc thu tiền tại quầy rồi xác nhận.");
    }

    // Lễ tân thu tiền đơn gói tại quầy. methodLabel: Tiền mặt / Chuyển khoản / Thẻ.
    public async Task<MembershipPaymentResultDto> ConfirmCounterMembershipPaymentAsync(
        int paymentId,
        string methodLabel,
        int performerUserId)
    {
        var found = await db.Memberships
            .AsNoTracking()
            .Include(item => item.Payment)
            .FirstOrDefaultAsync(item => item.PaymentId == paymentId && item.Payment!.ClassId == null)
            ?? throw new KeyNotFoundException("Không tìm thấy đơn gói.");
        var member = await FindActiveMemberAsync(found.UserId.ToString());
        var performerName = await PerformerNameAsync(performerUserId);

        // Hỏi payOS trước: học viên có thể đã quét QR trả tiền rồi.
        if (await SyncWithPayOsAsync(paymentId, "Lễ tân kiểm tra trước khi thu tại quầy") is not null)
        {
            throw new InvalidOperationException(
                "Học viên đã thanh toán đơn này qua payOS và gói đã được kích hoạt. Không thu tiền tại quầy nữa.");
        }

        var log = await InMemberLockAsync(member.UserId, async () =>
        {
            var membership = await db.Memberships
                .Include(item => item.Payment!)
                .ThenInclude(item => item.Invoice)
                .FirstAsync(item => item.PaymentId == paymentId);
            var payment = membership.Payment!;
            if (payment.Status != "pending" || membership.Status != "pending")
            {
                throw new InvalidOperationException("Chỉ xác nhận được đơn gói đang chờ thanh toán.");
            }

            if (payment.Invoice is null || PaymentTimeout.SecondsLeft(payment.Invoice.IssuedAt) == 0)
            {
                throw new InvalidOperationException("Đơn đã hết hạn. Hãy tạo đơn mới cho học viên.");
            }

            var now = DateTime.Now;
            payment.Status = "paid";
            payment.PaidAt = now;
            payment.PaymentMethod = methodLabel;
            payment.RegisteredByUserId ??= performerUserId;
            payment.Invoice.Status = "paid";
            AddHistory(payment, "paid", Trim($"Lễ tân {performerName} thu {Money(payment.Amount)} tại quầy ({methodLabel})", 300));
            db.ActivityLogs.Add(new ActivityLog
            {
                ActorUserId = performerUserId,
                Action = Trim($"Thu tiền gói tại quầy cho {member.FullName}", 100),
                EntityName = "payment",
                EntityId = payment.PaymentId,
                Detail = $"{membership.PlanName} · {Money(payment.Amount)} · {methodLabel} · hóa đơn {payment.Invoice.InvoiceCode}",
                CreatedAt = now,
            });

            var activated = await ActivateAsync(member, membership, payment, now);
            // Người thao tác là lễ tân, không phải học viên.
            activated.ActorUserId = performerUserId;
            db.Notifications.Add(new AccountNotification
            {
                UserId = member.UserId,
                Title = $"{GetRenewalType(activated)} {membership.PlanName} thành công",
                Content = $"AnhDuy Sport đã nhận {Money(payment.Amount)} ({methodLabel}) cho hóa đơn {payment.Invoice.InvoiceCode}. " +
                    $"Gói có hiệu lực {membership.StartDate:dd/MM/yyyy} → {membership.EndDate:dd/MM/yyyy}.",
                IsRead = false,
                CreatedAt = now,
            });
            return activated;
        });

        // Đã thu tại quầy: hủy link payOS để học viên không quét QR trả thêm lần nữa. Lỗi thì bỏ qua.
        if (found.Payment?.PayosOrderCode is long orderCode && PayOsClient is PayOSClient payOs)
        {
            try
            {
                await payOs.PaymentRequests.CancelAsync(orderCode, "Đã thu tiền gói tại quầy");
            }
            catch (ApiException)
            {
            }
        }

        db.ChangeTracker.Clear();
        var saved = await db.Memberships
            .AsNoTracking()
            .Include(item => item.Payment!)
            .ThenInclude(item => item.Invoice)
            .FirstAsync(item => item.PaymentId == paymentId);
        var today = DateOnly.FromDateTime(DateTime.Now);
        var endDate = await db.Memberships
            .AsNoTracking()
            .Where(item => item.UserId == member.UserId
                && (item.Status == "active" || item.Status == "scheduled") && item.EndDate >= today)
            .Select(item => (DateOnly?)item.EndDate)
            .MaxAsync();
        var startText = saved.Status == "scheduled" ? $" Gói bắt đầu từ {saved.StartDate:dd/MM/yyyy}." : "";
        return new MembershipPaymentResultDto(
            paymentId.ToString(),
            saved.Payment?.Status ?? "paid",
            ToMembershipDto(saved, today),
            endDate,
            $"{GetRenewalType(log)} {saved.PlanName} cho {member.FullName} thành công.{startText} " +
                $"Hội viên có hiệu lực đến hết {endDate:dd/MM/yyyy}.",
            ToLogDto(log, member.FullName));
    }

    // Không có payOS thì đơn không có QR nhưng vẫn dùng lại được để thu tại quầy.
    private bool CanReuseAtCounter(Membership membership, Payment payment, MembershipPackage package, int amount) =>
        PayOsClient is null
            ? payment.Status == "pending"
                && membership.MembershipPackageId == package.MembershipPackageId
                && payment.Amount == amount
                && payment.Invoice is not null
                && PaymentTimeout.SecondsLeft(payment.Invoice.IssuedAt) > 0
            : CanReuse(membership, payment, package, amount);

    private async Task<string> PerformerNameAsync(int performerUserId) =>
        await db.UserAccounts
            .AsNoTracking()
            .Where(user => user.UserId == performerUserId)
            .Select(user => user.FullName)
            .FirstOrDefaultAsync()
        ?? throw new InvalidOperationException("Tài khoản thao tác không còn tồn tại.");
}
