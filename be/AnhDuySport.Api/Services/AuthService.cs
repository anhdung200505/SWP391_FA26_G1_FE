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

    public async Task ChangePasswordAsync(int userId, ChangePasswordRequest request)
    {
        var currentPassword = request.CurrentPassword ?? "";
        var newPassword = request.NewPassword ?? "";

        var user = await db.UserAccounts.FirstOrDefaultAsync(account => account.UserId == userId && account.Status == "active")
            ?? throw new InvalidOperationException("Không tìm thấy tài khoản đang hoạt động.");

        if (!passwords.Verify(currentPassword, user.PasswordHash))
        {
            throw new InvalidOperationException("Mật khẩu hiện tại không đúng.");
        }

        if (newPassword == currentPassword)
        {
            throw new InvalidOperationException("Mật khẩu mới phải khác mật khẩu hiện tại.");
        }

        PasswordHasher.EnsureAcceptable(newPassword);

        user.PasswordHash = passwords.Hash(newPassword);
        await db.SaveChangesAsync();
    }

    public async Task ForgotPasswordAsync(ForgotPasswordRequest request)
    {
        var email = NormalizeEmail(request.Email);
        if (email.Length is 0 or > 200 || !email.Contains('@'))
        {
            throw new InvalidOperationException("Email không hợp lệ.");
        }

        var now = DateTime.UtcNow;
        await db.PasswordResets.Where(row => row.ExpiresAt <= now).ExecuteDeleteAsync();

        var accountStatus = await db.UserAccounts
            .Where(account => account.Email != null && account.Email.ToLower() == email)
            .Select(account => account.Status)
            .FirstOrDefaultAsync();
        if (accountStatus is null)
        {
            throw new InvalidOperationException("Email không tồn tại.");
        }

        if (accountStatus != "active")
        {
            throw new InvalidOperationException("Tài khoản đã bị khóa hoặc ngưng hoạt động.");
        }

        var reset = await db.PasswordResets.FirstOrDefaultAsync(row => row.Email == email);
        if (reset is not null && reset.CreatedAt > now.AddMinutes(-1))
        {
            throw new InvalidOperationException("Hãy đợi một phút trước khi gửi lại mã.");
        }

        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        var body = $"Xin chào,{Environment.NewLine}{Environment.NewLine}Mã OTP đặt lại mật khẩu AnhDuy Sport là {code}. Mã có hiệu lực trong 3 phút. Nếu bạn không yêu cầu mã này, hãy bỏ qua email.";
        try
        {
            await emailSender.SendAsync(email, "[AnhDuy Sport] Mã OTP đặt lại mật khẩu", body);
        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception exception)
        {
            throw new InvalidOperationException("Không gửi được email. Hãy thử lại.", exception);
        }

        if (reset is null)
        {
            reset = new PasswordReset { Email = email };
            db.PasswordResets.Add(reset);
        }

        reset.OtpHash = HashOtp(code);
        reset.Attempts = 0;
        reset.CreatedAt = now;
        reset.ExpiresAt = now.AddMinutes(3);
        await db.SaveChangesAsync();
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest request)
    {
        var email = NormalizeEmail(request.Email);
        var code = request.Code?.Trim() ?? "";
        var newPassword = request.NewPassword ?? "";
        const string invalidCode = "Mã OTP không đúng hoặc đã hết hạn.";

        if (email.Length == 0 || code.Length != 6 || !code.All(char.IsDigit))
        {
            throw new InvalidOperationException(invalidCode);
        }

        var reset = await db.PasswordResets.FirstOrDefaultAsync(row => row.Email == email);
        if (reset is null || reset.ExpiresAt <= DateTime.UtcNow)
        {
            if (reset is not null)
            {
                db.PasswordResets.Remove(reset);
                await db.SaveChangesAsync();
            }

            throw new InvalidOperationException(invalidCode);
        }

        if (reset.Attempts >= 5)
        {
            db.PasswordResets.Remove(reset);
            await db.SaveChangesAsync();
            throw new InvalidOperationException("Bạn đã nhập sai quá số lần. Hãy gửi lại mã.");
        }

        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(reset.OtpHash),
                Encoding.UTF8.GetBytes(HashOtp(code))))
        {
            reset.Attempts += 1;
            if (reset.Attempts >= 5)
            {
                db.PasswordResets.Remove(reset);
            }

            await db.SaveChangesAsync();
            throw new InvalidOperationException(reset.Attempts >= 5
                ? "Bạn đã nhập sai quá số lần. Hãy gửi lại mã."
                : invalidCode);
        }

        PasswordHasher.EnsureAcceptable(newPassword);

        var user = await db.UserAccounts.FirstOrDefaultAsync(account =>
            account.Email != null && account.Email.ToLower() == email && account.Status == "active")
            ?? throw new InvalidOperationException(invalidCode);

        user.PasswordHash = passwords.Hash(newPassword);
        db.PasswordResets.Remove(reset);
        await db.SaveChangesAsync();
    }

    public async Task<LoginResponse> RegisterGuestAsync(RegisterGuestRequest request)
    {
        var fullName = request.FullName?.Trim() ?? "";
        var email = request.Email?.Trim() ?? "";
        var phone = AccountPhone.Require(request.Phone);
        var password = request.Password ?? "";

        if (fullName.Length is 0 or > 200)
        {
            throw new InvalidOperationException("Họ tên không được để trống và không quá 200 ký tự.");
        }

        if (email.Length is 0 or > 200 || !email.Contains('@'))
        {
            throw new InvalidOperationException("Email không hợp lệ.");
        }

        PasswordHasher.EnsureAcceptable(password);

        var emailTaken = await db.UserAccounts.AnyAsync(account =>
            account.Email != null && account.Email.ToLower() == email.ToLower());
        if (emailTaken)
        {
            throw new InvalidOperationException("Email này đã được dùng.");
        }

        await AccountPhone.EnsureUniqueAsync(db, phone);

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
        var phone = AccountPhone.Require(request.Phone);
        var password = request.Password ?? "";

        if (fullName.Length is 0 or > 200)
        {
            throw new InvalidOperationException("Họ tên không được để trống và không quá 200 ký tự.");
        }

        if (email.Length is 0 or > 200 || !email.Contains('@'))
        {
            throw new InvalidOperationException("Email không hợp lệ.");
        }

        PasswordHasher.EnsureAcceptable(password);

        await DeleteUnconfirmedRegistrationsAsync();

        var emailTaken = await db.UserAccounts.AnyAsync(account =>
            account.Email != null && account.Email.ToLower() == email);
        if (emailTaken)
        {
            throw new InvalidOperationException("Email này đã được dùng.");
        }

        await AccountPhone.EnsureUniqueAsync(db, phone, exceptPendingEmail: email);

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

        var phone = AccountPhone.Require(pending.Phone);
        await AccountPhone.EnsureUniqueAsync(db, phone, exceptPendingEmail: email);

        var memberRole = await db.Roles.FirstOrDefaultAsync(role => role.RoleCode == "MEMBER")
            ?? throw new InvalidOperationException("Chưa có vai trò học viên.");
        var user = new UserAccount
        {
            RoleId = memberRole.RoleId,
            Role = memberRole,
            FullName = pending.FullName,
            Email = email,
            Phone = phone,
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

    public async Task DeleteOwnAccountAsync(int userId, string? password)
    {
        var user = await db.UserAccounts.Include(account => account.Role)
            .FirstOrDefaultAsync(account => account.UserId == userId)
            ?? throw new UnauthorizedAccessException("Tài khoản không còn tồn tại.");

        if (!passwords.Verify(password ?? "", user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Mật khẩu không đúng.");
        }

        if (user.Role?.RoleCode == RoleCatalog.AdminCode || user.UserId == RoleCatalog.ActorUserId)
        {
            throw new InvalidOperationException("Tài khoản quản trị không tự xóa được.");
        }

        if (await db.Classes.AnyAsync(item => item.CoachUserId == user.UserId))
        {
            throw new InvalidOperationException("Tài khoản đang phụ trách lớp học nên không tự xóa được.");
        }

        var planCount = await db.Database
            .SqlQuery<int>($"SELECT COUNT(*) AS Value FROM training_plan WHERE created_by_user_id = {user.UserId}")
            .SingleAsync();
        if (planCount > 0)
        {
            throw new InvalidOperationException("Tài khoản đang có giáo án nên không tự xóa được.");
        }

        var email = user.Email ?? "";
        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = user.UserId,
            Action = "Tự xóa tài khoản",
            EntityName = "user",
            EntityId = user.UserId,
            Detail = $"Tài khoản {email} (user {user.UserId}) tự xóa.",
            CreatedAt = DateTime.Now,
        });

        await using var transaction = await db.Database.BeginTransactionAsync();
        await db.SaveChangesAsync();
        await db.Database.ExecuteSqlInterpolatedAsync($"""
            DELETE FROM class_registration_log WHERE member_user_id = {user.UserId};
            UPDATE class_registration_log SET performed_by_user_id = NULL WHERE performed_by_user_id = {user.UserId};
            UPDATE payment SET registered_by_user_id = NULL WHERE registered_by_user_id = {user.UserId};
            DELETE FROM notification WHERE user_id = {user.UserId};
            DELETE FROM attendance WHERE user_id = {user.UserId};
            DELETE FROM class_enrollment WHERE user_id = {user.UserId};
            DELETE FROM evaluation WHERE evaluator_user_id = {user.UserId} OR evaluated_user_id = {user.UserId};
            UPDATE evaluation SET reviewer_user_id = NULL WHERE reviewer_user_id = {user.UserId};
            DELETE FROM support_request WHERE member_user_id = {user.UserId};
            UPDATE support_request SET assigned_to_user_id = NULL WHERE assigned_to_user_id = {user.UserId};
            UPDATE audit_log SET user_id = NULL WHERE user_id = {user.UserId};
            DELETE FROM personal_exercise WHERE user_id = {user.UserId};
            DELETE FROM ai_token_usage WHERE user_id = {user.UserId}
                OR membership_id IN (
                    SELECT membership_id FROM membership WHERE user_id = {user.UserId}
                        OR payment_id IN (SELECT payment_id FROM payment WHERE user_id = {user.UserId}));
            DELETE FROM ai_workout_recommendation WHERE user_id = {user.UserId};
            DELETE FROM member_body_metric WHERE user_id = {user.UserId};
            DELETE FROM coach_training_history WHERE member_user_id = {user.UserId} OR coach_user_id = {user.UserId};
            DELETE FROM membership WHERE user_id = {user.UserId}
                OR payment_id IN (SELECT payment_id FROM payment WHERE user_id = {user.UserId});
            DELETE FROM payment_history WHERE payment_id IN (SELECT payment_id FROM payment WHERE user_id = {user.UserId});
            DELETE FROM payment WHERE user_id = {user.UserId};
            DELETE FROM invoice WHERE user_id = {user.UserId};
            DELETE FROM pending_registration WHERE email = {email};
            DELETE FROM password_reset WHERE email = {email};
            DELETE FROM [user] WHERE user_id = {user.UserId};
            """);
        await transaction.CommitAsync();
    }

    public Task<int> DeleteUnconfirmedRegistrationsAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        return db.PendingRegistrations
            .Where(row => row.ExpiresAt <= now)
            .ExecuteDeleteAsync(cancellationToken);
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
            hasPaid,
            user.AvatarUrl);
}
