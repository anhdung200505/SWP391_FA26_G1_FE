using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PayOS.Models.Webhooks;

namespace AnhDuySport.Api.Controllers;

[ApiController]
[Route("api/payments")]
public class PaymentsController(PayOsPaymentService payments, CurrentActor actor) : ControllerBase
{
    [Authorize(Roles = "MEMBER")]
    [HttpPost("payos")]
    [EndpointSummary("Tạo link thanh toán payOS cho một lớp")]
    [EndpointDescription("Chỉ học viên đã đăng nhập. Đơn gắn với tài khoản trong token, không tạo tài khoản mới.")]
    public async Task<ActionResult<PayOsPaymentDto>> Create(CreatePayOsPaymentRequest request)
    {
        try
        {
            return Ok(await payments.CreateAsync(request, actor.UserId));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [Authorize(Roles = "MEMBER")]
    [HttpGet("{paymentId}")]
    [EndpointSummary("Xem trạng thái một thanh toán")]
    public async Task<ActionResult<PayOsPaymentDto>> Access(string paymentId)
    {
        try
        {
            return Ok(await payments.AccessAsync(paymentId, actor.UserId));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [Authorize(Roles = "MEMBER")]
    [HttpPost("{paymentId}/cancel")]
    [EndpointSummary("Ghi cancel khi không thanh toán")]
    [EndpointDescription("Chỉ đơn pending mới chuyển cancel. Đơn paid giữ nguyên. Không xóa payment hay lịch sử.")]
    public async Task<ActionResult<PayOsPaymentDto>> Cancel(string paymentId)
    {
        try
        {
            return Ok(await payments.CancelAsync(paymentId, actor.UserId));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [AllowAnonymous]
    [HttpPost("payos/webhook")]
    [EndpointSummary("payOS báo thanh toán thành công")]
    [EndpointDescription("Chỉ cập nhật paid khi chữ ký checksum hợp lệ và số tiền khớp. payOS không gửi JWT.")]
    public async Task<IActionResult> Webhook([FromBody] Webhook webhook)
    {
        try
        {
            await payments.HandleWebhookAsync(webhook);
            return Ok(new { success = true });
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    private bool MapFlowError(Exception exception, out ActionResult? result)
    {
        result = exception switch
        {
            KeyNotFoundException keyNotFound => NotFound(new { message = keyNotFound.Message }),
            InvalidOperationException invalid => BadRequest(new { message = invalid.Message }),
            _ => null,
        };
        return result is not null;
    }
}
