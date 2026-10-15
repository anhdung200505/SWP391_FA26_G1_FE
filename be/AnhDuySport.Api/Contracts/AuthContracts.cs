namespace AnhDuySport.Api.Contracts;

public sealed record LoginRequest(string Email, string Password);

public sealed record RegisterRequest(string FullName, string Email, string? Phone, string Password);

public sealed record AuthUserDto(
    string Id,
    string FullName,
    string Email,
    string RoleId,
    string RoleName);

public sealed record LoginResponse(string Token, AuthUserDto User);
