using System.Linq.Expressions;
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

        return await ToDtosAsync(query
            .OrderBy(item => item.StartDate == null)
            .ThenBy(item => item.StartDate)
            .ThenBy(item => item.ClassName));
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

    // sportId: chỉ phòng dùng được cho lớp nhóm của môn đó (sport_room).
    public async Task<IReadOnlyList<RoomOptionDto>> AccessRoomsAsync(string? centerId, string? sportId)
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

        if (!string.IsNullOrWhiteSpace(sportId))
        {
            if (!int.TryParse(sportId, out var sportKey))
            {
                throw new KeyNotFoundException("Không tìm thấy môn thể thao.");
            }

            query = query.Where(room => db.SportRooms.Any(link => link.RoomId == room.RoomId && link.SportId == sportKey && link.AllowGroup));
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

    public async Task<IReadOnlyList<ManagementCoachDto>> AccessCoachesAsync(string? sportId)
    {
        var query = db.UserAccounts.AsNoTracking().Where(user => user.Status == "active" && user.Role!.RoleCode == "COACH");
        if (!string.IsNullOrWhiteSpace(sportId))
        {
            if (!int.TryParse(sportId, out var sportKey))
            {
                throw new KeyNotFoundException("Không tìm thấy môn thể thao.");
            }

            query = query.Where(user => db.CoachSports.Any(link => link.CoachUserId == user.UserId && link.SportId == sportKey));
        }

        var coaches = await query
            .OrderBy(user => user.FullName)
            .Select(user => new
            {
                user.UserId,
                user.FullName,
                user.Phone,
                Sports = db.CoachSports
                    .Where(link => link.CoachUserId == user.UserId)
                    .Join(db.Sports, link => link.SportId, sport => sport.SportId, (link, sport) => sport.SportName)
                    .ToList(),
            })
            .ToListAsync();

        return coaches
            .Select(coach => new ManagementCoachDto(
                coach.UserId.ToString(),
                coach.FullName,
                coach.Phone ?? "",
                coach.Sports.OrderBy(name => name).ToList()))
            .ToList();
    }

    // Sinh thử các buổi theo lịch tuần rồi đối chiếu với buổi đã có để biết HLV, phòng nào bị trùng.
    public async Task<ClassAvailabilityDto> CheckAvailabilityAsync(ClassAvailabilityRequest request)
    {
        var course = int.TryParse(request.CourseId, out var courseId)
            ? await db.Courses.AsNoTracking().FirstOrDefaultAsync(item => item.CourseId == courseId)
            : null;
        if (course is null)
        {
            throw new RegistrationException("Khóa học không hợp lệ.");
        }

        if (request.StartDate is not { } start || request.EndDate is not { } end || end < start)
        {
            throw new RegistrationException("Chọn ngày bắt đầu và ngày kết thúc hợp lệ.");
        }

        var schedule = await ResolveScheduleAsync(request.Schedules);
        var planned = ClassSessionPlanner.Plan(0, start, end, schedule, 0, 0, DateTime.Now);
        var excludeId = int.TryParse(request.ExcludeClassId, out var parsed) ? parsed : 0;

        var existing = planned.Count == 0
            ? []
            : await db.ClassSessions.AsNoTracking()
                .Where(session => session.Status != "cancelled"
                    && session.ClassId != excludeId
                    && session.SessionDate >= start
                    && session.SessionDate <= end)
                .Select(session => new BookedSession(
                    session.SessionDate,
                    session.StartTime,
                    session.EndTime,
                    session.CoachUserId,
                    session.RoomId,
                    session.Class!.ClassName))
                .ToListAsync();

        string? Conflict(Func<BookedSession, bool> owner)
        {
            foreach (var slot in planned)
            {
                var hit = existing.FirstOrDefault(other => owner(other)
                    && other.Date == slot.SessionDate
                    && other.StartTime < slot.EndTime
                    && slot.StartTime < other.EndTime);
                if (hit is not null)
                {
                    return $"Trùng {hit.ClassName} ngày {hit.Date:dd/MM}";
                }
            }

            return null;
        }

        var coaches = await AccessCoachesAsync(course.SportId.ToString());
        var rooms = await AccessRoomsAsync(null, course.SportId.ToString());

        return new ClassAvailabilityDto(
            planned.Count,
            planned.Count == 0 ? null : planned.Min(slot => slot.SessionDate),
            planned.Count == 0 ? null : planned.Max(slot => slot.SessionDate),
            coaches
                .Select(coach =>
                {
                    var id = int.Parse(coach.Id);
                    var reason = Conflict(other => other.CoachUserId == id);
                    return new SessionOptionDto(coach.Id, coach.FullName, null, false, reason is not null, reason);
                })
                .ToList(),
            rooms
                .Select(room =>
                {
                    var id = int.Parse(room.Id);
                    var reason = request.Capacity is int needed && room.Capacity < needed
                        ? $"Chỉ chứa {room.Capacity} người"
                        : Conflict(other => other.RoomId == id);
                    return new SessionOptionDto(room.Id, room.Name, room.Capacity, false, reason is not null, reason);
                })
                .ToList());
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

        var fields = await ValidateFieldsAsync(
            request.ClassName, request.StartDate, request.EndDate, request.Capacity, request.CoachUserId, request.RoomId, course.SportId);
        var schedule = await ResolveScheduleAsync(request.Schedules ?? []);
        EnsureScheduleFitsDates(schedule, request.StartDate, request.EndDate);

        if (request.StartDate is { } start && start <= today)
        {
            throw new RegistrationException("Ngày bắt đầu phải sau hôm nay.");
        }

        var trainingPlanId = await db.TrainingPlans
            .Where(plan => plan.SportId == course.SportId)
            .Select(plan => (int?)plan.TrainingPlanId)
            .FirstOrDefaultAsync()
            ?? throw new RegistrationException("Môn này chưa có giáo án chuẩn.");

        var now = DateTime.Now;
        await using var transaction = await db.Database.BeginTransactionAsync();
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
            ClassType = "group",
        };
        db.Classes.Add(item);
        await db.SaveChangesAsync();

        var sessionCount = AddScheduleAndSessions(item, schedule, now);
        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = actor.UserId == 0 ? null : actor.UserId,
            Action = Shorten($"Thêm lớp {item.ClassName}", 100),
            EntityName = "class",
            EntityId = item.ClassId,
            Detail = $"Quản trị tạo lớp {item.ClassName} (khóa học {course.CourseName}), {sessionCount} buổi học.",
            CreatedAt = now,
        });
        await SaveSessionsAsync();
        await transaction.CommitAsync();

        return await LoadDtoAsync(item.ClassId);
    }

    public async Task<AdminClassDto> UpdateClassAsync(string classId, UpdateClassRequest request)
    {
        if (!int.TryParse(classId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy lớp học.");
        }

        var item = await db.Classes
            .Include(current => current.Course)
            .FirstOrDefaultAsync(current => current.ClassId == id)
            ?? throw new KeyNotFoundException("Không tìm thấy lớp học.");
        var currentSchedule = await db.ClassSchedules.AsNoTracking()
            .Include(schedule => schedule.TimeSlot)
            .Where(schedule => schedule.ClassId == id)
            .ToListAsync();

        var today = DateOnly.FromDateTime(DateTime.Now);
        var enrolledCount = await db.ClassEnrollments.CountAsync(enrollment => enrollment.ClassId == id && enrollment.Status == "enrolled");
        if (!IsEditable(item.Status, enrolledCount, item.StartDate, today))
        {
            throw new RegistrationException("Chỉ sửa được lớp đang open, chưa có học viên ghi danh và chưa tới ngày bắt đầu.");
        }

        var fields = await ValidateFieldsAsync(
            request.ClassName, request.StartDate, request.EndDate, request.Capacity, request.CoachUserId, request.RoomId, item.Course!.SportId);
        var schedule = request.Schedules is null
            ? currentSchedule.Select(current => (current.Weekday, current.TimeSlot!)).ToList()
            : await ResolveScheduleAsync(request.Schedules);
        EnsureScheduleFitsDates(schedule, request.StartDate, request.EndDate);
        await EnsureSessionsUnusedAsync(id, "Buổi học của lớp đã có bài tập hoặc điểm danh nên không thể sửa lớp.");

        var changed = new List<string>();
        if (item.ClassName != fields.ClassName) changed.Add("tên lớp");
        if (item.StartDate != request.StartDate) changed.Add("ngày bắt đầu");
        if (item.EndDate != request.EndDate) changed.Add("ngày kết thúc");
        if (item.Capacity != request.Capacity) changed.Add("sĩ số");
        if (item.CoachUserId != fields.CoachId) changed.Add("huấn luyện viên");
        if (item.RoomId != fields.RoomId) changed.Add("phòng");
        if (request.Schedules is not null && !SameSchedule(currentSchedule, schedule)) changed.Add("lịch học");

        var now = DateTime.Now;
        await using var transaction = await db.Database.BeginTransactionAsync();
        item.ClassName = fields.ClassName;
        item.StartDate = request.StartDate;
        item.EndDate = request.EndDate;
        item.Capacity = request.Capacity;
        item.CoachUserId = fields.CoachId;
        item.RoomId = fields.RoomId;

        await db.ClassAssignments
            .Where(assignment => db.ClassSessions.Any(session => session.SessionId == assignment.SessionId && session.ClassId == id))
            .ExecuteDeleteAsync();
        await db.ClassSessions.Where(session => session.ClassId == id).ExecuteDeleteAsync();
        await db.ClassSchedules.Where(current => current.ClassId == id).ExecuteDeleteAsync();
        var sessionCount = AddScheduleAndSessions(item, schedule, now);

        if (changed.Count > 0)
        {
            db.ActivityLogs.Add(new ActivityLog
            {
                ActorUserId = actor.UserId == 0 ? null : actor.UserId,
                Action = Shorten($"Sửa lớp {fields.ClassName}", 100),
                EntityName = "class",
                EntityId = id,
                Detail = $"Quản trị cập nhật: {string.Join(", ", changed)}. Lớp có {sessionCount} buổi học.",
                CreatedAt = now,
            });
        }

        await SaveSessionsAsync();
        await transaction.CommitAsync();

        return await LoadDtoAsync(id);
    }

    public async Task DeleteClassAsync(string classId)
    {
        if (!int.TryParse(classId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy lớp học.");
        }

        var item = await db.Classes.FirstOrDefaultAsync(current => current.ClassId == id)
            ?? throw new KeyNotFoundException("Không tìm thấy lớp học.");

        if (!await db.Classes.Where(current => current.ClassId == id).AnyAsync(NoRegistration))
        {
            throw new RegistrationException("Lớp đã có học viên đăng ký (thanh toán, ghi danh hoặc lịch sử) nên không thể xóa.");
        }

        await EnsureSessionsUnusedAsync(id, "Buổi học của lớp đã có điểm danh hoặc đánh giá nên không thể xóa lớp.");

        await using var transaction = await db.Database.BeginTransactionAsync();
        await db.ClassAssignments
            .Where(assignment => db.ClassSessions.Any(session => session.SessionId == assignment.SessionId && session.ClassId == id))
            .ExecuteDeleteAsync();
        await db.ClassSessions.Where(session => session.ClassId == id).ExecuteDeleteAsync();
        await db.ClassSchedules.Where(schedule => schedule.ClassId == id).ExecuteDeleteAsync();
        db.Classes.Remove(item);
        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = actor.UserId == 0 ? null : actor.UserId,
            Action = Shorten($"Xóa lớp {item.ClassName}", 100),
            EntityName = "class",
            EntityId = id,
            Detail = $"Quản trị xóa lớp {item.ClassName} (chưa có học viên đăng ký).",
            CreatedAt = DateTime.Now,
        });
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
    }

    // Kiểm tra các trường dùng chung cho thêm và sửa lớp; trả tên đã trim và id HLV, phòng đã parse.
    // HLV phải dạy môn của lớp (coach_sport), phòng phải dùng được cho lớp nhóm của môn (sport_room) và đủ sức chứa.
    private async Task<(string ClassName, int CoachId, int RoomId)> ValidateFieldsAsync(
        string? classNameValue, DateOnly? startDate, DateOnly? endDate, int? capacity, string? coachUserId, string? roomIdValue, int sportId)
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

        if (!await db.CoachSports.AnyAsync(link => link.CoachUserId == coachId && link.SportId == sportId))
        {
            throw new RegistrationException("Huấn luyện viên không dạy môn này.");
        }

        var room = int.TryParse(roomIdValue, out var roomId)
            ? await db.Rooms.AsNoTracking().FirstOrDefaultAsync(item => item.RoomId == roomId)
            : null;
        if (room is null)
        {
            throw new RegistrationException("Phòng không hợp lệ.");
        }

        if (!await db.SportRooms.AnyAsync(link => link.RoomId == roomId && link.SportId == sportId && link.AllowGroup))
        {
            throw new RegistrationException("Phòng không dùng được cho lớp nhóm của môn này.");
        }

        if (capacity > room.Capacity)
        {
            throw new RegistrationException($"Sĩ số lớp vượt sức chứa của phòng ({room.Capacity} người).");
        }

        return (className, coachId, roomId);
    }

    // Lịch tuần của lớp nhóm: khung giờ group, không trùng nhau trong cùng một thứ.
    private async Task<List<(byte Weekday, TimeSlot Slot)>> ResolveScheduleAsync(IReadOnlyCollection<ClassScheduleRequest> requests)
    {
        var ids = requests.Select(request => int.TryParse(request.TimeSlotId, out var id) ? id : 0).Distinct().ToList();
        var slots = await db.TimeSlots.AsNoTracking()
            .Where(slot => ids.Contains(slot.TimeSlotId) && slot.IsActive)
            .ToDictionaryAsync(slot => slot.TimeSlotId);

        var schedule = new List<(byte Weekday, TimeSlot Slot)>();
        foreach (var request in requests)
        {
            if (request.Weekday is < 2 or > 7)
            {
                throw new RegistrationException("Thứ trong tuần chỉ nhận 2 đến 7 (thứ 2 đến thứ 7).");
            }

            if (!int.TryParse(request.TimeSlotId, out var slotId) || !slots.TryGetValue(slotId, out var slot))
            {
                throw new RegistrationException("Khung giờ không hợp lệ.");
            }

            if (slot.Kind != "group")
            {
                throw new RegistrationException("Lớp nhóm chỉ dùng khung giờ group.");
            }

            var weekday = (byte)request.Weekday;
            if (schedule.Any(item => item.Weekday == weekday && item.Slot.StartTime < slot.EndTime && slot.StartTime < item.Slot.EndTime))
            {
                throw new RegistrationException($"Lịch học {ClassSessionPlanner.WeekdayName(weekday)} bị trùng khung giờ.");
            }

            schedule.Add((weekday, slot));
        }

        return schedule;
    }

    // Lớp phải có lịch tuần, và mỗi dòng lịch phải rơi vào ít nhất một ngày trong [startDate, endDate], nếu không lớp có lịch mà không có buổi nào.
    // Lịch rỗng chỉ xảy ra khi PUT không gửi schedules trên lớp cũ chưa có lịch (POST và PUT đã chặn danh sách rỗng ở contract).
    private static void EnsureScheduleFitsDates(IReadOnlyCollection<(byte Weekday, TimeSlot Slot)> schedule, DateOnly? startDate, DateOnly? endDate)
    {
        if (schedule.Count == 0)
        {
            throw new RegistrationException("Lớp chưa có lịch học tuần, cần gửi schedules.");
        }

        // Phòng thủ: startDate, endDate đã [Required] ở contract nên nhánh này không tới được qua API.
        if (startDate is not { } start || endDate is not { } end)
        {
            throw new RegistrationException("Cần ngày bắt đầu và ngày kết thúc để xếp lịch học.");
        }

        foreach (var (weekday, _) in schedule)
        {
            var hasSession = Enumerable.Range(0, 7)
                .Select(offset => start.AddDays(offset))
                .Any(date => date <= end && ClassSessionPlanner.WeekdayOf(date) == weekday);
            if (!hasSession)
            {
                throw new RegistrationException($"Khoảng ngày không có buổi nào vào {ClassSessionPlanner.WeekdayName(weekday)}.");
            }
        }
    }

    private static bool SameSchedule(IEnumerable<ClassSchedule> current, IEnumerable<(byte Weekday, TimeSlot Slot)> next) =>
        current.Select(item => (item.Weekday, item.TimeSlotId)).OrderBy(item => item).SequenceEqual(
            next.Select(item => (item.Weekday, item.Slot.TimeSlotId)).OrderBy(item => item));

    private async Task EnsureSessionsUnusedAsync(int classId, string message)
    {
        var sessionIds = db.ClassSessions.Where(session => session.ClassId == classId).Select(session => session.SessionId);
        var inUse = await db.ClassAttendances.AnyAsync(attendance => sessionIds.Contains(attendance.SessionId))
            || await db.CoachEvaluations.AnyAsync(evaluation => evaluation.AssignmentId != null
                && db.ClassAssignments.Any(assignment => assignment.AssignmentId == evaluation.AssignmentId && sessionIds.Contains(assignment.SessionId)));
        if (inUse)
        {
            throw new RegistrationException(message);
        }
    }

    // Thêm lịch tuần và toàn bộ buổi học trong [StartDate, EndDate]; trả số buổi đã sinh.
    private int AddScheduleAndSessions(TrainingClass item, IReadOnlyCollection<(byte Weekday, TimeSlot Slot)> schedule, DateTime now)
    {
        foreach (var (weekday, slot) in schedule)
        {
            db.ClassSchedules.Add(new ClassSchedule { ClassId = item.ClassId, Weekday = weekday, TimeSlotId = slot.TimeSlotId });
        }

        if (schedule.Count == 0 || item.StartDate is not { } start || item.EndDate is not { } end || item.RoomId is not int roomId)
        {
            return 0;
        }

        var sessions = ClassSessionPlanner.Plan(item.ClassId, start, end, schedule, item.CoachUserId, roomId, now);
        db.ClassSessions.AddRange(sessions);
        return sessions.Count;
    }

    // Trigger TR_session_rules chặn trùng lịch HLV hoặc phòng: đổi thành lỗi nghiệp vụ.
    private async Task SaveSessionsAsync()
    {
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException exception) when (ClassSessionPlanner.IsRuleViolation(exception, out var message))
        {
            throw new RegistrationException(message);
        }
    }

    private sealed record BookedSession(DateOnly Date, TimeOnly StartTime, TimeOnly EndTime, int CoachUserId, int RoomId, string ClassName);

    // Xóa được khi chưa ai đăng ký: không có thanh toán (kể cả đơn giữ chỗ), ghi danh, lịch sử đăng ký, đánh giá hay lịch sử tập.
    private Expression<Func<TrainingClass, bool>> NoRegistration =>
        item => !item.Enrollments.Any()
            && !db.Payments.Any(payment => payment.ClassId == item.ClassId)
            && !db.ClassRegistrationLogs.Any(log => log.ClassId == item.ClassId)
            && !db.CoachEvaluations.Any(evaluation => evaluation.ClassId == item.ClassId)
            && !db.CoachTrainingHistories.Any(history => history.ClassId == item.ClassId);

    private static bool IsEditable(string status, int enrolledCount, DateOnly? startDate, DateOnly today) =>
        status == "open" && enrolledCount == 0 && (startDate is null || startDate > today);

    private static string Shorten(string value, int max) => value.Length <= max ? value : value[..max];

    private async Task<AdminClassDto> LoadDtoAsync(int classId) =>
        (await ToDtosAsync(db.Classes.AsNoTracking().Where(current => current.ClassId == classId))).First();

    private async Task<List<AdminClassDto>> ToDtosAsync(IQueryable<TrainingClass> query)
    {
        var rows = await query
            .Select(item => new
            {
                item.ClassId,
                item.ClassName,
                item.Status,
                item.StartDate,
                item.EndDate,
                item.Capacity,
                EnrolledCount = item.Enrollments.Count(enrollment => enrollment.Status == "enrolled"),
                SessionCount = item.Sessions.Count(session => session.Status != "cancelled"),
                item.Course!.SportId,
                item.Course.Sport!.SportName,
                item.Course.CourseName,
                item.Course.LevelName,
                item.Course.Price,
                item.CoachUserId,
                CoachName = item.Coach!.FullName,
                item.RoomId,
                RoomName = item.Room != null ? item.Room.RoomName : "",
                CenterId = item.Room != null ? (int?)item.Room.CenterId : null,
                CenterName = item.Room != null ? item.Room.Center!.CenterName : "",
            })
            .ToListAsync();

        var classIds = rows.Select(row => row.ClassId).ToList();
        var deletable = (await db.Classes.AsNoTracking()
                .Where(item => classIds.Contains(item.ClassId))
                .Where(NoRegistration)
                .Select(item => item.ClassId)
                .ToListAsync())
            .ToHashSet();
        var schedules = (await db.ClassSchedules.AsNoTracking()
                .Include(schedule => schedule.TimeSlot)
                .Where(schedule => classIds.Contains(schedule.ClassId))
                .ToListAsync())
            .GroupBy(schedule => schedule.ClassId)
            .ToDictionary(
                group => group.Key,
                group => group
                    .OrderBy(schedule => schedule.Weekday)
                    .ThenBy(schedule => schedule.TimeSlot!.StartTime)
                    .Select(ClassSessionPlanner.ToScheduleDto)
                    .ToList());

        var today = DateOnly.FromDateTime(DateTime.Now);
        return rows
            .Select(row => new AdminClassDto(
                row.ClassId.ToString(),
                row.ClassName,
                row.Status,
                IsEditable(row.Status, row.EnrolledCount, row.StartDate, today),
                deletable.Contains(row.ClassId),
                row.StartDate,
                row.EndDate,
                row.Capacity,
                row.EnrolledCount,
                row.SportId.ToString(),
                row.SportName,
                row.CourseName,
                row.LevelName ?? "",
                row.Price,
                row.CoachUserId.ToString(),
                row.CoachName,
                row.RoomId?.ToString() ?? "",
                row.RoomName,
                row.CenterId?.ToString() ?? "",
                row.CenterName,
                schedules.GetValueOrDefault(row.ClassId) ?? [],
                row.SessionCount))
            .ToList();
    }
}
