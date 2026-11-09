using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Ngưng dùng phòng bị chặn vì còn buổi học sắp tới. Controller trả 409 kèm danh sách lớp và buổi để quản lý đổi phòng trước.
public sealed class RoomInUseException(string message, RoomUsageDto usage) : InvalidOperationException(message)
{
    public RoomUsageDto Usage { get; } = usage;
}

public class RoomManagementFlowService(AppDbContext db, CurrentActor actor, ILogger<RoomManagementFlowService> logger)
{
    // Buổi còn phải diễn ra: chưa học, chưa hủy, từ hôm nay trở đi.
    private static readonly string[] UpcomingStatuses = ["scheduled", "held"];

    public async Task<IReadOnlyList<RoomAdminDto>> ListAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.Now);

        var rooms = await db.Rooms.AsNoTracking()
            .OrderBy(room => room.Center!.CenterName)
            .ThenBy(room => room.RoomName)
            .Select(room => new
            {
                room.RoomId,
                room.RoomCode,
                room.RoomName,
                room.RoomType,
                room.Capacity,
                room.PrivateConcurrency,
                room.CenterId,
                room.Center!.CenterName,
                room.IsActive,
            })
            .ToListAsync();

        var links = await db.SportRooms.AsNoTracking()
            .Join(db.Sports, link => link.SportId, sport => sport.SportId, (link, sport) => new
            {
                link.RoomId,
                link.SportId,
                sport.SportName,
                link.AllowGroup,
                link.AllowPrivate,
            })
            .OrderBy(item => item.SportName)
            .ToListAsync();

        var upcoming = await db.ClassSessions.AsNoTracking()
            .Where(session => session.SessionDate >= today && UpcomingStatuses.Contains(session.Status))
            .GroupBy(session => session.RoomId)
            .Select(group => new
            {
                RoomId = group.Key,
                Sessions = group.Count(),
                Classes = group.Select(session => session.ClassId).Distinct().Count(),
            })
            .ToListAsync();

        return rooms
            .Select(room =>
            {
                var usage = upcoming.FirstOrDefault(item => item.RoomId == room.RoomId);
                return new RoomAdminDto(
                    room.RoomId.ToString(),
                    room.RoomCode,
                    room.RoomName,
                    room.RoomType ?? "",
                    room.Capacity,
                    room.PrivateConcurrency,
                    room.CenterId.ToString(),
                    room.CenterName,
                    room.IsActive,
                    links.Where(link => link.RoomId == room.RoomId)
                        .Select(link => new RoomSportDto(link.SportId.ToString(), link.SportName, link.AllowGroup, link.AllowPrivate))
                        .ToList(),
                    usage?.Sessions ?? 0,
                    usage?.Classes ?? 0);
            })
            .ToList();
    }

    // Các lớp còn buổi sắp tới trong phòng (chỉ đọc), để hộp thoại ngưng dùng báo trước.
    public async Task<RoomUsageDto> RoomUsageAsync(string roomId)
    {
        var id = int.TryParse(roomId, out var parsed) ? parsed : 0;
        if (!await db.Rooms.AnyAsync(item => item.RoomId == id))
        {
            throw new KeyNotFoundException("Không tìm thấy phòng.");
        }

        return await UsageAsync(id);
    }

    // Ngưng dùng: chặn nếu còn buổi sắp tới. Mở lại thì luôn được.
    public async Task<RoomAdminDto> SetActiveAsync(string roomId, bool isActive)
    {
        var id = int.TryParse(roomId, out var parsed) ? parsed : 0;
        var room = await db.Rooms.FirstOrDefaultAsync(item => item.RoomId == id)
            ?? throw new KeyNotFoundException("Không tìm thấy phòng.");

        if (room.IsActive == isActive)
        {
            return (await ListAsync()).First(item => item.Id == roomId);
        }

        if (!isActive)
        {
            var usage = await UsageAsync(id);
            if (usage.SessionCount > 0)
            {
                var since = usage.FirstDate is { } first ? $" từ {first:dd/MM} trở đi" : "";
                throw new RoomInUseException(
                    $"Phòng này còn {usage.SessionCount} buổi{since} ({usage.ClassCount} lớp). Hãy đổi phòng cho các buổi này trước.",
                    usage);
            }
        }

        room.IsActive = isActive;
        await db.SaveChangesAsync();
        logger.LogInformation("Quản trị {ActorId} {Action} phòng {RoomId} ({RoomName})",
            actor.UserId, isActive ? "mở lại" : "ngưng dùng", room.RoomId, room.RoomName);

        return (await ListAsync()).First(item => item.Id == roomId);
    }

    private async Task<RoomUsageDto> UsageAsync(int roomId)
    {
        var today = DateOnly.FromDateTime(DateTime.Now);

        var rows = await db.ClassSessions.AsNoTracking()
            .Where(session => session.RoomId == roomId
                && session.SessionDate >= today
                && UpcomingStatuses.Contains(session.Status))
            .GroupBy(session => new { session.ClassId, session.Class!.ClassName })
            .Select(group => new
            {
                group.Key.ClassId,
                group.Key.ClassName,
                Sessions = group.Count(),
                First = group.Min(session => session.SessionDate),
                Last = group.Max(session => session.SessionDate),
            })
            .OrderBy(item => item.First)
            .ThenBy(item => item.ClassName)
            .ToListAsync();

        return new RoomUsageDto(
            rows.Sum(item => item.Sessions),
            rows.Count,
            rows.Count == 0 ? null : rows.Min(item => item.First),
            rows.Select(item => new RoomUsageClassDto(item.ClassId.ToString(), item.ClassName, item.Sessions, item.First, item.Last)).ToList());
    }
}
