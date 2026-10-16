using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AuthService auth) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
    {
        try
        {
            return Ok(await auth.LoginAsync(request));
        }
        catch (UnauthorizedAccessException exception)
        {
            return Unauthorized(new { message = exception.Message });
        }
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<ActionResult<LoginResponse>> Register(RegisterGuestRequest request)
    {
        try
        {
            var result = await auth.RegisterGuestAsync(request);
            return Created(string.Empty, result);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [AllowAnonymous]
    [HttpPost("register/otp")]
    public async Task<IActionResult> SendRegistrationOtp(RegisterOtpRequest request)
    {
        try
        {
            await auth.SendRegistrationOtpAsync(request);
            return Ok(new { message = "Đã gửi mã OTP tới email của bạn. Mã có hiệu lực trong 3 phút. Nếu không xác nhận, đăng ký sẽ bị xóa." });
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [AllowAnonymous]
    [HttpPost("register/confirm")]
    public async Task<ActionResult<LoginResponse>> ConfirmRegistration(ConfirmRegistrationRequest request)
    {
        try
        {
            return Ok(await auth.ConfirmRegistrationAsync(request));
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }
}
