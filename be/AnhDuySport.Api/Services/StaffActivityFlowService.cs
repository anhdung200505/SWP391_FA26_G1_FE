using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Hoạt động gần đây của lễ tân và quản trị, cho chuông "Hoạt động" ở trang quản trị và portal lễ tân.
public class StaffActivityFlowService(AppDbContext db)
{
    private const int DefaultLimit = 40;
    private const int MaxLimit = 100;

    // Dòng do database\02_seed.sql tạo, không phải thao tác của nhân viên.
    private const string SeedAction = "SEED";

    private static readonly Dictionary<string, string> StaffRoles = new()
    {
        ["RECEPTIONIST"] = "Lễ tân",
        ["ADMIN"] = "Quản trị",
    };

    // Lễ tân chỉ thấy hoạt động lễ tân. Quản trị thấy cả hai. role để trống với quản trị: cả hai. Mới nhất trước.
    public async Task<IReadOnlyList<StaffActivityDto>> AccessRecentAsync(string? actorRole, string? role, int? limit)
    {
        var receptionistOnly = string.Equals(actorRole, "RECEPTIONIST", StringComparison.OrdinalIgnoreCase);
        var roles = StaffRoles.Keys.ToList();
        if (receptionistOnly)
        {
            roles = ["RECEPTIONIST"];
        }
        else if (!string.IsNullOrWhiteSpace(role))
        {
            var roleKey = role.Trim().ToUpperInvariant();
            if (!StaffRoles.ContainsKey(roleKey))
            {
                throw new RegistrationException("role chỉ nhận RECEPTIONIST hoặc ADMIN.");
            }

            roles = [roleKey];
        }

        var take = Math.Clamp(limit ?? DefaultLimit, 1, MaxLimit);
        var rows = await (
                from log in db.ActivityLogs.AsNoTracking()
                join user in db.UserAccounts.AsNoTracking() on log.ActorUserId equals (int?)user.UserId
                where roles.Contains(user.Role!.RoleCode) && log.Action != SeedAction
                orderby log.CreatedAt descending, log.AuditLogId descending
                select new
                {
                    log.AuditLogId,
                    user.UserId,
                    user.FullName,
                    user.Role!.RoleCode,
                    log.Action,
                    log.EntityName,
                    log.EntityId,
                    log.Detail,
                    log.CreatedAt,
                })
            .Take(take)
            .ToListAsync();

        return rows
            .Select(row => new StaffActivityDto(
                row.AuditLogId.ToString(),
                row.UserId.ToString(),
                row.FullName,
                row.RoleCode,
                StaffRoles[row.RoleCode],
                row.Action,
                row.EntityName,
                row.EntityId?.ToString(),
                row.Detail,
                row.CreatedAt))
            .ToList();
    }
}
