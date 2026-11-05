using System.Security.Claims;
using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AuthService auth, CurrentActor actor) : ControllerBase
{
    [Authorize]
    [HttpPost("change-password")]
    [EndpointSummary("Đổi mật khẩu")]
    [EndpointDescription("Mọi vai trò đã đăng nhập. Nhập mật khẩu hiện tại và mật khẩu mới (6-100 ký tự, có @, # hoặc !, khác mật khẩu cũ). Token cũ vẫn dùng được sau khi đổi.")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
    {
        try
        {
            await auth.ChangePasswordAsync(actor.UserId, request);
            return Ok(new { message = "Đổi mật khẩu thành công." });
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [AllowAnonymous]
    [HttpPost("forgot-password")]
    [EndpointSummary("Quên mật khẩu: gửi mã OTP qua email")]
    [EndpointDescription("Email không có tài khoản hoặc tài khoản không hoạt động trả 400. Mã OTP 6 số hiệu lực 3 phút, gửi lại cách nhau 1 phút.")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
    {
        try
        {
            await auth.ForgotPasswordAsync(request);
            return Ok(new { message = "Đã gửi mã OTP tới email của bạn. Mã có hiệu lực trong 3 phút." });
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [AllowAnonymous]
    [HttpPost("reset-password")]
    [EndpointSummary("Đặt lại mật khẩu bằng mã OTP")]
    [EndpointDescription("Nhập email, mã OTP và mật khẩu mới (6-100 ký tự, có @, # hoặc !). Nhập sai mã tối đa 5 lần. Thành công thì đăng nhập lại bằng mật khẩu mới.")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
    {
        try
        {
            await auth.ResetPasswordAsync(request);
            return Ok(new { message = "Đặt lại mật khẩu thành công." });
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

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

    [AllowAnonymous]
    [HttpGet("google-client")]
    [EndpointSummary("Client ID đăng nhập Google")]
    public IActionResult GoogleClient() => Ok(new { clientId = auth.GoogleClientId() });

    [AllowAnonymous]
    [HttpPost("google")]
    [EndpointSummary("Đăng nhập bằng Gmail")]
    [EndpointDescription("Nhận access token từ cửa sổ Google. Gmail đã đăng ký bằng mật khẩu thì trả requiresChoice, chưa vào tài khoản. Gửi lại kèm linkExisting để vào tài khoản đó. Học viên chưa có tài khoản thì tạo mới.")]
    public async Task<IActionResult> LoginWithGoogle(GoogleLoginRequest request)
    {
        try
        {
            var result = await auth.LoginWithGoogleAsync(request);
            if (result.Choice is not null)
            {
                return Ok(new
                {
                    requiresChoice = true,
                    email = result.Choice.Email,
                    fullName = result.Choice.FullName,
                });
            }

            return Ok(result.Login);
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

    [AllowAnonymous]
    [HttpPost("gmail/otp")]
    [EndpointSummary("Gửi mã đăng nhập Gmail")]
    [EndpointDescription("Chỉ nhận địa chỉ @gmail.com. Mã 6 số hiệu lực 3 phút, gửi lại cách nhau 1 phút.")]
    public async Task<IActionResult> SendGmailOtp(GmailOtpRequest request)
    {
        try
        {
            await auth.SendGmailLoginOtpAsync(request);
            return Ok(new { message = "Đã gửi mã tới Gmail. Mã có hiệu lực trong 3 phút." });
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [AllowAnonymous]
    [HttpPost("gmail/confirm")]
    [EndpointSummary("Đăng nhập bằng mã Gmail")]
    public async Task<ActionResult<LoginResponse>> ConfirmGmail(GmailConfirmRequest request)
    {
        try
        {
            return Ok(await auth.ConfirmGmailLoginAsync(request));
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
    [EndpointDescription("Cần JWT và mật khẩu hiện tại. Xóa tài khoản đang đăng nhập cùng đăng ký lớp, điểm danh, thông báo, hội viên và hóa đơn của chính họ. Tài khoản quản trị, hoặc huấn luyện viên đang giữ lớp hay giáo án, không xóa được.")]
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
