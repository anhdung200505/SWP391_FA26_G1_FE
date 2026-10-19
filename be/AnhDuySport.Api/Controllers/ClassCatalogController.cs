using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

[Authorize(Roles = "MEMBER,RECEPTIONIST,ADMIN")]
[ApiController]
[FlowErrors]
[Route("api/catalog")]
public class ClassCatalogController(ClassRegistrationFlowService registrations) : ControllerBase
{
    [HttpGet("centers")]
    public async Task<ActionResult<IReadOnlyList<CenterDto>>> AccessCenters() =>
        Ok(await registrations.AccessCentersAsync());

    [HttpGet("centers/{centerId}/sports")]
    public async Task<ActionResult<IReadOnlyList<SportDto>>> AccessSports(string centerId) =>
        Ok(await registrations.AccessSportsAsync(centerId));

    [HttpGet("classes")]
    public async Task<ActionResult<IReadOnlyList<ClassSummaryDto>>> AccessUpcomingClasses(
        [FromQuery] string? centerId,
        [FromQuery] string? sportId) =>
        Ok(await registrations.AccessUpcomingClassesAsync(centerId, sportId));

    [HttpGet("classes/{classId}")]
    public async Task<ActionResult<ClassDetailDto>> SelectClass(string classId) =>
        Ok(await registrations.SelectClassAsync(classId));
}
