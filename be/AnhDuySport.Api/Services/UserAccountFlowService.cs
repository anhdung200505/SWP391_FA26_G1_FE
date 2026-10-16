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

        return users.Select(AccountFlowMapper.ToDto).ToList();
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
        var phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
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

        if (phone is { Length: > 20 })
        {
            throw new InvalidOperationException("Số điện thoại không quá 20 ký tự.");
        }

        if (roleCode is not ("RECEPTIONIST" or "COACH"))
        {
            throw new InvalidOperationException("Chỉ tạo được tài khoản lễ tân hoặc huấn luyện viên.");
        }

        PasswordHasher.EnsureAcceptable(password);

        var emailTaken = await db.UserAccounts.AnyAsync(account =>
            account.Email != null && account.Email.ToLower() == email.ToLower());
        if (emailTaken)
        {
            throw new InvalidOperationException("Email này đã được dùng.");
        }

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

        var actorName = await ActorNameAsync();
        var log = AddLog(
            $"Thêm {role.RoleName} {user.FullName}",
            "user",
            user.UserId,
            "Quản trị trung tâm tạo tài khoản lễ tân hoặc huấn luyện viên.");
        await db.SaveChangesAsync();
        return new UserMutationResponse(AccountFlowMapper.ToDto(user), ToLogDto(log, actorName, user.FullName, null));
    }

    public async Task<UserAccountDto?> SelectUserAccountAsync(string userId)
    {
        if (!int.TryParse(userId, out var id))
        {
            return null;
        }

        var user = await db.UserAccounts.AsNoTracking().Include(item => item.Role).FirstOrDefaultAsync(item => item.UserId == id);
        return user is null ? null : AccountFlowMapper.ToDto(user);
    }

    public async Task<UserMutationResponse> ModifyRoleAsync(string userId, string roleCode)
    {
        var user = await FindEditableUserAsync(userId);
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
        return new UserMutationResponse(AccountFlowMapper.ToDto(user), ToLogDto(log, actor, user.FullName, null));
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
        var (subject, body) = emailNotifications.BuildAccountStatusEmail(user, nextStatus);
        var now = DateTime.Now;
        db.Notifications.Add(new AccountNotification
        {
            UserId = user.UserId,
            Title = subject,
            Content = body,
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
        var email = new EmailDto(user.Email ?? "", subject, body);
        return new UserMutationResponse(AccountFlowMapper.ToDto(user), ToLogDto(log, actor, user.FullName, email));
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
