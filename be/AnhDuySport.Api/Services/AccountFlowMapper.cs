using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Models;

namespace AnhDuySport.Api.Services;

public static class AccountFlowMapper
{
    public static UserAccountDto ToDto(UserAccount user) =>
        new(
            user.UserId.ToString(),
            $"ND-{user.UserId:D4}",
            user.FullName,
            user.Email ?? "",
            user.Phone ?? "",
            user.Role?.RoleCode ?? "",
            user.Status,
            user.Role?.RoleName ?? "",
            DateOnly.FromDateTime(user.CreatedAt));

    public static PackageDto ToDto(MembershipPackage package) =>
        new(
            package.MembershipPackageId.ToString(),
            package.PackageCode,
            package.PackageName,
            package.Fee,
            package.ValidityMonths,
            SplitBenefits(package.Benefits),
            package.UpdatedAt ?? package.CreatedAt,
            package.ClassDiscountPercent);

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
