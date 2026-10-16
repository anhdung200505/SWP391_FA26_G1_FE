namespace AnhDuySport.Api.Contracts;

// ===== Edit personal information =====

public sealed record MemberProfileDto(
    string Id,
    string Code,
    string FullName,
    string Email,
    string Phone,
    DateOnly? DateOfBirth,
    string Gender,
    string Status);

public sealed record MemberProfileMutationResponse(MemberProfileDto Profile, string Message, ActivityLogDto Log);

public sealed class UpdateMemberProfileRequest
{
    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";
    public string Phone { get; set; } = "";
    public DateOnly? DateOfBirth { get; set; }
    public string? Gender { get; set; }
}

// ===== Renew / Upgrade Package =====

public sealed record MembershipDto(
    string Id,
    string? PackageId,
    string PlanName,
    string RenewalType,
    DateOnly StartDate,
    DateOnly EndDate,
    string Status,
    decimal AmountPaid,
    string InvoiceCode,
    string PaymentMethod);

// View membership management
public sealed record MembershipManagementDto(
    MemberProfileDto Profile,
    MembershipDto? CurrentMembership,
    DateOnly? MembershipEndDate,
    IReadOnlyList<MembershipDto> History,
    IReadOnlyList<PackageDto> Packages);

// Display Success Message + Receive Updated Membership Info
public sealed record MembershipRenewalResponse(
    MembershipDto Membership,
    DateOnly MembershipEndDate,
    string Message,
    ActivityLogDto Log);

// Need Consultation? = No → học viên tự chọn gói
public sealed class RenewMembershipRequest
{
    public string PackageId { get; set; } = "";
    public string PaymentMethod { get; set; } = "";
}

// Need Consultation? = Yes → lễ tân tư vấn qua /api/support-requests rồi chọn gói tại quầy
public sealed class ConsultAndSelectPackageRequest
{
    public string MemberUserId { get; set; } = "";
    public string PackageId { get; set; } = "";
    public string PaymentMethod { get; set; } = "";
    public string? SupportRequestId { get; set; }
}
