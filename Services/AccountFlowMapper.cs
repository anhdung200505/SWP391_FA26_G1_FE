using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

public static class AccountFlowMapper
{
    public static UserAccountDto ToDto(UserAccount user, IReadOnlyList<CoachSportItemDto>? sports = null) =>
        new(
            user.UserId.ToString(),
            $"ND-{user.UserId:D4}",
            user.FullName,
            user.Email ?? "",
            user.Phone ?? "",
            user.Role?.RoleCode ?? "",
            user.Status,
            user.Role?.RoleName ?? "",
            DateOnly.FromDateTime(user.CreatedAt),
            sports ?? []);

    public static async Task<Dictionary<int, IReadOnlyList<CoachSportItemDto>>> LoadCoachSportsAsync(
        AppDbContext db, IReadOnlyCollection<int> userIds)
    {
        if (userIds.Count == 0)
        {
            return [];
        }

        var rows = await db.CoachSports.AsNoTracking()
            .Where(link => userIds.Contains(link.CoachUserId))
            .Join(
                db.Sports.AsNoTracking(),
                link => link.SportId,
                sport => sport.SportId,
                (link, sport) => new { link.CoachUserId, sport.SportId, sport.SportName })
            .ToListAsync();

        return rows
            .GroupBy(row => row.CoachUserId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<CoachSportItemDto>)group
                    .OrderBy(row => row.SportName)
                    .Select(row => new CoachSportItemDto(row.SportId.ToString(), row.SportName))
                    .ToList());
    }

    public static PackageDto ToDto(MembershipPackage package) =>
        new(
            package.MembershipPackageId.ToString(),
            package.PackageCode,
            package.PackageName,
            package.Fee,
            package.ValidityMonths,
            SplitBenefits(package.Benefits),
            package.UpdatedAt ?? package.CreatedAt,
            package.UpgradeDiscountPercent);

    public static IReadOnlyList<string> SplitBenefits(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return [];
        }

        var source = text.Contains('\n')
            ? text.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            : text.Split(". ", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        return source
            .Select(item => item.Trim().TrimEnd('.'))
            .Where(item => item.Length > 0)
            .ToList();
    }

    public static string JoinBenefits(IReadOnlyList<string> benefits)
    {
        var sentences = benefits.Select(item =>
        {
            var trimmed = item.Trim().TrimEnd('.');
            return $"{trimmed}.";
        });
        return string.Join(' ', sentences);
    }
}
