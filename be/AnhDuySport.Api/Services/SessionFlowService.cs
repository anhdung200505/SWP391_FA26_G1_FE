using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Lịch buổi học (session), danh mục khung giờ (time_slot) và điều chỉnh từng buổi (đổi HLV, phòng, hủy buổi).
public class SessionFlowService(AppDbContext db, CurrentActor actor)
{
    private static readonly string[] SlotKinds = ["group", "private"];

    // Mặc định từ hôm nay trở đi; from/to lọc theo ngày học.
    public async Task<IReadOnlyList<SessionDto>> AccessSessionsAsync(string? classId, string? sportId, DateOnly? from, DateOnly? to)
    {
        var query = db.ClassSessions.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(classId))
        {
            if (!int.TryParse(classId, out var classKey) || !await db.Classes.AnyAsync(item => item.ClassId == classKey))
            {
                throw new KeyNotFoundException("Không tìm thấy lớp học.");
            }

            query = query.Where(session => session.ClassId == classKey);
        }

        if (!string.IsNullOrWhiteSpace(sportId))
        {
            if (!int.TryParse(sportId, out var sportKey) || !await db.Sports.AnyAsync(sport => sport.SportId == sportKey))
            {
                throw new KeyNotFoundException("Không tìm thấy môn thể thao.");
            }

            query = query.Where(session => session.Class!.Course!.SportId == sportKey);
        }

        return await ProjectAsync(FilterDates(query, from, to));
    }

    public async Task<SessionDto> SelectSessionAsync(string sessionId)
    {
        var id = ParseId(sessionId);
        var rows = await ProjectAsync(db.ClassSessions.AsNoTracking().Where(session => session.SessionId == id));
        return rows.FirstOrDefault() ?? throw new KeyNotFoundException("Không tìm thấy buổi học.");
    }

    // Lịch học của học viên: các buổi chưa hủy của những lớp đang ghi danh.
    public async Task<IReadOnlyList<SessionDto>> AccessMemberSessionsAsync(int memberUserId, DateOnly? from, DateOnly? to)
    {
        var classIds = db.ClassEnrollments
            .Where(enrollment => enrollment.UserId == memberUserId && enrollment.Status == "enrolled")
            .Select(enrollment => enrollment.ClassId);
        var query = db.ClassSessions.AsNoTracking()
            .Where(session => classIds.Contains(session.ClassId) && session.Status != "cancelled");
        return await ProjectAsync(FilterDates(query, from, to));
    }

    // Lịch dạy của HLV theo HLV của từng buổi (session.coach_user_id), không theo HLV của lớp, vì HLV có thể được đổi cho riêng một buổi.
    public async Task<IReadOnlyList<SessionDto>> AccessCoachSessionsAsync(int coachUserId, DateOnly? from, DateOnly? to)
    {
        var query = db.ClassSessions.AsNoTracking()
            .Where(session => session.CoachUserId == coachUserId && session.Status != "cancelled");
        return await ProjectAsync(FilterDates(query, from, to));
    }

    public async Task<IReadOnlyList<TimeSlotDto>> AccessTimeSlotsAsync(string? kind)
    {
        var query = db.TimeSlots.AsNoTracking().Where(slot => slot.IsActive);
        if (!string.IsNullOrWhiteSpace(kind))
        {
            var kindKey = kind.Trim().ToLowerInvariant();
            if (!SlotKinds.Contains(kindKey))
            {
                throw new RegistrationException("kind chỉ nhận group hoặc private.");
            }

            query = query.Where(slot => slot.Kind == kindKey);
        }

        var slots = await query.OrderBy(slot => slot.Kind).ThenBy(slot => slot.StartTime).ToListAsync();
        return slots
            .Select(slot => new TimeSlotDto(
                slot.TimeSlotId.ToString(),
                slot.Kind,
                slot.StartTime,
                slot.EndTime,
                slot.Label ?? $"{slot.StartTime:HH\\:mm}-{slot.EndTime:HH\\:mm}"))
            .ToList();
    }

    // HLV dạy môn của lớp và phòng thuộc môn đó; đánh dấu bận nếu trùng giờ với buổi khác hoặc phòng không đủ sức chứa.
    public async Task<SessionOptionsDto> AccessOptionsAsync(string sessionId)
    {
        var session = await LoadSessionAsync(ParseId(sessionId), tracking: false);
        var sportId = session.Class!.Course!.SportId;
        var overlapping = db.ClassSessions.AsNoTracking().Where(other =>
            other.SessionId != session.SessionId
            && other.Status != "cancelled"
            && other.SessionDate == session.SessionDate
            && other.StartTime < session.EndTime
            && session.StartTime < other.EndTime);

        var coaches = await db.UserAccounts.AsNoTracking()
            .Where(user => user.Status == "active"
                && user.Role!.RoleCode == "COACH"
                && db.CoachSports.Any(link => link.CoachUserId == user.UserId && link.SportId == sportId))
            .OrderBy(user => user.FullName)
            .Select(user => new
            {
                user.UserId,
                user.FullName,
                BusyWith = overlapping.Where(other => other.CoachUserId == user.UserId).Select(other => other.Class!.ClassName).FirstOrDefault(),
            })
            .ToListAsync();

        var rooms = await db.Rooms.AsNoTracking()
            .Where(room => db.SportRooms.Any(link => link.RoomId == room.RoomId
                && link.SportId == sportId
                && (session.Class.ClassType == "private" ? link.AllowPrivate : link.AllowGroup)))
            .OrderBy(room => room.RoomName)
            .Select(room => new
            {
                room.RoomId,
                room.RoomName,
                room.Capacity,
                BusyWith = overlapping.Where(other => other.RoomId == room.RoomId).Select(other => other.Class!.ClassName).FirstOrDefault(),
            })
            .ToListAsync();

        var classCapacity = session.Class.Capacity;
        return new SessionOptionsDto(
            coaches
                .Select(coach => new SessionOptionDto(
                    coach.UserId.ToString(),
                    coach.FullName,
                    null,
                    coach.UserId == session.CoachUserId,
                    coach.BusyWith is not null,
                    coach.BusyWith is null ? null : $"Đang dạy {coach.BusyWith}"))
                .ToList(),
            rooms
                .Select(room =>
                {
                    var tooSmall = classCapacity is int needed && room.Capacity < needed;
                    var reason = room.BusyWith is not null
                        ? $"Đang có lớp {room.BusyWith}"
                        : tooSmall ? $"Chỉ chứa {room.Capacity} người" : null;
                    return new SessionOptionDto(
                        room.RoomId.ToString(),
                        room.RoomName,
                        room.Capacity,
                        room.RoomId == session.RoomId,
                        reason is not null,
                        reason);
                })
                .ToList());
    }

    // Quản trị đổi HLV và/hoặc phòng của một buổi chưa diễn ra.
    public async Task<SessionDto> UpdateSessionAsync(string sessionId, UpdateSessionRequest request)
    {
        var session = await LoadSessionAsync(ParseId(sessionId), tracking: true);
        EnsureEditable(session);

        var changes = new List<string>();
        if (!string.IsNullOrWhiteSpace(request.CoachUserId))
        {
            var coach = await ResolveCoachAsync(request.CoachUserId, session.Class!.Course!.SportId);
            if (coach.UserId != session.CoachUserId)
            {
                changes.Add($"HLV {session.Coach!.FullName} → {coach.FullName}");
                session.CoachUserId = coach.UserId;
            }
        }

        if (!string.IsNullOrWhiteSpace(request.RoomId))
        {
            var room = await ResolveRoomAsync(request.RoomId, session.Class!);
            if (room.RoomId != session.RoomId)
            {
                changes.Add($"phòng {session.Room!.RoomName} → {room.RoomName}");
                session.RoomId = room.RoomId;
            }
        }

        if (request.Note is not null)
        {
            session.Note = NormalizeNote(request.Note);
        }

        if (changes.Count > 0)
        {
            await NotifyMembersAsync(session, $"Thay đổi buổi học lớp {session.Class!.ClassName}",
                $"{When(session)}: đổi {string.Join(", ", changes)}." + NoteSuffix(session.Note));
        }

        AddLog("Điều chỉnh buổi học", session, changes.Count > 0 ? string.Join("; ", changes) : "Cập nhật ghi chú");
        await SaveAsync();
        return await SelectSessionAsync(sessionId);
    }

    // Lễ tân (hoặc quản trị) đổi HLV khi HLV phụ trách bận; không đổi phòng.
    public async Task<SessionDto> ChangeCoachAsync(string sessionId, ChangeSessionCoachRequest request)
    {
        var session = await LoadSessionAsync(ParseId(sessionId), tracking: true);
        EnsureEditable(session);

        var coach = await ResolveCoachAsync(request.CoachUserId, session.Class!.Course!.SportId);
        if (coach.UserId == session.CoachUserId)
        {
            throw new RegistrationException("Huấn luyện viên mới trùng huấn luyện viên hiện tại.");
        }

        var change = $"HLV {session.Coach!.FullName} → {coach.FullName}";
        session.CoachUserId = coach.UserId;
        session.Note = NormalizeNote(request.Note) ?? session.Note;
        await NotifyMembersAsync(session, $"Đổi huấn luyện viên lớp {session.Class.ClassName}",
            $"{When(session)}: {change}." + NoteSuffix(session.Note));
        AddLog("Đổi HLV buổi học", session, change);
        await SaveAsync();
        return await SelectSessionAsync(sessionId);
    }

    public async Task<SessionDto> CancelSessionAsync(string sessionId, CancelSessionRequest request)
    {
        var session = await LoadSessionAsync(ParseId(sessionId), tracking: true);
        EnsureEditable(session);

        var reason = NormalizeNote(request.Reason) ?? throw new RegistrationException("Nhập lý do hủy buổi học.");
        if (await db.ClassAttendances.AnyAsync(row => row.SessionId == session.SessionId))
        {
            throw new RegistrationException("Buổi học đã có điểm danh, không thể hủy.");
        }

        session.Status = "cancelled";
        session.Note = reason;
        await NotifyMembersAsync(session, $"Hủy buổi học lớp {session.Class!.ClassName}", $"{When(session)} bị hủy. Lý do: {reason}.");
        AddLog("Hủy buổi học", session, reason);
        await SaveAsync();
        return await SelectSessionAsync(sessionId);
    }

    private async Task<ClassSession> LoadSessionAsync(int id, bool tracking)
    {
        var query = db.ClassSessions
            .Include(session => session.Class).ThenInclude(item => item!.Course)
            .Include(session => session.Coach)
            .Include(session => session.Room)
            .AsQueryable();
        if (!tracking)
        {
            query = query.AsNoTracking();
        }

        return await query.FirstOrDefaultAsync(session => session.SessionId == id)
            ?? throw new KeyNotFoundException("Không tìm thấy buổi học.");
    }

    private static void EnsureEditable(ClassSession session)
    {
        if (session.Status is "cancelled" or "completed")
        {
            throw new RegistrationException(session.Status == "cancelled" ? "Buổi học đã bị hủy." : "Buổi học đã kết thúc.");
        }

        if (session.SessionDate < DateOnly.FromDateTime(DateTime.Now))
        {
            throw new RegistrationException("Buổi học đã qua ngày, không thể thay đổi.");
        }

        var now = DateTime.Now;
        if (session.SessionDate == DateOnly.FromDateTime(now) && session.EndTime <= TimeOnly.FromDateTime(now))
        {
            throw new RegistrationException("Buổi học đã kết thúc, không thể thay đổi.");
        }
    }

    private async Task<UserAccount> ResolveCoachAsync(string coachUserId, int sportId)
    {
        var id = int.TryParse(coachUserId, out var parsed) ? parsed : 0;
        var coach = await db.UserAccounts.AsNoTracking()
            .FirstOrDefaultAsync(user => user.UserId == id && user.Status == "active" && user.Role!.RoleCode == "COACH")
            ?? throw new RegistrationException("Huấn luyện viên không hợp lệ.");
        if (!await db.CoachSports.AnyAsync(link => link.CoachUserId == id && link.SportId == sportId))
        {
            throw new RegistrationException("Huấn luyện viên không dạy môn này.");
        }

        return coach;
    }

    private async Task<Room> ResolveRoomAsync(string roomId, TrainingClass trainingClass)
    {
        var id = int.TryParse(roomId, out var parsed) ? parsed : 0;
        var room = await db.Rooms.AsNoTracking().FirstOrDefaultAsync(item => item.RoomId == id)
            ?? throw new RegistrationException("Phòng không hợp lệ.");
        var allowed = await db.SportRooms.AnyAsync(link => link.RoomId == id
            && link.SportId == trainingClass.Course!.SportId
            && (trainingClass.ClassType == "private" ? link.AllowPrivate : link.AllowGroup));
        if (!allowed)
        {
            throw new RegistrationException("Phòng không dùng được cho môn này.");
        }

        if (trainingClass.Capacity is int needed && room.Capacity < needed)
        {
            throw new RegistrationException($"Phòng chỉ chứa {room.Capacity} người, lớp có sĩ số {needed}.");
        }

        return room;
    }

    // Trigger TR_session_rules chặn trùng lịch HLV hoặc phòng: đổi thành lỗi nghiệp vụ.
    private async Task SaveAsync()
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

    private async Task NotifyMembersAsync(ClassSession session, string title, string content)
    {
        var memberIds = await db.ClassEnrollments.AsNoTracking()
            .Where(enrollment => enrollment.ClassId == session.ClassId && enrollment.Status == "enrolled")
            .Select(enrollment => enrollment.UserId)
            .ToListAsync();
        var now = DateTime.Now;
        foreach (var memberId in memberIds)
        {
            db.Notifications.Add(new AccountNotification
            {
                UserId = memberId,
                Title = Shorten(title, 200),
                Content = content,
                IsRead = false,
                CreatedAt = now,
            });
        }
    }

    private void AddLog(string action, ClassSession session, string detail)
    {
        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = actor.UserId == 0 ? null : actor.UserId,
            Action = action,
            EntityName = "session",
            EntityId = session.SessionId,
            Detail = $"{session.Class!.ClassName}, {When(session)}: {detail}",
            CreatedAt = DateTime.Now,
        });
    }

    private static string When(ClassSession session) =>
        $"{ClassSessionPlanner.SessionTitle(session.SessionNo)} ngày {session.SessionDate:dd/MM/yyyy} {session.StartTime:HH\\:mm}-{session.EndTime:HH\\:mm}";

    private static string NoteSuffix(string? note) => string.IsNullOrWhiteSpace(note) ? "" : $" Ghi chú: {note}.";

    private static string? NormalizeNote(string? note)
    {
        var value = note?.Trim() ?? "";
        return value.Length == 0 ? null : Shorten(value, 500);
    }

    private static string Shorten(string value, int max) => value.Length <= max ? value : value[..max];

    private static int ParseId(string sessionId) =>
        int.TryParse(sessionId, out var id) ? id : throw new KeyNotFoundException("Không tìm thấy buổi học.");

    internal static IQueryable<ClassSession> FilterDates(IQueryable<ClassSession> query, DateOnly? from, DateOnly? to)
    {
        if (from is { } start && to is { } end && end < start)
        {
            throw new RegistrationException("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.");
        }

        var since = from ?? DateOnly.FromDateTime(DateTime.Now);
        query = query.Where(session => session.SessionDate >= since);
        return to is { } until ? query.Where(session => session.SessionDate <= until) : query;
    }

    internal async Task<List<SessionDto>> ProjectAsync(IQueryable<ClassSession> query)
    {
        var rows = await query
            .OrderBy(session => session.SessionDate)
            .ThenBy(session => session.StartTime)
            .ThenBy(session => session.ClassId)
            .Select(session => new
            {
                session.SessionId,
                session.ClassId,
                session.Class!.ClassName,
                session.Class.Course!.SportId,
                session.Class.Course.Sport!.SportName,
                session.Class.Course.CourseName,
                session.SessionNo,
                session.SessionDate,
                session.StartTime,
                session.EndTime,
                session.CoachUserId,
                CoachName = session.Coach!.FullName,
                session.RoomId,
                session.Room!.RoomName,
                session.Status,
                session.Note,
                EnrolledCount = session.Class.Enrollments.Count(enrollment => enrollment.Status == "enrolled"),
                session.Class.Capacity,
            })
            .ToListAsync();

        return rows
            .Select(row =>
            {
                var weekday = ClassSessionPlanner.WeekdayOf(row.SessionDate) ?? 0;
                return new SessionDto(
                    row.SessionId.ToString(),
                    row.ClassId.ToString(),
                    row.ClassName,
                    row.SportId.ToString(),
                    row.SportName,
                    row.CourseName,
                    row.SessionNo,
                    row.SessionDate,
                    weekday,
                    ClassSessionPlanner.WeekdayName(weekday),
                    row.StartTime,
                    row.EndTime,
                    row.CoachUserId.ToString(),
                    row.CoachName,
                    row.RoomId.ToString(),
                    row.RoomName,
                    row.Status,
                    row.Note,
                    row.EnrolledCount,
                    row.Capacity);
            })
            .ToList();
    }
}
