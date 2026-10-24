using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

[Authorize]
[ApiController]
[FlowErrors]
[Route("api/notifications")]
public class NotificationsController(NotificationFlowService notifications, CurrentActor actor) : ControllerBase
{
    [HttpGet("mine")]
    [EndpointSummary("Xem thông báo của tôi")]
    [EndpointDescription("Lấy từ token đăng nhập. Trả unreadCount (toàn bộ thông báo chưa đọc) và items mới nhất trước, mặc định 30, tối đa 100 (query limit).")]
    public async Task<ActionResult<NotificationFeedDto>> AccessMine([FromQuery] int? limit) =>
        Ok(await notifications.AccessMineAsync(actor.UserId, limit));

    [HttpPost("{notificationId}/read")]
    [EndpointSummary("Đánh dấu một thông báo đã đọc")]
    [EndpointDescription("Chỉ thông báo của chính mình. Đã đọc rồi vẫn trả 204. Không thuộc về mình hoặc không tồn tại trả 404.")]
    public async Task<IActionResult> MarkRead(string notificationId)
    {
        await notifications.MarkReadAsync(actor.UserId, notificationId);
        return NoContent();
    }

    [HttpPost("read-all")]
    [EndpointSummary("Đánh dấu tất cả thông báo đã đọc")]
    [EndpointDescription("Chỉ thông báo của chính mình. Trả 204.")]
    public async Task<IActionResult> MarkAllRead()
    {
        await notifications.MarkAllReadAsync(actor.UserId);
        return NoContent();
    }
}
