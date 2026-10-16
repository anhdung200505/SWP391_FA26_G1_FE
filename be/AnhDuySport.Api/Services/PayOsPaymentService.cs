using System.Data;
using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using PayOS;
using PayOS.Exceptions;
using PayOS.Models.V2.PaymentRequests;
using PayOS.Models.Webhooks;

namespace AnhDuySport.Api.Services;

public class PayOsPaymentService(AppDbContext db, PayOSClient payOs, IConfiguration configuration)
{
    public async Task<PayOsPaymentDto> CreateAsync(CreatePayOsPaymentRequest request)
    {
        var member = await FindActiveMemberAsync(request.MemberUserId);
        var trainingClass = await FindPayableClassAsync(request.ClassId);

        var alreadyPaid = await db.Payments.AnyAsync(item =>
            item.UserId == member.UserId && item.ClassId == trainingClass.ClassId && item.Status == "paid");
        if (alreadyPaid)
        {
            throw new InvalidOperationException("Học viên đã thanh toán lớp này.");
        }

        var enrolled = await db.ClassEnrollments.AnyAsync(item =>
            item.UserId == member.UserId && item.ClassId == trainingClass.ClassId && item.Status == "enrolled");
        if (enrolled)
        {
            throw new InvalidOperationException("Học viên đã ghi danh lớp này.");
        }

        var pending = await db.Payments
            .Include(item => item.Invoice)
            .FirstOrDefaultAsync(item =>
                item.UserId == member.UserId && item.ClassId == trainingClass.ClassId && item.Status == "pending");
        if (pending is not null)
        {
            if (string.IsNullOrWhiteSpace(pending.CheckoutUrl))
            {
                await CreateLinkAsync(pending, pending.Invoice?.InvoiceCode ?? "");
            }

            return ToDto(pending);
        }

        var payment = await CreatePendingPaymentAsync(member, trainingClass);
        await CreateLinkAsync(payment, payment.Invoice?.InvoiceCode ?? "");
        return ToDto(payment);
    }

    public async Task<PayOsPaymentDto> AccessAsync(string paymentId)
    {
        if (!int.TryParse(paymentId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy thanh toán.");
        }

        var payment = await db.Payments
            .AsNoTracking()
            .Include(item => item.Invoice)
            .FirstOrDefaultAsync(item => item.PaymentId == id)
            ?? throw new KeyNotFoundException("Không tìm thấy thanh toán.");
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

    private async Task<Payment> CreatePendingPaymentAsync(UserAccount member, PayableClass trainingClass)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();
        var invoice = new Invoice
        {
            UserId = member.UserId,
            InvoiceCode = await NextInvoiceCodeAsync(),
            IssuedAt = DateTime.Now,
            TotalAmount = trainingClass.Amount,
            Status = "issued",
        };
        var payment = new Payment
        {
            UserId = member.UserId,
            ClassId = trainingClass.ClassId,
            Amount = trainingClass.Amount,
            PaymentMethod = "payos",
            Status = "pending",
            Invoice = invoice,
        };
        db.Payments.Add(payment);
        await db.SaveChangesAsync();
        payment.PayosOrderCode = payment.PaymentId;
        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = member.UserId,
            Action = "Tạo link thanh toán payOS",
            EntityName = "payment",
            EntityId = payment.PaymentId,
            Detail = $"{invoice.InvoiceCode} / {trainingClass.ClassName}",
            CreatedAt = DateTime.Now,
        });
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return payment;
    }

    private async Task CreateLinkAsync(Payment payment, string invoiceCode)
    {
        if (payment.PayosOrderCode is not long orderCode)
        {
            throw new InvalidOperationException("Đơn thanh toán chưa có mã payOS.");
        }

        var description = invoiceCode.Length <= 25 ? invoiceCode : invoiceCode[..25];
        try
        {
            var link = await payOs.PaymentRequests.CreateAsync(new CreatePaymentLinkRequest
            {
                OrderCode = orderCode,
                Amount = decimal.ToInt32(payment.Amount),
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

    private async Task<string> NextInvoiceCodeAsync()
    {
        var connection = db.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync();
        }

        await using var command = connection.CreateCommand();
        command.Transaction = db.Database.CurrentTransaction?.GetDbTransaction();
        command.CommandText = "SELECT NEXT VALUE FOR dbo.invoice_code_seq";
        var value = Convert.ToInt32(await command.ExecuteScalarAsync());
        return $"INV-{DateTime.Now.Year}-{value:D4}";
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

    private async Task<PayableClass> FindPayableClassAsync(string classId)
    {
        if (!int.TryParse(classId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy lớp học.");
        }

        var today = DateOnly.FromDateTime(DateTime.Now);
        var item = await db.Classes
            .AsNoTracking()
            .Where(current => current.ClassId == id)
            .Select(current => new
            {
                current.ClassId,
                current.ClassName,
                current.Status,
                current.EndDate,
                current.Capacity,
                CourseStatus = current.Course!.Status,
                Price = current.Course.Price,
                EnrolledCount = current.Enrollments.Count(enrollment => enrollment.Status == "enrolled"),
            })
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Không tìm thấy lớp học.");

        int? seats = item.Capacity is int capacity ? capacity - item.EnrolledCount : null;
        var isOpen = item.Status is "open" or "ongoing"
            && (item.EndDate is null || item.EndDate >= today)
            && item.CourseStatus == "active"
            && (seats is null || seats > 0);
        if (!isOpen)
        {
            throw new InvalidOperationException("Lớp không còn mở để thanh toán.");
        }

        if (item.Price < 2000 || item.Price != decimal.Truncate(item.Price) || item.Price > int.MaxValue)
        {
            throw new InvalidOperationException("Học phí không hợp lệ để tạo link payOS.");
        }

        return new PayableClass(item.ClassId, item.ClassName, item.Price);
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

    private static PayOsPaymentDto ToDto(Payment payment) =>
        new(
            payment.PaymentId.ToString(),
            payment.Invoice?.InvoiceCode ?? "",
            payment.UserId.ToString(),
            payment.ClassId?.ToString() ?? "",
            payment.Status,
            decimal.ToInt32(payment.Amount),
            payment.CheckoutUrl);

    private sealed record PayableClass(int ClassId, string ClassName, decimal Amount);
}
