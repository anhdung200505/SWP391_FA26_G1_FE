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
}
