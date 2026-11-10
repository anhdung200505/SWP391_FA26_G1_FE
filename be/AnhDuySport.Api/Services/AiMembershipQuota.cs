using System.Globalization;
using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Gợi ý tập AI mở cho mọi hội viên có gói (Đồng, Bạc, Vàng) đang hiệu lực, không cần đăng ký lớp.
// Đồng: 5 lượt tạo lại, 50.000 token. Bạc: 10 lượt, 100.000 token. Vàng: 25 lượt, 250.000 token.
public static class AiMembershipQuota
{
    public const string BronzeCode = "PKG-001";
    public const string SilverCode = "PKG-002";
    public const string GoldCode = "PKG-003";
    public const string Generate = "generate";
    public const string Regenerate = "regenerate";

    public static bool IsEligible(string? packageCode) =>
        packageCode is BronzeCode or SilverCode or GoldCode;

    // Gói sinh ra từ đơn có lớp, hoặc Hạng Đồng tặng kèm lớp.
    public static bool BundledWithClass(Membership membership) =>
        membership.IsFree
        || membership.Payment?.ClassId is not null
        || membership.PlanName.Contains("kèm lớp", StringComparison.OrdinalIgnoreCase);

    // Mọi hội viên có gói đang hiệu lực đều dùng được AI, không cần có lớp.
    public static Task<bool> OpensAiAsync(AppDbContext db, Membership membership) => Task.FromResult(true);

    public const string AiBenefitPrefix = "Gợi ý tập cá nhân bằng AI:";
    public const string DiscountBenefitMarker = "phí gói khi nâng hạng";

    // Dòng quyền lợi AI luôn sinh từ hạn mức thật, để chữ hiển thị và hệ thống không lệch nhau.
    public static string AiBenefitText(int regenerations, int tokens) =>
        $"{AiBenefitPrefix} {regenerations.ToString("N0", CultureInfo.GetCultureInfo("vi-VN"))} lượt tạo lại và {tokens.ToString("N0", CultureInfo.GetCultureInfo("vi-VN"))} token mỗi kỳ hội viên";

    public static string DiscountBenefitText(decimal percent) =>
        $"Giảm {percent:0.##}% {DiscountBenefitMarker} cùng lúc đăng ký khóa học";

    // Thay (hoặc thêm) dòng AI và dòng giảm giá trong danh sách quyền lợi theo số liệu hệ thống.
    public static List<string> SyncBenefits(IEnumerable<string> benefits, bool aiEligible, int regenerations, int tokens, decimal discountPercent)
    {
        var result = benefits.ToList();
        Replace(result, item => item.StartsWith(AiBenefitPrefix, StringComparison.OrdinalIgnoreCase),
            aiEligible ? AiBenefitText(regenerations, tokens) : null);
        Replace(result, item => item.StartsWith("Giảm", StringComparison.OrdinalIgnoreCase)
                && item.Contains(DiscountBenefitMarker, StringComparison.OrdinalIgnoreCase),
            discountPercent > 0 ? DiscountBenefitText(discountPercent) : null);
        return result;
    }

    private static void Replace(List<string> list, Func<string, bool> match, string? text)
    {
        var index = list.FindIndex(item => match(item));
        if (index < 0)
        {
            if (text is not null) list.Add(text);
            return;
        }

        for (var i = list.Count - 1; i > index; i--)
        {
            if (match(list[i])) list.RemoveAt(i);
        }

        if (text is null) list.RemoveAt(index); else list[index] = text;
    }

    public static (int Regenerations, int Tokens) LimitsOf(string packageCode) => packageCode switch
    {
        BronzeCode => (5, 50_000),
        SilverCode => (10, 100_000),
        GoldCode => (25, 250_000),
        _ => (0, 0),
    };

    public static (int Regenerations, int Tokens) LimitsOf(MembershipPackage package) =>
        (package.AiRegenerationLimit, package.AiTokenLimit);

    public static async Task<AiAllowance> LoadAsync(AppDbContext db, int userId)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        await ClassMembershipBonus.PromoteAsync(db, userId, today);

        var membership = await db.Memberships
            .Include(item => item.Package)
            .Include(item => item.Payment)
            .Where(item => item.UserId == userId && item.Status == "active" && item.EndDate >= today)
            .OrderByDescending(item => item.Package != null ? item.Package.Fee : 0)
            .FirstOrDefaultAsync();
        var package = membership?.Package;
        if (membership is null || package is null || !IsEligible(package.PackageCode))
        {
            throw new InvalidOperationException(
                "Gợi ý tập AI mở cho hội viên có gói đang hiệu lực. Hãy đăng ký hoặc gia hạn gói hội viên.");
        }

        var tokensUsed = await db.AiTokenUsages
            .Where(item => item.MembershipId == membership.MembershipId)
            .SumAsync(item => (long?)item.TotalTokens) ?? 0;
        var regenerationsUsed = await db.AiTokenUsages
            .CountAsync(item => item.MembershipId == membership.MembershipId && item.Action == Regenerate);
        var (regenerations, tokens) = LimitsOf(package);
        return new AiAllowance(
            membership.UserId,
            membership.MembershipId,
            package.PackageCode,
            package.PackageName,
            regenerationsUsed,
            regenerations,
            Clamp(tokensUsed),
            tokens);
    }

    public static void EnsureCanCall(AiAllowance allowance, bool regenerating)
    {
        if (regenerating && allowance.RegenerationsUsed >= allowance.RegenerationLimit)
        {
            throw new InvalidOperationException(
                $"Bạn đã dùng hết {allowance.RegenerationLimit} lượt tạo lại gợi ý tập của {allowance.PackageName}.");
        }

        if (allowance.TokensUsed >= allowance.TokenLimit)
        {
            throw new InvalidOperationException(
                $"Bạn đã dùng hết {Format(allowance.TokenLimit)} token AI của {allowance.PackageName}.");
        }
    }

    public static void Record(AppDbContext db, AiAllowance allowance, string action, int tokens, DateTime now)
    {
        db.AiTokenUsages.Add(new AiTokenUsage
        {
            UserId = allowance.UserId,
            MembershipId = allowance.MembershipId,
            Action = action,
            TotalTokens = Math.Max(1, tokens),
            CreatedAt = now,
        });
    }

    public static string RemainingText(AiAllowance allowance, int justUsedTokens, bool countedRegeneration)
    {
        var regenerationsUsed = allowance.RegenerationsUsed + (countedRegeneration ? 1 : 0);
        var tokensUsed = allowance.TokensUsed + Math.Max(1, justUsedTokens);
        var regenerationsLeft = Math.Max(0, allowance.RegenerationLimit - regenerationsUsed);
        var tokensLeft = Math.Max(0, allowance.TokenLimit - tokensUsed);
        return $"Còn {regenerationsLeft}/{allowance.RegenerationLimit} lượt tạo lại gợi ý tập và {Format(tokensLeft)}/{Format(allowance.TokenLimit)} token AI của {allowance.PackageName}.";
    }

    public static int Clamp(long value) => value >= int.MaxValue ? int.MaxValue : (int)value;

    private static string Format(int value) => value.ToString("N0", CultureInfo.GetCultureInfo("vi-VN"));
}

public sealed record AiAllowance(
    int UserId,
    int MembershipId,
    string PackageCode,
    string PackageName,
    int RegenerationsUsed,
    int RegenerationLimit,
    int TokensUsed,
    int TokenLimit)
{
    public AiQuotaDto ToDto() => new(
        PackageCode,
        PackageName,
        RegenerationsUsed,
        RegenerationLimit,
        TokensUsed,
        TokenLimit);
}
