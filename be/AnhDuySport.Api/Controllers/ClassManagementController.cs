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
    [EndpointDescription("Lọc tùy chọn theo centerId. Sắp xếp theo trung tâm rồi tên phòng.")]
    public async Task<ActionResult<IReadOnlyList<RoomOptionDto>>> AccessRooms([FromQuery] string? centerId) =>
        Ok(await classes.AccessRoomsAsync(centerId));

    [HttpPost]
    [EndpointSummary("Quản trị thêm lớp")]
    [EndpointDescription("Lớp luôn tạo ở trạng thái open. Giáo án tự chọn theo môn của khóa học (400 nếu môn chưa có giáo án chuẩn). startDate nếu có phải sau hôm nay. Trả 201 kèm lớp vừa tạo.")]
    public async Task<ActionResult<AdminClassDto>> CreateClass(CreateClassRequest request)
    {
        var created = await classes.CreateClassAsync(request);
        return Created($"/api/management/classes/{created.Id}", created);
    }

    [HttpDelete("{classId}")]
    [EndpointSummary("Quản trị xóa lớp chưa bắt đầu, chưa có học viên")]
    [EndpointDescription("Chỉ xóa được lớp canEdit = true và không còn thanh toán, ghi danh hay lịch sử liên quan. Slot của lớp (chưa có đăng ký, bài tập, điểm danh) bị xóa cùng. Giáo án giữ nguyên. Trả 204.")]
    public async Task<IActionResult> DeleteClass(string classId)
    {
        await classes.DeleteClassAsync(classId);
        return NoContent();
    }

    [HttpPut("{classId}")]
    [EndpointSummary("Quản trị sửa lớp chưa mở")]
    [EndpointDescription("Chỉ sửa được lớp canEdit = true, ngược lại trả 400. Thay toàn bộ className, startDate, endDate, capacity, coachUserId, roomId (startDate, endDate, capacity để null nghĩa là bỏ). Đổi phòng thì slot của lớp đổi theo phòng mới. Đổi ngày mà còn slot nằm ngoài khoảng mới thì trả 400.")]
    public async Task<ActionResult<AdminClassDto>> UpdateClass(string classId, UpdateClassRequest request) =>
        Ok(await classes.UpdateClassAsync(classId, request));
}
