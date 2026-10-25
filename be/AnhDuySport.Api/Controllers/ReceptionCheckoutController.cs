using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

// Lễ tân đăng ký giùm học viên: chỉ lớp, chỉ gói hội viên, hoặc lớp kèm gói.
// ReceptionCheckoutFlowService tạo bằng ActivatorUtilities (giống ComboPaymentsController) nên không phải sửa Program.cs.
[Authorize(Roles = "RECEPTIONIST,ADMIN")]
[ApiController]
[Route("api/reception")]
public class ReceptionCheckoutController(IServiceProvider provider, MemberMembershipFlowService memberships) : ControllerBase
{
    private ReceptionCheckoutFlowService Checkout =>
        ActivatorUtilities.CreateInstance<ReceptionCheckoutFlowService>(provider);

    [HttpGet("members/{memberUserId}/membership")]
    [EndpointSummary("Lễ tân xem gói hội viên của học viên")]
    [EndpointDescription("Gói đang dùng, lịch sử, các gói đang bán và highestPackageId. memberUserId lấy từ GET /api/reception/members/lookup.")]
    public async Task<ActionResult<MembershipManagementDto>> ViewMembership(string memberUserId)
    {
        try
        {
            return Ok(await memberships.ViewMembershipManagementAsync(memberUserId));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [HttpPost("members/{memberUserId}/checkouts")]
    [EndpointSummary("Lễ tân đăng ký giùm: lớp học, gói hội viên hoặc cả hai")]
    [EndpointDescription("Có sportId (kèm classId / slotId nếu muốn) là đăng ký lớp; thêm membershipPackageId là mua gói kèm lớp với giá ưu đãi lên cấp (kind = class_membership). Chỉ gửi membershipPackageId là mua gói riêng giá gốc: tự chọn Đăng ký mới / Gia hạn / Nâng cấp / Đăng ký nối tiếp (kind = membership). Tạo đơn pending giữ 3 phút, trả mã QR payOS (rỗng nếu máy chưa cấu hình payOS). Học viên quét QR, hoặc lễ tân thu tại quầy rồi gọi POST /api/reception/checkouts/{paymentId}/confirm-payment.")]
    public async Task<ActionResult<ReceptionCheckoutDto>> Create(string memberUserId, ReceptionCheckoutRequest request)
    {
        try
        {
            return Ok(await Checkout.CreateAsync(memberUserId, request));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [HttpPost("checkouts/{paymentId}/confirm-payment")]
    [EndpointSummary("Lễ tân xác nhận đã thu tiền tại quầy (lớp, gói hoặc cả hai)")]
    [EndpointDescription("Body: { \"paymentMethod\": \"cash\" | \"transfer\" | \"card\" }. Chỉ nhận đơn pending còn hạn. Đơn lớp: ghi danh và cấp gói kèm. Đơn gói: kích hoạt gói ngay. Hủy link payOS để học viên không trả thêm lần nữa.")]
    public async Task<ActionResult<ReceptionCheckoutResultDto>> ConfirmPayment(string paymentId, ConfirmCounterPaymentRequest request)
    {
        try
        {
            return Ok(await Checkout.ConfirmPaymentAsync(paymentId, request));
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
