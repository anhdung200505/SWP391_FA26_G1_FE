using System.Text.RegularExpressions;

namespace AnhDuySport.Api.Services;

// Địa chỉ mẫu trong seed không có hộp thư thật. Gửi đi thì Gmail trả thư thất bại về đúng hộp người gửi.
public static partial class NotificationEmail
{
    // ten.hoNN@gmail.com — 60 học viên trong 04_seed_extra_members.sql.
    [GeneratedRegex(@"^[a-z]+\.[a-z]+\d{2}$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex SeedMemberLocal();

    public static bool CanDeliver(string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return false;
        }

        var to = email.Trim();
        var at = to.LastIndexOf('@');
        if (at <= 0 || at >= to.Length - 1 || to.Contains(' '))
        {
            return false;
        }

        var local = to[..at];
        var domain = to[(at + 1)..];
        if (domain.Equals("anhduysport.vn", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (domain.Equals("gmail.com", StringComparison.OrdinalIgnoreCase) && SeedMemberLocal().IsMatch(local))
        {
            return false;
        }

        return !to.Equals("khang.nguyen@gmail.com", StringComparison.OrdinalIgnoreCase)
            && !to.Equals("han.tran@gmail.com", StringComparison.OrdinalIgnoreCase);
    }
}
