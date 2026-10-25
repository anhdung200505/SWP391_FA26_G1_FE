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

public class PayOsPaymentService(AppDbContext db, IConfiguration configuration, IServiceProvider services)
{
    private const int CheckoutAmount = 10_000;

    private PayOSClient? PayOsClient => services.GetService<PayOSClient>();

    private PayOSClient RequirePayOs() =>
        PayOsClient ?? throw new InvalidOperationException(
            "Máy này chưa cấu hình payOS nên chưa tạo được mã QR. Kiểm tra file be/config/payos.json.");
    public async Task<PayOsPaymentDto> CreateAsync(CreatePayOsPaymentRequest request, int memberUserId)
    {
        RequirePayOs();
        var member = await FindRegisteredMemberAsync(memberUserId);
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
        if (pending is not null && pending.Amount != CheckoutAmount)
        {
            await MarkCancelAsync(pending, "Đổi số tiền, đóng đơn pending cũ");
            pending = null;
        }

        if (pending is not null && !string.IsNullOrWhiteSpace(pending.CheckoutUrl) && string.IsNullOrWhiteSpace(pending.QrCode))
        {
            await MarkCancelAsync(pending, "Tạo lại mã QR trên trang đăng ký");
            pending = null;
        }

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

    public async Task<PayOsPaymentDto> AccessAsync(string paymentId, int memberUserId)
    {
        var payment = await FindOwnPaymentAsync(paymentId, memberUserId);
        if (payment.Status == "pending")
        {
            await TryConfirmFromPayOsAsync(payment);
        }

        return ToDto(payment);
    }

    public async Task<PayOsPaymentDto> CancelAsync(string paymentId, int memberUserId)
    {
        var payment = await FindOwnPaymentAsync(paymentId, memberUserId);
        if (payment.Status == "paid")
        {
            throw new InvalidOperationException("Đơn đã thanh toán, không hủy.");
        }

        if (payment.Status == "pending")
        {
            await MarkCancelAsync(payment, "Không thanh toán");
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
            data = await RequirePayOs().Webhooks.VerifyAsync(webhook);
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
        if (payment is null)
        {
            return;
        }

        // Đơn gói hội viên (class_id NULL): MemberMembershipFlowService ghi paid và kích hoạt gói trong cùng một bước,
        // kể cả khi payment đã paid mà gói chưa kích hoạt, hoặc đơn đã hủy mà vẫn nhận tiền.
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
            throw new InvalidOperationException("Số tiền webhook không khớp hóa đơn.");
        }

        await MarkPaidAsync(payment);
    }

    // Link payOS cho đơn đăng ký lớp (POST /api/class-registrations), đúng số tiền của đơn.
    // Máy chưa cấu hình payOS hoặc payOS từ chối thì trả null: đơn vẫn pending để lễ tân thu tại quầy.
    public async Task<Payment?> EnsureRegistrationLinkAsync(int paymentId, DateTime holdUntil)
    {
        if (PayOsClient is not PayOSClient payOs)
        {
            return null;
        }

        var payment = await db.Payments
            .Include(item => item.Invoice)
            .FirstOrDefaultAsync(item => item.PaymentId == paymentId && item.Status == "pending");
        if (payment is null)
        {
            return null;
        }

        if (!string.IsNullOrWhiteSpace(payment.CheckoutUrl))
        {
            return payment;
        }

        if (payment.Amount < 2000 || payment.Amount != decimal.Truncate(payment.Amount) || payment.Amount > int.MaxValue)
        {
            return null;
        }

        // Mã đơn payOS không được trùng trong cả kênh thanh toán, kể cả sau khi dựng lại database: ghép thời gian.
        payment.PayosOrderCode ??= long.Parse(DateTime.Now.ToString("yyMMddHHmmss")) * 1000 + payment.PaymentId % 1000;
        var invoiceCode = payment.Invoice?.InvoiceCode ?? "";
        try
        {
            var link = await payOs.PaymentRequests.CreateAsync(new CreatePaymentLinkRequest
            {
                OrderCode = payment.PayosOrderCode.Value,
                Amount = decimal.ToInt32(payment.Amount),
                Description = invoiceCode.Length <= 25 ? invoiceCode : invoiceCode[..25],
                ReturnUrl = PayOsUrl("PayOS:ReturnUrl", "http://localhost:5173/payment/result"),
                CancelUrl = PayOsUrl("PayOS:CancelUrl", "http://localhost:5173/payment/cancel"),
                ExpiredAt = new DateTimeOffset(holdUntil).ToUnixTimeSeconds(),
            });
            payment.CheckoutUrl = link.CheckoutUrl;
            payment.PaymentLinkId = link.PaymentLinkId;
            payment.QrCode = link.QrCode;
            AddHistory(payment, "pending", "Tạo mã QR payOS cho đơn đăng ký lớp");
            await db.SaveChangesAsync();
            return payment;
        }
        catch (ApiException)
        {
            payment.PayosOrderCode = null;
            return null;
        }
    }

    // Trạng thái link payOS (PAID, PENDING, CANCELLED, EXPIRED...), null nếu không hỏi được.
    public async Task<string?> PayOsStatusAsync(long? orderCode)
    {
        if (orderCode is not long code || PayOsClient is not PayOSClient payOs)
        {
            return null;
        }

        try
        {
            return (await payOs.PaymentRequests.GetAsync(code)).Status.ToString();
        }
        catch (ApiException)
        {
            return null;
        }
    }

    // Lễ tân thu tiền tại quầy: hủy link payOS để học viên không trả lần nữa. Lỗi thì bỏ qua.
    public async Task CancelLinkQuietlyAsync(long? orderCode, string reason)
    {
        if (orderCode is not long code || PayOsClient is not PayOSClient payOs)
        {
            return;
        }

        try
        {
            await payOs.PaymentRequests.CancelAsync(code, reason);
        }
        catch (ApiException)
        {
        }
    }

    private async Task TryConfirmFromPayOsAsync(Payment payment)
    {
        if (payment.PayosOrderCode is not long orderCode)
        {
            return;
        }

        if (PayOsClient is not PayOSClient payOs)
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
        if (status.Equals("Paid", StringComparison.OrdinalIgnoreCase)
            || status.Equals("PAID", StringComparison.OrdinalIgnoreCase))
        {
            await MarkPaidAsync(payment);
            return;
        }

        if (status.Equals("Cancelled", StringComparison.OrdinalIgnoreCase)
            || status.Equals("Canceled", StringComparison.OrdinalIgnoreCase)
            || status.Equals("Expired", StringComparison.OrdinalIgnoreCase))
        {
            await MarkCancelAsync(payment, "payOS trả trạng thái " + status);
        }
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

            await ClassMembershipBonus.GrantAsync(db, payment, DateTime.Now);
        }

        AddHistory(payment, "paid", "Thanh toán thành công");
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

    private async Task MarkCancelAsync(Payment payment, string reason)
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
            Action = "Hủy thanh toán payOS",
            EntityName = "payment",
            EntityId = payment.PaymentId,
            Detail = reason,
            CreatedAt = DateTime.Now,
        });
        await db.SaveChangesAsync();
    }

    private async Task<Payment> FindPaymentAsync(string paymentId)
    {
        if (!int.TryParse(paymentId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy thanh toán.");
        }

        return await db.Payments
            .Include(item => item.Invoice)
            .FirstOrDefaultAsync(item => item.PaymentId == id)
            ?? throw new KeyNotFoundException("Không tìm thấy thanh toán.");
    }

    private async Task<Payment> CreatePendingPaymentAsync(UserAccount member, PayableClass trainingClass)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();
        var invoice = new Invoice
        {
            UserId = member.UserId,
            InvoiceCode = await NextInvoiceCodeAsync(),
            IssuedAt = DateTime.Now,
            TotalAmount = CheckoutAmount,
            Status = "issued",
        };
        var payment = new Payment
        {
            UserId = member.UserId,
            ClassId = trainingClass.ClassId,
            Amount = CheckoutAmount,
            PaymentMethod = "payos",
            Status = "pending",
            Invoice = invoice,
            RegisteredByUserId = member.UserId,
        };
        db.Payments.Add(payment);
        ClassRegistrationLogs.Add(
            db, member.UserId, trainingClass.ClassId, ClassRegistrationLogs.Register,
            new RegistrationActor(member.UserId, "MEMBER"), DateTime.Now, payment, classAssignedBy: "MEMBER");
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
            var link = await RequirePayOs().PaymentRequests.CreateAsync(new CreatePaymentLinkRequest
            {
                OrderCode = orderCode,
                Amount = decimal.ToInt32(payment.Amount),
                Description = description,
                ReturnUrl = PayOsUrl("PayOS:ReturnUrl", "http://localhost:5173/payment/result"),
                CancelUrl = PayOsUrl("PayOS:CancelUrl", "http://localhost:5173/payment/cancel"),
            });
            payment.CheckoutUrl = link.CheckoutUrl;
            payment.PaymentLinkId = link.PaymentLinkId;
            payment.QrCode = link.QrCode;
            payment.Status = "pending";
            AddHistory(payment, "pending", "Tạo mã QR");
            await db.SaveChangesAsync();
            if (string.IsNullOrWhiteSpace(link.QrCode))
            {
                await MarkCancelAsync(payment, "payOS không trả mã QR");
                throw new InvalidOperationException("payOS không trả mã QR.");
            }
        }
        catch (ApiException exception)
        {
            await MarkCancelAsync(payment, "payOS từ chối tạo mã QR");
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

    private string PayOsUrl(string key, string fallback)
    {
        var url = configuration[key];
        return string.IsNullOrWhiteSpace(url) ? fallback : url;
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

    private async Task<Payment> FindOwnPaymentAsync(string paymentId, int memberUserId)
    {
        var payment = await FindPaymentAsync(paymentId);
        if (payment.UserId != memberUserId)
        {
            throw new KeyNotFoundException("Không tìm thấy thanh toán.");
        }

        return payment;
    }

    private async Task<UserAccount> FindRegisteredMemberAsync(int memberUserId)
    {
        var member = await db.UserAccounts
            .Include(user => user.Role)
            .FirstOrDefaultAsync(user => user.UserId == memberUserId);
        if (member is null || member.Role?.RoleCode != "MEMBER")
        {
            throw new InvalidOperationException("Đăng ký học cần tài khoản học viên. Hãy tạo tài khoản trước.");
        }

        if (member.Status != "active")
        {
            throw new InvalidOperationException("Tài khoản học viên không hoạt động.");
        }

        if (string.IsNullOrWhiteSpace(member.FullName) || member.FullName.Trim().Length < 2)
        {
            throw new InvalidOperationException("Hồ sơ cần có họ tên.");
        }

        if (!System.Text.RegularExpressions.Regex.IsMatch(member.Phone ?? "", "^0\\d{9}$"))
        {
            throw new InvalidOperationException("Hồ sơ cần số điện thoại 10 số và bắt đầu bằng 0.");
        }

        var email = member.Email ?? "";
        if (email.Contains(' ') || !email.Contains('@') || email.StartsWith('@') || email.EndsWith('@'))
        {
            throw new InvalidOperationException("Hồ sơ cần email có ký tự @.");
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
            payment.CheckoutUrl,
            payment.QrCode);

    private sealed record PayableClass(int ClassId, string ClassName, decimal Amount);
}
