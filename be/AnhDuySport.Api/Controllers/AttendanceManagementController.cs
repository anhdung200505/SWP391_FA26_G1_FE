using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

[Authorize(Roles = "ADMIN")]
[ApiController]
[FlowErrors]
[Route("api/management/classes/{classId}/sessions/{sessionId}/attendance")]
public class AttendanceManagementController(CoachCourseFlowService courses) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("Quản trị xem điểm danh một buổi của lớp bất kỳ")]
    [EndpointDescription("Kèm canEdit và lockReason. Quản trị sửa được mọi buổi từ hôm nay về quá khứ, kể cả buổi hôm nay chưa tới giờ; buổi tương lai và buổi đã hủy thì không.")]
    public async Task<ActionResult<AttendanceSheetDto>> Attendance(string classId, string sessionId) =>
        Ok(await courses.AttendanceAsAdminAsync(classId, sessionId));

    [HttpPut]
    [EndpointSummary("Quản trị sửa điểm danh một buổi từ hôm nay về quá khứ")]
    [EndpointDescription("Gửi đủ học viên đang học, status: present, late hoặc absent. Dùng khi coach quên điểm danh hoặc buổi đã khóa sau 00:00. Buổi tương lai trả 400. Ghi audit log là do quản trị chỉnh.")]
    public async Task<ActionResult<AttendanceSheetDto>> SaveAttendance(string classId, string sessionId, SubmitAttendanceRequest request) =>
        Ok(await courses.SaveAttendanceAsAdminAsync(classId, sessionId, request));
}
