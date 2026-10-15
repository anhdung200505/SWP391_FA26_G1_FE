using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

[AllowAnonymous]
[ApiController]
[Route("api/catalog")]
public class ClassCatalogController(ClassRegistrationFlowService registrations) : ControllerBase
{
    [HttpGet("centers")]
    public async Task<ActionResult<IReadOnlyList<CenterDto>>> AccessCenters() =>
        Ok(await registrations.AccessCentersAsync());

    [HttpGet("centers/{centerId}/sports")]
    public async Task<ActionResult<IReadOnlyList<SportDto>>> AccessSports(string centerId)
    {
        try
        {
            return Ok(await registrations.AccessSportsAsync(centerId));
        }
        catch (KeyNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
    }
}
