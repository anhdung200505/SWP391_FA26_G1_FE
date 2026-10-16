using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

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
        var sports = await db.Classes
            .AsNoTracking()
            .Where(item => item.Room != null && item.Room.CenterId == id)
            .Where(item => item.Status == "open" || item.Status == "ongoing")
            .Where(item => item.EndDate == null || item.EndDate >= today)
            .Where(item => item.Course!.Status == "active")
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
            throw new InvalidOperationException("Cần chọn trung tâm.");
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
        var classes = await db.Classes
            .AsNoTracking()
            .Where(item => item.Room != null && item.Room.CenterId == centerKey)
            .Where(item => item.Status == "open" || item.Status == "ongoing")
            .Where(item => item.EndDate == null || item.EndDate >= today)
            .Where(item => item.Course!.Status == "active")
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
                item.Capacity is int capacity ? Math.Max(capacity - item.EnrolledCount, 0) : null,
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
                Slots = current.Slots
                    .OrderBy(slot => slot.SlotDate)
                    .ThenBy(slot => slot.StartTime)
                    .Select(slot => new { slot.SlotId, slot.SlotDate, slot.StartTime, slot.EndTime, slot.Title })
                    .ToList(),
            })
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Không tìm thấy lớp học.");

        var today = DateOnly.FromDateTime(DateTime.Now);
        int? availableSeats = item.Capacity is int capacity ? Math.Max(capacity - item.EnrolledCount, 0) : null;
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

    public async Task<ClassRegistrationDto> SubmitRegistrationAsync(CreateClassRegistrationRequest request)
    {
        var member = await FindActiveMemberAsync(request.MemberUserId);
        if (string.IsNullOrWhiteSpace(member.Phone))
        {
            throw new InvalidOperationException("Hồ sơ chưa có số điện thoại, cần bổ sung trước khi đăng ký.");
        }

        if (string.IsNullOrWhiteSpace(member.Email))
        {
            throw new InvalidOperationException("Hồ sơ chưa có email, cần bổ sung trước khi đăng ký.");
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

        var today = DateOnly.FromDateTime(DateTime.Now);
        int? availableSeats = item.Capacity is int capacity ? Math.Max(capacity - item.EnrolledCount, 0) : null;
        if (!IsOpenForRegistration(item.Status, item.EndDate, item.CourseStatus, availableSeats, today))
        {
            throw new InvalidOperationException("Lớp học không còn nhận đăng ký.");
        }

        if (await db.ClassEnrollments.AnyAsync(enrollment =>
                enrollment.ClassId == classId && enrollment.UserId == member.UserId && enrollment.Status == "enrolled"))
        {
            throw new InvalidOperationException("Bạn đã đăng ký lớp học này.");
        }

        var pending = await FindPendingPaymentAsync(member.UserId, classId);
        if (pending is not null)
        {
            return ToRegistrationDto(pending, item.ClassName, true);
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

    private Task<Payment?> FindPendingPaymentAsync(int userId, int classId) =>
        db.Payments
            .AsNoTracking()
            .Include(payment => payment.Invoice)
            .FirstOrDefaultAsync(payment =>
                payment.UserId == userId && payment.ClassId == classId && payment.Status == "pending");

    private async Task<Payment> CreatePendingPaymentAsync(int userId, int classId, string className, decimal tuition)
    {
        // Số lấy từ SEQUENCE nên hai đơn tạo cùng lúc không bao giờ trùng mã.
        // ToListAsync (không SingleAsync) để EF không bọc câu lệnh thành truy vấn con.
        var number = (await db.Database
            .SqlQuery<int>($"SELECT NEXT VALUE FOR dbo.invoice_code_seq AS [Value]")
            .ToListAsync()).Single();
        var now = DateTime.Now;

        await using var transaction = await db.Database.BeginTransactionAsync();
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

        var action = $"Đăng ký lớp {className}";
        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = userId,
            Action = action.Length > 100 ? action[..100] : action,
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
