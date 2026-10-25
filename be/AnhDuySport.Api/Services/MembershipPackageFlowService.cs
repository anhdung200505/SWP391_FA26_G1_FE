using System.Globalization;
using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

public class MembershipPackageFlowService(AppDbContext db, CurrentActor actor)
{
    public async Task<IReadOnlyList<PackageDto>> AccessPackageListAsync()
    {
        var packages = await db.MembershipPackages.AsNoTracking().OrderBy(package => package.PackageCode).ToListAsync();
        return packages.Select(AccountFlowMapper.ToDto).ToList();
    }

    public async Task<PackageDto?> SelectExistingPackageAsync(string packageId)
    {
        if (!int.TryParse(packageId, out var id))
        {
            return null;
        }

        var package = await db.MembershipPackages.AsNoTracking().FirstOrDefaultAsync(item => item.MembershipPackageId == id);
        return package is null ? null : AccountFlowMapper.ToDto(package);
    }

    public async Task<PackageMutationResponse> SaveNewPackageAsync(CreatePackageRequest request)
    {
        var name = request.Name.Trim();
        var benefits = NormalizeBenefits(request.Benefits);
        ValidateSetting(request.Fee, request.ValidityMonths, benefits);
        if (string.IsNullOrWhiteSpace(name) || name.Length > 200)
        {
            throw new InvalidOperationException("Tên gói là bắt buộc và không quá 200 ký tự.");
        }

        var codes = await db.MembershipPackages.Select(item => item.PackageCode).ToListAsync();
        var nextNumber = codes
            .Select(code => int.TryParse(code.Replace("PKG-", "", StringComparison.Ordinal), out var number) ? number : 0)
            .DefaultIfEmpty(0)
            .Max() + 1;
        var now = DateTime.Now;
        var package = new MembershipPackage
        {
            PackageCode = $"PKG-{nextNumber:D3}",
            PackageName = name,
            Fee = decimal.Round(request.Fee, 0),
            ValidityMonths = request.ValidityMonths,
            UpgradeDiscountPercent = NormalizeDiscount(request.UpgradeDiscountPercent),
            Benefits = AccountFlowMapper.JoinBenefits(benefits),
            Status = "active",
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.MembershipPackages.Add(package);
        await db.SaveChangesAsync();
        var actor = await ActorNameAsync();
        var detail = $"Phí {Money(package.Fee)}, thời hạn {package.ValidityMonths} tháng, giảm khi lên cấp kèm lớp {package.UpgradeDiscountPercent:0.##}%, {benefits.Count} quyền lợi.";
        var log = AddLog($"Tạo gói {package.PackageName}", package.MembershipPackageId, detail, now);
        await db.SaveChangesAsync();
        return new PackageMutationResponse(
            AccountFlowMapper.ToDto(package),
            ToLogDto(log, actor, package.PackageName));
    }

    public async Task<PackageMutationResponse> SaveMembershipPackageSettingAsync(string packageId, UpdatePackageSettingRequest request)
    {
        if (!int.TryParse(packageId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy gói hội viên.");
        }

        var package = await db.MembershipPackages.FirstOrDefaultAsync(item => item.MembershipPackageId == id)
            ?? throw new KeyNotFoundException("Không tìm thấy gói hội viên.");
        var benefits = NormalizeBenefits(request.Benefits);
        ValidateSetting(request.Fee, request.ValidityMonths, benefits);
        var nextFee = decimal.Round(request.Fee, 0);
        var nextDiscount = NormalizeDiscount(request.UpgradeDiscountPercent);
        var currentBenefits = AccountFlowMapper.SplitBenefits(package.Benefits);
        var unchanged = package.Fee == nextFee
            && package.ValidityMonths == request.ValidityMonths
            && package.UpgradeDiscountPercent == nextDiscount
            && currentBenefits.SequenceEqual(benefits);
        if (unchanged)
        {
            throw new InvalidOperationException("Thiết lập gói không thay đổi.");
        }

        var previousFee = package.Fee;
        var previousMonths = package.ValidityMonths;
        var previousDiscount = package.UpgradeDiscountPercent;
        package.Fee = nextFee;
        package.ValidityMonths = request.ValidityMonths;
        package.UpgradeDiscountPercent = nextDiscount;
        package.Benefits = AccountFlowMapper.JoinBenefits(benefits);
        package.UpdatedAt = DateTime.Now;
        var actor = await ActorNameAsync();
        var detail = $"Phí {Money(previousFee)} → {Money(package.Fee)}. Thời hạn {previousMonths} tháng → {package.ValidityMonths} tháng. Giảm khi lên cấp kèm lớp {previousDiscount:0.##}% → {package.UpgradeDiscountPercent:0.##}%. {benefits.Count} quyền lợi.";
        var log = AddLog(Trim($"Sửa thiết lập gói {package.PackageName}", 100), package.MembershipPackageId, detail, package.UpdatedAt.Value);
        await db.SaveChangesAsync();
        return new PackageMutationResponse(AccountFlowMapper.ToDto(package), ToLogDto(log, actor, package.PackageName));
    }

    private static List<string> NormalizeBenefits(IEnumerable<string>? benefits) =>
        (benefits ?? [])
            .Select(benefit => benefit.Trim().TrimEnd('.'))
            .Where(benefit => benefit.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

    private static decimal NormalizeDiscount(decimal percent)
    {
        if (percent < 0 || percent > 100)
        {
            throw new InvalidOperationException("Phần trăm giảm khi lên cấp từ 0 đến 100.");
        }

        return decimal.Round(percent, 2);
    }

    private static void ValidateSetting(decimal fee, int validityMonths, IReadOnlyList<string> benefits)
    {
        if (fee <= 0 || fee > 100_000_000)
        {
            throw new InvalidOperationException("Phí gói phải lớn hơn 0 và không quá 100.000.000đ.");
        }

        // Gói bao nhiêu tháng cũng được (1 tháng = 30 ngày); chặn trên chỉ để không tràn ngày.
        if (validityMonths < 1 || validityMonths > MembershipDuration.MaxMonths)
        {
            throw new InvalidOperationException($"Thời hạn gói phải từ 1 đến {MembershipDuration.MaxMonths} tháng.");
        }

        if (benefits.Count is < 1 or > 12 || benefits.Any(benefit => benefit.Length > 200))
        {
            throw new InvalidOperationException("Gói cần từ 1 đến 12 quyền lợi, mỗi quyền lợi không quá 200 ký tự.");
        }
    }

    private Task<string> ActorNameAsync() => actor.NameAsync();

    private ActivityLog AddLog(string action, int entityId, string detail, DateTime at)
    {
        var log = new ActivityLog
        {
            ActorUserId = actor.UserId == 0 ? null : actor.UserId,
            Action = Trim(action, 100),
            EntityName = "membership_package",
            EntityId = entityId,
            Detail = detail,
            CreatedAt = at,
        };
        db.ActivityLogs.Add(log);
        return log;
    }

    private static ActivityLogDto ToLogDto(ActivityLog log, string actor, string targetName) =>
        new(
            log.AuditLogId == 0 ? Guid.NewGuid().ToString() : log.AuditLogId.ToString(),
            log.CreatedAt,
            "membership_package",
            actor,
            log.EntityId?.ToString() ?? "",
            targetName,
            log.Action,
            log.Detail ?? "",
            null);

    private static string Trim(string value, int max) => value.Length <= max ? value : value[..max];

    private static string Money(decimal value) =>
        string.Create(CultureInfo.GetCultureInfo("vi-VN"), $"{decimal.Round(value, 0):N0}đ");
}
