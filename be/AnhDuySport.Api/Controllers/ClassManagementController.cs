using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

[Authorize(Roles = "ADMIN")]
[ApiController]
[FlowErrors]
[Route("api/management/classes")]
public class ClassManagementController(ClassManagementFlowService classes) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("Quản trị xem tất cả lớp, mọi trạng thái")]
    [EndpointDescription("Lọc tùy chọn theo status (open, ongoing, closed, cancelled), centerId, sportId. canEdit = true khi lớp open, chưa có học viên ghi danh và chưa tới ngày bắt đầu. Sắp xếp theo ngày bắt đầu.")]
    public async Task<ActionResult<IReadOnlyList<AdminClassDto>>> AccessClasses(
        [FromQuery] string? status,
        [FromQuery] string? centerId,
        [FromQuery] string? sportId) =>
        Ok(await classes.AccessClassesAsync(status, centerId, sportId));

    [HttpGet("~/api/management/courses")]
    [EndpointSummary("Quản trị xem danh sách khóa học để chọn khi thêm lớp")]
    [EndpointDescription("Chỉ khóa học đang active. Lọc tùy chọn theo sportId. Sắp xếp theo môn rồi tên khóa học.")]
    public async Task<ActionResult<IReadOnlyList<CourseOptionDto>>> AccessCourses([FromQuery] string? sportId) =>
        Ok(await classes.AccessCoursesAsync(sportId));

    [HttpGet("~/api/management/rooms")]
    [EndpointSummary("Quản trị xem danh sách phòng để chọn khi thêm hoặc sửa lớp")]
    [EndpointDescription("Lọc tùy chọn theo centerId và sportId (chỉ phòng dùng được cho lớp nhóm của môn). Sắp xếp theo trung tâm rồi tên phòng.")]
    public async Task<ActionResult<IReadOnlyList<RoomOptionDto>>> AccessRooms([FromQuery] string? centerId, [FromQuery] string? sportId) =>
        Ok(await classes.AccessRoomsAsync(centerId, sportId));

    [HttpGet("~/api/management/coaches")]
    [EndpointSummary("Quản trị xem HLV để chọn khi thêm lớp")]
    [EndpointDescription("HLV đang hoạt động. sportId: chỉ HLV dạy được môn đó (coach_sport). Mỗi HLV kèm danh sách môn dạy được.")]
    public async Task<ActionResult<IReadOnlyList<ManagementCoachDto>>> AccessCoaches([FromQuery] string? sportId) =>
        Ok(await classes.AccessCoachesAsync(sportId));

    [HttpPost("availability")]
    [EndpointSummary("Kiểm tra HLV và phòng còn trống trước khi thêm lớp")]
    [EndpointDescription("Sinh thử buổi học theo schedules trong [startDate, endDate] và đối chiếu với các buổi đã có. Trả số buổi sẽ sinh, HLV và phòng của môn kèm isBusy/busyReason (trùng lớp nào, ngày nào, hoặc phòng không đủ sức chứa). excludeClassId dùng khi sửa lớp.")]
    public async Task<ActionResult<ClassAvailabilityDto>> CheckAvailability(ClassAvailabilityRequest request) =>
        Ok(await classes.CheckAvailabilityAsync(request));

    [HttpGet("{classId}/coach-options")]
    [EndpointSummary("Xem HLV có thể nhận lớp đang học")]
    [EndpointDescription("HLV dạy được môn của lớp. isBusy = true khi trùng giờ với một buổi chưa diễn ra của lớp (busyReason). isCurrent = HLV hiện tại. remainingSessions: số buổi sẽ đổi HLV.")]
    public async Task<ActionResult<ClassCoachOptionsDto>> AccessClassCoachOptions(string classId) =>
        Ok(await classes.AccessClassCoachOptionsAsync(classId));

    [HttpPut("{classId}/coach")]
    [EndpointSummary("Quản trị đổi HLV cho lớp đang học")]
    [EndpointDescription("Chỉ lớp open hoặc ongoing. Đổi HLV mặc định của lớp và mọi buổi chưa diễn ra (buổi đã học, đã hủy giữ nguyên). HLV mới phải dạy môn và không trùng lịch, ngược lại trả 400. note là lý do, ghi vào ghi chú các buổi được đổi. Học viên đang học lớp nhận thông báo.")]
    public async Task<ActionResult<AdminClassDto>> ChangeClassCoach(string classId, ChangeClassCoachRequest request) =>
        Ok(await classes.ChangeClassCoachAsync(classId, request));

    [HttpPost]
    [EndpointSummary("Quản trị thêm lớp")]
    [EndpointDescription("Lớp luôn tạo ở trạng thái open. Giáo án tự chọn theo môn của khóa học (400 nếu môn chưa có giáo án chuẩn). Bắt buộc startDate (phải sau hôm nay), endDate, capacity và ít nhất một dòng schedules (weekday 2..7, timeSlotId từ GET /api/time-slots?kind=group). HLV phải dạy môn của khóa học, phòng phải thuộc môn và đủ sức chứa. Toàn bộ buổi học được sinh luôn; mỗi dòng lịch phải có ít nhất một buổi trong khoảng ngày, trùng lịch HLV hoặc phòng trả 400. Trả 201 kèm lớp vừa tạo.")]
    public async Task<ActionResult<AdminClassDto>> CreateClass(CreateClassRequest request)
    {
        var created = await classes.CreateClassAsync(request);
        return Created($"/api/management/classes/{created.Id}", created);
    }

    [HttpDelete("{classId}")]
    [EndpointSummary("Quản trị xóa lớp chưa bắt đầu, chưa có học viên")]
    [EndpointDescription("Chỉ xóa được lớp canDelete = true: chưa ai đăng ký (không có thanh toán kể cả đơn giữ chỗ, ghi danh, lịch sử đăng ký hay đánh giá), kể cả lớp đã khai giảng. Lịch tuần, buổi học và bài tập của lớp bị xóa cùng. Giáo án giữ nguyên. Trả 204.")]
    public async Task<IActionResult> DeleteClass(string classId)
    {
        await classes.DeleteClassAsync(classId);
        return NoContent();
    }

    [HttpPut("{classId}")]
    [EndpointSummary("Quản trị sửa lớp chưa mở")]
    [EndpointDescription("Chỉ sửa được lớp canEdit = true, ngược lại trả 400. Thay toàn bộ className, startDate, endDate, capacity, coachUserId, roomId (đều bắt buộc). schedules để null thì giữ lịch tuần cũ, không được gửi [] (lớp phải có lịch). Buổi học được sinh lại theo lịch, ngày, HLV và phòng mới; mỗi dòng lịch phải có ít nhất một buổi trong khoảng ngày, trùng lịch HLV hoặc phòng trả 400.")]
    public async Task<ActionResult<AdminClassDto>> UpdateClass(string classId, UpdateClassRequest request) =>
        Ok(await classes.UpdateClassAsync(classId, request));
}
