using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

public class ManagementDashboardService(AppDbContext db)
{
    public async Task<DashboardDto> AccessDashboardAsync()
    {
        var users = await db.UserAccounts.AsNoTracking().Include(user => user.Role).OrderBy(user => user.UserId).ToListAsync();
        var packages = await db.MembershipPackages.AsNoTracking().OrderBy(package => package.PackageCode).ToListAsync();
        var logs = await db.ActivityLogs.AsNoTracking().OrderByDescending(log => log.CreatedAt).ToListAsync();
        var notes = await db.Notifications.AsNoTracking().ToListAsync();
        var roles = await db.Roles.AsNoTracking().Include(role => role.Permissions).OrderBy(role => role.RoleId).ToListAsync();
        var names = users.ToDictionary(user => user.UserId, user => user.FullName);
        var emails = users.ToDictionary(user => user.UserId, user => user.Email ?? "");
        var packageNames = packages.ToDictionary(package => package.MembershipPackageId, package => package.PackageName);
        var activeCount = users.Count(user => user.Status == "active");

        return new DashboardDto(
            users.Count,
            activeCount,
            users.Count(user => user.Status != "active"),
            packages.Count,
            roles.Select(ToRoleDto).ToList(),
            users.Select(AccountFlowMapper.ToDto).ToList(),
            packages.Select(AccountFlowMapper.ToDto).ToList(),
            logs.Select(log => ToLogDto(log, names, emails, packageNames, notes)).ToList());
    }

    public async Task<IReadOnlyList<RoleDto>> ListRolesAsync()
    {
        var roles = await db.Roles.AsNoTracking().Include(role => role.Permissions).OrderBy(role => role.RoleId).ToListAsync();
        return roles.Select(ToRoleDto).ToList();
    }

    private static RoleDto ToRoleDto(Role role) =>
        new(
            role.RoleCode,
            role.RoleName,
            role.Permissions.OrderBy(permission => permission.PermissionCode).Select(permission => permission.PermissionName).ToList());

    private static ActivityLogDto ToLogDto(
        ActivityLog log,
        IReadOnlyDictionary<int, string> names,
        IReadOnlyDictionary<int, string> emails,
        IReadOnlyDictionary<int, string> packageNames,
        IReadOnlyList<AccountNotification> notes)
    {
        var targetId = log.EntityId ?? 0;
        var targetName = log.EntityName == "membership_package"
            ? packageNames.GetValueOrDefault(targetId, "Gói hội viên")
            : names.GetValueOrDefault(targetId, "Tài khoản");
        var actor = log.ActorUserId is int actorId
            ? names.GetValueOrDefault(actorId, "Quản trị AnhDuy")
            : "Hệ thống";
        AccountNotification? note = null;
        if (log.EntityName == "user")
        {
            note = notes
                .Where(item => item.UserId == targetId)
                .OrderBy(item => Math.Abs((item.CreatedAt - log.CreatedAt).TotalSeconds))
                .FirstOrDefault();
            if (note is not null && Math.Abs((note.CreatedAt - log.CreatedAt).TotalSeconds) > 10)
            {
                note = null;
            }
        }

        return new ActivityLogDto(
            log.AuditLogId.ToString(),
            log.CreatedAt,
            log.EntityName,
            actor,
            targetId.ToString(),
            targetName,
            log.Action,
            log.Detail ?? "",
            note is null ? null : new EmailDto(emails.GetValueOrDefault(targetId) ?? "", note.Title, note.Content));
    }
}
