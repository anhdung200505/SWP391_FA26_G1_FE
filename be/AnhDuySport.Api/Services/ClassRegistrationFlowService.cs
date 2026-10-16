using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

public class ClassRegistrationFlowService(AppDbContext db, CurrentActor actor, AuthService auth)
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
        var isOpen = (item.Status is "open" or "ongoing")
            && (item.EndDate is null || item.EndDate >= today)
            && item.CourseStatus == "active"
            && (availableSeats is null || availableSeats > 0);

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

    public async Task<RegistrationPaymentResponse> PayAsync(PayRegistrationRequest request)
    {
        if (actor.UserId == 0)
        {
            throw new UnauthorizedAccessException("Hãy đăng nhập bằng tài khoản khách.");
        }

        var user = await db.UserAccounts.Include(account => account.Role)
            .FirstOrDefaultAsync(account => account.UserId == actor.UserId)
            ?? throw new UnauthorizedAccessException("Hãy đăng nhập bằng tài khoản khách.");
        if (user.Role?.RoleCode is not "MEMBER")
        {
            throw new UnauthorizedAccessException("Chỉ học viên thanh toán học phí tại đây.");
        }

        var fullName = request.FullName?.Trim() ?? "";
        var phone = request.Phone?.Trim() ?? "";
        if (fullName.Length is 0 or > 200)
        {
            throw new InvalidOperationException("Nhập họ tên khách hàng.");
        }

        if (phone.Length is 0 or > 20)
        {
            throw new InvalidOperationException("Nhập số điện thoại không quá 20 ký tự.");
        }

        if (!PaymentMethods.TryGetValue(request.PaymentMethod?.Trim() ?? "", out var methodLabel))
        {
            throw new InvalidOperationException("Chọn hình thức thanh toán.");
        }

        if (!int.TryParse(request.ClassId, out var classId))
        {
            throw new KeyNotFoundException("Không tìm thấy lớp học.");
        }

        var trainingClass = await db.Classes
            .Include(item => item.Course)
            .Include(item => item.Room)
            .Include(item => item.Coach)
            .Include(item => item.Enrollments)
            .Include(item => item.Slots)
            .FirstOrDefaultAsync(item => item.ClassId == classId)
            ?? throw new KeyNotFoundException("Không tìm thấy lớp học.");

        if (!string.IsNullOrWhiteSpace(request.SlotId))
        {
            if (!int.TryParse(request.SlotId, out var slotId) || trainingClass.Slots.All(slot => slot.SlotId != slotId))
            {
                throw new InvalidOperationException("Khung giờ không thuộc lớp đã chọn.");
            }
        }
        else if (!request.GroupStudy)
        {
            throw new InvalidOperationException("Hãy chọn giờ học và huấn luyện viên.");
        }

        var today = DateOnly.FromDateTime(DateTime.Now);
        var enrolledCount = trainingClass.Enrollments.Count(item => item.Status == "enrolled");
        var seatsLeft = trainingClass.Capacity is int capacity ? capacity - enrolledCount : int.MaxValue;
        var isOpen = trainingClass.Status is "open" or "ongoing"
            && (trainingClass.EndDate is null || trainingClass.EndDate >= today)
            && trainingClass.Course?.Status == "active"
            && seatsLeft > 0;
        if (!isOpen)
        {
            throw new InvalidOperationException("Thanh toán chưa thành công vì lớp không còn chỗ. Hãy chọn lớp khác.");
        }

        if (trainingClass.Enrollments.Any(item => item.UserId == user.UserId && item.Status == "enrolled"))
        {
            throw new InvalidOperationException("Bạn đã ghi danh lớp này.");
        }

        user.FullName = fullName;
        user.Phone = phone;
        if (trainingClass.Room is not null)
        {
            user.CenterId = trainingClass.Room.CenterId;
        }

        var now = DateTime.Now;
        await using var transaction = await db.Database.BeginTransactionAsync();
        var invoice = new Invoice
        {
            UserId = user.UserId,
            InvoiceCode = $"HD{now:yyyyMMddHHmmss}{user.UserId}",
            IssuedAt = now,
            TotalAmount = trainingClass.Course?.Price ?? 0,
            Status = "paid",
        };
        db.Invoices.Add(invoice);
        await db.SaveChangesAsync();

        var payment = new Payment
        {
            InvoiceId = invoice.InvoiceId,
            UserId = user.UserId,
            ClassId = trainingClass.ClassId,
            Amount = invoice.TotalAmount,
            PaymentMethod = methodLabel,
            PaidAt = now,
            Status = "paid",
        };
        db.Payments.Add(payment);
        db.ClassEnrollments.Add(new ClassEnrollment
        {
            ClassId = trainingClass.ClassId,
            UserId = user.UserId,
            EnrolledAt = now,
            Status = "enrolled",
        });

        var thankYou = $"Cảm ơn {user.FullName}. AnhDuy Sport đã nhận học phí lớp {trainingClass.ClassName}.";
        var commitment = $"Tôi, {user.FullName}, cam kết tham gia đúng lịch lớp {trainingClass.ClassName}, đóng học phí đã thống nhất và tuân thủ nội quy trung tâm AnhDuy Sport.";
        db.Notifications.Add(new AccountNotification
        {
            UserId = user.UserId,
            Title = "Cảm ơn bạn đã đăng ký lớp",
            Content = $"{thankYou} {commitment}",
            IsRead = false,
            CreatedAt = now,
        });
        await db.SaveChangesAsync();
        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = user.UserId,
            Action = Trim($"Thanh toán lớp {trainingClass.ClassName}", 100),
            EntityName = "payment",
            EntityId = payment.PaymentId,
            Detail = $"Học viên {user.FullName} thanh toán học phí lớp {trainingClass.ClassName}.",
            CreatedAt = now,
        });
        await db.SaveChangesAsync();
        await transaction.CommitAsync();

        var session = await auth.IssueAsync(user);
        return new RegistrationPaymentResponse(
            true,
            "Thanh toán thành công. Bạn có thể dùng các thao tác còn lại của học viên.",
            thankYou,
            commitment,
            invoice.InvoiceCode,
            session.Token,
            session.User);
    }

    private static readonly Dictionary<string, string> PaymentMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        ["cash"] = "Tiền mặt",
        ["transfer"] = "Chuyển khoản",
        ["card"] = "Thẻ",
    };

    private static string Trim(string value, int max) =>
        value.Length <= max ? value : value[..max];
}
