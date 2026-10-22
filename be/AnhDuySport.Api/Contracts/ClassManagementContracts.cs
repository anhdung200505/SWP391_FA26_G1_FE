using System.ComponentModel.DataAnnotations;

namespace AnhDuySport.Api.Contracts;

// CanEdit = lớp open, chưa có học viên enrolled và chưa tới ngày bắt đầu.
public sealed record AdminClassDto(
    string Id,
    string Name,
    string Status,
    bool CanEdit,
    DateOnly? StartDate,
    DateOnly? EndDate,
    int? Capacity,
    int EnrolledCount,
    string SportId,
    string SportName,
    string CourseName,
    string Level,
    decimal Tuition,
    string CoachId,
    string CoachName,
    string RoomId,
    string RoomName,
    string CenterId,
    string CenterName);

// PUT thay toàn bộ 6 trường: StartDate, EndDate, Capacity để null nghĩa là bỏ giá trị đó.
public sealed class UpdateClassRequest
{
    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string ClassName { get; set; } = "";

    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }

    [Range(1, int.MaxValue)]
    public int? Capacity { get; set; }

    [Required]
    public string CoachUserId { get; set; } = "";

    [Required]
    public string RoomId { get; set; } = "";
}

// Thêm lớp: lớp luôn tạo ở trạng thái open, giáo án tự chọn theo môn của khóa học.
public sealed class CreateClassRequest
{
    [Required]
    public string CourseId { get; set; } = "";

    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string ClassName { get; set; } = "";

    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }

    [Range(1, int.MaxValue)]
    public int? Capacity { get; set; }

    [Required]
    public string CoachUserId { get; set; } = "";

    [Required]
    public string RoomId { get; set; } = "";
}

public sealed record CourseOptionDto(
    string Id,
    string Code,
    string Name,
    string SportId,
    string SportName,
    string Level,
    decimal Tuition);

public sealed record RoomOptionDto(
    string Id,
    string Code,
    string Name,
    string Type,
    int? Capacity,
    string CenterId,
    string CenterName);
