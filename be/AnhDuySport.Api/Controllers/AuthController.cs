using System.Security.Claims;
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
    [EndpointDescription("Trả JWT vai trò MEMBER để gọi các API đăng ký lớp. Chỉ cần email và mật khẩu của học viên đã xác nhận OTP.")]
    public Task<ActionResult<LoginResponse>> LoginMember(MemberLoginRequest request) =>
        SignIn(() => auth.LoginMemberAsync(request));

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

    [Authorize]
    [HttpDelete("account")]
    [EndpointSummary("Người dùng tự xóa tài khoản")]
    [EndpointDescription("Cần JWT và mật khẩu hiện tại. Xóa tài khoản đang đăng nhập cùng đăng ký lớp, slot, thông báo, hội viên và hóa đơn của chính họ. Tài khoản quản trị, hoặc huấn luyện viên đang giữ lớp hay giáo án, không xóa được.")]
    public async Task<IActionResult> DeleteAccount(DeleteAccountRequest request)
    {
        try
        {
            var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(value, out var userId))
            {
                return Unauthorized(new { message = "Bạn cần đăng nhập." });
            }

            await auth.DeleteOwnAccountAsync(userId, request.Password);
            return Ok(new { message = "Đã xóa tài khoản." });
        }
        catch (UnauthorizedAccessException exception)
        {
            return Unauthorized(new { message = exception.Message });
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }
}
