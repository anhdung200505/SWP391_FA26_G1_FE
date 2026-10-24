using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Lịch buổi học (session) và danh mục khung giờ (time_slot).
public class SessionFlowService(AppDbContext db)
{
    private static readonly string[] SlotKinds = ["group", "private"];

    // Mặc định từ hôm nay trở đi; from/to lọc theo ngày học.
    public async Task<IReadOnlyList<SessionDto>> AccessSessionsAsync(string? classId, DateOnly? from, DateOnly? to)
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

        return await ProjectAsync(FilterDates(query, from, to));
    }

    public async Task<SessionDto> SelectSessionAsync(string sessionId)
    {
        var id = int.TryParse(sessionId, out var parsed) ? parsed : 0;
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
                session.Class.Course!.Sport!.SportName,
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
                    row.EnrolledCount);
            })
            .ToList();
    }
}
