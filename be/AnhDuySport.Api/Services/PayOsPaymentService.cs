using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;
using PayOS;
using PayOS.Exceptions;
using PayOS.Models.V2.PaymentRequests;
using PayOS.Models.Webhooks;

namespace AnhDuySport.Api.Services;

public class PayOsPaymentService(
    AppDbContext db,
    PayOSClient payOs,
    IConfiguration configuration,
    ClassRegistrationFlowService registrations)
{
    public async Task<PayOsPaymentDto> CreateAsync(CreatePayOsPaymentRequest request)
    {
        // Kiểm tra và tạo đơn pending dùng chung với đăng ký tại quầy; ở đây chỉ thêm link payOS.
        var pending = await registrations.GetOrCreatePendingPaymentAsync(request.MemberUserId, request.ClassId);

        // Đơn có thể không được theo dõi (lấy lại đơn cũ), nạp lại để cập nhật link.
        var payment = await db.Payments
            .Include(item => item.Invoice)
            .FirstAsync(item => item.PaymentId == pending.Payment.PaymentId);
        if (payment.PayosOrderCode is null)
        {
            payment.PayosOrderCode = payment.PaymentId;
            await db.SaveChangesAsync();
        }

        if (string.IsNullOrWhiteSpace(payment.CheckoutUrl))
        {
            await CreateLinkAsync(payment, payment.Invoice?.InvoiceCode ?? "");
        }

        return ToDto(payment);
    }

    public async Task<PayOsPaymentDto> AccessAsync(string paymentId)
    {
        if (!int.TryParse(paymentId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy thanh toán.");
        }

        var payment = await db.Payments
            .Include(item => item.Invoice)
            .FirstOrDefaultAsync(item => item.PaymentId == id)
            ?? throw new KeyNotFoundException("Không tìm thấy thanh toán.");
        if (payment.Status == "pending")
        {
            await TryConfirmFromPayOsAsync(payment);
        }

        return ToDto(payment);
    }

    public async Task HandleWebhookAsync(Webhook? webhook)
    {
        if (webhook is null)
        {
            throw new InvalidOperationException("Webhook không có dữ liệu.");
        }

        WebhookData data;
        try
        {
            data = await payOs.Webhooks.VerifyAsync(webhook);
        }
        catch (WebhookException)
        {
            throw new InvalidOperationException("Chữ ký webhook không hợp lệ.");
        }

        if (data.OrderCode <= 0 || data.Code != "00")
        {
            return;
        }

        var payment = await db.Payments
            .Include(item => item.Invoice)
            .FirstOrDefaultAsync(item => item.PayosOrderCode == data.OrderCode);
        if (payment is null || payment.Status == "paid")
        {
            return;
        }

        if (data.Amount != decimal.ToInt32(payment.Amount))
        {
            throw new InvalidOperationException("Số tiền webhook không khớp hóa đơn.");
        }

        await MarkPaidAsync(payment);
    }

    private async Task TryConfirmFromPayOsAsync(Payment payment)
    {
        if (payment.PayosOrderCode is not long orderCode)
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
        var paid = status.Equals("Paid", StringComparison.OrdinalIgnoreCase)
            || status.Equals("PAID", StringComparison.OrdinalIgnoreCase);
        if (!paid)
        {
            return;
        }

        await MarkPaidAsync(payment);
    }

    private async Task MarkPaidAsync(Payment payment)
    {
        payment.Status = "paid";
        payment.PaidAt = DateTime.Now;
        if (payment.Invoice is not null)
        {
            payment.Invoice.Status = "paid";
        }

        if (payment.ClassId is int classId)
        {
            var enrollment = await db.ClassEnrollments
                .FirstOrDefaultAsync(item => item.ClassId == classId && item.UserId == payment.UserId);
            if (enrollment is null)
            {
                db.ClassEnrollments.Add(new ClassEnrollment
                {
                    ClassId = classId,
                    UserId = payment.UserId,
                    EnrolledAt = DateTime.Now,
                    Status = "enrolled",
                });
            }
            else if (enrollment.Status != "enrolled")
            {
                enrollment.Status = "enrolled";
                enrollment.EnrolledAt = DateTime.Now;
            }
        }

        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = payment.UserId,
            Action = "Thanh toán payOS thành công",
            EntityName = "payment",
            EntityId = payment.PaymentId,
            Detail = payment.Invoice?.InvoiceCode,
            CreatedAt = DateTime.Now,
        });
        await db.SaveChangesAsync();
    }

    private async Task CreateLinkAsync(Payment payment, string invoiceCode)
    {
        if (payment.PayosOrderCode is not long orderCode)
        {
            throw new InvalidOperationException("Đơn thanh toán chưa có mã payOS.");
        }

        // payOS chỉ nhận số tiền nguyên từ 2.000đ. Kiểm tra trước khi gọi để đơn pending không bị hủy oan.
        var amount = payment.Amount;
        if (amount < 2000 || amount != decimal.Truncate(amount) || amount > int.MaxValue)
        {
            throw new InvalidOperationException("Học phí không hợp lệ để tạo link payOS.");
        }

        var description = invoiceCode.Length <= 25 ? invoiceCode : invoiceCode[..25];
        try
        {
            var link = await payOs.PaymentRequests.CreateAsync(new CreatePaymentLinkRequest
            {
                OrderCode = orderCode,
                Amount = decimal.ToInt32(amount),
                Description = description,
                ReturnUrl = RequireUrl("PayOS:ReturnUrl"),
                CancelUrl = RequireUrl("PayOS:CancelUrl"),
            });
            payment.CheckoutUrl = link.CheckoutUrl;
            payment.PaymentLinkId = link.PaymentLinkId;
            await db.SaveChangesAsync();
        }
        catch (ApiException exception)
        {
            payment.Status = "failed";
            if (payment.Invoice is not null)
            {
                payment.Invoice.Status = "cancelled";
            }

            await db.SaveChangesAsync();
            throw new InvalidOperationException(string.IsNullOrWhiteSpace(exception.Message)
                ? "payOS từ chối tạo link thanh toán."
                : exception.Message);
        }
    }

    private string RequireUrl(string key)
    {
        var url = configuration[key];
        if (string.IsNullOrWhiteSpace(url))
        {
            throw new InvalidOperationException($"Thiếu cấu hình {key}.");
        }

        return url;
    }

    private static PayOsPaymentDto ToDto(Payment payment) =>
        new(
            payment.PaymentId.ToString(),
            payment.Invoice?.InvoiceCode ?? "",
            payment.UserId.ToString(),
            payment.ClassId?.ToString() ?? "",
            payment.Status,
            decimal.ToInt32(payment.Amount),
            payment.CheckoutUrl);
}
