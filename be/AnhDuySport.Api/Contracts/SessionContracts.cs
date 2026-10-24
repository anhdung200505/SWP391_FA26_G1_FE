using System.ComponentModel.DataAnnotations;

namespace AnhDuySport.Api.Contracts;

// Buổi học kèm thông tin lớp, dùng cho lịch học. Weekday: 2..7 = thứ 2..thứ 7.
// Status: scheduled, held, cancelled, completed.
public sealed record SessionDto(
    string Id,
    string ClassId,
    string ClassName,
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
    int EnrolledCount);

// Khung giờ cố định. Kind: group (3 giờ) hoặc private (90 phút).
public sealed record TimeSlotDto(
    string Id,
    string Kind,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string Label);

// Đổi HLV và/hoặc phòng cho riêng một buổi chưa diễn ra. Phải gửi ít nhất HLV hoặc phòng mới.
// Note: lý do đổi (tối đa 500 ký tự), để trống thì giữ ghi chú cũ.
public sealed class UpdateSessionRequest
{
    public string? CoachUserId { get; set; }

    public string? RoomId { get; set; }

    [StringLength(500)]
    public string? Note { get; set; }
}

// Hủy một buổi chưa diễn ra, bắt buộc có lý do (lưu vào ghi chú của buổi).
public sealed class CancelSessionRequest
{
    [Required]
    [StringLength(500, MinimumLength = 1)]
    public string Reason { get; set; } = "";
}
