using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

public class ManagementDashboardService(AppDbContext db, CurrentActor actor)
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

    public async Task<AiTokenUsageReportDto> ListAiTokenUsageAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var usages = await db.AiTokenUsages.AsNoTracking().ToListAsync();
        var memberships = await db.Memberships
            .AsNoTracking()
            .Include(item => item.Package)
            .Where(item => item.Status == "active" && item.EndDate >= today && item.Package != null)
            .ToListAsync();
        var current = memberships
            .Where(item => AiMembershipQuota.IsEligible(item.Package!.PackageCode))
            .GroupBy(item => item.UserId)
            .ToDictionary(
                group => group.Key,
                group => group.OrderByDescending(item => item.Package!.Fee).First());
        var activeCounts = await db.Memberships
            .AsNoTracking()
            .Where(item => item.Status == "active" && item.EndDate >= today && item.MembershipPackageId != null)
            .GroupBy(item => item.MembershipPackageId!.Value)
            .Select(group => new { PackageId = group.Key, Count = group.Count() })
            .ToListAsync();
        var countByPackage = activeCounts.ToDictionary(item => item.PackageId, item => item.Count);
        var packages = (await db.MembershipPackages
            .AsNoTracking()
            .Where(item => item.PackageCode == AiMembershipQuota.BronzeCode
                || item.PackageCode == AiMembershipQuota.SilverCode
                || item.PackageCode == AiMembershipQuota.GoldCode)
            .OrderBy(item => item.PackageCode)
            .ToListAsync())
            .Select(item => ToPackageQuota(item, countByPackage.GetValueOrDefault(item.MembershipPackageId)))
            .ToList();
        var userIds = usages.Select(item => item.UserId).Concat(current.Keys).Distinct().ToList();
        if (userIds.Count == 0)
        {
            return new AiTokenUsageReportDto(0, packages, []);
        }

        var users = await db.UserAccounts
            .AsNoTracking()
            .Where(item => userIds.Contains(item.UserId))
            .OrderBy(item => item.FullName)
            .ThenBy(item => item.UserId)
            .ToListAsync();
        var rows = users.Select(user =>
        {
            var lifetime = usages.Where(item => item.UserId == user.UserId).Sum(item => (long)item.TotalTokens);
            current.TryGetValue(user.UserId, out var membership);
            var package = membership?.Package;
            var (regenerationLimit, tokenLimit) = package is null
                ? (0, 0)
                : AiMembershipQuota.LimitsOf(package);
            var period = membership is null
                ? []
                : usages.Where(item => item.MembershipId == membership.MembershipId).ToList();
            return new AiTokenUsageRowDto(
                user.UserId.ToString(),
                user.FullName,
                package?.PackageCode,
                package?.PackageName,
                AiMembershipQuota.Clamp(lifetime),
                AiMembershipQuota.Clamp(period.Sum(item => (long)item.TotalTokens)),
                tokenLimit,
                period.Count(item => item.Action == AiMembershipQuota.Regenerate),
                regenerationLimit);
        }).ToList();

        return new AiTokenUsageReportDto(
            AiMembershipQuota.Clamp(usages.Sum(item => (long)item.TotalTokens)),
            packages,
            rows);
    }

    public async Task<UpdateAiPackageQuotaResponse> UpdateAiQuotaAsync(int packageId, UpdateAiQuotaRequest request)
    {
        if (request.RegenerationLimit < 0)
        {
            throw new InvalidOperationException("Số lượt tạo lại không được âm.");
        }

        if (request.TokenLimit < 0)
        {
            throw new InvalidOperationException("Số token sử dụng không được âm.");
        }

        var package = await db.MembershipPackages
            .FirstOrDefaultAsync(item => item.MembershipPackageId == packageId)
            ?? throw new KeyNotFoundException("Không tìm thấy gói hội viên.");
        if (!AiMembershipQuota.IsEligible(package.PackageCode))
        {
            throw new InvalidOperationException("Chỉ chỉnh hạn mức AI cho gói từ Hạng Đồng trở lên.");
        }

        package.AiRegenerationLimit = request.RegenerationLimit;
        package.AiTokenLimit = request.TokenLimit;
        package.UpdatedAt = DateTime.Now;
        var today = DateOnly.FromDateTime(DateTime.Today);
        var activeMembers = await db.Memberships
            .CountAsync(item => item.MembershipPackageId == package.MembershipPackageId
                && item.Status == "active"
                && item.EndDate >= today);
        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = actor.UserId == 0 ? null : actor.UserId,
            Action = "Chỉnh hạn mức AI của gói",
            EntityName = "membership_package",
            EntityId = package.MembershipPackageId,
            Detail = $"{package.PackageName}: {request.RegenerationLimit} lượt tạo lại, {request.TokenLimit.ToString("N0", System.Globalization.CultureInfo.GetCultureInfo("vi-VN"))} token. Áp dụng cho {activeMembers} học viên đang dùng gói.",
            CreatedAt = DateTime.Now,
        });
        await db.SaveChangesAsync();

        var quota = ToPackageQuota(package, activeMembers);
        return new UpdateAiPackageQuotaResponse(
            quota,
            $"Đã cập nhật {package.PackageName}. {activeMembers} học viên đang dùng gói này nhận hạn mức mới.");
    }

    private static AiPackageQuotaDto ToPackageQuota(MembershipPackage package, int activeMembers) =>
        new(
            package.MembershipPackageId.ToString(),
            package.PackageCode,
            package.PackageName,
            package.AiRegenerationLimit,
            package.AiTokenLimit,
            activeMembers);

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
