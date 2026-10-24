using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

[Authorize(Roles = "ADMIN")]
[ApiController]
[Route("api/management")]
public class ManagementController(ManagementDashboardService dashboard) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardDto>> AccessDashboard() =>
        Ok(await dashboard.AccessDashboardAsync());

    [HttpGet("ai-token-usage")]
    [EndpointSummary("Xem token AI đã dùng")]
    [EndpointDescription("Quản trị trung tâm xem hạn mức AI của từng gói và token từng học viên đang dùng gói đó. packageId dùng để chỉnh hạn mức của cả gói.")]
    public async Task<ActionResult<AiTokenUsageReportDto>> AiTokenUsage() =>
        Ok(await dashboard.ListAiTokenUsageAsync());

    [HttpPut("packages/{packageId:int}/ai-quota")]
    [EndpointSummary("Chỉnh lượt tạo lại và token của gói")]
    [EndpointDescription("Quản trị trung tâm đặt số lượt tạo lại và số token của một gói hội viên. Mọi học viên đang dùng gói đó nhận hạn mức mới. packageId lấy từ GET ai-token-usage. Ví dụ Hạng Đồng: { \"regenerationLimit\": 8, \"tokenLimit\": 70000 }.")]
    public async Task<ActionResult<UpdateAiPackageQuotaResponse>> UpdateAiQuota(int packageId, UpdateAiQuotaRequest request)
    {
        try
        {
            return Ok(await dashboard.UpdateAiQuotaAsync(packageId, request));
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
