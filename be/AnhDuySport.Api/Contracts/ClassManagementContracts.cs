using System.ComponentModel.DataAnnotations;

namespace AnhDuySport.Api.Contracts;

// CanEdit = lớp open, chưa có học viên enrolled và chưa tới ngày bắt đầu.
// CanDelete = chưa ai đăng ký: không có thanh toán (kể cả đơn giữ chỗ), ghi danh, lịch sử đăng ký hay đánh giá.
public sealed record AdminClassDto(
    string Id,
    string Name,
    string Status,
    bool CanEdit,
    bool CanDelete,
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

// Đổi HLV cho cả lớp: áp dụng cho mọi buổi chưa diễn ra. Note là lý do, gửi kèm thông báo cho học viên.
public sealed record ChangeClassCoachRequest(
    [Required] string CoachUserId,
    [StringLength(500)] string? Note = null);

// RemainingSessions: số buổi chưa diễn ra sẽ đổi HLV, bắt đầu từ FirstSession. Coaches: isBusy khi trùng lịch một buổi còn lại.
public sealed record ClassCoachOptionsDto(
    int RemainingSessions,
    DateOnly? FirstSession,
    IReadOnlyList<SessionOptionDto> Coaches);

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
