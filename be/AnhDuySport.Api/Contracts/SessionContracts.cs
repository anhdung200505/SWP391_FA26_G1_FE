using System.ComponentModel.DataAnnotations;

namespace AnhDuySport.Api.Contracts;

// Buổi học kèm thông tin lớp, dùng cho lịch học. Weekday: 2..7 = thứ 2..thứ 7.
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
    bool IsSubstituteCoach = false);

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

public sealed record CancelSessionRequest(
    [Required, StringLength(500, MinimumLength = 1)] string Reason);

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
