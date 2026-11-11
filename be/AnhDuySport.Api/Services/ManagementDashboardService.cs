using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

public class ManagementDashboardService(AppDbContext db, CurrentActor actor)
{
    public async Task<DashboardDto> AccessDashboardAsync()
    {
        var users = await db.UserAccounts.AsNoTracking().Include(user => user.Role).OrderBy(user => user.UserId).ToListAsync();
        var packages = await db.MembershipPackages.AsNoTracking().OrderBy(package => package.PackageCode).ToListAsync();
        var logs = await db.ActivityLogs.AsNoTracking().OrderByDescending(log => log.CreatedAt).ToListAsync();
        var notes = await db.Notifications.AsNoTracking().ToListAsync();
        var roles = await db.Roles.AsNoTracking().Include(role => role.Permissions).OrderBy(role => role.RoleId).ToListAsync();
        var names = users.ToDictionary(user => user.UserId, user => user.FullName);
        var emails = users.ToDictionary(user => user.UserId, user => user.Email ?? "");
        var packageNames = packages.ToDictionary(package => package.MembershipPackageId, package => package.PackageName);
        var activeCount = users.Count(user => user.Status == "active");
        var coachSports = await AccountFlowMapper.LoadCoachSportsAsync(db, users.Select(user => user.UserId).ToList());

        return new DashboardDto(
            users.Count,
            activeCount,
            users.Count(user => user.Status != "active"),
            packages.Count,
            roles.Select(ToRoleDto).ToList(),
            users.Select(user => AccountFlowMapper.ToDto(user, coachSports.GetValueOrDefault(user.UserId))).ToList(),
            packages.Select(AccountFlowMapper.ToDto).ToList(),
            logs.Select(log => ToLogDto(log, names, emails, packageNames, notes)).ToList());
    }

    public async Task<AiTokenUsageReportDto> ListAiTokenUsageAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var usages = await db.AiTokenUsages.AsNoTracking().ToListAsync();
        var memberships = await db.Memberships
            .AsNoTracking()
            .Include(item => item.Package)
            .Where(item => item.Status == "active" && item.EndDate >= today && item.Package != null)
            .ToListAsync();
        var current = memberships
            .Where(item => AiMembershipQuota.IsEligible(item.Package!.PackageCode))
            .GroupBy(item => item.UserId)
            .ToDictionary(
                group => group.Key,
                group => group.OrderByDescending(item => item.Package!.Fee).First());
        var activeCounts = await db.Memberships
            .AsNoTracking()
            .Where(item => item.Status == "active" && item.EndDate >= today && item.MembershipPackageId != null)
            .GroupBy(item => item.MembershipPackageId!.Value)
            .Select(group => new { PackageId = group.Key, Count = group.Count() })
            .ToListAsync();
        var countByPackage = activeCounts.ToDictionary(item => item.PackageId, item => item.Count);
        var packages = (await db.MembershipPackages
            .AsNoTracking()
            .Where(item => item.PackageCode == AiMembershipQuota.BronzeCode
                || item.PackageCode == AiMembershipQuota.SilverCode
                || item.PackageCode == AiMembershipQuota.GoldCode)
            .OrderBy(item => item.PackageCode)
            .ToListAsync())
            .Select(item => ToPackageQuota(item, countByPackage.GetValueOrDefault(item.MembershipPackageId)))
            .ToList();
        var userIds = usages.Select(item => item.UserId).Concat(current.Keys).Distinct().ToList();
        var months = MonthsOf(usages);
        var coachUsages = await db.CoachAiTokenUsages.AsNoTracking().ToListAsync();
        var coachIds = coachUsages.Select(item => item.CoachUserId).Distinct().ToList();
        var coachNames = await db.UserAccounts.AsNoTracking()
            .Where(item => coachIds.Contains(item.UserId))
            .ToDictionaryAsync(item => item.UserId, item => item.FullName);
        var coaches = coachUsages
            .GroupBy(item => item.CoachUserId)
            .Select(group => new AiCoachTokenRowDto(
                group.Key.ToString(),
                coachNames.GetValueOrDefault(group.Key, $"HLV #{group.Key}"),
                AiMembershipQuota.Clamp(group.Sum(item => (long)item.TotalTokens)),
                group.Count(item => item.Action == AiMembershipQuota.Generate),
                group.Count(item => item.Action == AiMembershipQuota.Regenerate),
                group.Max(item => item.CreatedAt),
                MonthsOf(group.Select(item => new AiTokenUsage { TotalTokens = item.TotalTokens, CreatedAt = item.CreatedAt }))))
            .OrderByDescending(item => item.TokensUsed)
            .ThenBy(item => item.CoachName)
            .ToList();
        var coachMonths = MonthsOf(coachUsages.Select(item => new AiTokenUsage { TotalTokens = item.TotalTokens, CreatedAt = item.CreatedAt }));
        var coachTotal = AiMembershipQuota.Clamp(coachUsages.Sum(item => (long)item.TotalTokens));
        if (userIds.Count == 0)
        {
            return new AiTokenUsageReportDto(0, packages, [], months, coaches, coachTotal, coachMonths);
        }

        var users = await db.UserAccounts
            .AsNoTracking()
            .Where(item => userIds.Contains(item.UserId))
            .OrderBy(item => item.FullName)
            .ThenBy(item => item.UserId)
            .ToListAsync();
        var rows = users.Select(user =>
        {
            var lifetime = usages.Where(item => item.UserId == user.UserId).Sum(item => (long)item.TotalTokens);
            current.TryGetValue(user.UserId, out var membership);
            var package = membership?.Package;
            var (regenerationLimit, tokenLimit) = package is null
                ? (0, 0)
                : AiMembershipQuota.LimitsOf(package);
            var period = membership is null
                ? []
                : usages.Where(item => item.MembershipId == membership.MembershipId).ToList();
            var own = usages.Where(item => item.UserId == user.UserId).ToList();
            return new AiTokenUsageRowDto(
                user.UserId.ToString(),
                user.FullName,
                package?.PackageCode,
                package?.PackageName,
                AiMembershipQuota.Clamp(lifetime),
                AiMembershipQuota.Clamp(period.Sum(item => (long)item.TotalTokens)),
                tokenLimit,
                period.Count(item => item.Action == AiMembershipQuota.Regenerate),
                regenerationLimit,
                MonthsOf(own));
        }).ToList();

        return new AiTokenUsageReportDto(
            AiMembershipQuota.Clamp(usages.Sum(item => (long)item.TotalTokens)),
            packages,
            rows,
            months,
            coaches,
            coachTotal,
            coachMonths);
    }

    private static List<AiTokenMonthDto> MonthsOf(IEnumerable<AiTokenUsage> usages)
    {
        var rows = usages.ToList();
        var start = new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1).AddMonths(-11);
        return Enumerable.Range(0, 12)
            .Select(offset =>
            {
                var month = start.AddMonths(offset);
                var total = rows
                    .Where(item => item.CreatedAt.Year == month.Year && item.CreatedAt.Month == month.Month)
                    .Sum(item => (long)item.TotalTokens);
                return new AiTokenMonthDto(month.Year, month.Month, AiMembershipQuota.Clamp(total));
            })
            .ToList();
    }

    public async Task<UpdateAiPackageQuotaResponse> UpdateAiQuotaAsync(int packageId, UpdateAiQuotaRequest request)
    {
        if (request.RegenerationLimit < 0)
        {
            throw new InvalidOperationException("Số lượt tạo lại không được âm.");
        }

        if (request.TokenLimit < 0)
        {
            throw new InvalidOperationException("Số token sử dụng không được âm.");
        }

        var package = await db.MembershipPackages
            .FirstOrDefaultAsync(item => item.MembershipPackageId == packageId)
            ?? throw new KeyNotFoundException("Không tìm thấy gói hội viên.");
        if (!AiMembershipQuota.IsEligible(package.PackageCode))
        {
            throw new InvalidOperationException("Chỉ chỉnh hạn mức AI cho gói từ Hạng Đồng trở lên.");
        }

        package.AiRegenerationLimit = request.RegenerationLimit;
        package.AiTokenLimit = request.TokenLimit;
        package.Benefits = AccountFlowMapper.JoinBenefits(AiMembershipQuota.SyncBenefits(
            AccountFlowMapper.SplitBenefits(package.Benefits), true,
            package.AiRegenerationLimit, package.AiTokenLimit, package.UpgradeDiscountPercent));
        package.UpdatedAt = DateTime.Now;
        var today = DateOnly.FromDateTime(DateTime.Today);
        var activeMembers = await db.Memberships
            .CountAsync(item => item.MembershipPackageId == package.MembershipPackageId
                && item.Status == "active"
                && item.EndDate >= today);
        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = actor.UserId == 0 ? null : actor.UserId,
            Action = "Chỉnh hạn mức AI của gói",
            EntityName = "membership_package",
            EntityId = package.MembershipPackageId,
            Detail = $"{package.PackageName}: {request.RegenerationLimit} lượt tạo lại, {request.TokenLimit.ToString("N0", System.Globalization.CultureInfo.GetCultureInfo("vi-VN"))} token. Áp dụng cho {activeMembers} học viên đang dùng gói.",
            CreatedAt = DateTime.Now,
        });
        await db.SaveChangesAsync();

        var quota = ToPackageQuota(package, activeMembers);
        return new UpdateAiPackageQuotaResponse(
            quota,
            $"Đã cập nhật {package.PackageName}. {activeMembers} học viên đang dùng gói này nhận hạn mức mới.");
    }

    private static AiPackageQuotaDto ToPackageQuota(MembershipPackage package, int activeMembers) =>
        new(
            package.MembershipPackageId.ToString(),
            package.PackageCode,
            package.PackageName,
            package.AiRegenerationLimit,
            package.AiTokenLimit,
            activeMembers);

    public async Task<RevenueReportDto> ListRevenueAsync()
    {
        var payments = await db.Payments
            .AsNoTracking()
            .Include(payment => payment.Class!)
            .ThenInclude(trainingClass => trainingClass.Course)
            .Include(payment => payment.Invoice)
            .Where(payment => payment.Status == "paid")
            .ToListAsync();
        var userIds = payments.Select(payment => payment.UserId).Distinct().ToList();
        var names = await db.UserAccounts
            .AsNoTracking()
            .Where(user => userIds.Contains(user.UserId))
            .ToDictionaryAsync(user => user.UserId, user => user.FullName);
        var paymentIds = payments.Select(payment => payment.PaymentId).ToList();
        var membershipRows = await db.Memberships
            .AsNoTracking()
            .Where(item => item.PaymentId != null && paymentIds.Contains(item.PaymentId.Value))
            .ToListAsync();
        var membershipByPayment = membershipRows
            .GroupBy(item => item.PaymentId!.Value)
            .ToDictionary(group => group.Key, group => group.OrderByDescending(item => item.MembershipId).First());
        var packageNames = await db.MembershipPackages
            .AsNoTracking()
            .ToDictionaryAsync(package => package.MembershipPackageId, package => package.PackageName);

        var courseLines = new List<RevenueLineDto>();
        var membershipLines = new List<RevenueLineDto>();
        foreach (var payment in payments)
        {
            var paidAt = payment.PaidAt ?? payment.Invoice?.IssuedAt ?? DateTime.MinValue;
            var memberName = names.GetValueOrDefault(payment.UserId, "Học viên");
            var method = PaymentMethodLabel(payment.PaymentMethod);
            if (payment.ClassId is not null)
            {
                var tuition = payment.Amount - payment.UpgradeAmount;
                if (tuition > 0)
                {
                    courseLines.Add(new RevenueLineDto(
                        payment.PaymentId,
                        paidAt,
                        memberName,
                        payment.Class?.Course?.CourseName ?? "Khóa học",
                        payment.Class?.ClassName ?? "Lớp học",
                        tuition,
                        method));
                }
            }

            var membershipAmount = payment.ClassId is null ? payment.Amount : payment.UpgradeAmount;
            if (membershipAmount <= 0)
            {
                continue;
            }

            membershipByPayment.TryGetValue(payment.PaymentId, out var membership);
            var packageName = membership?.PlanName;
            if (string.IsNullOrWhiteSpace(packageName) && payment.UpgradePackageId is int packageId)
            {
                packageName = packageNames.GetValueOrDefault(packageId);
            }

            var className = payment.Class?.ClassName;
            membershipLines.Add(new RevenueLineDto(
                payment.PaymentId,
                paidAt,
                memberName,
                string.IsNullOrWhiteSpace(packageName) ? "Gói hội viên" : packageName,
                payment.ClassId is null
                    ? "Mua hoặc gia hạn gói"
                    : string.IsNullOrWhiteSpace(className) ? "Lên cấp kèm lớp" : $"Lên cấp kèm lớp {className}",
                membershipAmount,
                method));
        }

        return new RevenueReportDto(ToRevenueSection(courseLines), ToRevenueSection(membershipLines));
    }

    public async Task<IReadOnlyList<RoleDto>> ListRolesAsync()
    {
        var roles = await db.Roles.AsNoTracking().Include(role => role.Permissions).OrderBy(role => role.RoleId).ToListAsync();
        return roles.Select(ToRoleDto).ToList();
    }

    private static RevenueSectionDto ToRevenueSection(List<RevenueLineDto> lines)
    {
        var ordered = lines
            .OrderByDescending(line => line.PaidAt)
            .ThenByDescending(line => line.PaymentId)
            .ToList();
        var groups = ordered
            .GroupBy(line => line.Title)
            .Select(group => new RevenueGroupDto(group.Key, group.Count(), group.Sum(line => line.Amount)))
            .OrderByDescending(group => group.Total)
            .ThenBy(group => group.Name)
            .ToList();
        return new RevenueSectionDto(ordered.Sum(line => line.Amount), ordered.Count, groups, ordered);
    }

    private static string PaymentMethodLabel(string? method) => method switch
    {
        "chuyen_khoan" => "Chuyển khoản",
        "payos" => "payOS",
        "cash" or "tien_mat" => "Tiền mặt",
        _ => string.IsNullOrWhiteSpace(method) ? "Khác" : method,
    };

    private static RoleDto ToRoleDto(Role role) =>
        new(
            role.RoleCode,
            role.RoleName,
            role.Permissions.OrderBy(permission => permission.PermissionCode).Select(permission => permission.PermissionName).ToList());

    private static ActivityLogDto ToLogDto(
        ActivityLog log,
        IReadOnlyDictionary<int, string> names,
        IReadOnlyDictionary<int, string> emails,
        IReadOnlyDictionary<int, string> packageNames,
        IReadOnlyList<AccountNotification> notes)
    {
        var targetId = log.EntityId ?? 0;
        var targetName = log.EntityName == "membership_package"
            ? packageNames.GetValueOrDefault(targetId, "Gói hội viên")
            : names.GetValueOrDefault(targetId, "Tài khoản");
        var actor = log.ActorUserId is int actorId
            ? names.GetValueOrDefault(actorId, "Quản trị AnhDuy")
            : "Hệ thống";
        AccountNotification? note = null;
        if (log.EntityName == "user")
        {
            note = notes
                .Where(item => item.UserId == targetId)
                .OrderBy(item => Math.Abs((item.CreatedAt - log.CreatedAt).TotalSeconds))
                .FirstOrDefault();
            if (note is not null && Math.Abs((note.CreatedAt - log.CreatedAt).TotalSeconds) > 10)
            {
                note = null;
            }
        }

        return new ActivityLogDto(
            log.AuditLogId.ToString(),
            log.CreatedAt,
            log.EntityName,
            actor,
            targetId.ToString(),
            targetName,
            log.Action,
            log.Detail ?? "",
            note is null ? null : new EmailDto(emails.GetValueOrDefault(targetId) ?? "", note.Title, note.Content));
    }
}
