using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

// Học viên đăng ký: chỉ lớp, chỉ gói hội viên, hoặc lớp kèm gói.
// MemberCheckoutFlowService tạo bằng ActivatorUtilities (giống ComboPaymentsController) nên không phải sửa Program.cs.
[Authorize(Roles = "MEMBER")]
[ApiController]
[Route("api/checkouts")]
public class MemberCheckoutController(IServiceProvider provider) : ControllerBase
{
    private MemberCheckoutFlowService Checkout =>
        ActivatorUtilities.CreateInstance<MemberCheckoutFlowService>(provider);

    [HttpPost]
    [EndpointSummary("Học viên đăng ký: lớp học, gói hội viên hoặc cả hai")]
    [EndpointDescription("Có sportId (kèm classId / slotId nếu muốn) là đăng ký lớp; thêm membershipPackageId là mua gói kèm lớp với giá ưu đãi lên cấp (kind = class_membership). Chỉ gửi membershipPackageId là mua gói riêng giá gốc: tự chọn Đăng ký mới / Gia hạn / Nâng cấp / Đăng ký nối tiếp (kind = membership). Tạo đơn pending giữ 3 phút và trả mã QR payOS. Học viên lấy từ token đăng nhập.")]
    public async Task<ActionResult<MemberCheckoutDto>> Create(MemberCheckoutRequest request)
    {
        try
        {
            return Ok(await Checkout.CreateAsync(request));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [HttpGet("{paymentId}")]
    [EndpointSummary("Học viên xem trạng thái đơn (lớp, gói hoặc cả hai)")]
    [EndpointDescription("Gọi sau khi quét QR hoặc khi payOS chuyển về. Đơn gói: hỏi lại payOS, đã trả thì kích hoạt gói (gọi nhiều lần không cộng hạn hai lần). Chỉ trả đơn của chính học viên, ngược lại 404.")]
    public async Task<ActionResult<MemberCheckoutStatusDto>> SelectStatus(string paymentId)
    {
        try
        {
            return Ok(await Checkout.SelectStatusAsync(paymentId));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    // RegistrationException kế thừa InvalidOperationException nên lỗi của cả luồng lớp lẫn luồng gói đều ra 400.
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
