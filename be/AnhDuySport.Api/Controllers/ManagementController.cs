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
}
