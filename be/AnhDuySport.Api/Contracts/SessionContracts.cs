using System.ComponentModel.DataAnnotations;

namespace AnhDuySport.Api.Contracts;

// Buổi học kèm thông tin lớp, dùng cho lịch học. Weekday: 2..7 = thứ 2..thứ 7, 8 = chủ nhật (chỉ có ở buổi bù).
// Status: scheduled, held, cancelled, completed. Note: ghi chú của buổi (lý do đổi HLV, phòng hoặc hủy).
public sealed record SessionDto(
    string Id,
    string ClassId,
    string ClassName,
    string SportId,
    string SportName,
    string CourseName,
    int? SessionNo,
    DateOnly Date,
    int Weekday,
    string WeekdayName,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string CoachUserId,
    string CoachName,
    string RoomId,
    string RoomName,
    string Status,
    string? Note,
    int EnrolledCount,
    int? Capacity,
    // Chỉ điền ở lịch của học viên: present, late, absent, null = chưa điểm danh.
    string? AttendanceStatus = null,
    // HLV phụ trách lớp. IsSubstituteCoach = true: buổi này do HLV khác dạy thay (CoachName là HLV thay thế).
    string? ClassCoachUserId = null,
    string? ClassCoachName = null,
    bool IsSubstituteCoach = false,
    // CoachChange: null, substitute (dạy thay một buổi) hoặc permanent (đổi HLV vĩnh viễn). RoomChanged: phòng khác phòng mặc định của lớp.
    string? CoachChange = null,
    bool RoomChanged = false,
    // Chỉ điền ở lịch của học viên: true = buổi bắt đầu trước giờ học viên ghi danh lớp (không tính vắng).
    bool BeforeEnrollment = false);

// Khung giờ cố định. Kind: group (3 giờ) hoặc private (90 phút).
public sealed record TimeSlotDto(
    string Id,
    string Kind,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string Label);

// Quản trị đổi HLV và/hoặc phòng của một buổi. Trường để null thì giữ nguyên; Note gửi chuỗi rỗng thì xóa ghi chú.
public sealed record UpdateSessionRequest(
    string? CoachUserId = null,
    string? RoomId = null,
    [StringLength(500)] string? Note = null);

// Lễ tân đổi HLV khi HLV phụ trách bận.
public sealed record ChangeSessionCoachRequest(
    [Required] string CoachUserId,
    [StringLength(500)] string? Note = null);

// Hủy buổi bắt buộc xếp buổi bù luôn: MakeupDate + MakeupTimeSlotId (cuối tuần cùng tháng).
// MakeupCoachUserId: HLV dạy buổi bù, bỏ trống = HLV chính của lớp; HLV khác thì buổi bù là dạy thay.
public sealed record CancelSessionRequest(
    [Required, StringLength(500, MinimumLength = 1)] string Reason,
    DateOnly? MakeupDate = null,
    int? MakeupTimeSlotId = null,
    string? MakeupCoachUserId = null);

// Chọn thời điểm mới: dùng cho đổi lịch một buổi và cho buổi bù của buổi đã hủy.
// CoachUserId chỉ dùng khi xếp buổi bù (bỏ trống = HLV chính của lớp).
public sealed record SessionSlotRequest(
    DateOnly Date,
    int TimeSlotId,
    [StringLength(500)] string? Reason = null,
    string? CoachUserId = null);

// Kế hoạch buổi bù cho HLV đang chọn (CoachUserId, mặc định HLV chính): các ngày cuối tuần được chọn kèm số khung
// còn trống (lớp, phòng, học viên và HLV đó đều rảnh; khung tối sau 18:00 không tính) và buổi gợi ý.
// Coaches: HLV dạy được môn, kèm số khung trống của từng người trong cả khoảng ngày bù.
// WeekendOnly = false khi trước ngày kết thúc khóa (ClassEndDate) không còn cuối tuần nên được bù vào ngày thường.
public sealed record MakeupDayDto(DateOnly Date, string WeekdayName, int FreeSlots, int TotalSlots);

public sealed record MakeupSuggestionDto(DateOnly Date, string TimeSlotId, string CoachUserId, string CoachName, bool IsMainCoach);

public sealed record MakeupCoachDto(string Id, string Name, bool IsMain, int FreeSlots);

public sealed record MakeupPlanDto(
    string MainCoachUserId,
    string MainCoachName,
    string CoachUserId,
    IReadOnlyList<MakeupCoachDto> Coaches,
    IReadOnlyList<MakeupDayDto> Days,
    MakeupSuggestionDto? Suggestion,
    bool WeekendOnly,
    DateOnly? ClassEndDate);

// Quản trị hủy buổi hôm nay hoặc buổi sắp tới: buổi gốc chuyển cancelled, MakeupSession là buổi bù.
public sealed record CancelSessionResult(SessionDto Session, SessionDto? MakeupSession);

// Lựa chọn HLV hoặc phòng cho một buổi. IsBusy = true: trùng giờ với buổi khác hoặc phòng không đủ sức chứa (BusyReason).
public sealed record SessionOptionDto(
    string Id,
    string Name,
    int? Capacity,
    bool IsCurrent,
    bool IsBusy,
    string? BusyReason);

public sealed record SessionOptionsDto(
    IReadOnlyList<SessionOptionDto> Coaches,
    IReadOnlyList<SessionOptionDto> Rooms);
