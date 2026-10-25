using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

public class UserAccountFlowService(
    AppDbContext db,
    EmailNotificationService emailNotifications,
    CurrentActor actor,
    PasswordHasher passwords)
{
    public async Task<IReadOnlyList<UserAccountDto>> AccessUserAccountListAsync(string? search, string? roleId, string? status)
    {
        var users = await db.UserAccounts
            .AsNoTracking()
            .Include(user => user.Role)
            .OrderBy(user => user.UserId)
            .ToListAsync();

        if (!string.IsNullOrWhiteSpace(roleId) && roleId != "all")
        {
            users = users.Where(user => user.Role?.RoleCode == roleId).ToList();
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "all")
        {
            users = users.Where(user => user.Status == status).ToList();
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim();
            users = users.Where(user =>
                    user.FullName.Contains(keyword, StringComparison.OrdinalIgnoreCase)
                    || (user.Email ?? "").Contains(keyword, StringComparison.OrdinalIgnoreCase)
                    || (user.Phone ?? "").Contains(keyword, StringComparison.OrdinalIgnoreCase)
                    || $"ND-{user.UserId:D4}".Contains(keyword, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        return await MapUsersAsync(users);
    }

    public async Task<UserMutationResponse> CreateStaffAccountAsync(CreateStaffRequest request)
    {
        var manager = await db.UserAccounts.AsNoTracking().Include(account => account.Role)
            .FirstOrDefaultAsync(account => account.UserId == actor.UserId);
        if (manager?.Role?.RoleCode != RoleCatalog.AdminCode)
        {
            throw new UnauthorizedAccessException("Chỉ quản trị trung tâm tạo được tài khoản huấn luyện viên và lễ tân.");
        }

        var fullName = request.FullName?.Trim() ?? "";
        var email = request.Email?.Trim() ?? "";
        var phone = AccountPhone.Require(request.Phone);
        var password = request.Password ?? "";
        var roleCode = request.RoleId?.Trim() ?? "";

        if (fullName.Length is 0 or > 200)
        {
            throw new InvalidOperationException("Họ tên không được để trống và không quá 200 ký tự.");
        }

        if (email.Length is 0 or > 200 || !email.Contains('@'))
        {
            throw new InvalidOperationException("Email không hợp lệ.");
        }

        if (roleCode is not ("RECEPTIONIST" or "COACH"))
        {
            throw new InvalidOperationException("Chỉ tạo được tài khoản lễ tân hoặc huấn luyện viên.");
        }

        var sportIds = roleCode == "COACH"
            ? await ResolveSportIdsAsync(request.SportIds, requireAtLeastOne: true)
            : [];

        PasswordHasher.EnsureAcceptable(password);

        var emailTaken = await db.UserAccounts.AnyAsync(account =>
            account.Email != null && account.Email.ToLower() == email.ToLower());
        if (emailTaken)
        {
            throw new InvalidOperationException("Email này đã được dùng.");
        }

        await AccountPhone.EnsureUniqueAsync(db, phone);

        var role = await db.Roles.FirstOrDefaultAsync(item => item.RoleCode == roleCode)
            ?? throw new InvalidOperationException("Không tìm thấy vai trò.");
        var user = new UserAccount
        {
            RoleId = role.RoleId,
            Role = role,
            CenterId = manager.CenterId ?? 1,
            FullName = fullName,
            Email = email,
            Phone = phone,
            PasswordHash = passwords.Hash(password),
            Status = "active",
            CreatedAt = DateTime.Now,
        };
        db.UserAccounts.Add(user);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            throw new InvalidOperationException("Email này đã được dùng.");
        }

        foreach (var sportId in sportIds)
        {
            db.CoachSports.Add(new CoachSport { CoachUserId = user.UserId, SportId = sportId });
        }

        var actorName = await ActorNameAsync();
        var sportNote = sportIds.Count == 0 ? "" : $" Môn: {await SportNamesAsync(sportIds)}.";
        var log = AddLog(
            $"Thêm {role.RoleName} {user.FullName}",
            "user",
            user.UserId,
            $"Quản trị trung tâm tạo tài khoản lễ tân hoặc huấn luyện viên.{sportNote}");
        await db.SaveChangesAsync();
        return new UserMutationResponse(await MapUserAsync(user), ToLogDto(log, actorName, user.FullName, null));
    }

    public async Task<UserAccountDto?> SelectUserAccountAsync(string userId)
    {
        if (!int.TryParse(userId, out var id))
        {
            return null;
        }

        var user = await db.UserAccounts.AsNoTracking().Include(item => item.Role).FirstOrDefaultAsync(item => item.UserId == id);
        return user is null ? null : await MapUserAsync(user);
    }

    public async Task<UserMutationResponse> ModifyRoleAsync(string userId, string roleCode)
    {
        var user = await FindEditableUserAsync(userId);
        if (roleCode == RoleCatalog.AdminCode)
        {
            throw new InvalidOperationException("Không cấp vai trò quản trị qua chức năng đổi vai trò.");
        }

        var nextRole = await db.Roles.FirstOrDefaultAsync(role => role.RoleCode == roleCode)
            ?? throw new InvalidOperationException("Vai trò không hợp lệ.");
        if (user.RoleId == nextRole.RoleId)
        {
            throw new InvalidOperationException("Vai trò không thay đổi.");
        }

        var previousLabel = user.Role?.RoleName ?? "Chưa gán";
        user.RoleId = nextRole.RoleId;
        user.Role = nextRole;
        var actor = await ActorNameAsync();
        var log = AddLog(
            $"Đổi vai trò của {user.FullName}",
            "user",
            user.UserId,
            $"{previousLabel} → {nextRole.RoleName}");
        await db.SaveChangesAsync();
        return new UserMutationResponse(await MapUserAsync(user), ToLogDto(log, actor, user.FullName, null));
    }

    // Thay toàn bộ môn của HLV. Một HLV có thể dạy nhiều môn. Không bỏ môn khi HLV còn lớp hoặc buổi sắp tới của môn đó.
    public async Task<UserMutationResponse> UpdateCoachSportsAsync(string userId, IReadOnlyList<string>? sportIds)
    {
        var user = await FindEditableUserAsync(userId);
        if (user.Role?.RoleCode != "COACH")
        {
            throw new InvalidOperationException("Chỉ gán môn cho tài khoản huấn luyện viên.");
        }

        var nextIds = await ResolveSportIdsAsync(sportIds, requireAtLeastOne: true);
        var existing = await db.CoachSports.Where(link => link.CoachUserId == user.UserId).ToListAsync();
        var currentIds = existing.Select(link => link.SportId).OrderBy(id => id).ToList();
        if (currentIds.SequenceEqual(nextIds))
        {
            throw new InvalidOperationException("Môn dạy không thay đổi.");
        }

        var removed = currentIds.Where(id => !nextIds.Contains(id)).ToList();
        if (removed.Count > 0)
        {
            var blocked = await BlockedSportNamesAsync(user.UserId, removed);
            if (blocked.Count > 0)
            {
                throw new InvalidOperationException($"Không bỏ được môn {string.Join(", ", blocked)} vì huấn luyện viên còn lớp hoặc buổi sắp tới của môn đó.");
            }
        }

        db.CoachSports.RemoveRange(existing.Where(link => !nextIds.Contains(link.SportId)));
        foreach (var sportId in nextIds.Where(id => !currentIds.Contains(id)))
        {
            db.CoachSports.Add(new CoachSport { CoachUserId = user.UserId, SportId = sportId });
        }

        var actorName = await ActorNameAsync();
        var names = await SportNamesAsync(nextIds);
        var log = AddLog(
            $"Cập nhật môn của {user.FullName}",
            "user",
            user.UserId,
            names);
        await db.SaveChangesAsync();
        return new UserMutationResponse(await MapUserAsync(user), ToLogDto(log, actorName, user.FullName, null));
    }

    public async Task<UserMutationResponse> ActiveOrInactiveUserAccountAsync(string userId, string nextStatus)
    {
        var user = await FindEditableUserAsync(userId);
        if (nextStatus is not ("active" or "inactive"))
        {
            throw new InvalidOperationException("Trạng thái không hợp lệ.");
        }

        if (user.Status == nextStatus)
        {
            throw new InvalidOperationException("Trạng thái không thay đổi.");
        }

        var previousLabel = RoleCatalog.StatusLabel(user.Status);
        var nextLabel = RoleCatalog.StatusLabel(nextStatus);
        user.Status = nextStatus;
        var email = await emailNotifications.SendAccountStatusEmailAsync(user, nextStatus);
        var now = DateTime.Now;
        db.Notifications.Add(new AccountNotification
        {
            UserId = user.UserId,
            Title = email.Subject,
            Content = email.Body,
            IsRead = false,
            CreatedAt = now,
        });
        var verb = nextStatus == "active" ? "Kích hoạt" : "Vô hiệu hóa";
        var actor = await ActorNameAsync();
        var log = AddLog(
            $"{verb} tài khoản {user.FullName}",
            "user",
            user.UserId,
            $"{previousLabel} → {nextLabel}",
            now);
        await db.SaveChangesAsync();
        return new UserMutationResponse(await MapUserAsync(user), ToLogDto(log, actor, user.FullName, email));
    }

    private async Task<List<UserAccountDto>> MapUsersAsync(IReadOnlyList<UserAccount> users)
    {
        var sports = await AccountFlowMapper.LoadCoachSportsAsync(db, users.Select(user => user.UserId).ToList());
        return users.Select(user => AccountFlowMapper.ToDto(user, sports.GetValueOrDefault(user.UserId))).ToList();
    }

    private async Task<UserAccountDto> MapUserAsync(UserAccount user)
    {
        var sports = await AccountFlowMapper.LoadCoachSportsAsync(db, [user.UserId]);
        return AccountFlowMapper.ToDto(user, sports.GetValueOrDefault(user.UserId));
    }

    private async Task<List<int>> ResolveSportIdsAsync(IReadOnlyList<string>? sportIds, bool requireAtLeastOne)
    {
        var parsed = new List<int>();
        foreach (var value in sportIds ?? [])
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                continue;
            }

            if (!int.TryParse(value, out var sportId))
            {
                throw new InvalidOperationException("Không tìm thấy môn thể thao.");
            }

            if (!parsed.Contains(sportId))
            {
                parsed.Add(sportId);
            }
        }

        parsed.Sort();
        if (requireAtLeastOne && parsed.Count == 0)
        {
            throw new InvalidOperationException("Chọn ít nhất một môn cho huấn luyện viên.");
        }

        if (parsed.Count == 0)
        {
            return parsed;
        }

        var known = await db.Sports.AsNoTracking()
            .Where(sport => parsed.Contains(sport.SportId))
            .Select(sport => sport.SportId)
            .ToListAsync();
        if (known.Count != parsed.Count)
        {
            throw new InvalidOperationException("Không tìm thấy môn thể thao.");
        }

        return parsed;
    }

    private async Task<string> SportNamesAsync(IReadOnlyList<int> sportIds)
    {
        var names = await db.Sports.AsNoTracking()
            .Where(sport => sportIds.Contains(sport.SportId))
            .OrderBy(sport => sport.SportName)
            .Select(sport => sport.SportName)
            .ToListAsync();
        return string.Join(", ", names);
    }

    private async Task<List<string>> BlockedSportNamesAsync(int coachId, IReadOnlyList<int> sportIds)
    {
        var today = DateOnly.FromDateTime(DateTime.Now);
        var classNames = await (
            from item in db.Classes.AsNoTracking()
            join course in db.Courses.AsNoTracking() on item.CourseId equals course.CourseId
            join sport in db.Sports.AsNoTracking() on course.SportId equals sport.SportId
            where item.CoachUserId == coachId
                && item.Status != "cancelled"
                && item.Status != "closed"
                && sportIds.Contains(course.SportId)
            select sport.SportName).Distinct().ToListAsync();

        var sessionNames = await (
            from session in db.ClassSessions.AsNoTracking()
            join item in db.Classes.AsNoTracking() on session.ClassId equals item.ClassId
            join course in db.Courses.AsNoTracking() on item.CourseId equals course.CourseId
            join sport in db.Sports.AsNoTracking() on course.SportId equals sport.SportId
            where session.CoachUserId == coachId
                && session.Status != "cancelled"
                && session.SessionDate >= today
                && sportIds.Contains(course.SportId)
            select sport.SportName).Distinct().ToListAsync();

        return classNames.Concat(sessionNames).Distinct().OrderBy(name => name).ToList();
    }

    private async Task<UserAccount> FindEditableUserAsync(string userId)
    {
        if (!int.TryParse(userId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy tài khoản.");
        }

        var user = await db.UserAccounts.Include(item => item.Role).FirstOrDefaultAsync(item => item.UserId == id)
            ?? throw new KeyNotFoundException("Không tìm thấy tài khoản.");
        if (user.UserId == RoleCatalog.ActorUserId || user.Role?.RoleCode == RoleCatalog.AdminCode)
        {
            throw new InvalidOperationException("Không đổi vai trò hoặc trạng thái của tài khoản quản trị.");
        }

        return user;
    }

    private async Task<string> ActorNameAsync()
    {
        return await actor.NameAsync();
    }

    private ActivityLog AddLog(string action, string entityName, int entityId, string detail, DateTime? at = null)
    {
        var log = new ActivityLog
        {
            ActorUserId = actor.UserId == 0 ? null : actor.UserId,
            Action = Trim(action, 100),
            EntityName = entityName,
            EntityId = entityId,
            Detail = detail,
            CreatedAt = at ?? DateTime.Now,
        };
        db.ActivityLogs.Add(log);
        return log;
    }

    private static ActivityLogDto ToLogDto(ActivityLog log, string actor, string targetName, EmailDto? email) =>
        new(
            log.AuditLogId == 0 ? Guid.NewGuid().ToString() : log.AuditLogId.ToString(),
            log.CreatedAt,
            log.EntityName,
            actor,
            log.EntityId?.ToString() ?? "",
            targetName,
            log.Action,
            log.Detail ?? "",
            email);

    private static string Trim(string value, int max) =>
        value.Length <= max ? value : value[..max];
}
