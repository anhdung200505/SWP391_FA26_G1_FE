namespace AnhDuySport.Api.Contracts;

// ===== Edit personal information =====

public sealed record UpdateMemberProfileRequest(
    string FullName,
    string Email,
    string Phone,
    DateOnly? DateOfBirth,
    string? Gender);

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

// ===== Renew / Upgrade Package =====

// Need Consultation? = Yes → hiển thị số chăm sóc khách hàng của trung tâm
public sealed record ConsultationContactDto(
    string CenterName,
    string Phone,
    string Email,
    string Message);

public sealed record RenewMembershipRequest(string PackageId, string PaymentMethod);

public sealed record MembershipDto(
    string Id,
    string? PackageId,
    string PlanName,
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
