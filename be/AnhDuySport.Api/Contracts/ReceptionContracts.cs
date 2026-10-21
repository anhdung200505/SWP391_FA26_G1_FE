namespace AnhDuySport.Api.Contracts;

public sealed record ReceptionMemberDto(
    string Id,
    string FullName,
    string Email,
    string Phone,
    string Status);

// paymentMethod: cash, transfer hoặc card.
public sealed record ConfirmCounterPaymentRequest(string PaymentMethod);

public sealed record MoveOutRequest(string Reason);

// targetClassId để trống thì học lại đúng lớp cũ. Lớp khác phải cùng khóa học.
public sealed record ReEnrollRequest(string Reason, string? TargetClassId = null);

public sealed record ReceptionEnrollmentDto(
    string MemberUserId,
    string MemberName,
    string ClassId,
    string ClassName,
    string Status,
    DateTime EnrolledAt,
    string Message);

public sealed record PaidRegistrationDto(
    string PaymentId,
    string InvoiceCode,
    string MemberUserId,
    string MemberName,
    string MemberEmail,
    string MemberPhone,
    string ClassId,
    string ClassName,
    decimal Amount,
    string PaymentMethod,
    DateTime? PaidAt,
    string? EnrollmentStatus,
    string? RegisteredByUserId,
    string? RegisteredByName,
    string? RegisteredByRole);

public sealed record ClassRegistrationLogDto(
    string Id,
    string Action,
    string MemberUserId,
    string MemberName,
    string ClassId,
    string ClassName,
    string? PaymentId,
    string? Reason,
    string? PerformedByUserId,
    string? PerformedByName,
    string PerformedByRole,
    DateTime CreatedAt);
