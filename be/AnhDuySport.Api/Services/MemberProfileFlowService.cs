using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Nhánh "Edit personal information" của main flow:
// Access System → Select Management Action → Input changes → Validate & Update database → Display Success Message
public class MemberProfileFlowService(AppDbContext db, CurrentActor actor)
{
    // Giá trị theo dữ liệu có sẵn trong 02_seed.sql
    private static readonly string[] Genders = ["Nam", "Nữ", "Khác"];

    public async Task<MemberProfileDto> AccessSystemAsync()
    {
        var member = await FindActiveMemberAsync();
        return MemberFlowMapper.ToProfileDto(member);
    }

    public async Task<MemberProfileMutationResponse> InputChangesAsync(UpdateMemberProfileRequest request)
    {
        var member = await FindActiveMemberAsync();

        // ---- Validate ----
        var fullName = RequireText(request.FullName, "Nhập họ tên.", 200);
        var email = NormalizeEmail(request.Email);
        var phone = NormalizePhone(request.Phone);
        var gender = NormalizeGender(request.Gender);
        ValidateDateOfBirth(request.DateOfBirth);

        var emailTaken = await db.UserAccounts.AnyAsync(user => user.UserId != member.UserId && user.Email == email);
        if (emailTaken)
        {
            throw new InvalidOperationException("Email đã được tài khoản khác sử dụng.");
        }

        var changes = new List<string>();
        if (member.FullName != fullName) changes.Add("Họ tên");
        if (!string.Equals(member.Email, email, StringComparison.OrdinalIgnoreCase)) changes.Add("Email");
        if (member.Phone != phone) changes.Add("Điện thoại");
        if (member.DateOfBirth != request.DateOfBirth) changes.Add("Ngày sinh");
        if (member.Gender != gender) changes.Add("Giới tính");
        if (changes.Count == 0)
        {
            throw new InvalidOperationException("Thông tin cá nhân không thay đổi.");
        }

        // ---- Update database ----
        member.FullName = fullName;
        member.Email = email;
        member.Phone = phone;
        member.DateOfBirth = request.DateOfBirth;
        member.Gender = gender;
        var now = DateTime.Now;
        var log = new ActivityLog
        {
            ActorUserId = member.UserId,
            Action = "Cập nhật thông tin cá nhân",
            EntityName = "user",
            EntityId = member.UserId,
            Detail = $"Đã sửa: {string.Join(", ", changes)}.",
            CreatedAt = now,
        };
        db.ActivityLogs.Add(log);
        await db.SaveChangesAsync();

        // ---- Display Success Message ----
        return new MemberProfileMutationResponse(
            MemberFlowMapper.ToProfileDto(member),
            "Cập nhật thông tin cá nhân thành công.",
            ToLogDto(log, member.FullName, member.FullName));
    }

    private async Task<UserAccount> FindActiveMemberAsync()
    {
        if (actor.UserId == 0)
        {
            throw new UnauthorizedAccessException("Phiên đăng nhập không hợp lệ.");
        }

        var member = await db.UserAccounts
            .Include(user => user.Role)
            .FirstOrDefaultAsync(user => user.UserId == actor.UserId);
        if (member is null || member.Role?.RoleCode != "MEMBER")
        {
            throw new KeyNotFoundException("Không tìm thấy học viên.");
        }

        if (member.Status != "active")
        {
            throw new InvalidOperationException("Tài khoản học viên không hoạt động.");
        }

        return member;
    }

    private static string NormalizeEmail(string? value)
    {
        var email = value?.Trim().ToLowerInvariant() ?? "";
        if (email.Length == 0 || email.Length > 200 || email.Contains(' ')
            || !email.Contains('@') || email.StartsWith('@') || email.EndsWith('@'))
        {
            throw new InvalidOperationException("Email không hợp lệ.");
        }

        return email;
    }

    private static string NormalizePhone(string? value)
    {
        // Bỏ khoảng trắng, dấu chấm, gạch nối: "0912 000 001" → "0912000001"
        var phone = new string((value ?? "").Where(char.IsDigit).ToArray());
        if (phone.Length != 10 || !phone.StartsWith('0'))
        {
            throw new InvalidOperationException("Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.");
        }

        return phone;
    }

    private static string? NormalizeGender(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var gender = Genders.FirstOrDefault(item => string.Equals(item, value.Trim(), StringComparison.OrdinalIgnoreCase));
        return gender ?? throw new InvalidOperationException("Giới tính phải là Nam, Nữ hoặc Khác.");
    }

    private static void ValidateDateOfBirth(DateOnly? dateOfBirth)
    {
        if (dateOfBirth is null)
        {
            return;
        }

        var today = DateOnly.FromDateTime(DateTime.Now);
        if (dateOfBirth > today || dateOfBirth < today.AddYears(-100))
        {
            throw new InvalidOperationException("Ngày sinh không hợp lệ.");
        }
    }

    private static ActivityLogDto ToLogDto(ActivityLog log, string actorName, string targetName) =>
        new(
            log.AuditLogId == 0 ? Guid.NewGuid().ToString() : log.AuditLogId.ToString(),
            log.CreatedAt,
            log.EntityName,
            actorName,
            log.EntityId?.ToString() ?? "",
            targetName,
            log.Action,
            log.Detail ?? "",
            null);

    private static string RequireText(string? value, string message, int max)
    {
        var text = value?.Trim() ?? "";
        if (text.Length == 0)
        {
            throw new InvalidOperationException(message);
        }

        if (text.Length > max)
        {
            throw new InvalidOperationException($"Không quá {max} ký tự.");
        }

        return text;
    }
}
