namespace AnhDuySport.Api.Contracts;

public sealed record CreateSupportRequest(
    string MemberUserId,
    string RequestType,
    string Subject,
    string Content);

public sealed record CreateEnrollmentConsultationRequest(
    string FullName,
    string Phone,
    string? Email,
    string? Sports,
    int? Age,
    string Title,
    string? Note);

public sealed record UpdateEnrollmentConsultationRequest(
    string? Title,
    string? FullName,
    string? Phone,
    string? Email,
    string? Sports,
    int? Age,
    string? Note,
    string? ResolutionNote);

public sealed record ClassifySupportRequest(string Category);

public sealed record EscalateSupportRequest(string Reason);

public sealed record FinancialDecisionRequest(string Decision, string Note);

public sealed record SupportResultRequest(string Note);

public sealed record SupportRequestDto(
    string Id,
    string MemberUserId,
    string MemberName,
    string MemberEmail,
    string Title,
    string Description,
    string SystemCategory,
    string? ClassificationReason,
    string? ReceptionistCategory,
    string Status,
    string? AssignedToUserId,
    string? AssigneeName,
    string? Decision,
    string? ResolutionNote,
    DateTime CreatedAt,
    DateTime? ResolvedAt);

public sealed record SupportRequestCreatedDto(string Classification, SupportRequestDto Request);

public sealed record SupportRequestResultDto(SupportRequestDto Request, EmailDto Email);
