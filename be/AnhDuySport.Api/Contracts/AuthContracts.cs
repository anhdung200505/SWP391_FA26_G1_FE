namespace AnhDuySport.Api.Contracts;

public sealed record LoginRequest(string Email, string Password, string? Portal = null);

public sealed record MemberLoginRequest(string Email, string Password);

public sealed record RegisterGuestRequest(string FullName, string Email, string? Phone, string Password);

public sealed record RegisterOtpRequest(string FullName, string Email, string? Phone, string Password);

public sealed record ConfirmRegistrationRequest(string Email, string Code);

public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public sealed record DeleteAccountRequest(string Password);

public sealed record AuthUserDto(
    string Id,
    string FullName,
    string Email,
    string Phone,
    string RoleId,
    string RoleName,
    bool HasPaid);

public sealed record LoginResponse(string Token, AuthUserDto User);
