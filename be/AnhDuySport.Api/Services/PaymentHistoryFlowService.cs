using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Lịch sử thanh toán của học viên: đăng ký lớp và mua, gia hạn, nâng hạng gói. Gói tặng kèm lớp không có tiền nên không nằm ở đây.
public class PaymentHistoryFlowService(AppDbContext db)
{
    public async Task<IReadOnlyList<PaymentHistoryDto>> AccessMineAsync(int userId)
    {
        var payments = await db.Payments.AsNoTracking()
            .Where(payment => payment.UserId == userId)
            .Include(payment => payment.Invoice)
            .Include(payment => payment.Class)
            .OrderByDescending(payment => payment.Invoice!.IssuedAt)
            .ThenByDescending(payment => payment.PaymentId)
            .ToListAsync();

        var packageIds = payments.Where(payment => payment.UpgradePackageId != null).Select(payment => payment.UpgradePackageId!.Value).Distinct().ToList();
        var packageNames = await db.MembershipPackages.AsNoTracking()
            .Where(package => packageIds.Contains(package.MembershipPackageId))
            .ToDictionaryAsync(package => package.MembershipPackageId, package => package.PackageName);

        var paymentIds = payments.Select(payment => payment.PaymentId).ToList();
        var planNames = await db.Memberships.AsNoTracking()
            .Where(membership => membership.PaymentId != null && paymentIds.Contains(membership.PaymentId.Value))
            .ToDictionaryAsync(membership => membership.PaymentId!.Value, membership => membership.PlanName);

        return payments.Select(payment =>
        {
            var package = payment.UpgradePackageId is { } packageId && packageNames.TryGetValue(packageId, out var name) ? name : null;
            var isClass = payment.ClassId != null;
            var title = isClass
                ? $"Lớp {payment.Class?.ClassName}" + (package is null ? "" : $" + Gói {package}")
                : package is not null ? $"Gói {package}"
                : planNames.TryGetValue(payment.PaymentId, out var plan) ? plan
                : "Gói hội viên";
            var secondsLeft = payment.Status == "pending" ? PaymentTimeout.SecondsLeft(payment.Invoice!.IssuedAt) : 0;
            return new PaymentHistoryDto(
                payment.PaymentId.ToString(),
                payment.Invoice!.InvoiceCode,
                isClass ? "class" : "membership",
                title,
                payment.Amount,
                payment.PaymentMethod,
                // Hết hạn chỉ suy ra từ thời gian (chỗ giữ lớp tự nhả), dòng payment vẫn pending trong DB.
                payment.Status == "pending" && secondsLeft == 0 ? "expired" : payment.Status,
                payment.Invoice.IssuedAt,
                payment.PaidAt,
                secondsLeft);
        }).ToList();
    }
}
