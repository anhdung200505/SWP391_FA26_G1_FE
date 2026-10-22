using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using PayOS.Models.Webhooks;

namespace AnhDuySport.Api.Controllers;

// Đăng ký lớp + lên cấp gói hội viên (combo), trả bằng mã QR payOS thật.
// Service tạo bằng ActivatorUtilities nên không phải sửa Program.cs.
[ApiController]
[ComboPaymentErrors]
[Route("api/combo-payments")]
public class ComboPaymentsController(IServiceProvider provider, CurrentActor actor) : ControllerBase
{
    private ComboPayOsPaymentService Combo =>
        ActivatorUtilities.CreateInstance<ComboPayOsPaymentService>(provider);

    [AllowAnonymous]
    [HttpGet("upgrade-options")]
    [EndpointSummary("Các gói lên cấp có ưu đãi khi đăng ký lớp")]
    [EndpointDescription("Trả gói có upgrade_discount_percent > 0 (Bạc, Vàng) và comboPrice là giá sau giảm cộng vào hóa đơn lớp. Không chọn gói thì được tặng Hạng Đồng.")]
    public async Task<ActionResult<IReadOnlyList<ComboUpgradeOptionDto>>> UpgradeOptions() =>
        Ok(await Combo.AccessUpgradeOptionsAsync());

    [Authorize(Roles = "MEMBER")]
    [HttpPost]
    [EndpointSummary("Đăng ký lớp (kèm lên cấp gói) và lấy mã QR payOS")]
    [EndpointDescription("Body giống POST /api/class-registrations, thêm upgradePackageId (id gói Bạc/Vàng, bỏ trống = tặng Đồng). amount = học phí + giá lên cấp. Trả qrCode (chuỗi VietQR) và checkoutUrl của payOS; link hết hạn sau 8 phút, chỗ giữ 10 phút.")]
    public async Task<ActionResult<ComboPayOsPaymentDto>> Create(CreateClassRegistrationRequest request) =>
        Ok(await Combo.CreateAsync(actor.UserId, request));

    [Authorize(Roles = "MEMBER")]
    [HttpGet("{paymentId}")]
    [EndpointSummary("Xem trạng thái đơn combo")]
    [EndpointDescription("Đơn pending thì hỏi lại payOS: đã trả → ghi danh và cấp gói ngay; hủy/hết hạn → đơn failed. FE gọi định kỳ sau khi hiện QR.")]
    public async Task<ActionResult<ComboPayOsPaymentDto>> Access(string paymentId) =>
        Ok(await Combo.AccessAsync(paymentId, actor.UserId));

    [Authorize(Roles = "MEMBER")]
    [HttpPost("{paymentId}/cancel")]
    [EndpointSummary("Hủy đơn combo chưa thanh toán")]
    [EndpointDescription("Đóng link payOS, đơn pending chuyển failed và nhả chỗ. Đơn đã paid thì từ chối.")]
    public async Task<ActionResult<ComboPayOsPaymentDto>> Cancel(string paymentId) =>
        Ok(await Combo.CancelAsync(paymentId, actor.UserId));

    [AllowAnonymous]
    [HttpPost("webhook")]
    [EndpointSummary("payOS báo thanh toán (dùng cho cả đơn combo và đơn lớp payOS)")]
    [EndpointDescription("Kiểm tra chữ ký và số tiền. Đơn pending → ghi danh (nếu còn chỗ) và cấp gói. Đơn đã hủy mà vẫn nhận tiền → chỉ ghi log để hoàn tiền.")]
    public async Task<IActionResult> Webhook([FromBody] Webhook webhook)
    {
        await Combo.HandleWebhookAsync(webhook);
        return Ok(new { success = true });
    }
}

// KeyNotFoundException → 404; InvalidOperationException (gồm RegistrationException, lỗi số điện thoại) → 400.
public sealed class ComboPaymentErrorsAttribute : ExceptionFilterAttribute
{
    public override void OnException(ExceptionContext context)
    {
        context.Result = context.Exception switch
        {
            KeyNotFoundException e => new NotFoundObjectResult(new { message = e.Message }),
            InvalidOperationException e => new BadRequestObjectResult(new { message = e.Message }),
            _ => null,
        };
        context.ExceptionHandled = context.Result is not null;
    }
}
