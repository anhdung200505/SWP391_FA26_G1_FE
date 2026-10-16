using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PayOS.Models.Webhooks;

namespace AnhDuySport.Api.Controllers;

[AllowAnonymous]
[ApiController]
[Route("api/payments")]
public class PaymentsController(PayOsPaymentService payments) : ControllerBase
{
    [HttpPost("payos")]
    [EndpointSummary("Tạo link thanh toán payOS cho một lớp")]
    [EndpointDescription("Học viên chưa đăng nhập được, truyền memberUserId. Trả checkoutUrl. Nếu còn đơn pending thì trả lại link cũ.")]
    public async Task<ActionResult<PayOsPaymentDto>> Create(CreatePayOsPaymentRequest request)
    {
        try
        {
            return Ok(await payments.CreateAsync(request));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [HttpGet("{paymentId}")]
    [EndpointSummary("Xem trạng thái một thanh toán")]
    public async Task<ActionResult<PayOsPaymentDto>> Access(string paymentId)
    {
        try
        {
            return Ok(await payments.AccessAsync(paymentId));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

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
