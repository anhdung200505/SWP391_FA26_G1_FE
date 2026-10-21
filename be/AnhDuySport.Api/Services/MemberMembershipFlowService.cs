using System.Globalization;
using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;
using PayOS;
using PayOS.Exceptions;
using PayOS.Models.V2.PaymentRequests;

namespace AnhDuySport.Api.Services;

// Main flow: User Information Edit & Membership Renewal
//
// Access System → Select Management Action
//   ├─ Edit personal information → Input changes → Validate & Update database → Display Success Message
//   └─ Renew/Upgrade Package → View membership management → Need Consultation?
//        ├─ Yes → hiển thị số chăm sóc khách hàng của trung tâm → học viên tự chọn gói
//        └─ No  → Select Membership Package
//      → Process Payment (payOS) → Update Membership Expiry → Validate & Update database
//      → Display Success Message → Receive Updated Membership Info
//
// Thanh toán gói dùng chung bảng payment và PayOSClient đã đăng ký trong Program.cs.
// Payment gói có class_id NULL. Webhook payOS (PaymentsController) tìm payment theo
// payos_order_code nên tự chuyển payment gói sang paid. Membership do service này kích hoạt
// ở bước ConfirmMembershipPaymentAsync (11_membership_pending.sql thêm trạng thái 'pending').
public class MemberMembershipFlowService(AppDbContext db, IConfiguration configuration, IServiceProvider services)
{
    // Giá trị theo dữ liệu có sẵn trong 02_seed.sql
    private static readonly string[] Genders = ["Nam", "Nữ", "Khác"];
    private const string PayOsMethod = "payos";

    private PayOSClient? PayOsClient => services.GetService<PayOSClient>();

    private PayOSClient RequirePayOs() =>
        PayOsClient ?? throw new InvalidOperationException(
            "Máy này chưa cấu hình payOS nên chưa tạo được mã QR thanh toán gói. Đặt PayOS:ClientId, PayOS:ApiKey và PayOS:ChecksumKey bằng lệnh dotnet user-secrets.");

    // ===== Access System =====
    public async Task<MemberProfileDto> AccessSystemAsync(string memberUserId)
    {
        var member = await FindActiveMemberAsync(memberUserId);
        return ToProfileDto(member);
    }

    // ===== Edit personal information → Input changes → Validate & Update database =====
    public async Task<MemberProfileMutationResponse> InputChangesAsync(string memberUserId, UpdateMemberProfileRequest request)
    {
        var member = await FindActiveMemberAsync(memberUserId);

        // ---- Validate ----
        var fullName = RequireText(request.FullName, "Nhập họ tên.", 200);
        var email = NormalizeEmail(request.Email);
        var phone = AccountPhone.Require(request.Phone);
        var gender = NormalizeGender(request.Gender);
        ValidateDateOfBirth(request.DateOfBirth);

        var emailTaken = await db.UserAccounts.AnyAsync(user => user.UserId != member.UserId && user.Email == email);
        if (emailTaken)
        {
            throw new InvalidOperationException("Email đã được tài khoản khác sử dụng.");
        }

        if (AccountPhone.Digits(member.Phone) != phone)
        {
            await AccountPhone.EnsureUniqueAsync(db, phone, member.UserId);
        }

        var changes = new List<string>();
        if (member.FullName != fullName) changes.Add("Họ tên");
        if (!string.Equals(member.Email, email, StringComparison.OrdinalIgnoreCase)) changes.Add("Email");
        if (member.Phone != phone) changes.Add("Điện thoại");
        if (member.DateOfBirth != request.DateOfBirth) changes.Add("Ngày sinh");
        if (member.Gender != gender) changes.Add("Giới tính");
        if (changes.Count == 0)
        {
            throw new InvalidOperationException("Thông tin cá nhân không thay đổi.");
        }

        // ---- Update database ----
        member.FullName = fullName;
        member.Email = email;
        member.Phone = phone;
        member.DateOfBirth = request.DateOfBirth;
        member.Gender = gender;
        var log = new ActivityLog
        {
            ActorUserId = member.UserId,
            Action = "Cập nhật thông tin cá nhân",
            EntityName = "user",
            EntityId = member.UserId,
            Detail = $"Đã sửa: {string.Join(", ", changes)}.",
            CreatedAt = DateTime.Now,
        };
        db.ActivityLogs.Add(log);
        await db.SaveChangesAsync();

        // ---- Display Success Message ----
        return new MemberProfileMutationResponse(
            ToProfileDto(member),
            "Cập nhật thông tin cá nhân thành công.",
            ToLogDto(log, member.FullName));
    }

    // ===== Renew/Upgrade Package → View membership management =====
    public async Task<MembershipManagementDto> ViewMembershipManagementAsync(string memberUserId)
    {
        var member = await FindActiveMemberAsync(memberUserId);
        var today = DateOnly.FromDateTime(DateTime.Now);

        var memberships = await db.Memberships
            .AsNoTracking()
            .Include(item => item.Payment)
            .ThenInclude(payment => payment!.Invoice)
            .Where(item => item.UserId == member.UserId)
            .OrderByDescending(item => item.MembershipId)
            .ToListAsync();
        var history = memberships.Select(item => ToMembershipDto(item, today)).ToList();

        var current = history.FirstOrDefault(item =>
            item.Status == "active" && item.StartDate <= today && item.EndDate >= today);
        var endDate = history
            .Where(item => item.Status == "active" && item.EndDate >= today)
            .Select(item => (DateOnly?)item.EndDate)
            .Max();

        var packages = await db.MembershipPackages
            .AsNoTracking()
            .Where(item => item.Status == "active")
            .OrderBy(item => item.Fee)
            .ToListAsync();

        return new MembershipManagementDto(
            ToProfileDto(member),
            current,
            endDate,
            history,
            packages.Select(AccountFlowMapper.ToDto).ToList());
    }

    // ===== Need Consultation? = Yes → hiển thị số chăm sóc khách hàng =====
    public async Task<ConsultationContactDto> AccessConsultationContactAsync(string memberUserId)
    {
        var member = await FindActiveMemberAsync(memberUserId);
        var center = await db.Centers.AsNoTracking().FirstOrDefaultAsync(item => item.CenterId == member.CenterId)
            ?? await db.Centers.AsNoTracking().OrderBy(item => item.CenterId).FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Chưa có thông tin trung tâm.");
        if (string.IsNullOrWhiteSpace(center.Phone))
        {
            throw new InvalidOperationException("Trung tâm chưa cập nhật số chăm sóc khách hàng.");
        }

        return new ConsultationContactDto(
            center.CenterName,
            center.Phone,
            center.Email ?? "",
            $"Gọi {center.Phone} để được tư vấn chọn gói phù hợp, sau đó chọn gói và thanh toán.");
    }

    // ===== Select Membership Package → Process Payment (tạo link payOS) =====
    // Chỉ tạo đơn chờ thanh toán. Hạn gói chỉ được cập nhật ở ConfirmMembershipPaymentAsync khi payment đã paid.
    public async Task<MembershipCheckoutDto> SelectMembershipPackageAsync(string memberUserId, RenewMembershipRequest request)
    {
        var member = await FindActiveMemberAsync(memberUserId);
        var package = await FindActivePackageAsync(request.PackageId);
        var amount = RequirePayableAmount(package.Fee);
        RequirePayOs();

        var now = DateTime.Now;
        var today = DateOnly.FromDateTime(now);

        // ---- Đơn gói đang chờ: mỗi học viên chỉ giữ 1 đơn ----
        // Hỏi lại payOS trước: đơn cũ đã trả tiền thì kích hoạt, không hủy nhầm.
        // Cùng gói, còn mã QR → trả lại đơn cũ. Khác gói → hủy đơn cũ rồi tạo đơn mới.
        var waiting = await db.Memberships
            .Include(item => item.Payment!)
            .ThenInclude(payment => payment.Invoice)
            .Where(item => item.UserId == member.UserId && item.Status == "pending")
            .ToListAsync();
        foreach (var item in waiting)
        {
            var oldPayment = item.Payment ?? throw new InvalidOperationException("Đơn gói thiếu thanh toán.");
            await SyncFromPayOsAsync(oldPayment);
            if (oldPayment.Status == "paid")
            {
                await ActivateAsync(member, item, oldPayment, now);
                await db.SaveChangesAsync();
                throw new InvalidOperationException(
                    $"Đơn {item.PlanName} trước đó đã thanh toán và vừa được kích hoạt. Tải lại trang để xem hạn mới.");
            }

            if (oldPayment.Status == "pending"
                && item.MembershipPackageId == package.MembershipPackageId
                && oldPayment.Amount == amount
                && !string.IsNullOrWhiteSpace(oldPayment.CheckoutUrl)
                && !string.IsNullOrWhiteSpace(oldPayment.QrCode))
            {
                var reusePlan = await PlanRenewalAsync(member.UserId, package, today, blockDowngrade: true);
                return ToCheckoutDto(item, oldPayment, reusePlan.Type,
                    "Bạn đang có đơn chờ thanh toán cho gói này. Quét mã QR để thanh toán.");
            }

            await CancelPaymentAsync(oldPayment, "Chọn gói khác, đóng đơn gói cũ");
            item.Status = "cancelled";
        }

        await db.SaveChangesAsync();

        // ---- Validate: tính loại gia hạn trước, không hợp lệ thì dừng trước khi thu tiền ----
        var plan = await PlanRenewalAsync(member.UserId, package, today, blockDowngrade: true);

        // ---- Tạo hóa đơn + payment pending + membership pending ----
        Payment payment;
        Membership membership;
        await using (var transaction = await db.Database.BeginTransactionAsync())
        {
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
                ClassId = null, // payment gói hội viên không gắn lớp (03_payment_class_id.sql)
                Amount = amount,
                PaymentMethod = PayOsMethod,
                Status = "pending",
            };
            // Ngày ở đây chỉ là tạm tính. Khi thanh toán xong sẽ tính lại theo ngày thanh toán.
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

            // Mã đơn payOS không dùng thẳng payment_id: chạy lại setup.ps1 thì payment_id đếm lại từ đầu
            // và payOS báo "Đơn thanh toán đã tồn tại". Ghép thời điểm tạo + 3 số cuối payment_id cho khác nhau.
            payment.PayosOrderCode = long.Parse(now.ToString("yyMMddHHmmss")) * 1000 + payment.PaymentId % 1000;
            AddHistory(payment, "pending", "Tạo đơn thanh toán gói");
            db.ActivityLogs.Add(new ActivityLog
            {
                ActorUserId = member.UserId,
                Action = Trim($"Tạo thanh toán gói cho {member.FullName}", 100),
                EntityName = "payment",
                EntityId = payment.PaymentId,
                Detail = $"{plan.Type} {package.PackageName} · {Money(amount)} · hóa đơn {invoice.InvoiceCode}",
                CreatedAt = now,
            });
            await db.SaveChangesAsync();
            await transaction.CommitAsync();
        }

        // ---- Process Payment: tạo link / mã QR payOS ----
        await CreateLinkAsync(payment, membership);

        return ToCheckoutDto(membership, payment, plan.Type,
            $"Quét mã QR để thanh toán {Money(amount)} cho {package.PackageName}. Gói có hiệu lực sau khi thanh toán.");
    }

    // ===== Process Payment → Update Membership Expiry → Validate & Update database =====
    // → Display Success Message → Receive Updated Membership Info
    // Gọi khi payOS chuyển về ReturnUrl (payOS gắn ?orderCode=...), hoặc khi học viên bấm kiểm tra.
    // paymentId nhận payment_id hoặc orderCode payOS.
    // Payment có thể đã được webhook chuyển paid trước. Gọi lại nhiều lần không cộng hạn hai lần.
    public async Task<MembershipPaymentResultDto> ConfirmMembershipPaymentAsync(string memberUserId, string paymentId)
    {
        var member = await FindActiveMemberAsync(memberUserId);
        var membership = await FindOwnMembershipPaymentAsync(member.UserId, paymentId);
        var payment = membership.Payment ?? throw new KeyNotFoundException("Không tìm thấy thanh toán gói.");
        var now = DateTime.Now;
        var today = DateOnly.FromDateTime(now);

        await SyncFromPayOsAsync(payment);

        ActivityLog? log = null;
        if (membership.Status == "pending")
        {
            if (payment.Status == "paid")
            {
                log = await ActivateAsync(member, membership, payment, now);
            }
            else if (payment.Status is "cancel" or "failed" or "refunded")
            {
                membership.Status = "cancelled";
            }
        }

        await db.SaveChangesAsync();

        var endDate = await db.Memberships
            .AsNoTracking()
            .Where(item => item.UserId == member.UserId && item.Status == "active" && item.EndDate >= today)
            .Select(item => (DateOnly?)item.EndDate)
            .MaxAsync();

        var endText = endDate?.ToString("dd/MM/yyyy") ?? "";
        var message = membership.Status switch
        {
            "pending" => "Chưa nhận được thanh toán. Hoàn tất thanh toán trên payOS rồi kiểm tra lại.",
            "cancelled" => "Đơn thanh toán đã hủy hoặc hết hạn. Hãy chọn gói lại.",
            _ when log is not null =>
                $"{GetRenewalType(log)} {membership.PlanName} thành công. Hội viên có hiệu lực đến hết {endText}.",
            _ => $"Đơn này đã thanh toán và gói đã được cập nhật trước đó. Hội viên có hiệu lực đến hết {endText}.",
        };

        return new MembershipPaymentResultDto(
            payment.PaymentId.ToString(),
            payment.Status,
            ToMembershipDto(membership, today),
            endDate,
            message,
            log is null ? null : ToLogDto(log, member.FullName));
    }

    // ---- Update Membership Expiry: kích hoạt membership pending sau khi payment paid ----
    // Tính lại ngày theo thời điểm thanh toán. Tiền đã thu nên không chặn hạ gói nữa.
    private async Task<ActivityLog> ActivateAsync(UserAccount member, Membership membership, Payment payment, DateTime now)
    {
        var today = DateOnly.FromDateTime(now);
        var package = await db.MembershipPackages.FirstOrDefaultAsync(item => item.MembershipPackageId == membership.MembershipPackageId)
            ?? throw new KeyNotFoundException("Không tìm thấy gói hội viên của đơn này.");
        var plan = await PlanRenewalAsync(member.UserId, package, today, blockDowngrade: false);

        // Mỗi học viên chỉ 1 gói active: đóng gói đang chạy và gói 'active' đã quá hạn trước khi kích hoạt gói mới.
        foreach (var item in plan.Running)
        {
            item.Status = plan.Type == "Gia hạn" ? "renewed" : "upgraded";
        }

        var stale = await db.Memberships
            .Where(item => item.UserId == member.UserId && item.Status == "active"
                && item.EndDate < today && item.MembershipId != membership.MembershipId)
            .ToListAsync();
        foreach (var item in stale)
        {
            item.Status = "expired";
        }

        // Lưu trước để unique index UX_membership_one_active không báo trùng khi dòng mới chuyển 'active'.
        await db.SaveChangesAsync();

        membership.StartDate = plan.StartDate;
        membership.EndDate = plan.EndDate;
        membership.Status = "active";

        var log = new ActivityLog
        {
            ActorUserId = member.UserId,
            Action = Trim($"{plan.Type} gói cho {member.FullName}", 100),
            EntityName = "membership",
            EntityId = membership.MembershipId,
            Detail = $"{membership.PlanName} · {Money(payment.Amount)} · {PaymentMethodLabel(payment.PaymentMethod)} · " +
                $"hiệu lực {plan.StartDate:dd/MM/yyyy} → {plan.EndDate:dd/MM/yyyy} · hóa đơn {payment.Invoice?.InvoiceCode}",
            CreatedAt = now,
        };
        db.ActivityLogs.Add(log);
        return log;
    }

    // Chưa có gói còn hạn            → đăng ký mới: bắt đầu hôm nay
    // Còn hạn, chọn cùng gói         → gia hạn:     bắt đầu hôm nay, hết hạn = hạn cũ + thời hạn gói, gói cũ chuyển "renewed"
    // Còn hạn, chọn gói khác         → nâng cấp:    bắt đầu hôm nay, gói cũ chuyển "upgraded"
    // Dòng cũ chưa gắn gói (membership_package_id NULL) được coi là gói khác.
    private async Task<RenewalPlan> PlanRenewalAsync(int userId, MembershipPackage package, DateOnly today, bool blockDowngrade)
    {
        var running = await db.Memberships
            .Include(item => item.Package)
            .Where(item => item.UserId == userId && item.Status == "active" && item.EndDate >= today)
            .OrderBy(item => item.EndDate)
            .ToListAsync();
        var latest = running.LastOrDefault();

        string renewalType;
        var startDate = today;
        DateOnly endDate;
        if (latest is null)
        {
            renewalType = "Đăng ký mới";
            endDate = today.AddMonths(package.ValidityMonths).AddDays(-1);
        }
        else if (latest.MembershipPackageId == package.MembershipPackageId)
        {
            // Gia hạn: dòng mới thay dòng cũ, giữ số ngày còn lại + thêm thời hạn gói.
            renewalType = "Gia hạn";
            endDate = latest.EndDate.AddMonths(package.ValidityMonths);
        }
        else
        {
            if (blockDowngrade && latest.Package is not null && package.Fee < latest.Package.Fee)
            {
                throw new InvalidOperationException(
                    $"{latest.PlanName} còn hạn đến {latest.EndDate:dd/MM/yyyy}. Chỉ được gia hạn hoặc nâng cấp lên hạng cao hơn.");
            }

            renewalType = "Nâng cấp";
            endDate = today.AddMonths(package.ValidityMonths).AddDays(-1);
        }

        return new RenewalPlan(renewalType, startDate, endDate, running);
    }

    // ---- payOS ----
    private async Task CreateLinkAsync(Payment payment, Membership membership)
    {
        if (payment.PayosOrderCode is not long orderCode)
        {
            throw new InvalidOperationException("Đơn thanh toán gói chưa có mã payOS.");
        }

        var invoiceCode = payment.Invoice?.InvoiceCode ?? "";
        var description = invoiceCode.Length <= 25 ? invoiceCode : invoiceCode[..25];
        try
        {
            var link = await RequirePayOs().PaymentRequests.CreateAsync(new CreatePaymentLinkRequest
            {
                OrderCode = orderCode,
                Amount = decimal.ToInt32(payment.Amount),
                Description = description,
                ReturnUrl = PayOsUrl("PayOS:MembershipReturnUrl", "http://localhost:5173/ho-so"),
                CancelUrl = PayOsUrl("PayOS:MembershipCancelUrl", "http://localhost:5173/ho-so"),
            });
            payment.CheckoutUrl = link.CheckoutUrl;
            payment.PaymentLinkId = link.PaymentLinkId;
            payment.QrCode = link.QrCode;
            AddHistory(payment, "pending", "Tạo mã QR thanh toán gói");
            await db.SaveChangesAsync();
        }
        catch (ApiException exception)
        {
            await CancelPaymentAsync(payment, "payOS từ chối tạo mã QR thanh toán gói");
            membership.Status = "cancelled";
            await db.SaveChangesAsync();
            throw new InvalidOperationException(string.IsNullOrWhiteSpace(exception.Message)
                ? "payOS từ chối tạo link thanh toán."
                : exception.Message);
        }

        if (string.IsNullOrWhiteSpace(payment.QrCode))
        {
            await CancelPaymentAsync(payment, "payOS không trả mã QR thanh toán gói");
            membership.Status = "cancelled";
            await db.SaveChangesAsync();
            throw new InvalidOperationException("payOS không trả mã QR.");
        }
    }

    // Hỏi trạng thái đơn trên payOS, phòng khi webhook chưa tới. Chỉ đổi trong bộ nhớ, nơi gọi tự lưu.
    private async Task SyncFromPayOsAsync(Payment payment)
    {
        if (payment.Status != "pending" || payment.PayosOrderCode is not long orderCode || PayOsClient is not PayOSClient payOs)
        {
            return;
        }

        PaymentLink link;
        try
        {
            link = await payOs.PaymentRequests.GetAsync(orderCode);
        }
        catch (ApiException)
        {
            return;
        }

        var status = link.Status.ToString();
        if (status.Equals("Paid", StringComparison.OrdinalIgnoreCase))
        {
            payment.Status = "paid";
            payment.PaidAt = DateTime.Now;
            if (payment.Invoice is not null)
            {
                payment.Invoice.Status = "paid";
            }

            AddHistory(payment, "paid", "Thanh toán gói thành công");
            db.ActivityLogs.Add(new ActivityLog
            {
                ActorUserId = payment.UserId,
                Action = "Thanh toán payOS thành công",
                EntityName = "payment",
                EntityId = payment.PaymentId,
                Detail = payment.Invoice?.InvoiceCode,
                CreatedAt = DateTime.Now,
            });
            return;
        }

        if (status.Equals("Cancelled", StringComparison.OrdinalIgnoreCase)
            || status.Equals("Canceled", StringComparison.OrdinalIgnoreCase)
            || status.Equals("Expired", StringComparison.OrdinalIgnoreCase))
        {
            await CancelPaymentAsync(payment, "payOS trả trạng thái " + status);
        }
    }

    // Đóng đơn pending: báo payOS hủy link (lỗi thì bỏ qua), payment → cancel, hóa đơn → cancelled.
    // Chỉ đổi trong bộ nhớ, nơi gọi tự lưu.
    private async Task CancelPaymentAsync(Payment payment, string reason)
    {
        if (payment.Status != "pending")
        {
            return;
        }

        if (payment.PayosOrderCode is long orderCode && PayOsClient is PayOSClient payOs)
        {
            try
            {
                await payOs.PaymentRequests.CancelAsync(orderCode, reason);
            }
            catch (ApiException)
            {
            }
        }

        payment.Status = "cancel";
        if (payment.Invoice is not null)
        {
            payment.Invoice.Status = "cancelled";
        }

        AddHistory(payment, "cancel", reason);
        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = payment.UserId,
            Action = "Hủy thanh toán gói",
            EntityName = "payment",
            EntityId = payment.PaymentId,
            Detail = reason,
            CreatedAt = DateTime.Now,
        });
    }

    private void AddHistory(Payment payment, string status, string note)
    {
        db.PaymentHistories.Add(new PaymentHistory
        {
            PaymentId = payment.PaymentId,
            Status = status,
            Note = note,
            CreatedAt = DateTime.Now,
        });
    }

    private string PayOsUrl(string key, string fallback)
    {
        var url = configuration[key];
        return string.IsNullOrWhiteSpace(url) ? fallback : url;
    }

    // payOS chỉ nhận số tiền nguyên, tối thiểu 2.000đ.
    private static int RequirePayableAmount(decimal fee)
    {
        if (fee < 2000 || fee != decimal.Truncate(fee) || fee > int.MaxValue)
        {
            throw new InvalidOperationException("Phí gói không hợp lệ để thanh toán payOS (cần số nguyên từ 2.000đ).");
        }

        return decimal.ToInt32(fee);
    }

    private async Task<Membership> FindOwnMembershipPaymentAsync(int memberUserId, string paymentId)
    {
        if (!long.TryParse(paymentId, out var code))
        {
            throw new KeyNotFoundException("Không tìm thấy thanh toán gói.");
        }

        // Nhận payment_id, hoặc orderCode payOS gắn vào ReturnUrl.
        int? id = code is > 0 and <= int.MaxValue ? (int)code : null;
        return await db.Memberships
            .Include(item => item.Payment!)
            .ThenInclude(payment => payment.Invoice)
            .FirstOrDefaultAsync(item => item.UserId == memberUserId
                && ((id != null && item.PaymentId == id) || item.Payment!.PayosOrderCode == code))
            ?? throw new KeyNotFoundException("Không tìm thấy thanh toán gói.");
    }

    // Action của log có dạng "{loại} gói cho {tên}".
    private static string GetRenewalType(ActivityLog log)
    {
        var index = log.Action.IndexOf(" gói cho ", StringComparison.Ordinal);
        return index > 0 ? log.Action[..index] : "Cập nhật";
    }

    private static MembershipCheckoutDto ToCheckoutDto(Membership membership, Payment payment, string renewalType, string message) =>
        new(
            payment.PaymentId.ToString(),
            membership.MembershipId.ToString(),
            payment.Invoice?.InvoiceCode ?? "",
            membership.MembershipPackageId?.ToString() ?? "",
            membership.PlanName,
            renewalType,
            decimal.ToInt32(payment.Amount),
            payment.Status,
            payment.CheckoutUrl,
            payment.QrCode,
            message);

    private sealed record RenewalPlan(string Type, DateOnly StartDate, DateOnly EndDate, List<Membership> Running);

    // Mã hóa đơn INV-{năm}-{số}, số lấy từ dbo.invoice_code_seq (05_payment_pending_unique.sql).
    // Seed đã có INV-2026-0001 nên gặp số trùng thì lấy số tiếp theo.
    private async Task<string> NextInvoiceCodeAsync(DateTime now)
    {
        while (true)
        {
            // Dùng ToListAsync, không dùng FirstAsync: SQL Server không cho NEXT VALUE FOR nằm trong truy vấn con.
            var numbers = await db.Database
                .SqlQuery<int>($"SELECT NEXT VALUE FOR dbo.invoice_code_seq AS [Value]")
                .ToListAsync();
            var code = $"INV-{now:yyyy}-{numbers[0]:D4}";
            if (!await db.Invoices.AnyAsync(item => item.InvoiceCode == code))
            {
                return code;
            }
        }
    }

    private async Task<MembershipPackage> FindActivePackageAsync(string packageId)
    {
        if (!int.TryParse(packageId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy gói hội viên.");
        }

        var package = await db.MembershipPackages.FirstOrDefaultAsync(item => item.MembershipPackageId == id)
            ?? throw new KeyNotFoundException("Không tìm thấy gói hội viên.");
        if (package.Status != "active")
        {
            throw new InvalidOperationException("Gói hội viên đã ngừng bán.");
        }

        return package;
    }

    private async Task<UserAccount> FindActiveMemberAsync(string memberUserId)
    {
        if (!int.TryParse(memberUserId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy học viên.");
        }

        var member = await db.UserAccounts
            .Include(user => user.Role)
            .FirstOrDefaultAsync(user => user.UserId == id);
        if (member is null || member.Role?.RoleCode != "MEMBER")
        {
            throw new KeyNotFoundException("Không tìm thấy học viên.");
        }

        if (member.Status != "active")
        {
            throw new InvalidOperationException("Tài khoản học viên không hoạt động.");
        }

        return member;
    }

    private static string NormalizeEmail(string? value)
    {
        var email = value?.Trim().ToLowerInvariant() ?? "";
        if (email.Length == 0 || email.Length > 200 || email.Contains(' ')
            || !email.Contains('@') || email.StartsWith('@') || email.EndsWith('@'))
        {
            throw new InvalidOperationException("Email không hợp lệ.");
        }

        return email;
    }

    private static string? NormalizeGender(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var gender = Genders.FirstOrDefault(item => string.Equals(item, value.Trim(), StringComparison.OrdinalIgnoreCase));
        return gender ?? throw new InvalidOperationException("Giới tính phải là Nam, Nữ hoặc Khác.");
    }

    private static void ValidateDateOfBirth(DateOnly? dateOfBirth)
    {
        if (dateOfBirth is null)
        {
            return;
        }

        var today = DateOnly.FromDateTime(DateTime.Now);
        if (dateOfBirth > today || dateOfBirth < today.AddYears(-100))
        {
            throw new InvalidOperationException("Ngày sinh không hợp lệ.");
        }
    }

    private static string RequireText(string? value, string message, int max)
    {
        var text = value?.Trim() ?? "";
        if (text.Length == 0)
        {
            throw new InvalidOperationException(message);
        }

        if (text.Length > max)
        {
            throw new InvalidOperationException($"Không quá {max} ký tự.");
        }

        return text;
    }

    private static MemberProfileDto ToProfileDto(UserAccount user) =>
        new(
            user.UserId.ToString(),
            $"ND-{user.UserId:D4}",
            user.FullName,
            user.Email ?? "",
            user.Phone ?? "",
            user.DateOfBirth,
            user.Gender ?? "",
            user.Status);

    // Cần có Payment và Payment.Invoice (Include hoặc vừa tạo) trước khi gọi.
    private static MembershipDto ToMembershipDto(Membership membership, DateOnly today) =>
        new(
            membership.MembershipId.ToString(),
            membership.MembershipPackageId?.ToString(),
            membership.PlanName,
            membership.StartDate,
            membership.EndDate,
            // Trong DB vẫn là active nhưng đã qua ngày hết hạn thì hiển thị expired.
            membership.Status == "active" && membership.EndDate < today ? "expired" : membership.Status,
            membership.Payment?.Amount ?? 0,
            membership.Payment?.Invoice?.InvoiceCode ?? "",
            membership.Payment?.PaymentMethod ?? "");

    private static ActivityLogDto ToLogDto(ActivityLog log, string memberName) =>
        new(
            log.AuditLogId == 0 ? Guid.NewGuid().ToString() : log.AuditLogId.ToString(),
            log.CreatedAt,
            log.EntityName,
            memberName,
            log.EntityId?.ToString() ?? "",
            memberName,
            log.Action,
            log.Detail ?? "",
            null);

    private static string PaymentMethodLabel(string method) => method switch
    {
        "chuyen_khoan" => "Chuyển khoản",
        "the" => "Thẻ",
        "payos" => "payOS",
        _ => method,
    };

    private static string Trim(string value, int max) => value.Length <= max ? value : value[..max];

    private static string Money(decimal value) =>
        string.Create(CultureInfo.GetCultureInfo("vi-VN"), $"{decimal.Round(value, 0):N0}đ");
}
