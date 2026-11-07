namespace AnhDuySport.Api.Contracts;

public sealed record ReceptionMemberDto(
    string Id,
    string FullName,
    string Email,
    string Phone,
    string Status);

// keyword: mã học viên (user id), email hoặc số điện thoại 10 số.
public sealed record ReceptionCheckInRequest(string? Keyword);

// Status: inside (đang ở trong), left (đã check-out), auto_closed (hôm trước quên check-out, tự đóng 00:00), voided (đã hoàn tác).
public sealed record CenterCheckInDto(
    string Id,
    string MemberUserId,
    string FullName,
    string Phone,
    string? Email,
    string? MembershipName,
    DateOnly? MembershipEndDate,
    DateTime CheckInAt,
    DateTime? CheckOutAt,
    string Status,
    string CheckedInBy,
    string? VoidReason,
    DateTime? VoidedAt);

// Outcome: checked_in (tạo lượt mới), already_inside (đang ở trong, chưa check-out), duplicate (vừa check-in dưới 10 phút).
public sealed record CenterCheckInResultDto(string Outcome, CenterCheckInDto CheckIn, string Message);

public sealed record CenterCheckInSummaryDto(int Total, int UniqueMembers, int Inside, int Voided);

public sealed record CenterCheckInListDto(DateOnly Date, CenterCheckInSummaryDto Summary, IReadOnlyList<CenterCheckInDto> Items);

public sealed record VoidCheckInRequest(string? Reason);

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

// Một học viên trong một lớp, gồm mọi thông tin lễ tân cần.
public sealed record ReceptionRegistrationDto(
    ReceptionMemberDto Member,
    ReceptionClassDto Class,
    string? EnrollmentStatus,
    ReceptionPaymentDto? Payment,
    RegisteredByDto? RegisteredBy,
    ClassAssignedByDto? ClassAssignedBy,
    // Buổi học sắp tới gần nhất của lớp.
    ClassSlotDto? NextSlot,
    IReadOnlyList<ReceptionHistoryDto> History,
    DateTime LastActivityAt);

public sealed record ReceptionClassDto(
    string Id,
    string Name,
    string Status,
    string SportId,
    string SportName,
    string CourseName,
    string CoachName,
    DateOnly? StartDate,
    DateOnly? EndDate);

// Amount = Tuition + MembershipPackage.Price.
public sealed record ReceptionPaymentDto(
    string PaymentId,
    string InvoiceCode,
    decimal Amount,
    string Method,
    string Status,
    DateTime? PaidAt,
    decimal Tuition,
    MembershipPackageQuoteDto? MembershipPackage);

// Source: SYSTEM (hệ thống tự xếp lớp), RECEPTIONIST, ADMIN, COACH, MEMBER (học viên tự chọn lớp).
public sealed record ClassAssignedByDto(
    string Source,
    string Label,
    string? UserId,
    string? FullName);

public sealed record ReceptionHistoryDto(
    string Id,
    string Action,
    string ActionLabel,
    string? Reason,
    string? PaymentId,
    RegisteredByDto PerformedBy,
    DateTime CreatedAt);
