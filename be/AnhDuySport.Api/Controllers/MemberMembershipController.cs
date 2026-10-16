using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

// Lane "Member" của main flow User Information Edit & Membership Renewal.
// Học viên lấy JWT từ POST /api/auth/login (Access System); id học viên đọc từ token, không truyền qua URL.
// Nhánh Need Consultation? = Yes dùng POST /api/support-requests có sẵn (requestType = consultation).
[Authorize(Roles = "MEMBER")]
[ApiController]
[Route("api/members/me")]
public class MemberMembershipController(
    MemberProfileFlowService profiles,
    MembershipRenewalFlowService renewals) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("Access System")]
    [EndpointDescription("Trả hồ sơ học viên để chọn thao tác: Edit personal information hoặc Renew/Upgrade Package.")]
    public async Task<ActionResult<MemberProfileDto>> AccessSystem()
    {
        try
        {
            return Ok(await profiles.AccessSystemAsync());
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [HttpPut("profile")]
    [EndpointSummary("Edit personal information → Input changes")]
    [EndpointDescription("Hệ thống validate rồi cập nhật database, trả thông báo thành công và hồ sơ mới.")]
    public async Task<ActionResult<MemberProfileMutationResponse>> InputChanges(UpdateMemberProfileRequest request)
    {
        try
        {
            return Ok(await profiles.InputChangesAsync(request));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [HttpGet("membership")]
    [EndpointSummary("View membership management")]
    [EndpointDescription("Gói đang dùng, ngày hết hạn, lịch sử mua gói và danh sách gói đang bán.")]
    public async Task<ActionResult<MembershipManagementDto>> ViewMembershipManagement()
    {
        try
        {
            return Ok(await renewals.ViewMembershipManagementAsync());
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [HttpPost("membership/renewals")]
    [EndpointSummary("Need Consultation? = No → Select Membership Package")]
    [EndpointDescription("paymentMethod: chuyen_khoan hoặc the. Hệ thống Process Payment → Update Membership Expiry → Validate & Update database.")]
    public async Task<ActionResult<MembershipRenewalResponse>> SelectMembershipPackage(RenewMembershipRequest request)
    {
        try
        {
            return Ok(await renewals.SelectMembershipPackageAsync(request));
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
            UnauthorizedAccessException unauthorized => Unauthorized(new { message = unauthorized.Message }),
            _ => null,
        };
        return result is not null;
    }
}
