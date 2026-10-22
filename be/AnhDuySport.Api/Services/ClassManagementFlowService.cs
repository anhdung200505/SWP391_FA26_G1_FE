using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

public class ClassManagementFlowService(AppDbContext db, CurrentActor actor)
{
    private static readonly string[] ClassStatuses = ["open", "ongoing", "closed", "cancelled"];

    public async Task<IReadOnlyList<AdminClassDto>> AccessClassesAsync(string? status, string? centerId, string? sportId)
    {
        var query = db.Classes.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            var statusKey = status.Trim().ToLowerInvariant();
            if (!ClassStatuses.Contains(statusKey))
            {
                throw new RegistrationException("Trạng thái lớp phải là open, ongoing, closed hoặc cancelled.");
            }

            query = query.Where(item => item.Status == statusKey);
        }

        if (!string.IsNullOrWhiteSpace(centerId))
        {
            if (!int.TryParse(centerId, out var centerKey))
            {
                throw new KeyNotFoundException("Không tìm thấy trung tâm.");
            }

            query = query.Where(item => item.Room != null && item.Room.CenterId == centerKey);
        }

        if (!string.IsNullOrWhiteSpace(sportId))
        {
            if (!int.TryParse(sportId, out var sportKey))
            {
                throw new KeyNotFoundException("Không tìm thấy môn thể thao.");
            }

            query = query.Where(item => item.Course!.SportId == sportKey);
        }

        var rows = await ProjectRows(query
                .OrderBy(item => item.StartDate == null)
                .ThenBy(item => item.StartDate)
                .ThenBy(item => item.ClassName))
            .ToListAsync();

        var today = DateOnly.FromDateTime(DateTime.Now);
        return rows.Select(row => ToDto(row, today)).ToList();
    }

    public async Task<IReadOnlyList<CourseOptionDto>> AccessCoursesAsync(string? sportId)
    {
        var query = db.Courses.AsNoTracking().Where(course => course.Status == "active");

        if (!string.IsNullOrWhiteSpace(sportId))
        {
            if (!int.TryParse(sportId, out var sportKey))
            {
                throw new KeyNotFoundException("Không tìm thấy môn thể thao.");
            }

            query = query.Where(course => course.SportId == sportKey);
        }

        var rows = await query
            .OrderBy(course => course.Sport!.SportName)
            .ThenBy(course => course.CourseName)
            .Select(course => new
            {
                course.CourseId,
                course.CourseCode,
                course.CourseName,
                course.SportId,
                course.Sport!.SportName,
                course.LevelName,
                course.Price,
            })
            .ToListAsync();

        return rows
            .Select(row => new CourseOptionDto(
                row.CourseId.ToString(),
                row.CourseCode,
                row.CourseName,
                row.SportId.ToString(),
                row.SportName,
                row.LevelName ?? "",
                row.Price))
            .ToList();
    }

    public async Task<IReadOnlyList<RoomOptionDto>> AccessRoomsAsync(string? centerId)
    {
        var query = db.Rooms.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(centerId))
        {
            if (!int.TryParse(centerId, out var centerKey))
            {
                throw new KeyNotFoundException("Không tìm thấy trung tâm.");
            }

            query = query.Where(room => room.CenterId == centerKey);
        }

        var rows = await query
            .OrderBy(room => room.Center!.CenterName)
            .ThenBy(room => room.RoomName)
            .Select(room => new
            {
                room.RoomId,
                room.RoomCode,
                room.RoomName,
                room.RoomType,
                room.Capacity,
                room.CenterId,
                room.Center!.CenterName,
            })
            .ToListAsync();

        return rows
            .Select(row => new RoomOptionDto(
                row.RoomId.ToString(),
                row.RoomCode,
                row.RoomName,
                row.RoomType ?? "",
                row.Capacity,
                row.CenterId.ToString(),
                row.CenterName))
            .ToList();
    }

    public async Task<AdminClassDto> CreateClassAsync(CreateClassRequest request)
    {
        var today = DateOnly.FromDateTime(DateTime.Now);

        var course = int.TryParse(request.CourseId, out var courseId)
            ? await db.Courses.AsNoTracking().FirstOrDefaultAsync(item => item.CourseId == courseId && item.Status == "active")
            : null;
        if (course is null)
        {
            throw new RegistrationException("Khóa học không hợp lệ.");
        }

        var fields = await ValidateFieldsAsync(request.ClassName, request.StartDate, request.EndDate, request.Capacity, request.CoachUserId, request.RoomId);

        if (request.StartDate is { } start && start <= today)
        {
            throw new RegistrationException("Ngày bắt đầu phải sau hôm nay.");
        }

        var trainingPlanId = await db.TrainingPlans
            .Where(plan => plan.SportId == course.SportId)
            .Select(plan => (int?)plan.TrainingPlanId)
            .FirstOrDefaultAsync()
            ?? throw new RegistrationException("Môn này chưa có giáo án chuẩn.");

        var item = new TrainingClass
        {
            CourseId = course.CourseId,
            TrainingPlanId = trainingPlanId,
            CoachUserId = fields.CoachId,
            RoomId = fields.RoomId,
            ClassName = fields.ClassName,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Capacity = request.Capacity,
            Status = "open",
        };
        db.Classes.Add(item);
        await db.SaveChangesAsync();

        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = actor.UserId == 0 ? null : actor.UserId,
            Action = Shorten($"Thêm lớp {item.ClassName}", 100),
            EntityName = "class",
            EntityId = item.ClassId,
            Detail = $"Quản trị tạo lớp {item.ClassName} (khóa học {course.CourseName}).",
            CreatedAt = DateTime.Now,
        });
        await db.SaveChangesAsync();

        var row = await ProjectRows(db.Classes.AsNoTracking().Where(current => current.ClassId == item.ClassId)).FirstAsync();
        return ToDto(row, today);
    }

    public async Task<AdminClassDto> UpdateClassAsync(string classId, UpdateClassRequest request)
    {
        if (!int.TryParse(classId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy lớp học.");
        }

        var item = await db.Classes.FirstOrDefaultAsync(current => current.ClassId == id)
            ?? throw new KeyNotFoundException("Không tìm thấy lớp học.");

        var today = DateOnly.FromDateTime(DateTime.Now);
        var enrolledCount = await db.ClassEnrollments.CountAsync(enrollment => enrollment.ClassId == id && enrollment.Status == "enrolled");
        if (!IsEditable(item.Status, enrolledCount, item.StartDate, today))
        {
            throw new RegistrationException("Chỉ sửa được lớp đang open, chưa có học viên ghi danh và chưa tới ngày bắt đầu.");
        }

        var fields = await ValidateFieldsAsync(request.ClassName, request.StartDate, request.EndDate, request.Capacity, request.CoachUserId, request.RoomId);

        var outsideSlots = await db.ClassSlots.CountAsync(slot => slot.ClassId == id
            && ((request.StartDate != null && slot.SlotDate < request.StartDate)
                || (request.EndDate != null && slot.SlotDate > request.EndDate)));
        if (outsideSlots > 0)
        {
            throw new RegistrationException($"Còn {outsideSlots} slot nằm ngoài thời gian mới của lớp. Hãy điều chỉnh slot trước.");
        }

        var changed = new List<string>();
        if (item.ClassName != fields.ClassName) changed.Add("tên lớp");
        if (item.StartDate != request.StartDate) changed.Add("ngày bắt đầu");
        if (item.EndDate != request.EndDate) changed.Add("ngày kết thúc");
        if (item.Capacity != request.Capacity) changed.Add("sĩ số");
        if (item.CoachUserId != fields.CoachId) changed.Add("huấn luyện viên");
        if (item.RoomId != fields.RoomId) changed.Add("phòng");

        item.ClassName = fields.ClassName;
        item.StartDate = request.StartDate;
        item.EndDate = request.EndDate;
        item.Capacity = request.Capacity;
        item.CoachUserId = fields.CoachId;

        if (item.RoomId != fields.RoomId)
        {
            item.RoomId = fields.RoomId;
            var slots = await db.ClassSlots.Where(slot => slot.ClassId == id).ToListAsync();
            foreach (var slot in slots)
            {
                slot.RoomId = fields.RoomId;
            }
        }

        if (changed.Count > 0)
        {
            db.ActivityLogs.Add(new ActivityLog
            {
                ActorUserId = actor.UserId == 0 ? null : actor.UserId,
                Action = Shorten($"Sửa lớp {fields.ClassName}", 100),
                EntityName = "class",
                EntityId = id,
                Detail = $"Quản trị cập nhật: {string.Join(", ", changed)}.",
                CreatedAt = DateTime.Now,
            });
            await db.SaveChangesAsync();
        }

        var row = await ProjectRows(db.Classes.AsNoTracking().Where(current => current.ClassId == id)).FirstAsync();
        return ToDto(row, today);
    }

    public async Task DeleteClassAsync(string classId)
    {
        if (!int.TryParse(classId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy lớp học.");
        }

        var item = await db.Classes.FirstOrDefaultAsync(current => current.ClassId == id)
            ?? throw new KeyNotFoundException("Không tìm thấy lớp học.");

        var today = DateOnly.FromDateTime(DateTime.Now);
        var enrolledCount = await db.ClassEnrollments.CountAsync(enrollment => enrollment.ClassId == id && enrollment.Status == "enrolled");
        if (!IsEditable(item.Status, enrolledCount, item.StartDate, today))
        {
            throw new RegistrationException("Chỉ xóa được lớp đang open, chưa có học viên ghi danh và chưa tới ngày bắt đầu.");
        }

        var hasHistory = await db.Payments.AnyAsync(payment => payment.ClassId == id)
            || await db.ClassEnrollments.AnyAsync(enrollment => enrollment.ClassId == id)
            || await db.ClassRegistrationLogs.AnyAsync(log => log.ClassId == id)
            || await db.CoachEvaluations.AnyAsync(evaluation => evaluation.ClassId == id)
            || await db.CoachTrainingHistories.AnyAsync(history => history.ClassId == id);
        if (hasHistory)
        {
            throw new RegistrationException("Lớp đã có thanh toán, ghi danh hoặc lịch sử liên quan nên không thể xóa.");
        }

        var slotIds = await db.ClassSlots.Where(slot => slot.ClassId == id).Select(slot => slot.SlotId).ToListAsync();
        var slotInUse = await db.SlotRegistrations.AnyAsync(registration => slotIds.Contains(registration.SlotId))
            || await db.ClassAssignments.AnyAsync(assignment => slotIds.Contains(assignment.SlotId))
            || await db.ClassAttendances.AnyAsync(attendance => slotIds.Contains(attendance.SlotId));
        if (slotInUse)
        {
            throw new RegistrationException("Slot của lớp đã có đăng ký, bài tập hoặc điểm danh nên không thể xóa lớp.");
        }

        await using var transaction = await db.Database.BeginTransactionAsync();
        await db.ClassSlots.Where(slot => slot.ClassId == id).ExecuteDeleteAsync();
        db.Classes.Remove(item);
        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = actor.UserId == 0 ? null : actor.UserId,
            Action = Shorten($"Xóa lớp {item.ClassName}", 100),
            EntityName = "class",
            EntityId = id,
            Detail = $"Quản trị xóa lớp {item.ClassName} (chưa bắt đầu, chưa có học viên).",
            CreatedAt = DateTime.Now,
        });
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
    }

    // Kiểm tra các trường dùng chung cho thêm và sửa lớp; trả tên đã trim và id HLV, phòng đã parse.
    private async Task<(string ClassName, int CoachId, int RoomId)> ValidateFieldsAsync(
        string? classNameValue, DateOnly? startDate, DateOnly? endDate, int? capacity, string? coachUserId, string? roomIdValue)
    {
        var className = classNameValue?.Trim() ?? "";
        if (className.Length is 0 or > 200)
        {
            throw new RegistrationException("Tên lớp không được để trống và không quá 200 ký tự.");
        }

        if (capacity is <= 0)
        {
            throw new RegistrationException("Sĩ số phải lớn hơn 0.");
        }

        if (startDate is { } start && endDate is { } end && end < start)
        {
            throw new RegistrationException("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.");
        }

        if (!int.TryParse(coachUserId, out var coachId)
            || !await db.UserAccounts.AnyAsync(user => user.UserId == coachId && user.Status == "active" && user.Role!.RoleCode == "COACH"))
        {
            throw new RegistrationException("Huấn luyện viên không hợp lệ.");
        }

        if (!int.TryParse(roomIdValue, out var roomId) || !await db.Rooms.AnyAsync(room => room.RoomId == roomId))
        {
            throw new RegistrationException("Phòng không hợp lệ.");
        }

        return (className, coachId, roomId);
    }

    private static bool IsEditable(string status, int enrolledCount, DateOnly? startDate, DateOnly today) =>
        status == "open" && enrolledCount == 0 && (startDate is null || startDate > today);

    private static string Shorten(string value, int max) => value.Length <= max ? value : value[..max];

    private IQueryable<ClassRow> ProjectRows(IQueryable<TrainingClass> query) =>
        query.Select(item => new ClassRow(
            item.ClassId,
            item.ClassName,
            item.Status,
            item.StartDate,
            item.EndDate,
            item.Capacity,
            item.Enrollments.Count(enrollment => enrollment.Status == "enrolled"),
            item.Course!.SportId,
            item.Course.Sport!.SportName,
            item.Course.CourseName,
            item.Course.LevelName,
            item.Course.Price,
            item.CoachUserId,
            item.Coach!.FullName,
            item.RoomId,
            item.Room != null ? item.Room.RoomName : "",
            item.Room != null ? (int?)item.Room.CenterId : null,
            item.Room != null ? item.Room.Center!.CenterName : ""));

    private static AdminClassDto ToDto(ClassRow row, DateOnly today) =>
        new(
            row.ClassId.ToString(),
            row.Name,
            row.Status,
            IsEditable(row.Status, row.EnrolledCount, row.StartDate, today),
            row.StartDate,
            row.EndDate,
            row.Capacity,
            row.EnrolledCount,
            row.SportId.ToString(),
            row.SportName,
            row.CourseName,
            row.Level ?? "",
            row.Tuition,
            row.CoachId.ToString(),
            row.CoachName,
            row.RoomId?.ToString() ?? "",
            row.RoomName,
            row.CenterId?.ToString() ?? "",
            row.CenterName);

    private sealed record ClassRow(
        int ClassId,
        string Name,
        string Status,
        DateOnly? StartDate,
        DateOnly? EndDate,
        int? Capacity,
        int EnrolledCount,
        int SportId,
        string SportName,
        string CourseName,
        string? Level,
        decimal Tuition,
        int CoachId,
        string CoachName,
        int? RoomId,
        string RoomName,
        int? CenterId,
        string CenterName);
}
