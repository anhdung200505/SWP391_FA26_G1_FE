using System.Globalization;
using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Main flow: User Information Edit & Membership Renewal
//
// Access System → Select Management Action
//   ├─ Edit personal information → Input changes → Validate & Update database → Display Success Message
//   └─ Renew/Upgrade Package → View membership management → Need Consultation?
//        ├─ Yes → hiển thị số chăm sóc khách hàng của trung tâm → học viên tự chọn gói
//        └─ No  → Select Membership Package
//      → Process Payment → Update Membership Expiry → Validate & Update database
//      → Display Success Message → Receive Updated Membership Info
public class MemberMembershipFlowService(AppDbContext db)
{
    // Giá trị theo dữ liệu có sẵn trong 02_seed.sql
    private static readonly string[] Genders = ["Nam", "Nữ", "Khác"];
    private static readonly string[] PaymentMethods = ["chuyen_khoan", "the"];

    // ===== Access System =====
    public async Task<MemberProfileDto> AccessSystemAsync(string memberUserId)
    {
        var member = await FindActiveMemberAsync(memberUserId);
        return ToProfileDto(member);
    }

    // ===== Edit personal information → Input changes → Validate & Update database =====
    public async Task<MemberProfileMutationResponse> InputChangesAsync(string memberUserId, UpdateMemberProfileRequest request)
    {
        var member = await FindActiveMemberAsync(memberUserId);

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
        var log = new ActivityLog
        {
            ActorUserId = member.UserId,
            Action = "Cập nhật thông tin cá nhân",
            EntityName = "user",
            EntityId = member.UserId,
            Detail = $"Đã sửa: {string.Join(", ", changes)}.",
            CreatedAt = DateTime.Now,
        };
        db.ActivityLogs.Add(log);
        await db.SaveChangesAsync();

        // ---- Display Success Message ----
        return new MemberProfileMutationResponse(
            ToProfileDto(member),
            "Cập nhật thông tin cá nhân thành công.",
            ToLogDto(log, member.FullName));
    }

    // ===== Renew/Upgrade Package → View membership management =====
    public async Task<MembershipManagementDto> ViewMembershipManagementAsync(string memberUserId)
    {
        var member = await FindActiveMemberAsync(memberUserId);
        var today = DateOnly.FromDateTime(DateTime.Now);

        var memberships = await db.Memberships
            .AsNoTracking()
            .Include(item => item.Payment)
            .ThenInclude(payment => payment!.Invoice)
            .Where(item => item.UserId == member.UserId)
            .OrderByDescending(item => item.MembershipId)
            .ToListAsync();
        var history = memberships.Select(item => ToMembershipDto(item, today)).ToList();

        var current = history.FirstOrDefault(item =>
            item.Status == "active" && item.StartDate <= today && item.EndDate >= today);
        var endDate = history
            .Where(item => item.Status == "active" && item.EndDate >= today)
            .Select(item => (DateOnly?)item.EndDate)
            .Max();

        var packages = await db.MembershipPackages
            .AsNoTracking()
            .Where(item => item.Status == "active")
            .OrderBy(item => item.Fee)
            .ToListAsync();

        return new MembershipManagementDto(
            ToProfileDto(member),
            current,
            endDate,
            history,
            packages.Select(AccountFlowMapper.ToDto).ToList());
    }

    // ===== Need Consultation? = Yes → hiển thị số chăm sóc khách hàng =====
    public async Task<ConsultationContactDto> AccessConsultationContactAsync(string memberUserId)
    {
        var member = await FindActiveMemberAsync(memberUserId);
        var center = await db.Centers.AsNoTracking().FirstOrDefaultAsync(item => item.CenterId == member.CenterId)
            ?? await db.Centers.AsNoTracking().OrderBy(item => item.CenterId).FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Chưa có thông tin trung tâm.");
        if (string.IsNullOrWhiteSpace(center.Phone))
        {
            throw new InvalidOperationException("Trung tâm chưa cập nhật số chăm sóc khách hàng.");
        }

        return new ConsultationContactDto(
            center.CenterName,
            center.Phone,
            center.Email ?? "",
            $"Gọi {center.Phone} để được tư vấn chọn gói phù hợp, sau đó chọn gói và thanh toán.");
    }

    // ===== Select Membership Package → Process Payment → Update Membership Expiry → Validate & Update database =====
    public async Task<MembershipRenewalResponse> SelectMembershipPackageAsync(string memberUserId, RenewMembershipRequest request)
    {
        var member = await FindActiveMemberAsync(memberUserId);
        var package = await FindActivePackageAsync(request.PackageId);
        var paymentMethod = request.PaymentMethod?.Trim().ToLowerInvariant() ?? "";
        if (!PaymentMethods.Contains(paymentMethod))
        {
            throw new InvalidOperationException("Phương thức thanh toán phải là chuyen_khoan hoặc the.");
        }

        var now = DateTime.Now;
        var today = DateOnly.FromDateTime(now);

        // ---- Validate: tính ngày hiệu lực trước, không hợp lệ thì dừng trước khi thu tiền ----
        // Chưa có gói còn hạn            → đăng ký mới: bắt đầu hôm nay
        // Còn hạn, chọn cùng gói         → gia hạn:     nối tiếp sau ngày hết hạn hiện tại
        // Còn hạn, chọn gói khác         → nâng cấp:    bắt đầu hôm nay, gói cũ chuyển "upgraded"
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
            renewalType = "Đăng ký mới";
            startDate = today;
        }
        else if (latest.MembershipPackageId == package.MembershipPackageId)
        {
            renewalType = "Gia hạn";
            startDate = latest.EndDate.AddDays(1);
        }
        else
        {
            if (latest.Package is not null && package.Fee < latest.Package.Fee)
            {
                throw new InvalidOperationException(
                    $"{latest.PlanName} còn hạn đến {latest.EndDate:dd/MM/yyyy}. Chỉ được gia hạn hoặc nâng cấp lên gói phí cao hơn.");
            }

            renewalType = "Nâng cấp";
            startDate = today;
        }

        var endDate = startDate.AddMonths(package.ValidityMonths).AddDays(-1);

        // ---- Process Payment ----
        // Hiện ghi nhận đã thanh toán ngay, chưa tích hợp cổng thanh toán.
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
        if (renewalType == "Nâng cấp")
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

        // ---- Update database ----
        var log = new ActivityLog
        {
            ActorUserId = member.UserId,
            Action = Trim($"{renewalType} gói cho {member.FullName}", 100),
            EntityName = "membership",
            Detail = $"{package.PackageName} · {Money(package.Fee)} · {PaymentMethodLabel(paymentMethod)} · " +
                $"hiệu lực {startDate:dd/MM/yyyy} → {endDate:dd/MM/yyyy} · hóa đơn {invoice.InvoiceCode}",
            CreatedAt = now,
        };
        db.ActivityLogs.Add(log);

        // Lưu 1 lần: hóa đơn, thanh toán, membership, nhật ký. Lỗi thì không lưu gì.
        await db.SaveChangesAsync();
        log.EntityId = membership.MembershipId;
        await db.SaveChangesAsync();

        // ---- Display Success Message + Receive Updated Membership Info ----
        return new MembershipRenewalResponse(
            ToMembershipDto(membership, today),
            endDate,
            $"{renewalType} {package.PackageName} thành công. Hội viên có hiệu lực đến hết {endDate:dd/MM/yyyy}.",
            ToLogDto(log, member.FullName));
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

    private async Task<UserAccount> FindActiveMemberAsync(string memberUserId)
    {
        if (!int.TryParse(memberUserId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy học viên.");
        }

        var member = await db.UserAccounts
            .Include(user => user.Role)
            .FirstOrDefaultAsync(user => user.UserId == id);
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

    private static MemberProfileDto ToProfileDto(UserAccount user) =>
        new(
            user.UserId.ToString(),
            $"ND-{user.UserId:D4}",
            user.FullName,
            user.Email ?? "",
            user.Phone ?? "",
            user.DateOfBirth,
            user.Gender ?? "",
            user.Status);

    // Cần có Payment và Payment.Invoice (Include hoặc vừa tạo) trước khi gọi.
    private static MembershipDto ToMembershipDto(Membership membership, DateOnly today) =>
        new(
            membership.MembershipId.ToString(),
            membership.MembershipPackageId?.ToString(),
            membership.PlanName,
            membership.StartDate,
            membership.EndDate,
            // Trong DB vẫn là active nhưng đã qua ngày hết hạn thì hiển thị expired.
            membership.Status == "active" && membership.EndDate < today ? "expired" : membership.Status,
            membership.Payment?.Amount ?? 0,
            membership.Payment?.Invoice?.InvoiceCode ?? "",
            membership.Payment?.PaymentMethod ?? "");

    private static ActivityLogDto ToLogDto(ActivityLog log, string memberName) =>
        new(
            log.AuditLogId == 0 ? Guid.NewGuid().ToString() : log.AuditLogId.ToString(),
            log.CreatedAt,
            log.EntityName,
            memberName,
            log.EntityId?.ToString() ?? "",
            memberName,
            log.Action,
            log.Detail ?? "",
            null);

    private static string PaymentMethodLabel(string method) => method switch
    {
        "chuyen_khoan" => "Chuyển khoản",
        "the" => "Thẻ",
        _ => method,
    };

    private static string Trim(string value, int max) => value.Length <= max ? value : value[..max];

    private static string Money(decimal value) =>
        string.Create(CultureInfo.GetCultureInfo("vi-VN"), $"{decimal.Round(value, 0):N0}đ");
}
