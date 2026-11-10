using System.Data;
using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Check-in vào trung tâm do lễ tân thao tác tay. Không gắn lớp học: chỉ cần gói hội viên còn hạn.
// Nhiều lượt mỗi ngày; nhập lại trong 10 phút sau lượt vừa check-in thì không tạo lượt mới.
// Lượt chưa check-out khi qua 00:00 được coi là tự đóng (suy ra từ thời gian, không ghi giờ ra).
public class CenterCheckInFlowService(AppDbContext db, CurrentActor actor, ReceptionFlowService reception)
{
    private const int DuplicateWindowMinutes = 10;

    private const int SearchLimit = 10;

    // Tìm học viên trước khi check-in: theo tên (không phân biệt dấu, hoa thường), mã học viên, email hoặc số điện thoại.
    // Chỉ trả học viên (MEMBER), tối đa 10, kèm gói còn hạn và lượt đang ở trong để màn hình chọn Check-in hay Check-out.
    public async Task<IReadOnlyList<CenterCheckInMemberDto>> SearchMembersAsync(string? keyword)
    {
        var term = keyword?.Trim() ?? "";
        if (term.Length == 0)
        {
            throw new RegistrationException("Nhập tên, mã học viên, email hoặc số điện thoại để tìm.");
        }

        var folded = Fold(term);
        var digits = AccountPhone.Digits(term);
        var phoneLike = digits.Length >= 3 && term.All(ch => char.IsDigit(ch) || ch is ' ' or '+' or '.' or '-');
        var members = await db.UserAccounts.AsNoTracking()
            .Where(user => user.Role!.RoleCode == "MEMBER")
            .Select(user => new { user.UserId, user.FullName, user.Phone, user.Email, user.Status })
            .ToListAsync();
        // Gõ đúng mã học viên là tra cứu chính xác: chỉ trả người đó, không lẫn với số điện thoại có chứa dãy số này.
        var byId = members.Where(user => user.UserId.ToString() == term).ToList();
        var found = (byId.Count > 0
                ? byId
                : members.Where(user => Fold(user.FullName).Contains(folded)
                    || (user.Email?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false)
                    || (phoneLike && AccountPhone.Digits(user.Phone).Contains(digits))))
            .OrderBy(user => user.FullName, StringComparer.CurrentCultureIgnoreCase)
            .Take(SearchLimit)
            .ToList();
        if (found.Count == 0)
        {
            return [];
        }

        var now = DateTime.Now;
        var today = DateOnly.FromDateTime(now);
        var ids = found.Select(user => user.UserId).ToList();
        var memberships = (await db.Memberships.AsNoTracking()
                .Where(item => ids.Contains(item.UserId) && item.Status == "active" && item.StartDate <= today && item.EndDate >= today)
                .ToListAsync())
            .GroupBy(item => item.UserId)
            .ToDictionary(group => group.Key, group => group.OrderByDescending(item => item.EndDate).First());
        var inside = (await db.CenterCheckIns.AsNoTracking()
                .Where(item => ids.Contains(item.UserId) && item.Status == "valid" && item.CheckedOutAt == null
                    && item.CheckedInAt >= now.Date && item.CheckedInAt < now.Date.AddDays(1))
                .ToListAsync())
            .GroupBy(item => item.UserId)
            .ToDictionary(group => group.Key, group => group.OrderByDescending(item => item.CheckedInAt).First());

        return found.Select(user =>
        {
            var membership = memberships.GetValueOrDefault(user.UserId);
            var current = inside.GetValueOrDefault(user.UserId);
            return new CenterCheckInMemberDto(
                user.UserId.ToString(),
                user.FullName,
                user.Phone ?? "",
                user.Email ?? "",
                user.Status,
                membership?.PlanName,
                membership?.EndDate,
                current?.CheckInId.ToString(),
                current?.CheckedInAt);
        }).ToList();
    }

    // Bỏ dấu và chữ hoa để "hung" tìm ra "Hùng".
    private static string Fold(string value) =>
        new string(value.Normalize(System.Text.NormalizationForm.FormD)
                .Where(ch => System.Globalization.CharUnicodeInfo.GetUnicodeCategory(ch) != System.Globalization.UnicodeCategory.NonSpacingMark)
                .ToArray())
            .Replace('đ', 'd').Replace('Đ', 'D')
            .ToLowerInvariant();

    public async Task<CenterCheckInResultDto> CheckInAsync(string? keyword)
    {
        var member = await reception.FindMemberByKeywordAsync(keyword);
        if (member.Status != "active")
        {
            throw new RegistrationException(member.Status == "locked"
                ? $"Tài khoản của {member.FullName} đang bị khóa."
                : $"Tài khoản của {member.FullName} đã ngừng hoạt động.");
        }

        var membership = await RequireActiveMembershipAsync(member, DateOnly.FromDateTime(DateTime.Now));

        // Khóa theo học viên: hai lễ tân (hoặc bấm đúp) check-in cùng lúc chạy lần lượt, lần sau thấy lượt của lần trước.
        return await LockedAsync($"center_checkin:user:{member.UserId}", async () =>
        {
            var now = DateTime.Now;
            var dayStart = now.Date;
            var last = await db.CenterCheckIns
                .Where(item => item.UserId == member.UserId && item.Status == "valid" && item.CheckedInAt >= dayStart && item.CheckedInAt < dayStart.AddDays(1))
                .OrderByDescending(item => item.CheckedInAt)
                .ThenByDescending(item => item.CheckInId)
                .FirstOrDefaultAsync();

            if (last is not null && last.CheckedOutAt is null)
            {
                return await ResultAsync("already_inside", last, now,
                    $"{member.FullName} đang ở trong trung tâm từ {last.CheckedInAt:HH:mm}. Bấm Check-out khi học viên ra về.");
            }

            if (last is not null && now - last.CheckedInAt < TimeSpan.FromMinutes(DuplicateWindowMinutes))
            {
                return await ResultAsync("duplicate", last, now,
                    $"{member.FullName} vừa check-in lúc {last.CheckedInAt:HH:mm}, bỏ qua lần nhập lại trong {DuplicateWindowMinutes} phút.");
            }

            var row = new CenterCheckIn
            {
                UserId = member.UserId,
                MembershipId = membership.MembershipId,
                CheckedInAt = now,
                CheckedInByUserId = RequireActorId(),
                Status = "valid",
            };
            db.CenterCheckIns.Add(row);
            await db.SaveChangesAsync();
            await LogAsync("Check-in trung tâm", row, member.FullName, $"{membership.PlanName} đến {membership.EndDate:dd/MM/yyyy}", now);
            return await ResultAsync("checked_in", row, now, $"Đã check-in {member.FullName} vào trung tâm.");
        });
    }

    public Task<CenterCheckInDto> CheckOutAsync(string checkInId) =>
        LockedAsync($"center_checkin:row:{checkInId.Trim()}", async () =>
        {
            var row = await FindAsync(checkInId);
            var now = DateTime.Now;
            if (row.Status == "voided")
            {
                throw new RegistrationException("Lượt check-in này đã bị hoàn tác.");
            }

            if (row.CheckedOutAt is not null)
            {
                throw new RegistrationException($"Học viên đã check-out lúc {row.CheckedOutAt:HH:mm}.");
            }

            if (row.CheckedInAt.Date < now.Date)
            {
                throw new RegistrationException("Lượt check-in này đã tự đóng lúc 00:00 nên không check-out được nữa.");
            }

            row.CheckedOutAt = now;
            row.CheckedOutByUserId = RequireActorId();
            await db.SaveChangesAsync();
            await LogAsync("Check-out trung tâm", row, await MemberNameAsync(row.UserId), $"Ra lúc {now:HH:mm}", now);
            return (await ToDtosAsync([row], now))[0];
        });

    // Lễ tân chỉ hoàn tác lượt trong ngày; quản trị hoàn tác mọi lúc. Giữ dòng, ghi lý do và người hủy.
    public Task<CenterCheckInDto> VoidAsync(string checkInId, string? reason, bool isAdmin)
    {
        var text = reason?.Trim() ?? "";
        if (text.Length == 0)
        {
            throw new RegistrationException("Nhập lý do hoàn tác check-in.");
        }

        if (text.Length > 500)
        {
            throw new RegistrationException("Lý do hoàn tác tối đa 500 ký tự.");
        }

        return LockedAsync($"center_checkin:row:{checkInId.Trim()}", async () =>
        {
            var row = await FindAsync(checkInId);
            var now = DateTime.Now;
            if (row.Status == "voided")
            {
                throw new RegistrationException("Lượt check-in này đã được hoàn tác.");
            }

            if (!isAdmin && row.CheckedInAt.Date != now.Date)
            {
                throw new RegistrationException("Lễ tân chỉ hoàn tác được lượt check-in trong ngày. Hãy nhờ quản lý hoàn tác lượt cũ.");
            }

            row.Status = "voided";
            row.VoidedAt = now;
            row.VoidedByUserId = RequireActorId();
            row.VoidReason = text;
            await db.SaveChangesAsync();
            await LogAsync("Hoàn tác check-in trung tâm", row, await MemberNameAsync(row.UserId), $"Lý do: {text}", now);
            return (await ToDtosAsync([row], now))[0];
        });
    }

    // status: bỏ trống = mọi lượt hợp lệ trong ngày; inside = đang ở trong; voided = đã hoàn tác.
    public async Task<CenterCheckInListDto> AccessAsync(DateOnly? date, string? keyword, string? status)
    {
        var now = DateTime.Now;
        var day = date ?? DateOnly.FromDateTime(now);
        var mode = status?.Trim().ToLowerInvariant();
        if (!string.IsNullOrEmpty(mode) && mode is not ("inside" or "voided"))
        {
            throw new RegistrationException("Trạng thái lọc phải là inside hoặc voided.");
        }

        var start = day.ToDateTime(TimeOnly.MinValue);
        var rows = await db.CenterCheckIns.AsNoTracking()
            .Where(item => item.CheckedInAt >= start && item.CheckedInAt < start.AddDays(1))
            .OrderByDescending(item => item.CheckedInAt)
            .ThenByDescending(item => item.CheckInId)
            .ToListAsync();

        var valid = rows.Where(item => item.Status == "valid").ToList();
        var inside = valid.Count(item => IsInside(item, now));
        var summary = new CenterCheckInSummaryDto(
            valid.Count,
            valid.Select(item => item.UserId).Distinct().Count(),
            inside,
            rows.Count - valid.Count);

        var shown = mode switch
        {
            "voided" => rows.Where(item => item.Status == "voided"),
            "inside" => valid.Where(item => IsInside(item, now)),
            _ => valid.AsEnumerable(),
        };
        var items = await ToDtosAsync(shown.ToList(), now);

        var term = keyword?.Trim();
        if (!string.IsNullOrEmpty(term))
        {
            var digits = AccountPhone.Digits(term);
            items = items
                .Where(item => item.FullName.Contains(term, StringComparison.OrdinalIgnoreCase)
                    || item.MemberUserId == term
                    || (digits.Length > 0 && AccountPhone.Digits(item.Phone).Contains(digits))
                    || (item.Email?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false))
                .ToList();
        }

        return new CenterCheckInListDto(day, summary, items);
    }

    private async Task<Membership> RequireActiveMembershipAsync(UserAccount member, DateOnly today)
    {
        var memberships = await db.Memberships.AsNoTracking()
            .Where(item => item.UserId == member.UserId)
            .ToListAsync();

        var current = memberships
            .Where(item => item.Status == "active" && item.StartDate <= today && item.EndDate >= today)
            .OrderByDescending(item => item.EndDate)
            .FirstOrDefault();
        if (current is not null)
        {
            return current;
        }

        var upcoming = memberships
            .Where(item => item.Status is "active" or "scheduled" && item.StartDate > today)
            .OrderBy(item => item.StartDate)
            .FirstOrDefault();
        if (upcoming is not null)
        {
            throw new RegistrationException($"Gói hội viên của {member.FullName} chỉ bắt đầu từ {upcoming.StartDate:dd/MM/yyyy}.");
        }

        var expired = memberships
            .Where(item => item.Status is "active" or "expired" or "renewed" or "upgraded" && item.EndDate < today)
            .OrderByDescending(item => item.EndDate)
            .FirstOrDefault();
        throw new RegistrationException(expired is not null
            ? $"Gói hội viên của {member.FullName} đã hết hạn ngày {expired.EndDate:dd/MM/yyyy}."
            : $"{member.FullName} chưa có gói hội viên.");
    }

    private static bool IsInside(CenterCheckIn row, DateTime now) =>
        row.Status == "valid" && row.CheckedOutAt is null && row.CheckedInAt.Date == now.Date;

    private static string StatusOf(CenterCheckIn row, DateTime now) =>
        row.Status == "voided" ? "voided"
        : row.CheckedOutAt is not null ? "left"
        : row.CheckedInAt.Date == now.Date ? "inside"
        : "auto_closed";

    private int RequireActorId() =>
        actor.UserId != 0 ? actor.UserId : throw new RegistrationException("Phiên đăng nhập không hợp lệ.");

    private async Task<CenterCheckIn> FindAsync(string checkInId)
    {
        var id = int.TryParse(checkInId, out var parsed) ? parsed : 0;
        return await db.CenterCheckIns.FirstOrDefaultAsync(item => item.CheckInId == id)
            ?? throw new KeyNotFoundException("Không tìm thấy lượt check-in.");
    }

    private async Task LogAsync(string action, CenterCheckIn row, string memberName, string detail, DateTime at)
    {
        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = actor.UserId == 0 ? null : actor.UserId,
            Action = action,
            EntityName = "center_checkin",
            EntityId = row.CheckInId,
            Detail = $"{memberName} · {detail}",
            CreatedAt = at,
        });
        await db.SaveChangesAsync();
    }

    private Task<string> MemberNameAsync(int userId) =>
        db.UserAccounts.AsNoTracking().Where(user => user.UserId == userId).Select(user => user.FullName).FirstAsync();

    // Chạy body trong một transaction giữ khóa ứng dụng (sp_getapplock) theo resource: các thao tác trên cùng học viên hoặc
    // cùng lượt chạy lần lượt, và việc ghi lượt cùng audit log thành công hoặc hủy cùng nhau.
    private async Task<T> LockedAsync<T>(string resource, Func<Task<T>> body)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();
        var result = new SqlParameter("@result", SqlDbType.Int) { Direction = ParameterDirection.Output };
        await db.Database.ExecuteSqlRawAsync(
            "EXEC @result = sp_getapplock @Resource = @resource, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000",
            result,
            new SqlParameter("@resource", resource));
        if ((int)result.Value < 0)
        {
            throw new RegistrationException("Hệ thống đang xử lý lượt check-in này, hãy thử lại sau giây lát.");
        }

        var value = await body();
        await transaction.CommitAsync();
        return value;
    }

    private async Task<CenterCheckInResultDto> ResultAsync(string outcome, CenterCheckIn row, DateTime now, string message) =>
        new(outcome, (await ToDtosAsync([row], now))[0], message);

    private async Task<List<CenterCheckInDto>> ToDtosAsync(IReadOnlyList<CenterCheckIn> rows, DateTime now)
    {
        if (rows.Count == 0)
        {
            return [];
        }

        var userIds = rows.Select(item => item.UserId)
            .Concat(rows.Select(item => item.CheckedInByUserId))
            .Distinct()
            .ToList();
        var users = await db.UserAccounts.AsNoTracking()
            .Where(user => userIds.Contains(user.UserId))
            .ToDictionaryAsync(user => user.UserId);
        var membershipIds = rows.Where(item => item.MembershipId != null).Select(item => item.MembershipId!.Value).Distinct().ToList();
        var memberships = await db.Memberships.AsNoTracking()
            .Where(item => membershipIds.Contains(item.MembershipId))
            .ToDictionaryAsync(item => item.MembershipId);

        return rows.Select(row =>
        {
            var member = users[row.UserId];
            var membership = row.MembershipId is { } id ? memberships.GetValueOrDefault(id) : null;
            return new CenterCheckInDto(
                row.CheckInId.ToString(),
                row.UserId.ToString(),
                member.FullName,
                member.Phone ?? "",
                member.Email,
                membership?.PlanName,
                membership?.EndDate,
                row.CheckedInAt,
                row.CheckedOutAt,
                StatusOf(row, now),
                users.GetValueOrDefault(row.CheckedInByUserId)?.FullName ?? "",
                row.VoidReason,
                row.VoidedAt);
        }).ToList();
    }
}
