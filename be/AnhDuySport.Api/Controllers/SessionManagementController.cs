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
    [EndpointDescription("Mặc định các buổi từ hôm nay trở đi, mọi trạng thái (scheduled, held, cancelled, completed). Lọc tùy chọn theo classId, coachUserId (HLV của buổi), roomId (phòng của buổi), sportId, status, from, to (yyyy-MM-dd). Id không tồn tại trả 404, status sai hoặc from > to trả 400.")]
    public async Task<ActionResult<IReadOnlyList<SessionDto>>> AccessSessions(
        [FromQuery] string? classId,
        [FromQuery] string? coachUserId,
        [FromQuery] string? roomId,
        [FromQuery] string? sportId,
        [FromQuery] string? status,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to) =>
        Ok(await sessions.AccessSessionsAsync(classId, coachUserId, roomId, sportId, status, from, to));

    [HttpPut("{sessionId}")]
    [EndpointSummary("Quản trị đổi HLV hoặc phòng cho một buổi học")]
    [EndpointDescription("Chỉ đổi riêng buổi này, giờ học giữ nguyên và các buổi khác của lớp không đổi. Phải gửi ít nhất coachUserId hoặc roomId (chỉ gửi note thì trả 400); note là lý do (tối đa 500 ký tự), để trống thì giữ ghi chú cũ. Chỉ đổi được buổi scheduled hoặc held chưa kết thúc (buổi đang diễn ra trong hôm nay vẫn đổi được). HLV phải dạy môn của lớp, phòng phải dùng được cho môn đó và đủ chỗ cho số học viên ghi danh; trùng lịch HLV hoặc phòng trả 400. Trả lại buổi học sau khi đổi.")]
    public async Task<ActionResult<SessionDto>> UpdateSession(string sessionId, UpdateSessionRequest request) =>
        Ok(await sessions.UpdateSessionAsync(sessionId, request));

    [HttpPost("{sessionId}/cancel")]
    [EndpointSummary("Quản trị hủy một buổi học")]
    [EndpointDescription("Bắt buộc reason (1 đến 500 ký tự), lưu vào ghi chú của buổi (ghi đè ghi chú cũ). Chỉ hủy được buổi scheduled hoặc held chưa kết thúc và chưa có điểm danh (buổi đang diễn ra trong hôm nay vẫn hủy được). Buổi bị hủy không còn trong lịch học viên và lịch HLV. Trả lại buổi học sau khi hủy.")]
    public async Task<ActionResult<SessionDto>> CancelSession(string sessionId, CancelSessionRequest request) =>
        Ok(await sessions.CancelSessionAsync(sessionId, request));
}
