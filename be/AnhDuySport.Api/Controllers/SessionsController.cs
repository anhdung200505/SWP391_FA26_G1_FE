using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

[ApiController]
[FlowErrors]
[Route("api/sessions")]
public class SessionsController(SessionFlowService sessions, CurrentActor actor) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet]
    [EndpointSummary("Xem lịch buổi học")]
    [EndpointDescription("Mặc định các buổi từ hôm nay trở đi, mọi trạng thái (scheduled, held, cancelled, completed). Lọc tùy chọn theo classId, from, to (yyyy-MM-dd). Mỗi buổi kèm lớp, môn, HLV, phòng và sĩ số đang ghi danh.")]
    public async Task<ActionResult<IReadOnlyList<SessionDto>>> AccessSessions(
        [FromQuery] string? classId,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to) =>
        Ok(await sessions.AccessSessionsAsync(classId, from, to));

    [Authorize(Roles = "MEMBER")]
    [HttpGet("mine")]
    [EndpointSummary("Học viên xem lịch học của mình")]
    [EndpointDescription("Học viên lấy từ token đăng nhập. Các buổi chưa hủy của những lớp đang ghi danh, mặc định từ hôm nay trở đi. Lọc tùy chọn from, to (yyyy-MM-dd).")]
    public async Task<ActionResult<IReadOnlyList<SessionDto>>> AccessMine([FromQuery] DateOnly? from, [FromQuery] DateOnly? to) =>
        Ok(await sessions.AccessMemberSessionsAsync(actor.UserId, from, to));

    [AllowAnonymous]
    [HttpGet("{sessionId}")]
    [EndpointSummary("Xem một buổi học")]
    public async Task<ActionResult<SessionDto>> SelectSession(string sessionId) =>
        Ok(await sessions.SelectSessionAsync(sessionId));

    [AllowAnonymous]
    [HttpGet("~/api/time-slots")]
    [EndpointSummary("Xem danh mục khung giờ cố định")]
    [EndpointDescription("Khung giờ đang dùng, lọc tùy chọn kind = group (lớp nhóm, 3 giờ) hoặc private (học 1-1, 90 phút). Dùng timeSlotId khi xếp lịch tuần cho lớp.")]
    public async Task<ActionResult<IReadOnlyList<TimeSlotDto>>> AccessTimeSlots([FromQuery] string? kind) =>
        Ok(await sessions.AccessTimeSlotsAsync(kind));
}
