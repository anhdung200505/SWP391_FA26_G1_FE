using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Quản trị xem lịch buổi học (session) có lọc theo HLV và phòng của từng buổi.
// Đổi HLV/phòng và hủy buổi nằm ở SessionFlowService (PUT, cancel trên /api/sessions).
public class SessionManagementFlowService(AppDbContext db, SessionFlowService sessions)
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
}
