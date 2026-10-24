using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

[Authorize(Roles = "ADMIN")]
[ApiController]
[FlowErrors]
[Route("api/management/sessions")]
public class SessionManagementController(SessionManagementFlowService sessions) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("Quản trị xem lịch buổi học có lọc")]
    [EndpointDescription("Mặc định các buổi từ hôm nay trở đi, mọi trạng thái (scheduled, held, cancelled, completed). Lọc tùy chọn theo classId, coachUserId (HLV của buổi), roomId (phòng của buổi), sportId, status, from, to (yyyy-MM-dd). Id không tồn tại trả 404, status sai hoặc from > to trả 400. Đổi HLV/phòng và hủy buổi dùng PUT và POST cancel trên /api/sessions/{id}.")]
    public async Task<ActionResult<IReadOnlyList<SessionDto>>> AccessSessions(
        [FromQuery] string? classId,
        [FromQuery] string? coachUserId,
        [FromQuery] string? roomId,
        [FromQuery] string? sportId,
        [FromQuery] string? status,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to) =>
        Ok(await sessions.AccessSessionsAsync(classId, coachUserId, roomId, sportId, status, from, to));
}
