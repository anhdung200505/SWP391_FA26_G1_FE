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
    [EndpointDescription("Thao tác gần đây trong nhật ký hệ thống (audit_log), mới nhất trước. Quản trị xem lễ tân và quản trị. Lễ tân chỉ xem lễ tân, kể cả khi truyền role=ADMIN. role tùy chọn với quản trị: RECEPTIONIST hoặc ADMIN. limit mặc định 40, tối đa 100.")]
    public async Task<ActionResult<IReadOnlyList<StaffActivityDto>>> AccessRecent([FromQuery] string? role, [FromQuery] int? limit) =>
        Ok(await activity.AccessRecentAsync(User.FindFirstValue(ClaimTypes.Role), role, limit));
}
