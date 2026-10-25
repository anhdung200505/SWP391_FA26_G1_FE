using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/members/{memberUserId}")]
public class MemberMembershipController(MemberMembershipFlowService flow, CurrentActor actor) : ControllerBase
{
    [Authorize(Roles = "MEMBER,RECEPTIONIST,COACH,ADMIN")]
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

    [Authorize(Roles = "MEMBER,RECEPTIONIST,COACH,ADMIN")]
    [HttpPut("profile")]
    [EndpointSummary("Edit personal information: học viên sửa thông tin cá nhân")]
    [EndpointDescription("gender: Nam, Nữ hoặc Khác. dateOfBirth không bắt buộc (yyyy-MM-dd; gửi null hoặc \"\" thì giữ nguyên ngày sinh đang có). email không bắt buộc; gửi email khác email hiện tại thì báo lỗi, đổi email dùng POST profile/email/otp rồi profile/email/confirm. Hệ thống kiểm tra rồi cập nhật database và ghi nhật ký.")]
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

    [Authorize(Roles = "MEMBER,RECEPTIONIST,COACH,ADMIN")]
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

    [Authorize(Roles = "MEMBER")]
    [HttpPost("profile/email/otp")]
    [EndpointSummary("Edit personal information: đổi email bước 1 – gửi mã OTP tới email mới")]
    [EndpointDescription("Body: { \"newEmail\": \"...\", \"currentPassword\": \"...\" }. Cần đúng mật khẩu hiện tại. Mã OTP 6 số có hiệu lực 3 phút, đợi 1 phút mới gửi lại được.")]
    public async Task<ActionResult<EmailChangeOtpDto>> RequestEmailChange(string memberUserId, RequestEmailChangeRequest request)
    {
        if (EnsureOwner(memberUserId) is { } denied) return denied;
        try
        {
            return Ok(await flow.RequestEmailChangeAsync(memberUserId, request));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [Authorize(Roles = "MEMBER")]
    [HttpPost("profile/email/confirm")]
    [EndpointSummary("Edit personal information: đổi email bước 2 – nhập mã OTP")]
    [EndpointDescription("Body: { \"code\": \"123456\" }. Sai 5 lần thì mã bị hủy, phải gửi lại. Đổi xong hệ thống báo cho email cũ.")]
    public async Task<ActionResult<MemberProfileMutationResponse>> ConfirmEmailChange(string memberUserId, ConfirmEmailChangeRequest request)
    {
        if (EnsureOwner(memberUserId) is { } denied) return denied;
        try
        {
            return Ok(await flow.ConfirmEmailChangeAsync(memberUserId, request));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [Authorize(Roles = "MEMBER")]
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

    [Authorize(Roles = "MEMBER")]
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

    [Authorize(Roles = "MEMBER")]
    [HttpPost("membership/renewals")]
    [EndpointSummary("Select Membership Package: chọn gói và tạo link thanh toán payOS")]
    [EndpointDescription("Tạo hóa đơn, payment pending và membership pending, trả checkoutUrl / qrCode payOS. Membership chỉ có hiệu lực sau khi thanh toán. renewalType: Đăng ký mới, Gia hạn, Nâng cấp (gói cao hơn chạy ngay, ngày còn lại của gói cũ dùng tiếp sau đó) hoặc Đăng ký nối tiếp (gói thấp hơn bắt đầu sau khi gói hiện tại hết).")]
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

    [Authorize(Roles = "MEMBER")]
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
