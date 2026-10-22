using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Gói hội viên nhận kèm khi đăng ký lớp:
// - Không lên cấp: thanh toán lớp xong được tặng Hạng Đồng.
// - Lên cấp ngay (cùng lúc đăng ký lớp): mua Bạc / Vàng với giá giảm theo upgrade_discount_percent,
//   cộng chung vào hóa đơn lớp. Mua gói riêng sau đó luôn là giá gốc.
// Đang có gói còn hạn thì gói nhận kèm chờ (scheduled), bắt đầu sau ngày hết hạn cuối cùng.
public static class ClassMembershipBonus
{
    public const string BronzeCode = "PKG-001";

    // Giá gói lên cấp khi chọn cùng lúc đăng ký lớp. Không chọn → (null, 0).
    public static async Task<(MembershipPackage? Package, decimal Price)> QuoteUpgradeAsync(AppDbContext db, string? packageId)
    {
        if (string.IsNullOrWhiteSpace(packageId))
        {
            return (null, 0);
        }

        if (!int.TryParse(packageId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy gói lên cấp.");
        }

        var package = await db.MembershipPackages
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.MembershipPackageId == id && item.Status == "active")
            ?? throw new KeyNotFoundException("Không tìm thấy gói lên cấp.");
        if (package.PackageCode == BronzeCode)
        {
            return (null, 0);
        }

        if (package.UpgradeDiscountPercent <= 0)
        {
            throw new RegistrationException("Gói này không có ưu đãi lên cấp khi đăng ký lớp.");
        }

        var price = decimal.Round(package.Fee * (100 - package.UpgradeDiscountPercent) / 100, 0, MidpointRounding.AwayFromZero);
        return (package, price);
    }

    // Gói đơn lớp này nhận khi thanh toán: gói mua kèm, hoặc Hạng Đồng tặng kèm.
    public static async Task<MembershipPackageQuoteDto?> QuoteOfPaymentAsync(AppDbContext db, Payment payment)
    {
        if (payment.ClassId is null)
        {
            return null;
        }

        var isFree = payment.UpgradePackageId is null;
        var package = await db.MembershipPackages.AsNoTracking()
            .FirstOrDefaultAsync(item => isFree
                ? item.PackageCode == BronzeCode
                : item.MembershipPackageId == payment.UpgradePackageId);
        return package is null ? null : ToQuote(package, isFree, payment.UpgradeAmount);
    }

    public static MembershipPackageQuoteDto ToQuote(MembershipPackage package, bool isFree, decimal upgradeAmount) =>
        new(
            package.MembershipPackageId.ToString(),
            package.PackageName,
            package.Fee,
            isFree ? 100 : package.UpgradeDiscountPercent,
            isFree ? 0 : upgradeAmount,
            package.ValidityMonths,
            isFree);

    // Tới ngày thì 'scheduled' → 'active'; gói đã quá hạn → 'expired'. Mỗi lúc chỉ 1 gói active.
    public static async Task PromoteAsync(AppDbContext db, int userId, DateOnly today)
    {
        var rows = await db.Memberships
            .Where(item => item.UserId == userId && (item.Status == "active" || item.Status == "scheduled"))
            .OrderBy(item => item.StartDate)
            .ToListAsync();
        foreach (var item in rows.Where(item => item.EndDate < today))
        {
            item.Status = "expired";
        }

        await db.SaveChangesAsync();
        if (rows.Any(item => item.Status == "active"))
        {
            return;
        }

        var next = rows.FirstOrDefault(item => item.Status == "scheduled" && item.StartDate <= today);
        if (next is null)
        {
            return;
        }

        next.Status = "active";
        await db.SaveChangesAsync();
    }

    // Gọi 1 lần khi payment lớp chuyển 'paid' (payment phải đã có PaymentId).
    public static async Task GrantAsync(AppDbContext db, Payment payment, DateTime now)
    {
        var today = DateOnly.FromDateTime(now);
        await PromoteAsync(db, payment.UserId, today);

        var isFree = payment.UpgradePackageId is null;
        var package = isFree
            ? await db.MembershipPackages.FirstOrDefaultAsync(item => item.PackageCode == BronzeCode)
            : await db.MembershipPackages.FirstOrDefaultAsync(item => item.MembershipPackageId == payment.UpgradePackageId);
        if (package is null)
        {
            return;
        }

        // Đang có gói (active hoặc đang chờ) → bắt đầu sau ngày hết hạn cuối cùng.
        var lastEnd = await db.Memberships
            .Where(item => item.UserId == payment.UserId
                && (item.Status == "active" || item.Status == "scheduled")
                && item.EndDate >= today)
            .Select(item => (DateOnly?)item.EndDate)
            .MaxAsync();
        var start = lastEnd is DateOnly end ? end.AddDays(1) : today;

        db.Memberships.Add(new Membership
        {
            UserId = payment.UserId,
            PaymentId = isFree ? null : payment.PaymentId,
            IsFree = isFree,
            MembershipPackageId = package.MembershipPackageId,
            PlanName = isFree ? $"{package.PackageName} (tặng kèm lớp)" : $"{package.PackageName} (ưu đãi kèm lớp)",
            StartDate = start,
            EndDate = start.AddMonths(package.ValidityMonths).AddDays(-1),
            Status = start <= today ? "active" : "scheduled",
        });
    }
}
