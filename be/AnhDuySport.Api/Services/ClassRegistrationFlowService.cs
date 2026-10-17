using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Lỗi nghiệp vụ (trả 400). InvalidOperationException của .NET/EF vẫn ra 500.
public sealed class RegistrationException(string message) : InvalidOperationException(message);

public class ClassRegistrationFlowService(AppDbContext db)
{
    public async Task<IReadOnlyList<CenterDto>> AccessCentersAsync()
    {
        var centers = await db.Centers
            .AsNoTracking()
            .OrderBy(center => center.CenterName)
            .ToListAsync();

        return centers
            .Select(center => new CenterDto(
                center.CenterId.ToString(),
                center.CenterName,
                center.Address ?? "",
                center.Phone ?? ""))
            .ToList();
    }

    public async Task<IReadOnlyList<SportDto>> AccessSportsAsync(string centerId)
    {
        if (!int.TryParse(centerId, out var id) || !await db.Centers.AnyAsync(center => center.CenterId == id))
        {
            throw new KeyNotFoundException("Không tìm thấy trung tâm.");
        }

        var today = DateOnly.FromDateTime(DateTime.Now);
        var sports = await OpenClasses(today)
            .Where(item => item.Room != null && item.Room.CenterId == id)
            .Select(item => new
            {
                item.Course!.Sport!.SportId,
                item.Course.Sport.SportCode,
                item.Course.Sport.SportName,
            })
            .GroupBy(item => new { item.SportId, item.SportCode, item.SportName })
            .Select(group => new
            {
                group.Key.SportId,
                group.Key.SportCode,
                group.Key.SportName,
                OpenClassCount = group.Count(),
            })
            .OrderBy(item => item.SportName)
            .ToListAsync();

        return sports
            .Select(item => new SportDto(item.SportId.ToString(), item.SportCode, item.SportName, item.OpenClassCount))
            .ToList();
    }

    public async Task<IReadOnlyList<ClassSummaryDto>> AccessUpcomingClassesAsync(string? centerId, string? sportId)
    {
        if (string.IsNullOrWhiteSpace(centerId))
        {
            throw new RegistrationException("Cần chọn trung tâm.");
        }

        if (!int.TryParse(centerId, out var centerKey) || !await db.Centers.AnyAsync(center => center.CenterId == centerKey))
        {
            throw new KeyNotFoundException("Không tìm thấy trung tâm.");
        }

        int? sportKey = null;
        if (!string.IsNullOrWhiteSpace(sportId))
        {
            if (!int.TryParse(sportId, out var parsedSport) || !await db.Sports.AnyAsync(sport => sport.SportId == parsedSport))
            {
                throw new KeyNotFoundException("Không tìm thấy môn thể thao.");
            }

            sportKey = parsedSport;
        }

        var today = DateOnly.FromDateTime(DateTime.Now);
        var holds = LiveHolds();
        var classes = await OpenClasses(today)
            .Where(item => item.Room != null && item.Room.CenterId == centerKey)
            .Where(item => sportKey == null || item.Course!.SportId == sportKey)
            .OrderBy(item => item.StartDate)
            .ThenBy(item => item.ClassName)
            .Select(item => new
            {
                item.ClassId,
                item.ClassName,
                item.Course!.SportId,
                item.Course.Sport!.SportName,
                item.Course.CourseName,
                item.Course.LevelName,
                item.Course.Price,
                CoachName = item.Coach!.FullName,
                RoomName = item.Room!.RoomName,
                item.StartDate,
                item.EndDate,
                item.Capacity,
                EnrolledCount = item.Enrollments.Count(enrollment => enrollment.Status == "enrolled"),
                HeldCount = holds.Count(hold => hold.ClassId == item.ClassId),
                NextSlot = item.Slots
                    .Where(slot => slot.SlotDate >= today)
                    .OrderBy(slot => slot.SlotDate)
                    .ThenBy(slot => slot.StartTime)
                    .Select(slot => new { slot.SlotId, slot.SlotDate, slot.StartTime, slot.EndTime, slot.Title })
                    .FirstOrDefault(),
            })
            .ToListAsync();

        return classes
            .Select(item => new ClassSummaryDto(
                item.ClassId.ToString(),
                item.ClassName,
                item.SportId.ToString(),
                item.SportName,
                item.CourseName,
                item.LevelName ?? "",
                item.CoachName,
                item.RoomName,
                item.StartDate,
                item.EndDate,
                item.Capacity,
                item.EnrolledCount,
                AvailableSeats(item.Capacity, item.EnrolledCount + item.HeldCount),
                item.Price,
                item.NextSlot is null
                    ? null
                    : new ClassSlotDto(
                        item.NextSlot.SlotId.ToString(),
                        item.NextSlot.SlotDate,
                        item.NextSlot.StartTime,
                        item.NextSlot.EndTime,
                        item.NextSlot.Title ?? "")))
            .ToList();
    }

    public async Task<ClassDetailDto> SelectClassAsync(string classId)
    {
        if (!int.TryParse(classId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy lớp học.");
        }

        var holds = LiveHolds();
        var item = await db.Classes
            .AsNoTracking()
            .Where(current => current.ClassId == id)
            .Select(current => new
            {
                current.ClassId,
                current.ClassName,
                current.Status,
                current.StartDate,
                current.EndDate,
                current.Course!.SportId,
                current.Course.Sport!.SportName,
                current.Course.CourseName,
                current.Course.LevelName,
                current.Course.AgeRange,
                current.Course.Description,
                CourseStatus = current.Course.Status,
                Tuition = current.Course.Price,
                CenterId = current.Room != null ? (int?)current.Room.CenterId : null,
                CenterName = current.Room != null ? current.Room.Center!.CenterName : "",
                RoomName = current.Room != null ? current.Room.RoomName : "",
                CoachName = current.Coach!.FullName,
                current.Capacity,
                EnrolledCount = current.Enrollments.Count(enrollment => enrollment.Status == "enrolled"),
                HeldCount = holds.Count(hold => hold.ClassId == current.ClassId),
                Slots = current.Slots
                    .OrderBy(slot => slot.SlotDate)
                    .ThenBy(slot => slot.StartTime)
                    .Select(slot => new { slot.SlotId, slot.SlotDate, slot.StartTime, slot.EndTime, slot.Title })
                    .ToList(),
            })
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Không tìm thấy lớp học.");

        var today = DateOnly.FromDateTime(DateTime.Now);
        var availableSeats = AvailableSeats(item.Capacity, item.EnrolledCount + item.HeldCount);
        var isOpen = IsOpenForRegistration(item.Status, item.EndDate, item.CourseStatus, availableSeats, today);

        return new ClassDetailDto(
            item.ClassId.ToString(),
            item.ClassName,
            item.Status,
            item.StartDate,
            item.EndDate,
            item.SportId.ToString(),
            item.SportName,
            item.CourseName,
            item.LevelName ?? "",
            item.AgeRange ?? "",
            item.Description ?? "",
            item.CenterId?.ToString() ?? "",
            item.CenterName,
            item.RoomName,
            item.CoachName,
            item.Capacity,
            item.EnrolledCount,
            availableSeats,
            item.Tuition,
            isOpen,
            item.Slots
                .Select(slot => new ClassSlotDto(
                    slot.SlotId.ToString(),
                    slot.SlotDate,
                    slot.StartTime,
                    slot.EndTime,
                    slot.Title ?? ""))
                .ToList());
    }

    public async Task<ClassRegistrationDto> SubmitRegistrationAsync(int memberUserId, CreateClassRegistrationRequest request)
    {
        var member = await FindActiveMemberAsync(memberUserId);
        if (string.IsNullOrWhiteSpace(member.Phone))
        {
            throw new RegistrationException("Hồ sơ chưa có số điện thoại, cần bổ sung trước khi đăng ký.");
        }

        if (string.IsNullOrWhiteSpace(member.Email))
        {
            throw new RegistrationException("Hồ sơ chưa có email, cần bổ sung trước khi đăng ký.");
        }

        if (!int.TryParse(request.ClassId, out var classId))
        {
            throw new KeyNotFoundException("Không tìm thấy lớp học.");
        }

        var item = await db.Classes
            .AsNoTracking()
            .Where(current => current.ClassId == classId)
            .Select(current => new
            {
                current.ClassName,
                current.Status,
                current.EndDate,
                CourseStatus = current.Course!.Status,
                Tuition = current.Course.Price,
                current.Capacity,
                EnrolledCount = current.Enrollments.Count(enrollment => enrollment.Status == "enrolled"),
            })
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Không tìm thấy lớp học.");

        if (await db.ClassEnrollments.AnyAsync(enrollment =>
                enrollment.ClassId == classId && enrollment.UserId == member.UserId && enrollment.Status == "enrolled"))
        {
            throw new RegistrationException("Bạn đã đăng ký lớp học này.");
        }

        var today = DateOnly.FromDateTime(DateTime.Now);
        // Chỗ người khác đang giữ cũng tính là hết chỗ. Chỗ giữ của chính học viên này thì không, để họ nhận lại được đơn cũ.
        var heldByOthers = await LiveHolds().CountAsync(hold => hold.ClassId == classId && hold.UserId != member.UserId);
        var availableSeats = AvailableSeats(item.Capacity, item.EnrolledCount + heldByOthers);
        if (!IsOpenForRegistration(item.Status, item.EndDate, item.CourseStatus, availableSeats, today))
        {
            throw new RegistrationException("Lớp học không còn nhận đăng ký.");
        }

        var pending = await FindPendingPaymentAsync(member.UserId, classId);
        if (pending is not null)
        {
            return ToRegistrationDto(pending, item.ClassName, true);
        }

        // shortcut: giới hạn mềm, hai request cùng lúc ở hai lớp khác nhau có thể vượt 1 đơn; đủ cho chặn spam giữ chỗ.
        if (await LiveHolds().CountAsync(hold => hold.UserId == member.UserId) >= MaxHoldsPerMember)
        {
            throw new RegistrationException($"Bạn đang giữ chỗ ở {MaxHoldsPerMember} lớp. Hãy thanh toán hoặc đợi hết hạn giữ chỗ trước khi đăng ký thêm.");
        }

        try
        {
            var created = await CreatePendingPaymentAsync(member.UserId, classId, item.ClassName, item.Tuition);
            return ToRegistrationDto(created, item.ClassName, false);
        }
        catch (DbUpdateException exception) when (exception.InnerException is SqlException { Number: 2601 or 2627 })
        {
            // Một request khác vừa tạo đơn pending cho cùng học viên và lớp: trả lại đơn đó.
            db.ChangeTracker.Clear();
            var existing = await FindPendingPaymentAsync(member.UserId, classId);
            if (existing is null)
            {
                throw;
            }

            return ToRegistrationDto(existing, item.ClassName, true);
        }
    }

    // #7: học viên xem trạng thái đơn của mình. Sai chủ đơn và không có đơn cùng trả 404 để không lộ id nào có thật.
    public async Task<RegistrationStatusDto> SelectRegistrationStatusAsync(string paymentId, int memberId)
    {
        if (!int.TryParse(paymentId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy đơn đăng ký.");
        }

        var payment = await db.Payments
            .AsNoTracking()
            .Include(item => item.Invoice)
            .Include(item => item.Class)
            .FirstOrDefaultAsync(item => item.PaymentId == id && item.UserId == memberId && item.ClassId != null)
            ?? throw new KeyNotFoundException("Không tìm thấy đơn đăng ký.");

        return await BuildStatusAsync(payment);
    }

    // Hệ thống xác nhận đã nhận tiền (webhook payOS gọi hàm này). Gọi lặp lại không ghi thêm gì.
    public async Task<RegistrationStatusDto> MarkPaymentPaidAsync(int paymentId, int? actorUserId = null)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();
        var payment = await db.Payments
            .Include(item => item.Invoice)
            .Include(item => item.Class)
            .FirstOrDefaultAsync(item => item.PaymentId == paymentId)
            ?? throw new KeyNotFoundException("Không tìm thấy đơn thanh toán.");

        if (payment.Status == "refunded")
        {
            throw new RegistrationException("Đơn thanh toán đã được hoàn tiền.");
        }

        if (payment.Status == "paid")
        {
            return await BuildStatusAsync(payment);
        }

        var now = DateTime.Now;
        var className = payment.Class?.ClassName ?? "";
        var hasSeat = true;
        if (payment.ClassId is int classId)
        {
            // Khóa dòng lớp để hai thanh toán cùng lúc cho chỗ cuối không cùng qua.
            await db.Database
                .SqlQuery<int>($"SELECT class_id AS [Value] FROM class WITH (UPDLOCK, HOLDLOCK) WHERE class_id = {classId}")
                .ToListAsync();

            var capacity = await db.Classes
                .Where(item => item.ClassId == classId)
                .Select(item => item.Capacity)
                .FirstAsync();
            var enrolledCount = await db.ClassEnrollments
                .CountAsync(item => item.ClassId == classId && item.Status == "enrolled");
            var enrollment = await db.ClassEnrollments
                .FirstOrDefaultAsync(item => item.ClassId == classId && item.UserId == payment.UserId);

            var alreadyEnrolled = enrollment?.Status == "enrolled";
            hasSeat = alreadyEnrolled || capacity is null || enrolledCount < capacity;
            if (hasSeat && !alreadyEnrolled)
            {
                if (enrollment is null)
                {
                    db.ClassEnrollments.Add(new ClassEnrollment
                    {
                        ClassId = classId,
                        UserId = payment.UserId,
                        EnrolledAt = now,
                        Status = "enrolled",
                    });
                }
                else
                {
                    // Bảng có UNIQUE(class_id, user_id): mở lại dòng cũ thay vì tạo dòng mới.
                    enrollment.Status = "enrolled";
                    enrollment.EnrolledAt = now;
                }
            }
        }

        payment.Status = "paid";
        payment.PaidAt = now;
        if (payment.Invoice is not null)
        {
            payment.Invoice.Status = "paid";
        }

        if (payment.ClassId is not null)
        {
            var memberName = await db.UserAccounts
                .AsNoTracking()
                .Where(user => user.UserId == payment.UserId)
                .Select(user => user.FullName)
                .FirstOrDefaultAsync() ?? "";
            db.Notifications.Add(new AccountNotification
            {
                UserId = payment.UserId,
                Title = hasSeat ? "Cảm ơn bạn đã đăng ký lớp" : "Lớp đã đầy, AnhDuy Sport sẽ hoàn tiền",
                Content = hasSeat
                    ? $"Cảm ơn {memberName}. AnhDuy Sport đã nhận học phí lớp {className}. Tôi, {memberName}, cam kết tham gia đúng lịch lớp {className}, đóng học phí đã thống nhất và tuân thủ nội quy trung tâm AnhDuy Sport."
                    : $"Xin lỗi {memberName}. AnhDuy Sport đã nhận học phí nhưng lớp {className} đã đầy. Chúng tôi sẽ liên hệ để hoàn tiền cho bạn.",
                IsRead = false,
                CreatedAt = now,
            });
        }

        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = actorUserId ?? payment.UserId,
            Action = Shorten(hasSeat ? $"Thanh toán lớp {className}" : $"Lớp đầy, cần hoàn tiền: {className}", 100),
            EntityName = "payment",
            EntityId = payment.PaymentId,
            Detail = hasSeat
                ? $"Hóa đơn {payment.Invoice?.InvoiceCode}, học phí {payment.Amount:N0}"
                : $"Đã thu {payment.Amount:N0} (hóa đơn {payment.Invoice?.InvoiceCode}) nhưng lớp đầy, chưa ghi danh. Cần hoàn tiền.",
            CreatedAt = now,
        });
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return await BuildStatusAsync(payment);
    }

    // Nhánh NO của "Payment Success?": đơn đang chờ chuyển sang thất bại. Gọi lặp lại không ghi thêm gì.
    public async Task<RegistrationStatusDto> MarkPaymentFailedAsync(int paymentId, int? actorUserId = null)
    {
        var payment = await db.Payments
            .Include(item => item.Invoice)
            .Include(item => item.Class)
            .FirstOrDefaultAsync(item => item.PaymentId == paymentId)
            ?? throw new KeyNotFoundException("Không tìm thấy đơn thanh toán.");

        if (payment.Status is "paid" or "refunded")
        {
            throw new RegistrationException("Đơn thanh toán đã hoàn tất, không thể đánh dấu thất bại.");
        }

        if (payment.Status == "pending")
        {
            payment.Status = "failed";
            if (payment.Invoice is not null)
            {
                payment.Invoice.Status = "cancelled";
            }

            db.ActivityLogs.Add(new ActivityLog
            {
                ActorUserId = actorUserId ?? payment.UserId,
                Action = Shorten($"Thanh toán thất bại: {payment.Class?.ClassName}", 100),
                EntityName = "payment",
                EntityId = payment.PaymentId,
                Detail = $"Hóa đơn {payment.Invoice?.InvoiceCode} bị hủy.",
                CreatedAt = DateTime.Now,
            });
            await db.SaveChangesAsync();
        }

        return await BuildStatusAsync(payment);
    }

    private async Task<UserAccount> FindActiveMemberAsync(int id)
    {
        var member = await db.UserAccounts
            .Include(user => user.Role)
            .FirstOrDefaultAsync(user => user.UserId == id);
        if (member is null || member.Role?.RoleCode != "MEMBER")
        {
            throw new KeyNotFoundException("Không tìm thấy học viên.");
        }

        if (member.Status != "active")
        {
            throw new RegistrationException("Tài khoản học viên không hoạt động.");
        }

        return member;
    }

    // Chỉ lấy đơn pending còn hạn giữ chỗ: đơn quá hạn không được trả lại cho học viên.
    private Task<Payment?> FindPendingPaymentAsync(int userId, int classId) =>
        LiveHolds()
            .Include(payment => payment.Invoice)
            .FirstOrDefaultAsync(payment => payment.UserId == userId && payment.ClassId == classId);

    private async Task<Payment> CreatePendingPaymentAsync(int userId, int classId, string className, decimal tuition)
    {
        // Số lấy từ SEQUENCE nên hai đơn tạo cùng lúc không bao giờ trùng mã.
        // ToListAsync (không SingleAsync) để EF không bọc câu lệnh thành truy vấn con.
        var number = (await db.Database
            .SqlQuery<int>($"SELECT NEXT VALUE FOR dbo.invoice_code_seq AS [Value]")
            .ToListAsync()).Single();
        var now = DateTime.Now;

        await using var transaction = await db.Database.BeginTransactionAsync();

        // Khóa dòng lớp để hai đăng ký cùng lúc cho chỗ cuối không cùng qua (cùng cách với MarkPaymentPaidAsync).
        await db.Database
            .SqlQuery<int>($"SELECT class_id AS [Value] FROM class WITH (UPDLOCK, HOLDLOCK) WHERE class_id = {classId}")
            .ToListAsync();
        var capacity = await db.Classes.Where(item => item.ClassId == classId).Select(item => item.Capacity).FirstAsync();
        var enrolled = await db.ClassEnrollments.CountAsync(item => item.ClassId == classId && item.Status == "enrolled");
        var heldByOthers = await LiveHolds().CountAsync(hold => hold.ClassId == classId && hold.UserId != userId);
        if (AvailableSeats(capacity, enrolled + heldByOthers) == 0)
        {
            throw new RegistrationException("Lớp đã hết chỗ (đang có người giữ chỗ chờ thanh toán). Vui lòng thử lại sau ít phút.");
        }

        // Đơn pending cũ của chính học viên đã quá hạn giữ chỗ: hủy để chỉ mục UX_payment_pending_per_class cho tạo đơn mới.
        var holdSince = HoldSince();
        var expired = await db.Payments
            .Include(payment => payment.Invoice)
            .Where(payment => payment.UserId == userId && payment.ClassId == classId && payment.Status == "pending"
                && payment.Invoice!.IssuedAt <= holdSince)
            .ToListAsync();
        foreach (var old in expired)
        {
            old.Status = "failed";
            old.Invoice!.Status = "cancelled";
        }

        await db.SaveChangesAsync();

        var invoice = new Invoice
        {
            UserId = userId,
            InvoiceCode = $"INV-{now.Year}-{number:D4}",
            IssuedAt = now,
            TotalAmount = tuition,
            Status = "issued",
        };
        var payment = new Payment
        {
            Invoice = invoice,
            UserId = userId,
            ClassId = classId,
            Amount = tuition,
            PaymentMethod = "payos",
            Status = "pending",
        };
        db.Payments.Add(payment);
        await db.SaveChangesAsync();

        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = userId,
            Action = Shorten($"Đăng ký lớp {className}", 100),
            EntityName = "payment",
            EntityId = payment.PaymentId,
            Detail = $"Hóa đơn {invoice.InvoiceCode}, học phí {tuition:N0}",
            CreatedAt = now,
        });
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return payment;
    }

    private static ClassRegistrationDto ToRegistrationDto(Payment payment, string className, bool isExisting) =>
        new(
            payment.PaymentId.ToString(),
            payment.Invoice!.InvoiceCode,
            payment.ClassId.ToString()!,
            className,
            payment.Amount,
            payment.Status,
            "",
            isExisting);

    // Người gọi phải Include(Invoice), nếu không InvoiceCode và InvoiceStatus sẽ rỗng.
    private static RegistrationStatusDto ToRegistrationStatusDto(Payment payment, string className, string? enrollmentStatus, string message) =>
        new RegistrationStatusDto(
            payment.PaymentId.ToString(),
            payment.Invoice?.InvoiceCode ?? "",
            payment.ClassId?.ToString() ?? "",
            className,
            payment.Amount,
            payment.Status,
            payment.Invoice?.Status ?? "",
            enrollmentStatus,
            message);

    // Đơn có thể không gắn lớp (thanh toán gói hội viên): khi đó không có tên lớp và trạng thái ghi danh.
    private async Task<RegistrationStatusDto> BuildStatusAsync(Payment payment)
    {
        var className = payment.Class?.ClassName ?? "";
        string? enrollmentStatus = null;
        if (payment.ClassId is int classId)
        {
            enrollmentStatus = await db.ClassEnrollments
                .AsNoTracking()
                .Where(item => item.ClassId == classId && item.UserId == payment.UserId)
                .Select(item => item.Status)
                .FirstOrDefaultAsync();
        }

        return ToRegistrationStatusDto(payment, className, enrollmentStatus, StatusMessage(payment.Status, enrollmentStatus, className));
    }

    private static string StatusMessage(string paymentStatus, string? enrollmentStatus, string className) =>
        paymentStatus switch
        {
            "paid" when enrollmentStatus is "enrolled" or "completed" =>
                $"Cảm ơn bạn đã thanh toán. Bạn đã được ghi danh vào lớp {className}.",
            "paid" =>
                $"AnhDuy Sport đã nhận thanh toán nhưng lớp {className} đã đầy. Chúng tôi sẽ liên hệ để hoàn tiền cho bạn.",
            "failed" => "Thanh toán không thành công.",
            _ => "",
        };

    private static string Shorten(string value, int max) => value.Length > max ? value[..max] : value;

    // Đơn pending giữ chỗ HoldMinutes phút kể từ lúc phát hành hóa đơn. Khi nối payOS, link phải hết hạn sớm hơn 1-2 phút
    // (expiredAt = IssuedAt + HoldMinutes - 2) để QR đã hết hạn thì chỗ mới được nhả.
    private const int HoldMinutes = 10;
    private const int MaxHoldsPerMember = 3;

    private static DateTime HoldSince() => DateTime.Now.AddMinutes(-HoldMinutes);

    private IQueryable<Payment> LiveHolds()
    {
        var since = HoldSince();
        return db.Payments
            .AsNoTracking()
            .Where(payment => payment.ClassId != null && payment.Status == "pending" && payment.Invoice!.IssuedAt > since);
    }

    private static int? AvailableSeats(int? capacity, int enrolledCount) =>
        capacity is int total ? Math.Max(total - enrolledCount, 0) : null;

    // Cùng luật với IsOpenForRegistration (chưa tính chỗ trống): đổi một nơi thì đổi cả nơi kia.
    private IQueryable<TrainingClass> OpenClasses(DateOnly today) =>
        db.Classes
            .AsNoTracking()
            .Where(item => item.Status == "open" || item.Status == "ongoing")
            .Where(item => item.EndDate == null || item.EndDate >= today)
            .Where(item => item.Course!.Status == "active");

    private static bool IsOpenForRegistration(
        string classStatus,
        DateOnly? endDate,
        string courseStatus,
        int? availableSeats,
        DateOnly today) =>
        (classStatus is "open" or "ongoing")
        && (endDate is null || endDate >= today)
        && courseStatus == "active"
        && (availableSeats is null || availableSeats > 0);
}

