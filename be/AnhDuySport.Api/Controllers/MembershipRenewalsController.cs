using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

// Lane "Receptionist" của main flow, nhánh Need Consultation? = Yes.
// Process Consultation và Consult dùng /api/support-requests có sẵn (classify, provide-consultation).
// Controller này làm bước cuối: Consult & Select Package → Process Payment tại quầy.
[Authorize(Roles = "RECEPTIONIST")]
[ApiController]
[Route("api/memberships")]
public class MembershipRenewalsController(MembershipRenewalFlowService renewals) : ControllerBase
{
    [HttpGet("packages")]
    [EndpointSummary("Lễ tân xem các gói đang bán")]
    public async Task<ActionResult<IReadOnlyList<PackageDto>>> AccessActivePackages() =>
        Ok(await renewals.AccessActivePackagesAsync());

    [HttpPost("counter-renewals")]
    [EndpointSummary("Consult & Select Package")]
    [EndpointDescription("paymentMethod: tien_mat, chuyen_khoan hoặc the. supportRequestId (không bắt buộc): yêu cầu tư vấn đã resolved của học viên. Hệ thống Process Payment → Update Membership Expiry → Validate & Update database.")]
    public async Task<ActionResult<MembershipRenewalResponse>> ConsultAndSelectPackage(ConsultAndSelectPackageRequest request)
    {
        try
        {
            return Ok(await renewals.ConsultAndSelectPackageAsync(request));
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
