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
    [EndpointSummary("Quản trị và lễ tân đăng nhập")]
    public Task<ActionResult<LoginResponse>> Login(LoginRequest request) => SignIn(() => auth.LoginAsync(request));

    [AllowAnonymous]
    [HttpPost("member-login")]
    [EndpointSummary("Học viên đăng nhập")]
    [EndpointDescription("Trả JWT vai trò MEMBER để gọi các API đăng ký lớp. Chỉ tài khoản học viên đã có mật khẩu mới đăng nhập được.")]
    public Task<ActionResult<LoginResponse>> LoginMember(LoginRequest request) => SignIn(() => auth.LoginMemberAsync(request));

    private async Task<ActionResult<LoginResponse>> SignIn(Func<Task<LoginResponse>> login)
    {
        try
        {
            return Ok(await login());
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
