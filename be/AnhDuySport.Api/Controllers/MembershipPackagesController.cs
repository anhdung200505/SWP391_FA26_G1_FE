using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

[ApiController]
[Route("api/packages")]
public class MembershipPackagesController(MembershipPackageFlowService packages) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PackageDto>>> AccessList() =>
        Ok(await packages.AccessPackageListAsync());

    [HttpGet("{packageId}")]
    public async Task<ActionResult<PackageDto>> SelectExisting(string packageId)
    {
        var package = await packages.SelectExistingPackageAsync(packageId);
        return package is null ? NotFound(new { message = "Không tìm thấy gói hội viên." }) : Ok(package);
    }

    [HttpPost]
    public async Task<ActionResult<PackageMutationResponse>> SaveNew(CreatePackageRequest request)
    {
        try
        {
            var result = await packages.SaveNewPackageAsync(request);
            return CreatedAtAction(nameof(SelectExisting), new { packageId = result.Package.Id }, result);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpPut("{packageId}")]
    public async Task<ActionResult<PackageMutationResponse>> SaveSetting(string packageId, UpdatePackageSettingRequest request)
    {
        try
        {
            return Ok(await packages.SaveMembershipPackageSettingAsync(packageId, request));
        }
        catch (KeyNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }
}
