using System.ComponentModel.DataAnnotations;

namespace AnhDuySport.Api.Contracts;

// Gói học 1-1 (course.format = private): SessionCount buổi, mỗi buổi SessionMinutes phút.
public sealed record PrivateCourseDto(
    string Id,
    string SportId,
    string SportName,
    string Name,
    int SessionCount,
    int SessionMinutes,
    decimal Price);

// Lịch hằng tuần: Weekday 2..7 = thứ 2..thứ 7, TimeSlotId lấy từ GET /api/time-slots?kind=private.
public class PrivateAvailabilityRequest
{
    [Required]
    public string CourseId { get; set; } = "";

    [Required]
    public DateOnly? StartDate { get; set; }

    [Required]
    [MinLength(1)]
    public List<ClassScheduleRequest>? Slots { get; set; }
}

public sealed class CreatePrivateRequest : PrivateAvailabilityRequest
{
    [Required]
    public string CoachUserId { get; set; } = "";

    [StringLength(500)]
    public string? Note { get; set; }

    // Gói hội viên mua kèm và thông tin học viên: cùng ý nghĩa với đăng ký lớp nhóm, áp khi thanh toán sau khi quản lý duyệt.
    public string? MembershipPackageId { get; set; }

    public bool RenewMembership { get; set; }

    [StringLength(200)]
    public string? FullName { get; set; }

    [RegularExpression(@"^\+?[0-9 ]{8,20}$")]
    public string? Phone { get; set; }

    public DateOnly? DateOfBirth { get; set; }

    [RegularExpression("^(Nam|Nữ|Khác)$")]
    public string? Gender { get; set; }
}

public sealed record PrivateCoachDto(string Id, string FullName);

// Xem lịch của một HLV cho gói và ngày bắt đầu đã chọn (ngày bắt đầu phải từ hôm nay + 3 ngày).
public sealed class PrivateCoachScheduleRequest
{
    [Required]
    public string CourseId { get; set; } = "";

    [Required]
    public string CoachUserId { get; set; } = "";

    [Required]
    public DateOnly? StartDate { get; set; }
}

// Ô bận: Weekday 2..7, TimeSlotId là khung giờ 1-1; Reason nói bận vì lớp nào, ngày nào.
public sealed record PrivateBusyCellDto(int Weekday, string TimeSlotId, string Reason);

public sealed record PrivateCoachScheduleDto(int SessionCount, IReadOnlyList<PrivateBusyCellDto> BusyCells);

public sealed record RejectPrivateRequest([StringLength(500)] string? Reason = null);

public sealed record PrivateCoachOptionDto(string Id, string FullName, bool IsBusy, string? BusyReason);

// RoomsAvailable: còn ít nhất một phòng 1-1 trống cho toàn bộ các buổi. Coaches: HLV dạy môn, kèm bận hay rảnh cho cả chuỗi buổi.
public sealed record PrivateAvailabilityDto(
    int SessionCount,
    DateOnly? FirstSession,
    DateOnly? LastSession,
    bool RoomsAvailable,
    IReadOnlyList<PrivateCoachOptionDto> Coaches);

public sealed record PrivateSlotDto(int Weekday, string WeekdayName, string TimeSlotId, TimeOnly StartTime, TimeOnly EndTime);

public sealed record PrivateSessionPreviewDto(int No, DateOnly Date, TimeOnly StartTime, TimeOnly EndTime);

// Status: pending (chờ duyệt), approved (đã duyệt, chờ thanh toán đến ApprovalExpiresAt), paid (đã thanh toán, đã ghi danh),
// rejected, cancelled, expired (quá hạn thanh toán, lớp bị hủy).
// Chỉ ở chi tiết của quản lý: CanApprove, BlockReason (lý do chưa duyệt được), PlannedSessions, RoomId/RoomName (phòng sẽ gán hoặc đã gán).
public sealed record PrivateRequestDto(
    string Id,
    string Status,
    string MemberUserId,
    string MemberName,
    string MemberPhone,
    string CourseId,
    string CourseName,
    string SportId,
    string SportName,
    int SessionCount,
    int SessionMinutes,
    decimal Price,
    string CoachUserId,
    string CoachName,
    DateOnly StartDate,
    DateOnly? FirstSession,
    DateOnly? LastSession,
    IReadOnlyList<PrivateSlotDto> Slots,
    string? Note,
    DateTime CreatedAt,
    DateTime? DecidedAt,
    string? RejectReason,
    string? ClassId,
    DateTime? ApprovalExpiresAt,
    string? RoomId,
    string? RoomName,
    string? MembershipPackageId,
    string? MembershipPackageName,
    bool RenewMembership,
    bool? CanApprove = null,
    string? BlockReason = null,
    IReadOnlyList<PrivateSessionPreviewDto>? PlannedSessions = null);
