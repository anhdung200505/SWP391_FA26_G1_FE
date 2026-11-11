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
            .Join(ActiveCoaches(), link => link.CoachUserId, user => user.UserId, (link, user) => new
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

    // Một điều kiện duy nhất cho "HLV dùng được": vai trò COACH và đang hoạt động.
    private IQueryable<Models.UserAccount> ActiveCoaches() =>
        db.UserAccounts.Where(user => user.Status == "active" && user.Role!.RoleCode == "COACH");

    public async Task<IReadOnlyList<SportCoachOptionDto>> ListCoachOptionsAsync() =>
        await ActiveCoaches().AsNoTracking()
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
            await EnsureRoomFreeForSportAsync(roomId, null);
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

            db.TrainingPlans.Add(StandardTrainingPlan.Create(sport.SportId, name, actor.UserId));
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

    // Chỉ thêm quyền: thêm lại phòng đã gắn thì gộp (OR) hai cờ, không bao giờ gỡ quyền đã có.
    public async Task<SportAdminDto> AddRoomAsync(string sportId, SportRoomRequest request)
    {
        var id = await FindSportAsync(sportId);
        var roomId = await ValidateRoomAsync(request);
        await EnsureRoomFreeForSportAsync(roomId, id);
        var link = await db.SportRooms.FirstOrDefaultAsync(item => item.SportId == id && item.RoomId == roomId);
        if (link is null)
        {
            db.SportRooms.Add(new Models.SportRoom { SportId = id, RoomId = roomId, AllowGroup = request.AllowGroup, AllowPrivate = request.AllowPrivate });
        }
        else
        {
            link.AllowGroup |= request.AllowGroup;
            link.AllowPrivate |= request.AllowPrivate;
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

    // Xem trước: dùng chung ComputeDeleteCheckAsync với lệnh xóa nên hai bên không thể lệch nhau.
    public async Task<DeleteSportCheckDto> CheckDeleteSportAsync(string sportId)
    {
        var check = await ComputeDeleteCheckAsync(await FindSportAsync(sportId));
        return new DeleteSportCheckDto(check.BlockReason is null, check.BlockReason, check.CourseCount, check.RoomLinkCount,
            check.CoachLinkCount, check.CoachesWithoutSport, check.BlockedCourses);
    }

    // Xóa trọn gói trong một giao dịch, kiểm tra lại điều kiện chặn ngay trong giao dịch. Không xóa phòng, HLV hay tài khoản, chỉ gỡ liên kết.
    public async Task<DeleteSportResultDto> DeleteSportAsync(string sportId)
    {
        var id = await FindSportAsync(sportId);
        await using var transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        var check = await ComputeDeleteCheckAsync(id);
        if (check.BlockReason is not null)
        {
            throw new RegistrationException(check.BlockReason);
        }

        await db.SportCourseUnits.Where(item => item.SportId == id).ExecuteDeleteAsync();
        await db.SportCourseMaterials.Where(item => item.SportId == id).ExecuteDeleteAsync();
        await db.CoachSports.Where(item => item.SportId == id).ExecuteDeleteAsync();
        await db.SportRooms.Where(item => item.SportId == id).ExecuteDeleteAsync();
        var deletedCourses = await db.Courses.Where(item => item.SportId == id).ExecuteDeleteAsync();
        await db.TrainingPlans.Where(item => item.SportId == id).ExecuteDeleteAsync();
        await db.Sports.Where(item => item.SportId == id).ExecuteDeleteAsync();
        await transaction.CommitAsync();

        logger.LogInformation("Quản trị {ActorId} xóa môn {SportId} ({Name}), {Courses} khóa học", actor.UserId, id, check.SportName, deletedCourses);
        return new DeleteSportResultDto(id.ToString(), check.SportName, deletedCourses, check.CoachesWithoutSport);
    }

    private sealed record DeleteCheck(string SportName, string? BlockReason, int CourseCount, int RoomLinkCount, int CoachLinkCount,
        IReadOnlyList<SportCoachOptionDto> CoachesWithoutSport, IReadOnlyList<BlockedCourseDto> BlockedCourses);

    private async Task<DeleteCheck> ComputeDeleteCheckAsync(int sportId)
    {
        var sportName = await db.Sports.AsNoTracking().Where(sport => sport.SportId == sportId).Select(sport => sport.SportName).FirstAsync();
        var courses = await db.Courses.AsNoTracking().Where(course => course.SportId == sportId)
            .Select(course => new
            {
                course.CourseName,
                Classes = db.Classes.Count(item => item.CourseId == course.CourseId),
                Requests = db.PrivateClassRequests.Count(item => item.CourseId == course.CourseId),
            })
            .OrderBy(course => course.CourseName)
            .ToListAsync();

        string? blockReason = null;
        var blocked = courses.Where(course => course.Classes > 0 || course.Requests > 0).ToList();
        if (blocked.Count > 0)
        {
            var parts = blocked.Take(3).Select(course =>
            {
                var reasons = new List<string>();
                if (course.Classes > 0)
                {
                    reasons.Add($"đã có {course.Classes} lớp");
                }

                if (course.Requests > 0)
                {
                    reasons.Add($"có {course.Requests} yêu cầu học 1-1");
                }

                return $"Khóa học '{course.CourseName}' {string.Join(" và ", reasons)}";
            });
            blockReason = string.Join(", ", parts) + (blocked.Count > 3 ? $" và {blocked.Count - 3} khóa khác" : "") + " nên không xóa được môn.";
        }
        else
        {
            var planClasses = await db.Classes.CountAsync(item => db.TrainingPlans.Any(plan => plan.TrainingPlanId == item.TrainingPlanId && plan.SportId == sportId));
            var planRecommendations = await db.WorkoutRecommendations.CountAsync(item => db.TrainingPlans.Any(plan => plan.TrainingPlanId == item.TrainingPlanId && plan.SportId == sportId));
            if (planClasses > 0)
            {
                blockReason = $"Có {planClasses} lớp đang dùng giáo án của môn nên không xóa được môn.";
            }
            else if (planRecommendations > 0)
            {
                blockReason = $"Có {planRecommendations} gợi ý tập luyện AI đang dùng giáo án của môn nên không xóa được môn.";
            }
        }

        var roomLinks = await db.SportRooms.CountAsync(link => link.SportId == sportId);
        var coachLinks = await db.CoachSports.CountAsync(link => link.SportId == sportId);
        var withoutSport = await ActiveCoaches().AsNoTracking()
            .Where(user => db.CoachSports.Any(link => link.CoachUserId == user.UserId && link.SportId == sportId)
                && !db.CoachSports.Any(link => link.CoachUserId == user.UserId && link.SportId != sportId))
            .OrderBy(user => user.FullName)
            .Select(user => new SportCoachOptionDto(user.UserId.ToString(), user.FullName))
            .ToListAsync();
        var blockedCourses = blocked.Select(course => new BlockedCourseDto(course.CourseName, course.Classes, course.Requests)).ToList();
        return new DeleteCheck(sportName, blockReason, courses.Count, roomLinks, coachLinks, withoutSport, blockedCourses);
    }

    public async Task<IReadOnlyList<CourseAdminDto>> ListCoursesAsync(string? sportId)
    {
        var query = db.Courses.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(sportId))
        {
            if (!int.TryParse(sportId, out var sportKey))
            {
                throw new KeyNotFoundException("Không tìm thấy môn.");
            }

            query = query.Where(course => course.SportId == sportKey);
        }

        var courses = await query
            .OrderBy(course => course.Sport!.SportName)
            .ThenBy(course => course.CourseName)
            .Select(course => new { Course = course, course.Sport!.SportName })
            .ToListAsync();
        return courses.Select(item => ToCourseDto(item.Course, item.SportName)).ToList();
    }

    public async Task<CourseAdminDto> CreateCourseAsync(CreateCourseRequest request)
    {
        var code = (request.Code ?? "").Trim().ToUpperInvariant();
        if (code.Length is < 1 or > 50)
        {
            throw new RegistrationException("Mã khóa học là bắt buộc và không quá 50 ký tự.");
        }

        var format = (request.Format ?? "").Trim();
        var fields = ValidateCourseFields(request.Name, request.Price, format, request.SessionMinutes, request.SessionCount,
            request.LevelName, request.AgeRange, request.Description, request.ImagePath);
        var sportId = int.TryParse(request.SportId, out var parsedSport) ? parsedSport : 0;
        if (!await db.Sports.AnyAsync(sport => sport.SportId == sportId))
        {
            throw new RegistrationException("Môn không tồn tại.");
        }

        var hasCoach = await db.CoachSports.AnyAsync(link => link.SportId == sportId
            && ActiveCoaches().Any(user => user.UserId == link.CoachUserId));
        if (!hasCoach)
        {
            throw new RegistrationException("Môn này chưa có huấn luyện viên đang hoạt động, hãy gắn HLV cho môn trước.");
        }

        var hasRoom = await db.SportRooms.AnyAsync(link => link.SportId == sportId
            && (format == "group" ? link.AllowGroup : link.AllowPrivate)
            && db.Rooms.Any(room => room.RoomId == link.RoomId && room.IsActive));
        if (!hasRoom)
        {
            throw new RegistrationException(format == "group"
                ? "Môn này chưa có phòng đang hoạt động dùng được cho lớp nhóm, hãy gắn phòng cho môn trước."
                : "Môn này chưa có phòng đang hoạt động dùng được cho học 1-1, hãy gắn phòng cho môn trước.");
        }

        if (await db.Courses.AnyAsync(course => course.CourseCode == code))
        {
            throw new RegistrationException("Mã khóa học đã tồn tại.");
        }

        var entity = new Models.Course { SportId = sportId, CourseCode = code, Format = format, Status = "active" };
        ApplyCourseFields(entity, fields);
        db.Courses.Add(entity);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException exception) when (exception.InnerException?.Message.Contains("UQ_course_code") == true)
        {
            throw new RegistrationException("Mã khóa học đã tồn tại.");
        }

        logger.LogInformation("Quản trị {ActorId} tạo khóa học {CourseId} ({Code})", actor.UserId, entity.CourseId, code);
        return await GetCourseAsync(entity.CourseId);
    }

    public async Task<CourseAdminDto> UpdateCourseAsync(string courseId, UpdateCourseRequest request)
    {
        var entity = await FindCourseAsync(courseId);
        var fields = ValidateCourseFields(request.Name, request.Price, entity.Format, request.SessionMinutes, request.SessionCount,
            request.LevelName, request.AgeRange, request.Description, request.ImagePath);
        ApplyCourseFields(entity, fields);
        await db.SaveChangesAsync();
        logger.LogInformation("Quản trị {ActorId} sửa khóa học {CourseId}", actor.UserId, entity.CourseId);
        return await GetCourseAsync(entity.CourseId);
    }

    public async Task<CourseAdminDto> SetCourseActiveAsync(string courseId, bool isActive)
    {
        var entity = await FindCourseAsync(courseId);
        entity.Status = isActive ? "active" : "inactive";
        await db.SaveChangesAsync();
        logger.LogInformation("Quản trị {ActorId} đặt khóa học {CourseId} thành {Status}", actor.UserId, entity.CourseId, entity.Status);
        return await GetCourseAsync(entity.CourseId);
    }

    private sealed record CourseFields(string Name, decimal Price, int? SessionMinutes, int? SessionCount,
        string? LevelName, string? AgeRange, string? Description, string? ImagePath);

    // Dùng chung cho tạo và sửa. Khóa nhóm không có số buổi/số phút; khóa 1-1 bắt buộc cả hai.
    private static CourseFields ValidateCourseFields(string? rawName, decimal price, string format, int? sessionMinutes, int? sessionCount,
        string? levelName, string? ageRange, string? description, string? imagePath)
    {
        var name = (rawName ?? "").Trim();
        if (name.Length is < 1 or > 200)
        {
            throw new RegistrationException("Tên khóa học là bắt buộc và không quá 200 ký tự.");
        }

        if (price is < 0 or > 9999999999999.99m)
        {
            throw new RegistrationException("Học phí phải từ 0 đến 9.999.999.999.999,99.");
        }

        if (Clean(levelName) is { Length: > 50 })
        {
            throw new RegistrationException("Cấp độ không quá 50 ký tự.");
        }

        if (Clean(ageRange) is { Length: > 50 })
        {
            throw new RegistrationException("Độ tuổi không quá 50 ký tự.");
        }

        if (Clean(imagePath) is { Length: > 500 })
        {
            throw new RegistrationException("Đường dẫn hình ảnh không quá 500 ký tự.");
        }

        if (format is not ("group" or "private"))
        {
            throw new RegistrationException("Hình thức khóa học phải là lớp nhóm hoặc học 1-1.");
        }

        if (format == "private")
        {
            if (sessionMinutes is null or <= 0 || sessionCount is null or <= 0)
            {
                throw new RegistrationException("Khóa học 1-1 cần số phút mỗi buổi và số buổi lớn hơn 0.");
            }
        }
        else if (sessionMinutes is not null || sessionCount is not null)
        {
            throw new RegistrationException("Khóa học lớp nhóm không có số buổi hay số phút mỗi buổi.");
        }

        return new CourseFields(name, price, sessionMinutes, sessionCount, Clean(levelName), Clean(ageRange), Clean(description), Clean(imagePath));
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static void ApplyCourseFields(Models.Course entity, CourseFields fields)
    {
        entity.CourseName = fields.Name;
        entity.Price = fields.Price;
        entity.SessionMinutes = fields.SessionMinutes;
        entity.SessionCount = fields.SessionCount;
        entity.LevelName = fields.LevelName;
        entity.AgeRange = fields.AgeRange;
        entity.Description = fields.Description;
        entity.ImagePath = fields.ImagePath;
    }

    private async Task<Models.Course> FindCourseAsync(string courseId)
    {
        var id = int.TryParse(courseId, out var parsed) ? parsed : 0;
        return await db.Courses.FirstOrDefaultAsync(course => course.CourseId == id)
            ?? throw new KeyNotFoundException("Không tìm thấy khóa học.");
    }

    private async Task<CourseAdminDto> GetCourseAsync(int courseId)
    {
        var item = await db.Courses.AsNoTracking()
            .Where(course => course.CourseId == courseId)
            .Select(course => new { Course = course, course.Sport!.SportName })
            .FirstAsync();
        return ToCourseDto(item.Course, item.SportName);
    }

    private static CourseAdminDto ToCourseDto(Models.Course course, string sportName) => new(
        course.CourseId.ToString(),
        course.SportId.ToString(),
        sportName,
        course.CourseCode,
        course.CourseName,
        course.LevelName,
        course.AgeRange,
        course.Description,
        course.Price,
        course.ImagePath,
        course.Format,
        course.SessionMinutes,
        course.SessionCount,
        course.Status == "active");

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

    // Một phòng chỉ thuộc một môn: phòng đã gắn cho môn khác thì không dùng được.
    private async Task EnsureRoomFreeForSportAsync(int roomId, int? sportId)
    {
        var other = await db.SportRooms.AsNoTracking()
            .Where(link => link.RoomId == roomId && link.SportId != sportId)
            .Join(db.Sports, link => link.SportId, sport => sport.SportId, (link, sport) => new { sport.SportName, link.RoomId })
            .Join(db.Rooms, item => item.RoomId, room => room.RoomId, (item, room) => new { item.SportName, room.RoomName })
            .FirstOrDefaultAsync();
        if (other is not null)
        {
            throw new RegistrationException($"Phòng {other.RoomName} đã dùng cho môn {other.SportName}.");
        }
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
