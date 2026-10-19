using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace AnhDuySport.Api.Services;

public class AuthService(AppDbContext db, PasswordHasher passwords, IConfiguration configuration, SmtpEmailSender emailSender)
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

    public Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var portal = request.Portal?.Trim().ToLowerInvariant() ?? "";
        if (portal == "customer")
        {
            return SignInAsync(request.Email, request.Password, ["MEMBER"], "Cửa này dành cho học viên.");
        }

        if (portal.Length == 0)
        {
            return SignInAsync(request.Email, request.Password, [RoleCatalog.AdminCode, "RECEPTIONIST"], "Chỉ quản trị trung tâm và lễ tân đăng nhập được.");
        }

        return SignInAsync(request.Email, request.Password, [RoleCatalog.AdminCode, "RECEPTIONIST", "COACH"], "Cửa này dành cho quản trị trung tâm, lễ tân và huấn luyện viên.");
    }

    public Task<LoginResponse> LoginMemberAsync(MemberLoginRequest request) =>
        SignInAsync(request.Email, request.Password, ["MEMBER"], "Chỉ học viên đăng nhập được ở đây.");

    private async Task<LoginResponse> SignInAsync(string? emailValue, string? passwordValue, string[] allowedRoles, string wrongRoleMessage)
    {
        var email = emailValue?.Trim() ?? "";
        var password = passwordValue ?? "";
        if (email.Length == 0 || password.Length == 0)
        {
            throw new UnauthorizedAccessException("Email hoặc mật khẩu không đúng.");
        }

        var user = await db.UserAccounts
            .Include(account => account.Role)
            .FirstOrDefaultAsync(account => account.Email != null && account.Email.ToLower() == email.ToLower());
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

        return await IssueAsync(user);
    }

    public async Task<LoginResponse> RegisterGuestAsync(RegisterGuestRequest request)
    {
        var fullName = request.FullName?.Trim() ?? "";
        var email = request.Email?.Trim() ?? "";
        var phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        var password = request.Password ?? "";

        if (fullName.Length is 0 or > 200)
        {
            throw new InvalidOperationException("Họ tên không được để trống và không quá 200 ký tự.");
        }

        if (email.Length is 0 or > 200 || !email.Contains('@'))
        {
            throw new InvalidOperationException("Email không hợp lệ.");
        }

        if (phone is { Length: > 20 })
        {
            throw new InvalidOperationException("Số điện thoại không quá 20 ký tự.");
        }

        PasswordHasher.EnsureAcceptable(password);

        var emailTaken = await db.UserAccounts.AnyAsync(account =>
            account.Email != null && account.Email.ToLower() == email.ToLower());
        if (emailTaken)
        {
            throw new InvalidOperationException("Email này đã được dùng.");
        }

        var memberRole = await db.Roles.FirstOrDefaultAsync(role => role.RoleCode == "MEMBER")
            ?? throw new InvalidOperationException("Chưa có vai trò học viên.");

        var user = new UserAccount
        {
            RoleId = memberRole.RoleId,
            Role = memberRole,
            FullName = fullName,
            Email = email,
            Phone = phone,
            PasswordHash = passwords.Hash(password),
            Status = "active",
            CreatedAt = DateTime.Now,
        };
        db.UserAccounts.Add(user);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            throw new InvalidOperationException("Email này đã được dùng.");
        }

        return await IssueAsync(user);
    }

    public async Task SendRegistrationOtpAsync(RegisterOtpRequest request)
    {
        var fullName = request.FullName?.Trim() ?? "";
        var email = NormalizeEmail(request.Email);
        var phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        var password = request.Password ?? "";

        if (fullName.Length is 0 or > 200)
        {
            throw new InvalidOperationException("Họ tên không được để trống và không quá 200 ký tự.");
        }

        if (email.Length is 0 or > 200 || !email.Contains('@'))
        {
            throw new InvalidOperationException("Email không hợp lệ.");
        }

        if (phone is { Length: > 20 })
        {
            throw new InvalidOperationException("Số điện thoại không quá 20 ký tự.");
        }

        PasswordHasher.EnsureAcceptable(password);

        await DeleteUnconfirmedRegistrationsAsync();

        var emailTaken = await db.UserAccounts.AnyAsync(account =>
            account.Email != null && account.Email.ToLower() == email);
        if (emailTaken)
        {
            throw new InvalidOperationException("Email này đã được dùng.");
        }

        var now = DateTime.UtcNow;
        var pending = await db.PendingRegistrations.FirstOrDefaultAsync(row => row.Email == email);
        if (pending is not null && pending.CreatedAt > now.AddMinutes(-1))
        {
            throw new InvalidOperationException("Hãy đợi một phút trước khi gửi lại mã.");
        }

        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        var body = $"Xin chào {fullName},{Environment.NewLine}{Environment.NewLine}Mã OTP đăng ký tài khoản học viên AnhDuy Sport là {code}. Mã có hiệu lực trong 3 phút. Nếu bạn không yêu cầu mã này, hãy bỏ qua email.";
        try
        {
            await emailSender.SendAsync(email, "[AnhDuy Sport] Mã OTP đăng ký học viên", body);
        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception exception)
        {
            throw new InvalidOperationException("Không gửi được email. Hãy kiểm tra địa chỉ và thử lại.", exception);
        }

        if (pending is null)
        {
            pending = new PendingRegistration { Email = email };
            db.PendingRegistrations.Add(pending);
        }

        pending.FullName = fullName;
        pending.Phone = phone;
        pending.PasswordHash = passwords.Hash(password);
        pending.OtpHash = HashOtp(code);
        pending.Attempts = 0;
        pending.CreatedAt = now;
        pending.ExpiresAt = now.AddMinutes(3);
        await db.SaveChangesAsync();
    }

    public async Task<LoginResponse> ConfirmRegistrationAsync(ConfirmRegistrationRequest request)
    {
        var email = NormalizeEmail(request.Email);
        var code = request.Code?.Trim() ?? "";
        await DeleteUnconfirmedRegistrationsAsync();

        if (email.Length == 0 || code.Length != 6 || !code.All(char.IsDigit))
        {
            throw new InvalidOperationException("Mã OTP không đúng hoặc đã hết hạn.");
        }

        var pending = await db.PendingRegistrations.FirstOrDefaultAsync(row => row.Email == email);
        if (pending is null || pending.ExpiresAt <= DateTime.UtcNow)
        {
            if (pending is not null)
            {
                db.PendingRegistrations.Remove(pending);
                await db.SaveChangesAsync();
            }

            throw new InvalidOperationException("Mã OTP không đúng hoặc đã hết hạn.");
        }

        if (pending.Attempts >= 5)
        {
            db.PendingRegistrations.Remove(pending);
            await db.SaveChangesAsync();
            throw new InvalidOperationException("Bạn đã nhập sai quá số lần. Hãy gửi lại mã.");
        }

        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(pending.OtpHash),
                Encoding.UTF8.GetBytes(HashOtp(code))))
        {
            pending.Attempts += 1;
            if (pending.Attempts >= 5)
            {
                db.PendingRegistrations.Remove(pending);
            }

            await db.SaveChangesAsync();
            throw new InvalidOperationException(pending.Attempts >= 5
                ? "Bạn đã nhập sai quá số lần. Hãy gửi lại mã."
                : "Mã OTP không đúng hoặc đã hết hạn.");
        }

        var memberRole = await db.Roles.FirstOrDefaultAsync(role => role.RoleCode == "MEMBER")
            ?? throw new InvalidOperationException("Chưa có vai trò học viên.");
        var user = new UserAccount
        {
            RoleId = memberRole.RoleId,
            Role = memberRole,
            FullName = pending.FullName,
            Email = email,
            Phone = pending.Phone,
            PasswordHash = pending.PasswordHash,
            Status = "active",
            CreatedAt = DateTime.Now,
        };
        db.UserAccounts.Add(user);
        db.PendingRegistrations.Remove(pending);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            throw new InvalidOperationException("Email này đã được dùng.");
        }

        return await IssueAsync(user);
    }

    public Task<int> DeleteUnconfirmedRegistrationsAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        return db.PendingRegistrations
            .Where(row => row.ExpiresAt <= now)
            .ExecuteDeleteAsync(cancellationToken);
    }

    public async Task EnsurePendingRegistrationTableAsync()
    {
        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID(N'dbo.pending_registration', N'U') IS NULL
            BEGIN
                CREATE TABLE pending_registration (
                    email          NVARCHAR(200) NOT NULL,
                    full_name      NVARCHAR(200) NOT NULL,
                    phone          NVARCHAR(20)  NULL,
                    password_hash  NVARCHAR(255) NOT NULL,
                    otp_hash       NVARCHAR(64)  NOT NULL,
                    attempts       INT           NOT NULL CONSTRAINT DF_pending_registration_attempts DEFAULT (0),
                    created_at     DATETIME2(0)  NOT NULL,
                    expires_at     DATETIME2(0)  NOT NULL,
                    CONSTRAINT PK_pending_registration PRIMARY KEY (email)
                );
            END
            """);
    }

    public async Task<LoginResponse> IssueAsync(UserAccount user)
    {
        var hasPaid = await db.Payments.AnyAsync(payment => payment.UserId == user.UserId && payment.Status == "paid")
            || await db.ClassEnrollments.AnyAsync(enrollment => enrollment.UserId == user.UserId && enrollment.Status == "enrolled");
        return new LoginResponse(CreateToken(user), ToDto(user, hasPaid));
    }

    private static string NormalizeEmail(string? email) => (email ?? "").Trim().ToLowerInvariant();

    private static string HashOtp(string code)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(code));
        return Convert.ToHexString(hash);
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

    private static AuthUserDto ToDto(UserAccount user, bool hasPaid) =>
        new(
            user.UserId.ToString(),
            user.FullName,
            user.Email ?? "",
            user.Phone ?? "",
            user.Role?.RoleCode ?? "",
            user.Role?.RoleName ?? "",
            hasPaid);
}
