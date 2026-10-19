using System.ComponentModel.DataAnnotations;

namespace AnhDuySport.Api.Contracts;

public sealed record CenterDto(
    string Id,
    string Name,
    string Address,
    string Phone);

public sealed record SportDto(
    string Id,
    string Code,
    string Name,
    int OpenClassCount);

public sealed record ClassSlotDto(
    string Id,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string Title);

public sealed record ClassSummaryDto(
    string Id,
    string Name,
    string SportId,
    string SportName,
    string CourseName,
    string Level,
    string CoachName,
    string RoomName,
    DateOnly? StartDate,
    DateOnly? EndDate,
    int? Capacity,
    int EnrolledCount,
    int? AvailableSeats,
    decimal Tuition,
    ClassSlotDto? NextSlot);

public sealed record ClassDetailDto(
    string Id,
    string Name,
    string Status,
    DateOnly? StartDate,
    DateOnly? EndDate,
    string SportId,
    string SportName,
    string CourseName,
    string Level,
    string AgeRange,
    string Description,
    string CenterId,
    string CenterName,
    string RoomName,
    string CoachName,
    int? Capacity,
    int EnrolledCount,
    int? AvailableSeats,
    decimal Tuition,
    bool IsOpenForRegistration,
    IReadOnlyList<ClassSlotDto> Slots);

// Các trường hồ sơ đều tùy chọn: có gửi thì ghi đè hồ sơ học viên khi tạo đơn mới.
public sealed record CreateClassRegistrationRequest(
    string ClassId,
    [StringLength(200, MinimumLength = 1)] string? FullName = null,
    [RegularExpression(@"^\+?[0-9 ]{8,20}$")] string? Phone = null,
    DateOnly? DateOfBirth = null,
    [RegularExpression("^(Nam|Nữ|Khác)$")] string? Gender = null);

public sealed record ClassRegistrationDto(
    string PaymentId,
    string InvoiceCode,
    string ClassId,
    string ClassName,
    decimal Amount,
    string Status,
    string PaymentUrl,
    bool IsExisting);

public sealed record RegistrationStatusDto(
    string PaymentId,
    string InvoiceCode,
    string ClassId,
    string ClassName,
    decimal Amount,
    string PaymentStatus,
    string InvoiceStatus,
    string? EnrollmentStatus,
    string Message);