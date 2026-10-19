using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

// Main flow: User Information Edit & Membership Renewal.
// Dùng memberUserId có sẵn trong bảng user vì học viên chưa đăng nhập được (giống SlotsController).
[AllowAnonymous]
[ApiController]
[Route("api/members/{memberUserId}")]
public class MemberMembershipController(MemberMembershipFlowService flow) : ControllerBase
{
    [HttpGet("profile")]
    [EndpointSummary("Access System: xem hồ sơ học viên")]
    public async Task<ActionResult<MemberProfileDto>> AccessSystem(string memberUserId)
    {
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
        try
        {
            return Ok(await flow.InputChangesAsync(memberUserId, request));
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
    [EndpointSummary("Select Membership Package: chọn gói và thanh toán")]
    [EndpointDescription("paymentMethod: chuyen_khoan hoặc the. Hệ thống Process Payment → Update Membership Expiry → Validate & Update database.")]
    public async Task<ActionResult<MembershipRenewalResponse>> SelectMembershipPackage(string memberUserId, RenewMembershipRequest request)
    {
        try
        {
            return Ok(await flow.SelectMembershipPackageAsync(memberUserId, request));
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
