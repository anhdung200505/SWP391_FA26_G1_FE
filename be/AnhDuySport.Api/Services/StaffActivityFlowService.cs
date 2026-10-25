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

    // Thao tác của quản trị mà lễ tân cần biết để điều phối: lớp (thêm, sửa, xóa, đổi HLV cả lớp) và buổi học (đổi HLV, phòng, hủy).
    private static readonly string[] ReceptionVisibleAdminEntities = ["class", "session"];

    // Lễ tân thấy hoạt động lễ tân và các thao tác lớp / buổi học của quản trị.
    // Quản trị thấy cả hai. role (RECEPTIONIST hoặc ADMIN) lọc thêm theo vai trò người làm. Mới nhất trước.
    public async Task<IReadOnlyList<StaffActivityDto>> AccessRecentAsync(string? actorRole, string? role, int? limit)
    {
        var receptionistViewer = string.Equals(actorRole, "RECEPTIONIST", StringComparison.OrdinalIgnoreCase);
        var roles = StaffRoles.Keys.ToList();
        if (!string.IsNullOrWhiteSpace(role))
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
                where roles.Contains(user.Role!.RoleCode)
                    && log.Action != SeedAction
                    && (!receptionistViewer
                        || user.Role!.RoleCode == "RECEPTIONIST"
                        || ReceptionVisibleAdminEntities.Contains(log.EntityName))
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
