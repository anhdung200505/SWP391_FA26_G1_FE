using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

[Authorize(Roles = "MEMBER")]
[ApiController]
[Route("api/members/{memberUserId}")]
public class MemberMembershipController(MemberMembershipFlowService flow, CurrentActor actor) : ControllerBase
{
    [HttpGet("profile")]
    [EndpointSummary("Access System: xem hồ sơ học viên")]
    public async Task<ActionResult<MemberProfileDto>> AccessSystem(string memberUserId)
    {
        if (EnsureOwner(memberUserId) is { } denied) return denied;
        try
        {
            return Ok(await flow.AccessSystemAsync(memberUserId));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [HttpPut("profile")]
    [EndpointSummary("Edit personal information: học viên sửa thông tin cá nhân")]
    [EndpointDescription("gender: Nam, Nữ hoặc Khác. Hệ thống kiểm tra rồi cập nhật database và ghi nhật ký.")]
    public async Task<ActionResult<MemberProfileMutationResponse>> InputChanges(string memberUserId, UpdateMemberProfileRequest request)
    {
        if (EnsureOwner(memberUserId) is { } denied) return denied;
        try
        {
            return Ok(await flow.InputChangesAsync(memberUserId, request));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [HttpPost("profile/avatar")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(3 * 1024 * 1024)]
    [EndpointSummary("Edit personal information: học viên đổi ảnh đại diện")]
    [EndpointDescription("Gửi form-data có field file (JPG, PNG, WebP hoặc GIF, tối đa 2 MB). Trả hồ sơ mới với avatarUrl dạng /api/uploads/avatars/...")]
    public async Task<ActionResult<MemberProfileMutationResponse>> UploadAvatar(string memberUserId, IFormFile? file)
    {
        if (EnsureOwner(memberUserId) is { } denied) return denied;
        try
        {
            return Ok(await flow.UpdateAvatarAsync(memberUserId, file));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [HttpGet("membership")]
    [EndpointSummary("View membership management: gói đang dùng, lịch sử và các gói đang bán")]
    public async Task<ActionResult<MembershipManagementDto>> ViewMembershipManagement(string memberUserId)
    {
        if (EnsureOwner(memberUserId) is { } denied) return denied;
        try
        {
            return Ok(await flow.ViewMembershipManagementAsync(memberUserId));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [HttpGet("consultation-contact")]
    [EndpointSummary("Need Consultation? = Yes: hiển thị số chăm sóc khách hàng của trung tâm")]
    public async Task<ActionResult<ConsultationContactDto>> AccessConsultationContact(string memberUserId)
    {
        if (EnsureOwner(memberUserId) is { } denied) return denied;
        try
        {
            return Ok(await flow.AccessConsultationContactAsync(memberUserId));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [HttpPost("membership/renewals")]
    [EndpointSummary("Select Membership Package: chọn gói và tạo link thanh toán payOS")]
    [EndpointDescription("Tạo hóa đơn, payment pending và membership pending, trả checkoutUrl / qrCode payOS. Membership chỉ có hiệu lực sau khi thanh toán.")]
    public async Task<ActionResult<MembershipCheckoutDto>> SelectMembershipPackage(string memberUserId, RenewMembershipRequest request)
    {
        if (EnsureOwner(memberUserId) is { } denied) return denied;
        try
        {
            return Ok(await flow.SelectMembershipPackageAsync(memberUserId, request));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [HttpPost("membership/renewals/{paymentId}/confirm")]
    [EndpointSummary("Process Payment → Update Membership Expiry: kiểm tra thanh toán payOS")]
    [EndpointDescription("Gọi sau khi payOS chuyển về trang kết quả. Đã thanh toán thì cập nhật hạn gói và trả thông tin mới. Gọi lại nhiều lần không bị cộng hạn hai lần.")]
    public async Task<ActionResult<MembershipPaymentResultDto>> ConfirmMembershipPayment(string memberUserId, string paymentId)
    {
        if (EnsureOwner(memberUserId) is { } denied) return denied;
        try
        {
            return Ok(await flow.ConfirmMembershipPaymentAsync(memberUserId, paymentId));
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
    private ActionResult? EnsureOwner(string memberUserId)
    {
        if (!int.TryParse(memberUserId, out var id) || id != actor.UserId)
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                new { message = "Bạn chỉ được thao tác trên tài khoản của chính mình." });
        }
        return null;
    }
}
