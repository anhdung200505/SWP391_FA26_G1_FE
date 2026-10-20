using AnhDuySport.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

public static class AccountPhone
{
    public static string Require(string? value)
    {
        var phone = Digits(value);
        if (phone.Length != 10 || !phone.StartsWith('0'))
        {
            throw new InvalidOperationException("Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.");
        }

        return phone;
    }

    public static string Digits(string? value) => new((value ?? "").Where(char.IsDigit).ToArray());

    public static async Task EnsureUniqueAsync(AppDbContext db, string phone, int? exceptUserId = null, string? exceptPendingEmail = null)
    {
        var users = await db.UserAccounts.AsNoTracking()
            .Where(user => user.Phone != null && user.Phone != "")
            .Select(user => new { user.UserId, user.Phone })
            .ToListAsync();
        if (users.Any(user => user.UserId != exceptUserId && Digits(user.Phone) == phone))
        {
            throw new InvalidOperationException("Số điện thoại này đã được dùng cho một tài khoản khác.");
        }

        var pending = await db.PendingRegistrations.AsNoTracking()
            .Where(row => row.Phone != null && row.Phone != "")
            .Select(row => new { row.Email, row.Phone })
            .ToListAsync();
        if (pending.Any(row => row.Email != exceptPendingEmail && Digits(row.Phone) == phone))
        {
            throw new InvalidOperationException("Số điện thoại này đang được dùng để đăng ký.");
        }
    }
}
