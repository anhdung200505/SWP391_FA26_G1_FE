using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

[Authorize(Roles = "MEMBER")]
[ApiController]
[Route("api/registrations")]
public class RegistrationsController(ClassRegistrationFlowService registrations) : ControllerBase
{
    [HttpPost("pay")]
    public async Task<ActionResult<RegistrationPaymentResponse>> Pay(PayRegistrationRequest request)
    {
        try
        {
            return Ok(await registrations.PayAsync(request));
        }
        catch (UnauthorizedAccessException exception)
        {
            return Unauthorized(new { message = exception.Message });
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
