using System.Globalization;
using System.Text.Json;
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
    [RequestSizeLimit(3 * 1024 * 1024)]
    [EndpointSummary("Edit personal information: học viên sửa hồ sơ và ảnh đại diện")]
    [EndpointDescription("Một request cho cả hồ sơ và ảnh. JSON hoặc form-data: fullName, phone, gender (Nam, Nữ hoặc Khác), dateOfBirth (yyyy-MM-dd; null hoặc \"\" thì giữ nguyên), email (không đổi ở đây). Form-data thêm field file nếu đổi ảnh (JPG, PNG, WebP hoặc GIF, tối đa 2 MB); không gửi file thì giữ ảnh cũ. Đổi email dùng POST profile/email/otp rồi profile/email/confirm.")]
    public async Task<ActionResult<MemberProfileMutationResponse>> InputChanges(string memberUserId)
    {
        if (EnsureOwner(memberUserId) is { } denied) return denied;
        try
        {
            var (request, file) = await ReadProfileUpdateAsync();
            return Ok(await flow.InputChangesAsync(memberUserId, request, file));
        }
        catch (JsonException)
        {
            return BadRequest(new { message = "Dữ liệu hồ sơ không hợp lệ. Ngày sinh phải có dạng yyyy-MM-dd." });
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

    private async Task<(UpdateMemberProfileRequest Request, IFormFile? File)> ReadProfileUpdateAsync()
    {
        if (Request.HasFormContentType)
        {
            var form = await Request.ReadFormAsync();
            return (
                new UpdateMemberProfileRequest(
                    form["fullName"].ToString(),
                    BlankToNull(form["email"]),
                    form["phone"].ToString(),
                    ParseOptionalDate(form["dateOfBirth"]),
                    BlankToNull(form["gender"])),
                form.Files.GetFile("file") ?? form.Files.FirstOrDefault());
        }

        var json = await Request.ReadFromJsonAsync<UpdateMemberProfileRequest>();
        if (json is null)
        {
            throw new InvalidOperationException("Thiếu thông tin hồ sơ.");
        }

        return (json, null);
    }

    private static string? BlankToNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static DateOnly? ParseOptionalDate(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        var datePart = text.Trim().Split('T')[0];
        if (DateOnly.TryParseExact(datePart, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
        {
            return date;
        }

        throw new InvalidOperationException("Ngày sinh phải có dạng yyyy-MM-dd.");
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
