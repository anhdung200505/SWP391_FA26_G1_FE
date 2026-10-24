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
    string CenterName,
    IReadOnlyList<ClassScheduleDto> Schedule,
    int SessionCount);

// Một dòng lịch tuần. Weekday: 2..7 = thứ 2..thứ 7. TimeSlotId lấy từ GET /api/time-slots?kind=group.
public sealed class ClassScheduleRequest
{
    [Range(2, 7)]
    public int Weekday { get; set; }

    [Required]
    public string TimeSlotId { get; set; } = "";
}

// PUT thay toàn bộ các trường, bắt buộc có StartDate, EndDate, Capacity.
// Schedules để null thì giữ lịch tuần cũ, không được gửi [] (lớp phải có lịch). Buổi học được sinh lại theo lịch và khoảng ngày mới.
public sealed class UpdateClassRequest
{
    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string ClassName { get; set; } = "";

    [Required]
    public DateOnly? StartDate { get; set; }

    [Required]
    public DateOnly? EndDate { get; set; }

    [Required]
    [Range(1, int.MaxValue)]
    public int? Capacity { get; set; }

    [Required]
    public string CoachUserId { get; set; } = "";

    [Required]
    public string RoomId { get; set; } = "";

    [MinLength(1)]
    public List<ClassScheduleRequest>? Schedules { get; set; }
}

// Thêm lớp: lớp luôn tạo ở trạng thái open, giáo án tự chọn theo môn của khóa học.
// Bắt buộc StartDate, EndDate, Capacity và ít nhất một dòng Schedules; toàn bộ buổi học của lớp được sinh luôn.
public sealed class CreateClassRequest
{
    [Required]
    public string CourseId { get; set; } = "";

    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string ClassName { get; set; } = "";

    [Required]
    public DateOnly? StartDate { get; set; }

    [Required]
    public DateOnly? EndDate { get; set; }

    [Required]
    [Range(1, int.MaxValue)]
    public int? Capacity { get; set; }

    [Required]
    public string CoachUserId { get; set; } = "";

    [Required]
    public string RoomId { get; set; } = "";

    [Required]
    [MinLength(1)]
    public List<ClassScheduleRequest>? Schedules { get; set; }
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
    int Capacity,
    string CenterId,
    string CenterName);
