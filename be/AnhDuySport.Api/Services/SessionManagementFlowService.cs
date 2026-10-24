using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Quản trị xem và xử lý sự cố lịch buổi học (session): đổi HLV hoặc phòng cho riêng một buổi, hủy một buổi.
public class SessionManagementFlowService(AppDbContext db, CurrentActor actor, SessionFlowService sessions)
{
    private static readonly string[] SessionStatuses = ["scheduled", "held", "cancelled", "completed"];

    // Mặc định từ hôm nay trở đi, mọi trạng thái; lọc tùy chọn theo lớp, HLV của buổi, phòng của buổi, môn, trạng thái, ngày.
    public async Task<IReadOnlyList<SessionDto>> AccessSessionsAsync(
        string? classId, string? coachUserId, string? roomId, string? sportId, string? status, DateOnly? from, DateOnly? to)
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

        if (!string.IsNullOrWhiteSpace(coachUserId))
        {
            if (!int.TryParse(coachUserId, out var coachKey)
                || !await db.UserAccounts.AnyAsync(user => user.UserId == coachKey && user.Role!.RoleCode == "COACH"))
            {
                throw new KeyNotFoundException("Không tìm thấy huấn luyện viên.");
            }

            query = query.Where(session => session.CoachUserId == coachKey);
        }

        if (!string.IsNullOrWhiteSpace(roomId))
        {
            if (!int.TryParse(roomId, out var roomKey) || !await db.Rooms.AnyAsync(room => room.RoomId == roomKey))
            {
                throw new KeyNotFoundException("Không tìm thấy phòng.");
            }

            query = query.Where(session => session.RoomId == roomKey);
        }

        if (!string.IsNullOrWhiteSpace(sportId))
        {
            if (!int.TryParse(sportId, out var sportKey) || !await db.Sports.AnyAsync(sport => sport.SportId == sportKey))
            {
                throw new KeyNotFoundException("Không tìm thấy môn thể thao.");
            }

            query = query.Where(session => session.Class!.Course!.SportId == sportKey);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var statusKey = status.Trim().ToLowerInvariant();
            if (!SessionStatuses.Contains(statusKey))
            {
                throw new RegistrationException("Trạng thái buổi học phải là scheduled, held, cancelled hoặc completed.");
            }

            query = query.Where(session => session.Status == statusKey);
        }

        return await sessions.ProjectAsync(SessionFlowService.FilterDates(query, from, to));
    }

    // Đổi HLV và/hoặc phòng của MỘT buổi chưa diễn ra; giờ học không đổi. Trùng lịch HLV hoặc phòng do trigger TR_session_rules chặn.
    public async Task<SessionDto> UpdateSessionAsync(string sessionId, UpdateSessionRequest request)
    {
        var session = await LoadSessionAsync(sessionId);
        var hasCoach = !string.IsNullOrWhiteSpace(request.CoachUserId);
        var hasRoom = !string.IsNullOrWhiteSpace(request.RoomId);
        if (!hasCoach && !hasRoom)
        {
            throw new RegistrationException("Cần gửi huấn luyện viên hoặc phòng mới.");
        }

        EnsureNotFinished(session, "đổi");
        var sportId = session.Class!.Course!.SportId;
        var changes = new List<string>();

        if (hasCoach)
        {
            var coach = int.TryParse(request.CoachUserId, out var coachId)
                ? await db.UserAccounts.AsNoTracking().FirstOrDefaultAsync(user => user.UserId == coachId && user.Status == "active" && user.Role!.RoleCode == "COACH")
                : null;
            if (coach is null)
            {
                throw new RegistrationException("Huấn luyện viên không hợp lệ.");
            }

            if (!await db.CoachSports.AnyAsync(link => link.CoachUserId == coach.UserId && link.SportId == sportId))
            {
                throw new RegistrationException("Huấn luyện viên không dạy môn này.");
            }

            if (coach.UserId != session.CoachUserId)
            {
                changes.Add($"HLV {session.Coach!.FullName} -> {coach.FullName}");
                session.CoachUserId = coach.UserId;
            }
        }

        if (hasRoom)
        {
            var room = int.TryParse(request.RoomId, out var roomId)
                ? await db.Rooms.AsNoTracking().FirstOrDefaultAsync(item => item.RoomId == roomId)
                : null;
            if (room is null)
            {
                throw new RegistrationException("Phòng không hợp lệ.");
            }

            var isPrivate = session.Class.ClassType == "private";
            if (!await db.SportRooms.AnyAsync(link => link.RoomId == room.RoomId && link.SportId == sportId && (isPrivate ? link.AllowPrivate : link.AllowGroup)))
            {
                throw new RegistrationException("Phòng không dùng được cho môn hoặc loại lớp này.");
            }

            var enrolled = await db.ClassEnrollments.CountAsync(item => item.ClassId == session.ClassId && item.Status == "enrolled");
            if (enrolled > room.Capacity)
            {
                throw new RegistrationException($"Phòng không đủ chỗ cho {enrolled} học viên đang ghi danh (sức chứa {room.Capacity} người).");
            }

            if (room.RoomId != session.RoomId)
            {
                changes.Add($"Phòng {session.Room!.RoomName} -> {room.RoomName}");
                session.RoomId = room.RoomId;
            }
        }

        var note = request.Note?.Trim();
        if (!string.IsNullOrEmpty(note) && note != session.Note)
        {
            session.Note = note;
            changes.Add($"Ghi chú: {note}");
        }

        if (changes.Count > 0)
        {
            AddLog(session, "Đổi HLV hoặc phòng", $"Quản trị cập nhật: {string.Join("; ", changes)}.");

            var moves = changes.Where(change => change.StartsWith("HLV ") || change.StartsWith("Phòng ")).ToList();
            if (moves.Count > 0)
            {
                var why = string.IsNullOrEmpty(note) ? "" : $" Lý do: {note}.";
                await NotifyEnrolledAsync(session, "Thay đổi thông tin buổi học", $"{Describe(session)}: {string.Join("; ", moves)}.{why}");
            }

            await SaveAsync();
        }

        return await sessions.SelectSessionAsync(session.SessionId.ToString());
    }

    // Hủy MỘT buổi chưa diễn ra, chưa có điểm danh; lý do lưu vào ghi chú của buổi.
    public async Task<SessionDto> CancelSessionAsync(string sessionId, CancelSessionRequest request)
    {
        var session = await LoadSessionAsync(sessionId);
        EnsureNotFinished(session, "hủy");

        if (await db.ClassAttendances.AnyAsync(attendance => attendance.SessionId == session.SessionId))
        {
            throw new RegistrationException("Buổi học đã có điểm danh nên không thể hủy.");
        }

        var reason = request.Reason.Trim();
        session.Status = "cancelled";
        session.Note = reason;
        AddLog(session, "Hủy buổi học", $"Quản trị hủy buổi. Lý do: {reason}.");
        await NotifyEnrolledAsync(session, "Buổi học bị hủy", $"{Describe(session)} đã bị hủy. Lý do: {reason}.");
        await SaveAsync();

        return await sessions.SelectSessionAsync(session.SessionId.ToString());
    }

    private async Task<ClassSession> LoadSessionAsync(string sessionId)
    {
        var id = int.TryParse(sessionId, out var parsed) ? parsed : 0;
        return await db.ClassSessions
            .Include(item => item.Class).ThenInclude(item => item!.Course)
            .Include(item => item.Coach)
            .Include(item => item.Room)
            .FirstOrDefaultAsync(item => item.SessionId == id)
            ?? throw new KeyNotFoundException("Không tìm thấy buổi học.");
    }

    // Chỉ buổi còn scheduled hoặc held và chưa kết thúc mới đổi hoặc hủy được: buổi đang diễn ra trong hôm nay vẫn xử lý được
    // (HLV vắng mặt giữa buổi), buổi đã qua ngày hoặc đã hết giờ trong hôm nay thì không.
    private static void EnsureNotFinished(ClassSession session, string verb)
    {
        if (session.Status is not ("scheduled" or "held"))
        {
            var reason = session.Status == "cancelled" ? "đã hủy" : "đã hoàn thành";
            throw new RegistrationException($"Buổi học {reason}, không {verb} được.");
        }

        var now = DateTime.Now;
        if (session.SessionDate < DateOnly.FromDateTime(now))
        {
            throw new RegistrationException($"Buổi học đã qua ngày, không {verb} được.");
        }

        if (session.SessionDate == DateOnly.FromDateTime(now) && session.EndTime <= TimeOnly.FromDateTime(now))
        {
            throw new RegistrationException($"Buổi học đã kết thúc, không {verb} được.");
        }
    }

    // Báo cho học viên đang ghi danh lớp của buổi. Chỉ thêm vào context, được lưu cùng lần SaveChanges với thay đổi
    // nên khi trigger từ chối (trùng lịch) thì không có thông báo nào được ghi.
    private async Task NotifyEnrolledAsync(ClassSession session, string title, string content)
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
                Title = title,
                Content = content,
                IsRead = false,
                CreatedAt = now,
            });
        }
    }

    private static string Describe(ClassSession session) =>
        $"{ClassSessionPlanner.SessionTitle(session.SessionNo)} lớp {session.Class!.ClassName} ngày {session.SessionDate:dd/MM/yyyy} ({session.StartTime:HH\\:mm}-{session.EndTime:HH\\:mm})";

    private void AddLog(ClassSession session, string action, string detail) =>
        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = actor.UserId == 0 ? null : actor.UserId,
            Action = Shorten($"{action} buổi {session.SessionNo} lớp {session.Class!.ClassName}", 100),
            EntityName = "session",
            EntityId = session.SessionId,
            Detail = detail,
            CreatedAt = DateTime.Now,
        });

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
        catch (DbUpdateException exception) when (exception.GetBaseException() is SqlException { Number: 1205 })
        {
            // Hai thao tác cùng khóa lịch (trigger dùng UPDLOCK): thử lại là xong.
            throw new RegistrationException("Hệ thống đang xử lý thao tác khác trên lịch này, hãy thử lại sau ít giây.");
        }
    }

    private static string Shorten(string value, int max) => value.Length <= max ? value : value[..max];
}
