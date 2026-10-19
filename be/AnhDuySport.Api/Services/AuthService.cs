using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace AnhDuySport.Api.Services;

public class AuthService(AppDbContext db, PasswordHasher passwords, IConfiguration configuration)
{
    public async Task EnsureBootstrapAdminPasswordAsync()
    {
        var admin = await db.UserAccounts.FirstOrDefaultAsync(user => user.Email == "admin@anhduysport.vn");
        if (admin is null || !string.IsNullOrWhiteSpace(admin.PasswordHash))
        {
            return;
        }

        var password = configuration["Auth:BootstrapPassword"];
        if (string.IsNullOrWhiteSpace(password))
        {
            return;
        }

        admin.PasswordHash = passwords.Hash(password);
        await db.SaveChangesAsync();
    }

    public Task<LoginResponse> LoginAsync(LoginRequest request) =>
        SignInAsync(request, [RoleCatalog.AdminCode, "RECEPTIONIST"], "Chỉ quản trị trung tâm và lễ tân đăng nhập được.");

    public Task<LoginResponse> LoginMemberAsync(LoginRequest request) =>
        SignInAsync(request, ["MEMBER"], "Chỉ học viên đăng nhập được ở đây.");

    private async Task<LoginResponse> SignInAsync(LoginRequest request, string[] allowedRoles, string wrongRoleMessage)
    {
        var email = request.Email?.Trim() ?? "";
        var password = request.Password ?? "";
        if (email.Length == 0 || password.Length == 0)
        {
            throw new UnauthorizedAccessException("Email hoặc mật khẩu không đúng.");
        }

        var user = await db.UserAccounts
            .Include(account => account.Role)
            .FirstOrDefaultAsync(account => account.Email == email);
        if (user is null || !passwords.Verify(password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Email hoặc mật khẩu không đúng.");
        }

        if (user.Status == "locked")
        {
            throw new UnauthorizedAccessException("Tài khoản đã bị khóa.");
        }

        if (user.Status != "active")
        {
            throw new UnauthorizedAccessException("Tài khoản đã ngưng hoạt động.");
        }

        if (user.Role is null || !allowedRoles.Contains(user.Role.RoleCode))
        {
            throw new UnauthorizedAccessException(wrongRoleMessage);
        }

        return new LoginResponse(CreateToken(user), ToDto(user));
    }

    private string CreateToken(UserAccount user)
    {
        var key = configuration["Auth:JwtKey"] ?? throw new InvalidOperationException("Thiếu khóa ký JWT.");
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Email, user.Email ?? ""),
            new Claim(ClaimTypes.Role, user.Role?.RoleCode ?? ""),
        };
        var token = new JwtSecurityToken(
            issuer: configuration["Auth:Issuer"],
            audience: configuration["Auth:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: credentials);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static AuthUserDto ToDto(UserAccount user) =>
        new(
            user.UserId.ToString(),
            user.FullName,
            user.Email ?? "",
            user.Role?.RoleCode ?? "",
            user.Role?.RoleName ?? "");
}
