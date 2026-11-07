namespace AnhDuySport.Api.Contracts;

public sealed record LoginRequest(string Email, string Password, string? Portal = null);

public sealed record MemberLoginRequest(string Email, string Password);

public sealed record GoogleLoginRequest(string? IdToken, string? Portal = null, string? AccessToken = null, bool LinkExisting = false);

public sealed record GoogleLoginResult(LoginResponse? Login, GoogleAccountChoice? Choice);

public sealed record GoogleAccountChoice(string Email, string FullName);

public sealed record GmailOtpRequest(string Email, string? Portal = null);

public sealed record GmailConfirmRequest(string Email, string Code, string? Portal = null);

public sealed record RegisterGuestRequest(string FullName, string Email, string? Phone, string Password);

public sealed record RegisterOtpRequest(string FullName, string Email, string? Phone, string Password);

public sealed record ConfirmRegistrationRequest(string Email, string Code);

public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public sealed record ForgotPasswordRequest(string Email);

public sealed record ResetPasswordRequest(string Email, string Code, string NewPassword);

public sealed record DeleteAccountRequest(string Password);

public sealed record AuthUserDto(
    string Id,
    string FullName,
    string Email,
    string Phone,
    string RoleId,
    string RoleName,
    bool HasPaid,
    // Ảnh đại diện để hiện trên thanh menu, null khi chưa có ảnh.
    string? AvatarUrl);

public sealed record LoginResponse(string Token, AuthUserDto User);
