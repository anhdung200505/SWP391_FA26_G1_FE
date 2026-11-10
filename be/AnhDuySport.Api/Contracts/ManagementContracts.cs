namespace AnhDuySport.Api.Contracts;

public sealed record RoleDto(string Id, string Label, IReadOnlyList<string> Permissions);

public sealed record EmailDto(string To, string Subject, string Body);

public sealed record CoachSportItemDto(string Id, string Name);

public sealed record UserAccountDto(
    string Id,
    string Code,
    string FullName,
    string Email,
    string Phone,
    string RoleId,
    string Status,
    string Unit,
    DateOnly JoinedAt,
    IReadOnlyList<CoachSportItemDto> Sports);

public sealed class UpdateCoachSportsRequest
{
    public List<string> SportIds { get; set; } = [];
}

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
    decimal UpgradeDiscountPercent,
    int AiRegenerationLimit = 0,
    int AiTokenLimit = 0,
    bool AiEligible = false);

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
    public List<string> SportIds { get; set; } = [];
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
    // Null = giữ nguyên hạn mức AI hiện tại của gói.
    public int? AiRegenerationLimit { get; set; }
    public int? AiTokenLimit { get; set; }
    public List<string> Benefits { get; set; } = [];
}

public sealed class UpdateAiQuotaRequest
{
    public int RegenerationLimit { get; set; }
    public int TokenLimit { get; set; }
}

public sealed record AiPackageQuotaDto(
    string PackageId,
    string PackageCode,
    string PackageName,
    int RegenerationLimit,
    int TokenLimit,
    int ActiveMembers);

public sealed record AiTokenMonthDto(int Year, int Month, int TokensUsed);

public sealed record AiTokenUsageRowDto(
    string MemberUserId,
    string MemberName,
    string? PackageCode,
    string? PackageName,
    int TokensUsed,
    int PeriodTokensUsed,
    int TokenLimit,
    int RegenerationsUsed,
    int RegenerationLimit,
    IReadOnlyList<AiTokenMonthDto> Months);

// Token Gemini của huấn luyện viên khi soạn bài tập từng buổi.
public sealed record AiCoachTokenRowDto(
    string CoachUserId,
    string CoachName,
    int TokensUsed,
    int Generations,
    int Regenerations,
    DateTime? LastUsedAt,
    IReadOnlyList<AiTokenMonthDto> Months);

public sealed record AiTokenUsageReportDto(
    int TotalTokensUsed,
    IReadOnlyList<AiPackageQuotaDto> Packages,
    IReadOnlyList<AiTokenUsageRowDto> Members,
    IReadOnlyList<AiTokenMonthDto> Months,
    IReadOnlyList<AiCoachTokenRowDto>? Coaches = null,
    int CoachTotalTokensUsed = 0,
    IReadOnlyList<AiTokenMonthDto>? CoachMonths = null);

public sealed record UpdateAiPackageQuotaResponse(
    AiPackageQuotaDto Package,
    string Message);

public sealed record RevenueLineDto(
    int PaymentId,
    DateTime PaidAt,
    string MemberName,
    string Title,
    string Subtitle,
    decimal Amount,
    string Method);

public sealed record RevenueGroupDto(string Name, int PaymentCount, decimal Total);

public sealed record RevenueSectionDto(
    decimal Total,
    int PaymentCount,
    IReadOnlyList<RevenueGroupDto> Groups,
    IReadOnlyList<RevenueLineDto> Lines);

public sealed record RevenueReportDto(RevenueSectionDto Course, RevenueSectionDto Membership);
