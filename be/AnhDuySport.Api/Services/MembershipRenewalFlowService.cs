using System.Globalization;
using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Nhánh "Renew/Upgrade Package" của main flow.
//
// Member:       View membership management → Need Consultation?
//                 ├─ No  → Select Membership Package ─────────────────────────┐
//                 └─ Yes → Book Consultation (POST /api/support-requests)     │
// Receptionist:   Process Consultation (classify) → Consult (provide-consultation)
//                 → Consult & Select Package ─────────────────────────────────┤
// System:         Process Payment → Update Membership Expiry → Validate & Update database
// Member:         Display Success Message → Receive Updated Membership Info
public class MembershipRenewalFlowService(AppDbContext db, CurrentActor actor)
{
    // Mã phương thức thanh toán theo 02_seed.sql. Tiền mặt chỉ nhận tại quầy lễ tân.
    private static readonly string[] MemberPaymentMethods = ["chuyen_khoan", "the"];
    private static readonly string[] CounterPaymentMethods = ["tien_mat", "chuyen_khoan", "the"];

    // ===== Member: View membership management =====
    public async Task<MembershipManagementDto> ViewMembershipManagementAsync()
    {
        var member = await FindActiveMemberAsync(RequireActor());
        var today = DateOnly.FromDateTime(DateTime.Now);

        var memberships = await db.Memberships
            .AsNoTracking()
            .Include(item => item.Payment)
            .ThenInclude(payment => payment!.Invoice)
            .Where(item => item.UserId == member.UserId)
            .OrderByDescending(item => item.MembershipId)
            .ToListAsync();
        var history = memberships.Select(item => MemberFlowMapper.ToDto(item, today)).ToList();

        var current = history.FirstOrDefault(item =>
            item.Status == "active" && item.StartDate <= today && item.EndDate >= today);
        var endDate = history
            .Where(item => item.Status == "active" && item.EndDate >= today)
            .Select(item => (DateOnly?)item.EndDate)
            .Max();

        return new MembershipManagementDto(
            MemberFlowMapper.ToProfileDto(member),
            current,
            endDate,
            history,
            await AccessActivePackagesAsync());
    }

    public async Task<IReadOnlyList<PackageDto>> AccessActivePackagesAsync()
    {
        var packages = await db.MembershipPackages
            .AsNoTracking()
            .Where(item => item.Status == "active")
            .OrderBy(item => item.Fee)
            .ToListAsync();
        return packages.Select(AccountFlowMapper.ToDto).ToList();
    }

    // ===== Member: Need Consultation? = No → Select Membership Package =====
    public async Task<MembershipRenewalResponse> SelectMembershipPackageAsync(RenewMembershipRequest request)
    {
        var member = await FindActiveMemberAsync(RequireActor());
        var package = await FindActivePackageAsync(request.PackageId);
        var method = NormalizePaymentMethod(request.PaymentMethod, MemberPaymentMethods);
        return await RenewAsync(member, package, method, member.UserId, null);
    }

    // ===== Receptionist: Consult & Select Package =====
    // Tư vấn dùng luồng Customer Service có sẵn:
    //   POST /api/support-requests (requestType = consultation)
    //   POST /api/support-requests/{id}/classify (category = consultation)
    //   POST /api/support-requests/{id}/provide-consultation
    // Sau đó lễ tân gọi hàm này để chọn gói và thu tiền tại quầy.
    public async Task<MembershipRenewalResponse> ConsultAndSelectPackageAsync(ConsultAndSelectPackageRequest request)
    {
        var receptionistId = RequireActor();
        if (!int.TryParse(request.MemberUserId, out var memberUserId))
        {
            throw new KeyNotFoundException("Không tìm thấy học viên.");
        }

        var member = await FindActiveMemberAsync(memberUserId);
        var package = await FindActivePackageAsync(request.PackageId);
        var method = NormalizePaymentMethod(request.PaymentMethod, CounterPaymentMethods);

        string? consultationNote = null;
        if (!string.IsNullOrWhiteSpace(request.SupportRequestId))
        {
            var consultation = await FindResolvedConsultationAsync(request.SupportRequestId, member.UserId);
            consultationNote = $"Theo yêu cầu tư vấn #{consultation.SupportRequestId}";
        }

        return await RenewAsync(member, package, method, receptionistId, consultationNote);
    }

    // ===== System: Process Payment → Update Membership Expiry → Validate & Update database =====
    private async Task<MembershipRenewalResponse> RenewAsync(
        UserAccount member,
        MembershipPackage package,
        string paymentMethod,
        int actorUserId,
        string? consultationNote)
    {
        var now = DateTime.Now;
        var today = DateOnly.FromDateTime(now);

        // ---- Validate: tính ngày hiệu lực trước, không hợp lệ thì dừng trước khi thu tiền ----
        // Chưa có gói còn hạn            → new:     bắt đầu hôm nay
        // Còn hạn, chọn cùng gói         → renew:   nối tiếp sau ngày hết hạn hiện tại
        // Còn hạn, chọn gói khác         → upgrade: bắt đầu hôm nay, gói cũ chuyển "upgraded"
        // Dòng cũ chưa gắn gói (membership_package_id NULL) được coi là gói khác.
        var running = await db.Memberships
            .Include(item => item.Package)
            .Where(item => item.UserId == member.UserId && item.Status == "active" && item.EndDate >= today)
            .OrderBy(item => item.EndDate)
            .ToListAsync();
        var latest = running.LastOrDefault();

        string renewalType;
        DateOnly startDate;
        if (latest is null)
        {
            renewalType = "new";
            startDate = today;
        }
        else if (latest.MembershipPackageId == package.MembershipPackageId)
        {
            renewalType = "renew";
            startDate = latest.EndDate.AddDays(1);
        }
        else
        {
            if (latest.Package is not null && package.Fee < latest.Package.Fee)
            {
                throw new InvalidOperationException(
                    $"{latest.PlanName} còn hạn đến {latest.EndDate:dd/MM/yyyy}. Chỉ được gia hạn hoặc nâng cấp lên gói phí cao hơn.");
            }

            renewalType = "upgrade";
            startDate = today;
        }

        var endDate = startDate.AddMonths(package.ValidityMonths).AddDays(-1);

        // ---- Process Payment ----
        // Hiện ghi nhận đã thanh toán ngay (tiền mặt / thẻ / chuyển khoản đã đối soát).
        var invoice = new Invoice
        {
            UserId = member.UserId,
            InvoiceCode = await NextInvoiceCodeAsync(now),
            IssuedAt = now,
            TotalAmount = package.Fee,
            Status = "paid",
        };
        var payment = new Payment
        {
            Invoice = invoice,
            UserId = member.UserId,
            ClassId = null, // payment gói hội viên không gắn lớp (03_payment_class_id.sql)
            Amount = package.Fee,
            PaymentMethod = paymentMethod,
            PaidAt = now,
            Status = "paid",
        };
        db.Invoices.Add(invoice);
        db.Payments.Add(payment);

        // ---- Update Membership Expiry ----
        if (renewalType == "upgrade")
        {
            foreach (var item in running)
            {
                item.Status = "upgraded";
            }
        }

        var membership = new Membership
        {
            UserId = member.UserId,
            Payment = payment,
            MembershipPackageId = package.MembershipPackageId,
            PlanName = package.PackageName,
            StartDate = startDate,
            EndDate = endDate,
            Status = "active",
        };
        db.Memberships.Add(membership);

        // ---- Update database: nhật ký ----
        var detail = $"{package.PackageName} · {Money(package.Fee)} · {MemberFlowMapper.PaymentMethodLabel(paymentMethod)} · " +
            $"hiệu lực {startDate:dd/MM/yyyy} → {endDate:dd/MM/yyyy} · hóa đơn {invoice.InvoiceCode}";
        if (consultationNote is not null)
        {
            detail += $" · {consultationNote}";
        }

        var log = new ActivityLog
        {
            ActorUserId = actorUserId,
            Action = Trim($"{MemberFlowMapper.RenewalTypeLabel(renewalType)} gói cho {member.FullName}", 100),
            EntityName = "membership",
            Detail = detail,
            CreatedAt = now,
        };
        db.ActivityLogs.Add(log);

        // Lưu 1 lần: hóa đơn, thanh toán, membership, nhật ký. Lỗi thì không lưu gì.
        await db.SaveChangesAsync();
        log.EntityId = membership.MembershipId;
        await db.SaveChangesAsync();

        // ---- Display Success Message + Receive Updated Membership Info ----
        var actorName = await actor.NameAsync();
        return new MembershipRenewalResponse(
            MemberFlowMapper.ToDto(membership, today),
            endDate,
            $"{MemberFlowMapper.RenewalTypeLabel(renewalType)} {package.PackageName} thành công. Hội viên có hiệu lực đến hết {endDate:dd/MM/yyyy}.",
            ToLogDto(log, actorName, member.FullName));
    }

    // Mã hóa đơn INV-{năm}-{số}, số lấy từ dbo.invoice_code_seq (05_payment_pending_unique.sql).
    // Seed đã có INV-2026-0001 nên gặp số trùng thì lấy số tiếp theo.
    private async Task<string> NextInvoiceCodeAsync(DateTime now)
    {
        while (true)
        {
            // Dùng ToListAsync, không dùng FirstAsync: SQL Server không cho NEXT VALUE FOR nằm trong truy vấn con.
            var numbers = await db.Database
                .SqlQuery<int>($"SELECT NEXT VALUE FOR dbo.invoice_code_seq AS [Value]")
                .ToListAsync();
            var code = $"INV-{now:yyyy}-{numbers[0]:D4}";
            if (!await db.Invoices.AnyAsync(item => item.InvoiceCode == code))
            {
                return code;
            }
        }
    }

    private async Task<SupportRequest> FindResolvedConsultationAsync(string supportRequestId, int memberUserId)
    {
        if (!int.TryParse(supportRequestId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy yêu cầu tư vấn.");
        }

        var item = await db.SupportRequests.FirstOrDefaultAsync(request => request.SupportRequestId == id)
            ?? throw new KeyNotFoundException("Không tìm thấy yêu cầu tư vấn.");
        if (item.MemberUserId != memberUserId)
        {
            throw new InvalidOperationException("Yêu cầu tư vấn không thuộc học viên này.");
        }

        if (item.ReceptionistCategory != "consultation" || item.Status != "resolved")
        {
            throw new InvalidOperationException("Yêu cầu này chưa được tư vấn xong.");
        }

        return item;
    }

    private async Task<MembershipPackage> FindActivePackageAsync(string packageId)
    {
        if (!int.TryParse(packageId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy gói hội viên.");
        }

        var package = await db.MembershipPackages.FirstOrDefaultAsync(item => item.MembershipPackageId == id)
            ?? throw new KeyNotFoundException("Không tìm thấy gói hội viên.");
        if (package.Status != "active")
        {
            throw new InvalidOperationException("Gói hội viên đã ngừng bán.");
        }

        return package;
    }

    private async Task<UserAccount> FindActiveMemberAsync(int memberUserId)
    {
        var member = await db.UserAccounts
            .Include(user => user.Role)
            .FirstOrDefaultAsync(user => user.UserId == memberUserId);
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

    private int RequireActor()
    {
        if (actor.UserId == 0)
        {
            throw new UnauthorizedAccessException("Phiên đăng nhập không hợp lệ.");
        }

        return actor.UserId;
    }

    private static string NormalizePaymentMethod(string? value, string[] allowed)
    {
        var method = value?.Trim().ToLowerInvariant() ?? "";
        if (!allowed.Contains(method))
        {
            throw new InvalidOperationException($"Phương thức thanh toán phải là {string.Join(", ", allowed)}.");
        }

        return method;
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

    private static string Trim(string value, int max) => value.Length <= max ? value : value[..max];

    private static string Money(decimal value) =>
        string.Create(CultureInfo.GetCultureInfo("vi-VN"), $"{decimal.Round(value, 0):N0}đ");
}
