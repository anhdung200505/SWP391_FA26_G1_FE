using AnhDuySport.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Giảm học phí lớp theo gói hội viên. Mỗi học viên chỉ có 1 gói active tại 1 thời điểm.
public static class MembershipDiscount
{
    // % giảm của gói active còn hạn; 0 nếu không có gói hoặc chưa đăng nhập.
    public static async Task<decimal> ClassDiscountPercentAsync(AppDbContext db, int userId)
    {
        if (userId == 0)
        {
            return 0;
        }

        var today = DateOnly.FromDateTime(DateTime.Now);
        return await db.Memberships
            .AsNoTracking()
            .Where(item => item.UserId == userId
                && item.Status == "active"
                && item.StartDate <= today
                && item.EndDate >= today
                && item.Package != null)
            .Select(item => item.Package!.ClassDiscountPercent)
            .FirstOrDefaultAsync();
    }

    // 100.000đ với 5% → 95.000đ (làm tròn tới đồng)
    public static decimal Apply(decimal price, decimal percent) =>
        percent <= 0 ? price : decimal.Round(price * (100 - percent) / 100, 0, MidpointRounding.AwayFromZero);
}
