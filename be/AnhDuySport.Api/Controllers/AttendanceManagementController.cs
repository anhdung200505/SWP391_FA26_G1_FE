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
    [EndpointDescription("Kèm canEdit và lockReason. Quản trị sửa được mọi buổi, mọi thời điểm; chỉ buổi đã hủy là không điểm danh.")]
    public async Task<ActionResult<AttendanceSheetDto>> Attendance(string classId, string sessionId) =>
        Ok(await courses.AttendanceAsAdminAsync(classId, sessionId));

    [HttpPut]
    [EndpointSummary("Quản trị sửa điểm danh một buổi, mọi thời điểm")]
    [EndpointDescription("Gửi đủ học viên đang học, status: present, late hoặc absent. Dùng khi coach quên điểm danh hoặc buổi đã khóa sau 00:00. Ghi audit log là do quản trị chỉnh.")]
    public async Task<ActionResult<AttendanceSheetDto>> SaveAttendance(string classId, string sessionId, SubmitAttendanceRequest request) =>
        Ok(await courses.SaveAttendanceAsAdminAsync(classId, sessionId, request));
}
