using System.Security.Claims;
using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

[Authorize(Roles = "ADMIN,RECEPTIONIST")]
[ApiController]
[FlowErrors]
[Route("api/staff-activity")]
public class StaffActivityController(StaffActivityFlowService activity) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("Xem lễ tân và quản trị vừa làm gì")]
    [EndpointDescription("Thao tác gần đây trong nhật ký hệ thống (audit_log), mới nhất trước. Quản trị xem toàn bộ lễ tân và quản trị. Lễ tân xem hoạt động lễ tân và các thao tác lớp / buổi học của quản trị (thêm, sửa, xóa lớp, đổi HLV, đổi phòng, hủy buổi). role tùy chọn: RECEPTIONIST hoặc ADMIN. limit mặc định 40, tối đa 100.")]
    public async Task<ActionResult<IReadOnlyList<StaffActivityDto>>> AccessRecent([FromQuery] string? role, [FromQuery] int? limit) =>
        Ok(await activity.AccessRecentAsync(User.FindFirstValue(ClaimTypes.Role), role, limit));
}
