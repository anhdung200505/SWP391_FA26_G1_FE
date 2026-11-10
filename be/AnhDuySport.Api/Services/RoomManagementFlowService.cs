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

    public async Task<RoomAdminDto> CreateAsync(SaveRoomRequest request)
    {
        var (name, type, sports) = await ValidateAsync(request);
        var centerId = await db.Centers.AsNoTracking().OrderBy(item => item.CenterId).Select(item => (int?)item.CenterId).FirstOrDefaultAsync()
            ?? throw new InvalidOperationException("Chưa có cơ sở để thêm phòng.");
        var next = await db.Rooms.CountAsync() + 1;
        string code;
        do
        {
            code = $"ROOM-{next++:D3}";
        }
        while (await db.Rooms.AnyAsync(item => item.RoomCode == code));

        var room = new Models.Room
        {
            CenterId = centerId,
            RoomCode = code,
            RoomName = name,
            RoomType = type,
            Capacity = request.Capacity,
            PrivateConcurrency = request.PrivateConcurrency,
            IsActive = true,
        };
        db.Rooms.Add(room);
        await db.SaveChangesAsync();
        db.SportRooms.AddRange(sports.Select(item => new Models.SportRoom
        {
            RoomId = room.RoomId,
            SportId = item.SportId,
            AllowGroup = item.AllowGroup,
            AllowPrivate = item.AllowPrivate,
        }));
        await db.SaveChangesAsync();
        logger.LogInformation("Quản trị {ActorId} thêm phòng {RoomId} ({RoomName})", actor.UserId, room.RoomId, room.RoomName);
        return (await ListAsync()).First(item => item.Id == room.RoomId.ToString());
    }

    public async Task<RoomAdminDto> UpdateAsync(string roomId, SaveRoomRequest request)
    {
        var id = int.TryParse(roomId, out var parsed) ? parsed : 0;
        var room = await db.Rooms.FirstOrDefaultAsync(item => item.RoomId == id)
            ?? throw new KeyNotFoundException("Không tìm thấy phòng.");
        var (name, type, sports) = await ValidateAsync(request, id);

        var today = DateOnly.FromDateTime(DateTime.Now);
        var upcoming = await db.ClassSessions.AsNoTracking()
            .Where(session => session.RoomId == id && session.SessionDate >= today && UpcomingStatuses.Contains(session.Status))
            .Select(session => new
            {
                session.ClassId,
                ClassName = session.Class!.ClassName,
                session.Class.ClassType,
                session.Class.Capacity,
                SportId = session.Class.Course!.SportId,
            })
            .Distinct()
            .ToListAsync();
        var tooBig = upcoming.Where(item => item.ClassType == "group" && item.Capacity > request.Capacity).ToList();
        if (tooBig.Count > 0)
        {
            throw new InvalidOperationException(
                $"Sức chứa mới ({request.Capacity}) nhỏ hơn sĩ số lớp {tooBig[0].ClassName} ({tooBig[0].Capacity}) còn buổi sắp tới trong phòng.");
        }

        var blocked = upcoming.FirstOrDefault(item => !sports.Any(sport =>
            sport.SportId == item.SportId && (item.ClassType == "private" ? sport.AllowPrivate : sport.AllowGroup)));
        if (blocked is not null)
        {
            throw new InvalidOperationException(
                $"Lớp {blocked.ClassName} còn buổi sắp tới trong phòng nên phải giữ môn và loại lớp tương ứng.");
        }

        room.RoomName = name;
        room.RoomType = type;
        room.Capacity = request.Capacity;
        room.PrivateConcurrency = request.PrivateConcurrency;
        var links = await db.SportRooms.Where(item => item.RoomId == id).ToListAsync();
        db.SportRooms.RemoveRange(links.Where(link => !sports.Any(item => item.SportId == link.SportId)));
        foreach (var item in sports)
        {
            var link = links.FirstOrDefault(existing => existing.SportId == item.SportId);
            if (link is null)
            {
                db.SportRooms.Add(new Models.SportRoom { RoomId = id, SportId = item.SportId, AllowGroup = item.AllowGroup, AllowPrivate = item.AllowPrivate });
            }
            else
            {
                link.AllowGroup = item.AllowGroup;
                link.AllowPrivate = item.AllowPrivate;
            }
        }

        await db.SaveChangesAsync();
        logger.LogInformation("Quản trị {ActorId} sửa phòng {RoomId} ({RoomName})", actor.UserId, room.RoomId, room.RoomName);
        return (await ListAsync()).First(item => item.Id == roomId);
    }

    private sealed record ValidSport(int SportId, bool AllowGroup, bool AllowPrivate);

    private async Task<(string Name, string? Type, List<ValidSport> Sports)> ValidateAsync(SaveRoomRequest request, int? ignoreRoomId = null)
    {
        var name = request.Name?.Trim() ?? "";
        if (name.Length is < 1 or > 200)
        {
            throw new InvalidOperationException("Tên phòng là bắt buộc và không quá 200 ký tự.");
        }

        var type = string.IsNullOrWhiteSpace(request.Type) ? null : request.Type.Trim();
        if (type is { Length: > 100 })
        {
            throw new InvalidOperationException("Loại phòng không quá 100 ký tự.");
        }

        if (request.Capacity is < 1 or > 1000)
        {
            throw new InvalidOperationException("Sức chứa từ 1 đến 1.000 người.");
        }

        if (request.PrivateConcurrency is < 1 or > 50)
        {
            throw new InvalidOperationException("Số buổi 1-1 cùng lúc từ 1 đến 50.");
        }

        if (await db.Rooms.AnyAsync(item => item.RoomName == name && item.RoomId != ignoreRoomId))
        {
            throw new InvalidOperationException("Đã có phòng trùng tên.");
        }

        var sports = new List<ValidSport>();
        foreach (var item in request.Sports ?? [])
        {
            if (!int.TryParse(item.SportId, out var sportId) || !await db.Sports.AnyAsync(sport => sport.SportId == sportId))
            {
                throw new InvalidOperationException("Môn thể thao không hợp lệ.");
            }

            if (!item.AllowGroup && !item.AllowPrivate)
            {
                continue;
            }

            if (sports.All(existing => existing.SportId != sportId))
            {
                sports.Add(new ValidSport(sportId, item.AllowGroup, item.AllowPrivate));
            }
        }

        return (name, type, sports);
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
