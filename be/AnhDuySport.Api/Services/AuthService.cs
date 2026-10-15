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

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
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

        return new LoginResponse(CreateToken(user), ToDto(user));
    }

    public async Task RegisterAsync(RegisterRequest request)
    {
        var fullName = request.FullName?.Trim() ?? "";
        var email = request.Email?.Trim() ?? "";
        var phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        var password = request.Password ?? "";

        if (fullName.Length is 0 or > 200)
        {
            throw new InvalidOperationException("Họ tên không được để trống và không quá 200 ký tự.");
        }

        if (!IsEmail(email) || email.Length > 200)
        {
            throw new InvalidOperationException("Email không hợp lệ.");
        }

        if (phone is { Length: > 20 })
        {
            throw new InvalidOperationException("Số điện thoại không quá 20 ký tự.");
        }

        if (password.Length is < 6 or > 100)
        {
            throw new InvalidOperationException("Mật khẩu cần từ 6 đến 100 ký tự.");
        }

        if (!password.Any(character => character is '@' or '#' or '!'))
        {
            throw new InvalidOperationException("Mật khẩu phải có ít nhất một ký tự đặc biệt như @, # hoặc !.");
        }

        var emailTaken = await db.UserAccounts.AnyAsync(account => account.Email != null && account.Email.ToLower() == email.ToLower());
        if (emailTaken)
        {
            throw new InvalidOperationException("Email này đã được đăng ký.");
        }

        var memberRole = await db.Roles.FirstOrDefaultAsync(role => role.RoleCode == "MEMBER")
            ?? throw new InvalidOperationException("Chưa có vai trò học viên.");

        db.UserAccounts.Add(new UserAccount
        {
            RoleId = memberRole.RoleId,
            FullName = fullName,
            Email = email,
            Phone = phone,
            PasswordHash = passwords.Hash(password),
            Status = "active",
            CreatedAt = DateTime.Now,
        });

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            throw new InvalidOperationException("Email này đã được đăng ký.");
        }
    }

    private static bool IsEmail(string email)
    {
        try
        {
            var address = new System.Net.Mail.MailAddress(email);
            return address.Address == email;
        }
        catch (FormatException)
        {
            return false;
        }
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
