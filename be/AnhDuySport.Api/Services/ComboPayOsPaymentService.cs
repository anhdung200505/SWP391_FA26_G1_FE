using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;
using PayOS;
using PayOS.Exceptions;
using PayOS.Models.V2.PaymentRequests;
using PayOS.Models.Webhooks;

namespace AnhDuySport.Api.Services;

// Đăng ký lớp + lên cấp gói hội viên (combo), thanh toán bằng mã QR payOS thật.
// - Tạo đơn: dùng lại SubmitRegistrationAsync (kiểm tra lớp, giữ chỗ 10 phút, Amount = học phí + giá lên cấp),
//   rồi gắn payos_order_code = payment_id và xin link/QR payOS đúng số tiền đó.
// - Xác nhận: dùng lại MarkPaymentPaidAsync (khóa lớp, kiểm tra chỗ, ghi danh, cấp gói qua ClassMembershipBonus.GrantAsync).
// Không sửa file cũ: controller tự tạo service này bằng ActivatorUtilities nên không cần đăng ký trong Program.cs.
public class ComboPayOsPaymentService(
    AppDbContext db,
    ClassRegistrationFlowService registrations,
    IConfiguration configuration,
    IServiceProvider services)
{
    // Giữ chỗ của ClassRegistrationFlowService là 10 phút; link payOS hết hạn sớm hơn 2 phút
    // để QR đã chết thì chỗ mới được nhả (đúng ghi chú trong ClassRegistrationFlowService).
    private const int HoldMinutes = 10;
    private const int LinkMinutes = HoldMinutes - 2;

    // Webhook và học viên hỏi trạng thái có thể tới cùng lúc: chỉ cho một luồng xác nhận một lúc,
    // tránh cấp gói 2 lần (MarkPaymentPaidAsync đọc payment trước khi khóa dòng lớp).
    private static readonly SemaphoreSlim ConfirmLock = new(1, 1);

    private PayOSClient? PayOsClient => services.GetService<PayOSClient>();

    private PayOSClient RequirePayOs() =>
        PayOsClient ?? throw new RegistrationException(
            "Máy này chưa cấu hình payOS nên chưa tạo được mã QR. Kiểm tra file be/config/payos.json.");

    // Danh sách gói có ưu đãi lên cấp kèm lớp (Bạc, Vàng). Đồng có ưu đãi 0% nên không nằm trong danh sách.
    public async Task<IReadOnlyList<ComboUpgradeOptionDto>> AccessUpgradeOptionsAsync()
    {
        var packages = await db.MembershipPackages
            .AsNoTracking()
            .Where(item => item.Status == "active" && item.UpgradeDiscountPercent > 0)
            .OrderBy(item => item.Fee)
            .ToListAsync();
        return packages
            .Select(item => new ComboUpgradeOptionDto(
                item.MembershipPackageId.ToString(),
                item.PackageCode,
                item.PackageName,
                item.Fee,
                item.UpgradeDiscountPercent,
                decimal.Round(item.Fee * (100 - item.UpgradeDiscountPercent) / 100, 0, MidpointRounding.AwayFromZero),
                item.ValidityMonths))
            .ToList();
    }

    public async Task<ComboPayOsPaymentDto> CreateAsync(int memberUserId, CreateClassRegistrationRequest request)
    {
        var payOs = RequirePayOs();
        var registration = await registrations.SubmitRegistrationAsync(memberUserId, request);
        var payment = await FindPaymentAsync(int.Parse(registration.PaymentId));

        // Đơn pending cũ sắp hết hạn giữ chỗ thì không đủ thời gian quét QR: hủy và tạo đơn mới.
        if (string.IsNullOrWhiteSpace(payment.QrCode) && LinkExpiresAt(payment) <= DateTime.Now.AddMinutes(1))
        {
            await registrations.MarkPaymentFailedAsync(payment.PaymentId, memberUserId);
            AddHistory(payment.PaymentId, "cancel", "Đơn sắp hết hạn giữ chỗ, tạo đơn mới để lấy mã QR");
            await db.SaveChangesAsync();
            db.ChangeTracker.Clear();
            registration = await registrations.SubmitRegistrationAsync(memberUserId, request);
            payment = await FindPaymentAsync(int.Parse(registration.PaymentId));
        }

        // Đổi lựa chọn lên cấp: SubmitRegistrationAsync định hủy đơn cũ nhưng đơn đó lấy từ LiveHolds() (AsNoTracking)
        // nên 'failed' không được lưu, rồi trùng UX_payment_pending_per_class và trả lại đơn cũ.
        // Ở đây tự hủy đơn cũ (đóng cả QR payOS) rồi tạo lại.
        var wantedPackageId = (await ClassMembershipBonus.QuoteUpgradeAsync(db, request.MembershipPackageId)).Package?.MembershipPackageId;
        if (payment.Status == "pending" && payment.UpgradePackageId != wantedPackageId)
        {
            await CancelLinkAsync(payment, "Đổi lựa chọn gói lên cấp");
            await registrations.MarkPaymentFailedAsync(payment.PaymentId, memberUserId);
            AddHistory(payment.PaymentId, "cancel", "Đổi lựa chọn gói lên cấp, tạo đơn mới");
            await db.SaveChangesAsync();
            db.ChangeTracker.Clear();
            registration = await registrations.SubmitRegistrationAsync(memberUserId, request);
            payment = await FindPaymentAsync(int.Parse(registration.PaymentId));
        }

        // Còn mã QR của đơn đã hủy gần đây (cùng lớp) trên payOS thì đóng luôn để học viên không trả nhầm.
        await CancelStaleLinksAsync(payOs, payment);

        if (payment.Status == "pending" && !string.IsNullOrWhiteSpace(payment.QrCode))
        {
            return await ToDtoAsync(payment, true);
        }

        var amount = payment.Amount;
        if (amount < 2000 || amount != decimal.Truncate(amount) || amount > int.MaxValue)
        {
            throw new RegistrationException("Số tiền không hợp lệ để tạo mã QR payOS.");
        }

        // Không dùng payment_id làm orderCode: reset DB hoặc nhiều máy dùng chung khóa payOS thì payment_id lặp lại
        // và payOS báo "Đơn thanh toán đã tồn tại". Mỗi lần xin link dùng mã mới (vẫn tra ngược qua payos_order_code).
        payment.PayosOrderCode = NewOrderCode(payment.PaymentId);
        var invoiceCode = payment.Invoice?.InvoiceCode ?? "";
        var expiresAt = LinkExpiresAt(payment);
        try
        {
            var link = await payOs.PaymentRequests.CreateAsync(new CreatePaymentLinkRequest
            {
                OrderCode = payment.PayosOrderCode.Value,
                Amount = decimal.ToInt32(amount),
                Description = invoiceCode.Length <= 25 ? invoiceCode : invoiceCode[..25],
                ReturnUrl = Url("PayOS:ReturnUrl", "http://localhost:5173/payment/result"),
                CancelUrl = Url("PayOS:CancelUrl", "http://localhost:5173/payment/cancel"),
                ExpiredAt = new DateTimeOffset(expiresAt).ToUnixTimeSeconds(),
            });
            if (string.IsNullOrWhiteSpace(link.QrCode))
            {
                throw new RegistrationException("payOS không trả mã QR.");
            }

            payment.CheckoutUrl = link.CheckoutUrl;
            payment.PaymentLinkId = link.PaymentLinkId;
            payment.QrCode = link.QrCode;
        }
        catch (Exception exception) when (exception is ApiException or RegistrationException)
        {
            // Không có QR thì nhả chỗ ngay, không giữ chỗ 10 phút cho đơn không trả được.
            db.ChangeTracker.Clear();
            await registrations.MarkPaymentFailedAsync(payment.PaymentId, memberUserId);
            AddHistory(payment.PaymentId, "cancel", "payOS từ chối tạo mã QR");
            await db.SaveChangesAsync();
            throw new RegistrationException(string.IsNullOrWhiteSpace(exception.Message)
                ? "payOS từ chối tạo mã QR."
                : exception.Message);
        }

        AddHistory(payment.PaymentId, "pending", "Tạo mã QR combo lớp + gói hội viên");
        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = memberUserId,
            Action = "Tạo mã QR payOS (combo)",
            EntityName = "payment",
            EntityId = payment.PaymentId,
            Detail = payment.UpgradePackageId is null
                ? $"{invoiceCode}, học phí {amount:N0}"
                : $"{invoiceCode}, học phí {amount - payment.UpgradeAmount:N0} + lên cấp {payment.UpgradeAmount:N0}",
            CreatedAt = DateTime.Now,
        });
        await db.SaveChangesAsync();
        return await ToDtoAsync(payment, registration.IsExisting);
    }

    // Học viên (FE) hỏi lại sau khi quét QR: nếu payOS báo đã trả thì xác nhận luôn, không cần chờ webhook.
    public async Task<ComboPayOsPaymentDto> AccessAsync(string paymentId, int memberUserId)
    {
        var payment = await FindOwnPaymentAsync(paymentId, memberUserId);
        if (payment.Status == "pending" && payment.PayosOrderCode is long orderCode && PayOsClient is PayOSClient payOs)
        {
            PaymentLink? link = null;
            try
            {
                link = await payOs.PaymentRequests.GetAsync(orderCode);
            }
            catch (ApiException)
            {
            }

            var status = link?.Status.ToString() ?? "";
            if (status.Equals("Paid", StringComparison.OrdinalIgnoreCase))
            {
                await ConfirmPaidAsync(payment.PaymentId, "payOS báo đã thanh toán");
            }
            else if (status is not "" && (status.Equals("Cancelled", StringComparison.OrdinalIgnoreCase)
                || status.Equals("Canceled", StringComparison.OrdinalIgnoreCase)
                || status.Equals("Expired", StringComparison.OrdinalIgnoreCase)))
            {
                await registrations.MarkPaymentFailedAsync(payment.PaymentId, memberUserId);
                AddHistory(payment.PaymentId, "cancel", "payOS trả trạng thái " + status);
                await db.SaveChangesAsync();
            }

            db.ChangeTracker.Clear();
            payment = await FindPaymentAsync(payment.PaymentId);
        }

        return await ToDtoAsync(payment, true);
    }

    public async Task<ComboPayOsPaymentDto> CancelAsync(string paymentId, int memberUserId)
    {
        var payment = await FindOwnPaymentAsync(paymentId, memberUserId);
        if (payment.Status == "paid")
        {
            throw new RegistrationException("Đơn đã thanh toán, không hủy.");
        }

        if (payment.Status == "pending")
        {
            await CancelLinkAsync(payment, "Học viên không thanh toán");
            await registrations.MarkPaymentFailedAsync(payment.PaymentId, memberUserId);
            AddHistory(payment.PaymentId, "cancel", "Học viên không thanh toán");
            await db.SaveChangesAsync();
            db.ChangeTracker.Clear();
            payment = await FindPaymentAsync(payment.PaymentId);
        }

        return await ToDtoAsync(payment, true);
    }

    // payOS gọi khi có tiền vào. Khác webhook cũ: kiểm tra lớp còn chỗ (qua MarkPaymentPaidAsync)
    // và không tự chuyển 'paid' cho đơn đã hủy (chỉ ghi log để hoàn tiền).
    public async Task HandleWebhookAsync(Webhook? webhook)
    {
        if (webhook is null)
        {
            throw new RegistrationException("Webhook không có dữ liệu.");
        }

        WebhookData data;
        try
        {
            data = await RequirePayOs().Webhooks.VerifyAsync(webhook);
        }
        catch (WebhookException)
        {
            throw new RegistrationException("Chữ ký webhook không hợp lệ.");
        }

        if (data.OrderCode <= 0 || data.Code != "00")
        {
            return;
        }

        var payment = await db.Payments
            .AsNoTracking()
            .Include(item => item.Invoice)
            .FirstOrDefaultAsync(item => item.PayosOrderCode == data.OrderCode);
        if (payment is null)
        {
            return;
        }

        // Đơn gói hội viên (class_id NULL): giao cho MemberMembershipFlowService ghi paid và kích hoạt gói.
        if (payment.ClassId is null)
        {
            await services.GetRequiredService<MemberMembershipFlowService>().HandlePayOsPaidAsync(payment.PaymentId, data.Amount);
            return;
        }

        if (payment.Status == "paid")
        {
            return;
        }

        if (data.Amount != decimal.ToInt32(payment.Amount))
        {
            throw new RegistrationException("Số tiền webhook không khớp hóa đơn.");
        }

        if (payment.Status != "pending")
        {
            db.ActivityLogs.Add(new ActivityLog
            {
                ActorUserId = payment.UserId,
                Action = "Nhận tiền payOS cho đơn đã hủy",
                EntityName = "payment",
                EntityId = payment.PaymentId,
                Detail = $"Hóa đơn {payment.Invoice?.InvoiceCode}, {payment.Amount:N0}, trạng thái {payment.Status}. Cần hoàn tiền.",
                CreatedAt = DateTime.Now,
            });
            await db.SaveChangesAsync();
            return;
        }

        await ConfirmPaidAsync(payment.PaymentId, "Webhook payOS: thanh toán thành công");
    }

    private async Task ConfirmPaidAsync(int paymentId, string note)
    {
        await ConfirmLock.WaitAsync();
        try
        {
            db.ChangeTracker.Clear();
            var status = await db.Payments
                .AsNoTracking()
                .Where(item => item.PaymentId == paymentId)
                .Select(item => item.Status)
                .FirstAsync();
            if (status != "pending")
            {
                return;
            }

            // Ghi danh + cấp gói lên cấp (hoặc tặng Đồng) nằm trong MarkPaymentPaidAsync.
            await registrations.MarkPaymentPaidAsync(paymentId, null, "payos");
            AddHistory(paymentId, "paid", note);
            await db.SaveChangesAsync();
        }
        finally
        {
            ConfirmLock.Release();
        }
    }

    private async Task CancelStaleLinksAsync(PayOSClient payOs, Payment current)
    {
        var since = DateTime.Now.AddMinutes(-HoldMinutes);
        var stale = await db.Payments
            .AsNoTracking()
            .Where(item => item.UserId == current.UserId
                && item.ClassId == current.ClassId
                && item.PaymentId != current.PaymentId
                && (item.Status == "failed" || item.Status == "cancel")
                && item.PayosOrderCode != null
                && item.CheckoutUrl != null
                && item.Invoice!.IssuedAt > since)
            .Select(item => item.PayosOrderCode!.Value)
            .ToListAsync();
        foreach (var orderCode in stale)
        {
            try
            {
                await payOs.PaymentRequests.CancelAsync(orderCode, "Đổi lựa chọn gói lên cấp");
            }
            catch (ApiException)
            {
            }
        }
    }

    private async Task CancelLinkAsync(Payment payment, string reason)
    {
        if (payment.PayosOrderCode is not long orderCode || PayOsClient is not PayOSClient payOs)
        {
            return;
        }

        try
        {
            await payOs.PaymentRequests.CancelAsync(orderCode, reason);
        }
        catch (ApiException)
        {
        }
    }

    // Mili-giây Unix × 1000 + 3 số cuối payment_id: luôn tăng, không trùng giữa các lần tạo,
    // và nhỏ hơn 9007199254740991 (giới hạn orderCode của payOS).
    private static long NewOrderCode(int paymentId) =>
        DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() * 1000 + paymentId % 1000;

    private static DateTime LinkExpiresAt(Payment payment) =>
        (payment.Invoice?.IssuedAt ?? DateTime.Now).AddMinutes(LinkMinutes);

    private async Task<Payment> FindPaymentAsync(int paymentId) =>
        await db.Payments
            .Include(item => item.Invoice)
            .Include(item => item.Class)
            .FirstOrDefaultAsync(item => item.PaymentId == paymentId && item.ClassId != null)
        ?? throw new KeyNotFoundException("Không tìm thấy đơn thanh toán.");

    private async Task<Payment> FindOwnPaymentAsync(string paymentId, int memberUserId)
    {
        if (!int.TryParse(paymentId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy đơn thanh toán.");
        }

        var payment = await FindPaymentAsync(id);
        if (payment.UserId != memberUserId)
        {
            throw new KeyNotFoundException("Không tìm thấy đơn thanh toán.");
        }

        return payment;
    }

    private void AddHistory(int paymentId, string status, string note) =>
        db.PaymentHistories.Add(new PaymentHistory
        {
            PaymentId = paymentId,
            Status = status,
            Note = note,
            CreatedAt = DateTime.Now,
        });

    private string Url(string key, string fallback)
    {
        var url = configuration[key];
        return string.IsNullOrWhiteSpace(url) ? fallback : url;
    }

    private async Task<ComboPayOsPaymentDto> ToDtoAsync(Payment payment, bool isExisting)
    {
        var packageName = payment.UpgradePackageId is int packageId
            ? await db.MembershipPackages.AsNoTracking()
                .Where(item => item.MembershipPackageId == packageId)
                .Select(item => item.PackageName)
                .FirstOrDefaultAsync()
            : null;
        var enrollmentStatus = await db.ClassEnrollments.AsNoTracking()
            .Where(item => item.ClassId == payment.ClassId && item.UserId == payment.UserId)
            .Select(item => item.Status)
            .FirstOrDefaultAsync();
        var isPending = payment.Status == "pending";
        var message = payment.Status switch
        {
            "pending" => "Quét mã QR bằng app ngân hàng để thanh toán.",
            "paid" when enrollmentStatus == "enrolled" => packageName is null
                ? "Thanh toán thành công. Bạn đã được ghi danh và được tặng Hạng Đồng."
                : $"Thanh toán thành công. Bạn đã được ghi danh và lên {packageName}.",
            "paid" => "Đã nhận thanh toán nhưng lớp đã đầy. AnhDuy Sport sẽ liên hệ hoàn tiền.",
            _ => "Đơn đã hủy hoặc hết hạn. Hãy đăng ký lại để lấy mã QR mới.",
        };

        return new ComboPayOsPaymentDto(
            payment.PaymentId.ToString(),
            payment.Invoice?.InvoiceCode ?? "",
            payment.ClassId?.ToString() ?? "",
            payment.Class?.ClassName ?? "",
            payment.Amount - payment.UpgradeAmount,
            payment.UpgradePackageId?.ToString(),
            packageName,
            payment.UpgradeAmount,
            payment.Amount,
            payment.Status,
            enrollmentStatus,
            isPending ? payment.CheckoutUrl : null,
            isPending ? payment.QrCode : null,
            isPending ? LinkExpiresAt(payment) : null,
            isExisting,
            message);
    }
}
