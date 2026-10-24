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

// PUT thay toàn bộ các trường: StartDate, EndDate, Capacity để null nghĩa là bỏ giá trị đó.
// Schedules để null thì giữ lịch tuần cũ, gửi [] thì bỏ lịch. Buổi học được sinh lại theo lịch và khoảng ngày mới.
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

    public List<ClassScheduleRequest>? Schedules { get; set; }
}

// Thêm lớp: lớp luôn tạo ở trạng thái open, giáo án tự chọn theo môn của khóa học.
// Có Schedules (kèm StartDate, EndDate) thì sinh luôn toàn bộ buổi học của lớp.
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

    public List<ClassScheduleRequest>? Schedules { get; set; }
}

// HLV dạy được môn (coach_sport). SportNames: các môn HLV dạy được.
public sealed record ManagementCoachDto(
    string Id,
    string FullName,
    string Phone,
    IReadOnlyList<string> SportNames);

// Kiểm tra trước khi thêm hoặc sửa lớp: HLV và phòng nào trùng lịch với các buổi đã có trong khoảng ngày.
// ExcludeClassId: khi sửa lớp, bỏ qua buổi của chính lớp đó.
public sealed class ClassAvailabilityRequest
{
    [Required]
    public string CourseId { get; set; } = "";

    [Required]
    public DateOnly? StartDate { get; set; }

    [Required]
    public DateOnly? EndDate { get; set; }

    [Range(1, int.MaxValue)]
    public int? Capacity { get; set; }

    public List<ClassScheduleRequest> Schedules { get; set; } = [];

    public string? ExcludeClassId { get; set; }
}

// SessionCount: số buổi sẽ sinh. Coaches, Rooms: isBusy kèm busyReason (trùng lớp nào, ngày nào, hoặc phòng không đủ sức chứa).
public sealed record ClassAvailabilityDto(
    int SessionCount,
    DateOnly? FirstSession,
    DateOnly? LastSession,
    IReadOnlyList<SessionOptionDto> Coaches,
    IReadOnlyList<SessionOptionDto> Rooms);

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
