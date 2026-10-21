namespace AnhDuySport.Api.Contracts;

public sealed record RoleDto(string Id, string Label, IReadOnlyList<string> Permissions);

public sealed record EmailDto(string To, string Subject, string Body);

public sealed record UserAccountDto(
    string Id,
    string Code,
    string FullName,
    string Email,
    string Phone,
    string RoleId,
    string Status,
    string Unit,
    DateOnly JoinedAt);

public sealed record ActivityLogDto(
    string Id,
    DateTimeOffset At,
    string Type,
    string Actor,
    string UserId,
    string UserName,
    string Summary,
    string Detail,
    EmailDto? Email);

public sealed record PackageDto(
    string Id,
    string Code,
    string Name,
    decimal Fee,
    int ValidityMonths,
    IReadOnlyList<string> Benefits,
    DateTimeOffset UpdatedAt,
    decimal UpgradeDiscountPercent);

public sealed record DashboardDto(
    int TotalAccounts,
    int ActiveAccounts,
    int InactiveAccounts,
    int PackageCount,
    IReadOnlyList<RoleDto> Roles,
    IReadOnlyList<UserAccountDto> Users,
    IReadOnlyList<PackageDto> Packages,
    IReadOnlyList<ActivityLogDto> Logs);

public sealed record UserMutationResponse(UserAccountDto User, ActivityLogDto Log);

public sealed record PackageMutationResponse(PackageDto Package, ActivityLogDto Log);

public sealed class CreateStaffRequest
{
    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Phone { get; set; }
    public string Password { get; set; } = "";
    public string RoleId { get; set; } = "";
}

public sealed class UpdateRoleRequest
{
    public string RoleId { get; set; } = "";
}

public sealed class UpdateStatusRequest
{
    public string Status { get; set; } = "";
}

public sealed class CreatePackageRequest
{
    public string Name { get; set; } = "";
    public decimal Fee { get; set; }
    public int ValidityMonths { get; set; }
    public decimal UpgradeDiscountPercent { get; set; }
    public List<string> Benefits { get; set; } = [];
}

public sealed class UpdatePackageSettingRequest
{
    public decimal Fee { get; set; }
    public int ValidityMonths { get; set; }
    public decimal UpgradeDiscountPercent { get; set; }
    public List<string> Benefits { get; set; } = [];
}
