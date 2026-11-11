using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

public class SportCourseManagementFlowService(AppDbContext db, CurrentActor actor, ILogger<SportCourseManagementFlowService> logger)
{
    public async Task<IReadOnlyList<SportAdminDto>> ListSportsAsync()
    {
        var sports = await db.Sports.AsNoTracking().OrderBy(sport => sport.SportName).ToListAsync();

        var roomLinks = await db.SportRooms.AsNoTracking()
            .Join(db.Rooms, link => link.RoomId, room => room.RoomId, (link, room) => new
            {
                link.SportId,
                link.RoomId,
                room.RoomName,
                link.AllowGroup,
                link.AllowPrivate,
            })
            .OrderBy(item => item.RoomName)
            .ToListAsync();

        var coachLinks = await db.CoachSports.AsNoTracking()
            .Join(db.UserAccounts, link => link.CoachUserId, user => user.UserId, (link, user) => new
            {
                link.SportId,
                user.UserId,
                user.FullName,
            })
            .OrderBy(item => item.FullName)
            .ToListAsync();

        var courseCounts = await db.Courses.AsNoTracking()
            .GroupBy(course => course.SportId)
            .Select(group => new { SportId = group.Key, Count = group.Count() })
            .ToListAsync();

        return sports
            .Select(sport => new SportAdminDto(
                sport.SportId.ToString(),
                sport.SportCode,
                sport.SportName,
                sport.Category,
                roomLinks.Where(link => link.SportId == sport.SportId)
                    .Select(link => new SportRoomLinkDto(link.RoomId.ToString(), link.RoomName, link.AllowGroup, link.AllowPrivate))
                    .ToList(),
                coachLinks.Where(link => link.SportId == sport.SportId)
                    .Select(link => new SportCoachOptionDto(link.UserId.ToString(), link.FullName))
                    .ToList(),
                courseCounts.FirstOrDefault(item => item.SportId == sport.SportId)?.Count ?? 0))
            .ToList();
    }

    public async Task<IReadOnlyList<SportCoachOptionDto>> ListCoachOptionsAsync() =>
        await db.UserAccounts.AsNoTracking()
            .Where(user => user.Status == "active" && user.Role!.RoleCode == "COACH")
            .OrderBy(user => user.FullName)
            .Select(user => new SportCoachOptionDto(user.UserId.ToString(), user.FullName))
            .ToListAsync();

    public async Task<SportAdminDto> CreateSportAsync(CreateSportRequest request)
    {
        var code = (request.Code ?? "").Trim().ToUpperInvariant();
        var name = (request.Name ?? "").Trim();
        var category = string.IsNullOrWhiteSpace(request.Category) ? null : request.Category.Trim();
        if (code.Length is < 1 or > 50)
        {
            throw new RegistrationException("Mã môn là bắt buộc và không quá 50 ký tự.");
        }

        if (name.Length is < 1 or > 100)
        {
            throw new RegistrationException("Tên môn là bắt buộc và không quá 100 ký tự.");
        }

        if (category is { Length: > 100 })
        {
            throw new RegistrationException("Nhóm môn không quá 100 ký tự.");
        }

        if (await db.Sports.AnyAsync(sport => sport.SportCode == code))
        {
            throw new RegistrationException("Mã môn đã tồn tại.");
        }

        var rooms = new List<(int RoomId, bool AllowGroup, bool AllowPrivate)>();
        foreach (var item in request.Rooms ?? [])
        {
            var roomId = await ValidateRoomAsync(item);
            if (rooms.All(existing => existing.RoomId != roomId))
            {
                rooms.Add((roomId, item.AllowGroup, item.AllowPrivate));
            }
        }

        var coachIds = await ValidateCoachesAsync(request.CoachUserIds);

        await using var transaction = await db.Database.BeginTransactionAsync();
        try
        {
            var sport = new Models.Sport { SportCode = code, SportName = name, Category = category };
            db.Sports.Add(sport);
            await db.SaveChangesAsync();

            db.TrainingPlans.Add(new Models.TrainingPlan
            {
                CreatedByUserId = actor.UserId,
                PlanName = $"Giáo án chuẩn {name}",
                SportId = sport.SportId,
                CreatedAt = DateTime.Now,
            });
            db.SportRooms.AddRange(rooms.Select(item => new Models.SportRoom
            {
                SportId = sport.SportId,
                RoomId = item.RoomId,
                AllowGroup = item.AllowGroup,
                AllowPrivate = item.AllowPrivate,
            }));
            db.CoachSports.AddRange(coachIds.Select(id => new Models.CoachSport { SportId = sport.SportId, CoachUserId = id }));
            await db.SaveChangesAsync();
            await transaction.CommitAsync();

            logger.LogInformation("Quản trị {ActorId} tạo môn {SportId} ({Code})", actor.UserId, sport.SportId, code);
            return await GetAsync(sport.SportId);
        }
        catch (DbUpdateException exception) when (exception.InnerException?.Message.Contains("UQ_sport_code") == true)
        {
            throw new RegistrationException("Mã môn đã tồn tại.");
        }
    }

    // Chỉ thêm liên kết phòng; thêm lại phòng đã gắn thì cập nhật hai cờ.
    public async Task<SportAdminDto> AddRoomAsync(string sportId, SportRoomRequest request)
    {
        var id = await FindSportAsync(sportId);
        var roomId = await ValidateRoomAsync(request);
        var link = await db.SportRooms.FirstOrDefaultAsync(item => item.SportId == id && item.RoomId == roomId);
        if (link is null)
        {
            db.SportRooms.Add(new Models.SportRoom { SportId = id, RoomId = roomId, AllowGroup = request.AllowGroup, AllowPrivate = request.AllowPrivate });
        }
        else
        {
            link.AllowGroup = request.AllowGroup;
            link.AllowPrivate = request.AllowPrivate;
        }

        await db.SaveChangesAsync();
        logger.LogInformation("Quản trị {ActorId} gắn phòng {RoomId} cho môn {SportId}", actor.UserId, roomId, id);
        return await GetAsync(id);
    }

    // Chỉ thêm HLV chưa dạy môn này, không xóa dòng nào.
    public async Task<SportAdminDto> AddCoachesAsync(string sportId, AddSportCoachesRequest request)
    {
        var id = await FindSportAsync(sportId);
        var coachIds = await ValidateCoachesAsync(request.CoachUserIds);
        var existing = await db.CoachSports.Where(item => item.SportId == id).Select(item => item.CoachUserId).ToListAsync();
        db.CoachSports.AddRange(coachIds.Except(existing).Select(coach => new Models.CoachSport { SportId = id, CoachUserId = coach }));
        await db.SaveChangesAsync();
        logger.LogInformation("Quản trị {ActorId} gắn HLV cho môn {SportId}", actor.UserId, id);
        return await GetAsync(id);
    }

    private async Task<int> FindSportAsync(string sportId)
    {
        var id = int.TryParse(sportId, out var parsed) ? parsed : 0;
        if (!await db.Sports.AnyAsync(sport => sport.SportId == id))
        {
            throw new KeyNotFoundException("Không tìm thấy môn.");
        }

        return id;
    }

    private async Task<int> ValidateRoomAsync(SportRoomRequest item)
    {
        if (!int.TryParse(item.RoomId, out var roomId) || !await db.Rooms.AnyAsync(room => room.RoomId == roomId && room.IsActive))
        {
            throw new RegistrationException("Phòng không tồn tại hoặc đã ngưng dùng.");
        }

        if (!item.AllowGroup && !item.AllowPrivate)
        {
            throw new RegistrationException("Phòng phải dùng được cho lớp nhóm hoặc học 1-1.");
        }

        return roomId;
    }

    private async Task<List<int>> ValidateCoachesAsync(List<string>? coachUserIds)
    {
        var ids = new List<int>();
        foreach (var raw in coachUserIds ?? [])
        {
            if (!int.TryParse(raw, out var coachId)
                || !await db.UserAccounts.AnyAsync(user => user.UserId == coachId && user.Status == "active" && user.Role!.RoleCode == "COACH"))
            {
                throw new RegistrationException("Huấn luyện viên không hợp lệ hoặc không còn hoạt động.");
            }

            if (!ids.Contains(coachId))
            {
                ids.Add(coachId);
            }
        }

        return ids;
    }

    private async Task<SportAdminDto> GetAsync(int sportId) =>
        (await ListSportsAsync()).First(item => item.Id == sportId.ToString());
}
