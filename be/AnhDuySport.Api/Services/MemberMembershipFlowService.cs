using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using PayOS;
using PayOS.Exceptions;
using PayOS.Models.V2.PaymentRequests;

namespace AnhDuySport.Api.Services;

// Main flow: User Information Edit & Membership Renewal
//
// Access System → Select Management Action
//   ├─ Edit personal information → Input changes → Validate & Update database → Display Success Message
//   │    (đổi email tách riêng: gửi OTP tới email mới → xác nhận OTP → cập nhật)
//   └─ Renew/Upgrade Package → View membership management → Need Consultation?
//        ├─ Yes → hiển thị số chăm sóc khách hàng của trung tâm → học viên tự chọn gói
//        └─ No  → Select Membership Package
//      → Process Payment (payOS) → Update Membership Expiry → Validate & Update database
//      → Display Success Message → Receive Updated Membership Info
//
// Thanh toán gói dùng chung bảng payment và PayOSClient đã đăng ký trong Program.cs. Payment gói có class_id NULL.
// Membership chỉ được kích hoạt qua ConfirmPaidAsync (khóa theo học viên, gọi nhiều lần không cộng hạn hai lần).
// Có 4 đường dẫn tới đó: webhook payOS (HandlePayOsPaidAsync), job nền MembershipPaymentSyncService,
// học viên bấm kiểm tra (ConfirmMembershipPaymentAsync), và khi học viên mở trang hồ sơ / gói hội viên.
//
// Luật gia hạn / nâng cấp (1 tháng = 30 ngày, hạng gói = phí trung bình mỗi tháng):
//   Chưa có gói đang dùng  → Đăng ký mới:      bắt đầu hôm nay.
//   Cùng gói đang dùng     → Gia hạn:          hạn mới = hạn cũ + thời hạn gói, gói cũ chuyển "renewed".
//   Gói cao cấp hơn        → Nâng cấp:         gói mới chạy ngay hôm nay; số ngày còn lại của gói cũ
//                                               được tách thành dòng "scheduled" chạy tiếp sau khi gói mới hết.
//   Gói thấp hơn           → Đăng ký nối tiếp: gói cũ dùng tiếp đến hết, gói mới "scheduled" bắt đầu sau đó.
public class MemberMembershipFlowService(AppDbContext db, IConfiguration configuration, IServiceProvider services)
{
    // Giá trị theo dữ liệu có sẵn trong 02_seed.sql
    private static readonly string[] Genders = ["Nam", "Nữ", "Khác"];
    private const string PayOsMethod = "payos";

    private const string TypeNew = "Đăng ký mới";
    private const string TypeRenew = "Gia hạn";
    private const string TypeUpgrade = "Nâng cấp";
    private const string TypeQueued = "Đăng ký nối tiếp";

    // Cùng thông số với OTP quên mật khẩu (AuthService).
    private const int OtpMinutes = 3;
    private const int OtpMaxAttempts = 5;

    private PayOSClient? PayOsClient => services.GetService<PayOSClient>();

    private PayOSClient RequirePayOs() =>
        PayOsClient ?? throw new InvalidOperationException(
            "Máy này chưa cấu hình payOS nên chưa tạo được mã QR thanh toán gói. Kiểm tra file be/config/payos.json.");

    // ===== Access System =====
    public async Task<MemberProfileDto> AccessSystemAsync(string memberUserId)
    {
        var member = await FindActiveProfileUserAsync(memberUserId);
        // Học viên trả tiền xong rồi tắt app: lần mở hồ sơ tiếp theo vẫn kích hoạt được gói.
        // Lễ tân, HLV, admin không mua gói nên không cần đối chiếu.
        if (member.Role?.RoleCode == "MEMBER")
        {
            await SyncPendingPaymentsAsync(member.UserId, CancellationToken.None);
        }
        return ToProfileDto(member);
    }

    // ===== Edit personal information → Input changes → Validate & Update database =====
    // Email không đổi ở đây: gửi email khác email hiện tại thì báo dùng luồng đổi email bằng OTP.
    public async Task<MemberProfileMutationResponse> InputChangesAsync(string memberUserId, UpdateMemberProfileRequest request)
    {
        var member = await FindActiveProfileUserAsync(memberUserId);

        // ---- Validate ----
        var fullName = RequireText(request.FullName, "Nhập họ tên.", 200);
        var phone = AccountPhone.Require(request.Phone);
        var gender = NormalizeGender(request.Gender);
        // Ngày sinh không bắt buộc: để trống (null / "") thì giữ nguyên ngày sinh đang có, chỉ kiểm tra khi có nhập.
        var dateOfBirth = request.DateOfBirth ?? member.DateOfBirth;
        if (request.DateOfBirth is not null)
        {
            ValidateDateOfBirth(request.DateOfBirth);
        }

        if (!string.IsNullOrWhiteSpace(request.Email)
            && !string.Equals(NormalizeEmail(request.Email), member.Email?.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Đổi email cần xác thực OTP gửi tới email mới. Hãy dùng chức năng đổi email.");
        }

        if (AccountPhone.Digits(member.Phone) != phone)
        {
            await AccountPhone.EnsureUniqueAsync(db, phone, member.UserId);
        }

        var changes = new List<string>();
        if (member.FullName != fullName) changes.Add("Họ tên");
        if (member.Phone != phone) changes.Add("Điện thoại");
        if (member.DateOfBirth != dateOfBirth) changes.Add("Ngày sinh");
        if (member.Gender != gender) changes.Add("Giới tính");
        if (changes.Count == 0)
        {
            throw new InvalidOperationException("Thông tin cá nhân không thay đổi.");
        }

        // ---- Update database ----
        member.FullName = fullName;
        member.Phone = phone;
        member.DateOfBirth = dateOfBirth;
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

    // ===== Edit personal information → đổi email (bước 1: gửi OTP tới email mới) =====
    // Cùng cách làm với quên mật khẩu: OTP 6 số, lưu hash, hết hạn 3 phút, đợi 1 phút mới gửi lại, sai 5 lần thì hủy mã.
    // Thêm: phải nhập đúng mật khẩu hiện tại, email mới chưa ai dùng (kể cả đăng ký đang chờ OTP).
    public async Task<EmailChangeOtpDto> RequestEmailChangeAsync(string memberUserId, RequestEmailChangeRequest request)
    {
        var member = await FindActiveMemberAsync(memberUserId);
        var email = NormalizeEmail(request.NewEmail);
        if (string.Equals(email, member.Email?.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Email mới phải khác email hiện tại.");
        }

        var passwords = services.GetRequiredService<PasswordHasher>();
        if (!passwords.Verify(request.CurrentPassword ?? "", member.PasswordHash))
        {
            throw new InvalidOperationException("Mật khẩu hiện tại không đúng.");
        }

        var now = DateTime.UtcNow;
        await db.EmailChanges.Where(row => row.ExpiresAt <= now).ExecuteDeleteAsync();
        await EnsureEmailAvailableAsync(email, member.UserId, now);

        var change = await db.EmailChanges.FirstOrDefaultAsync(row => row.UserId == member.UserId);
        if (change is not null && change.CreatedAt > now.AddMinutes(-1))
        {
            throw new InvalidOperationException("Hãy đợi một phút trước khi gửi lại mã.");
        }

        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        var body = $"Xin chào {member.FullName},{Environment.NewLine}{Environment.NewLine}" +
            $"Mã OTP xác nhận đổi email đăng nhập AnhDuy Sport sang địa chỉ này là {code}. " +
            $"Mã có hiệu lực trong {OtpMinutes} phút. Nếu bạn không yêu cầu đổi email, hãy bỏ qua thư này.";
        try
        {
            await services.GetRequiredService<SmtpEmailSender>().SendAsync(email, "[AnhDuy Sport] Mã OTP đổi email", body);
        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception exception)
        {
            throw new InvalidOperationException("Không gửi được email. Hãy thử lại.", exception);
        }

        if (change is null)
        {
            change = new EmailChange { UserId = member.UserId };
            db.EmailChanges.Add(change);
        }

        change.NewEmail = email;
        change.OtpHash = HashOtp(code);
        change.Attempts = 0;
        change.CreatedAt = now;
        change.ExpiresAt = now.AddMinutes(OtpMinutes);
        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = member.UserId,
            Action = "Yêu cầu đổi email",
            EntityName = "user",
            EntityId = member.UserId,
            Detail = $"Gửi mã OTP tới {email}.",
            CreatedAt = DateTime.Now,
        });
        await db.SaveChangesAsync();

        return new EmailChangeOtpDto(
            email,
            OtpMinutes * 60,
            $"Đã gửi mã OTP tới {email}. Mã có hiệu lực trong {OtpMinutes} phút.");
    }

    // ===== Edit personal information → đổi email (bước 2: nhập OTP) → Validate & Update database =====
    public async Task<MemberProfileMutationResponse> ConfirmEmailChangeAsync(string memberUserId, ConfirmEmailChangeRequest request)
    {
        var member = await FindActiveMemberAsync(memberUserId);
        var code = request.Code?.Trim() ?? "";
        const string invalidCode = "Mã OTP không đúng hoặc đã hết hạn.";
        if (code.Length != 6 || !code.All(char.IsDigit))
        {
            throw new InvalidOperationException(invalidCode);
        }

        var now = DateTime.UtcNow;
        var change = await db.EmailChanges.FirstOrDefaultAsync(row => row.UserId == member.UserId);
        if (change is null || change.ExpiresAt <= now)
        {
            if (change is not null)
            {
                db.EmailChanges.Remove(change);
                await db.SaveChangesAsync();
            }

            throw new InvalidOperationException(invalidCode);
        }

        if (change.Attempts >= OtpMaxAttempts)
        {
            db.EmailChanges.Remove(change);
            await db.SaveChangesAsync();
            throw new InvalidOperationException("Bạn đã nhập sai quá số lần. Hãy gửi lại mã.");
        }

        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(change.OtpHash),
                Encoding.UTF8.GetBytes(HashOtp(code))))
        {
            change.Attempts += 1;
            if (change.Attempts >= OtpMaxAttempts)
            {
                db.EmailChanges.Remove(change);
            }

            await db.SaveChangesAsync();
            throw new InvalidOperationException(change.Attempts >= OtpMaxAttempts
                ? "Bạn đã nhập sai quá số lần. Hãy gửi lại mã."
                : invalidCode);
        }

        // Trong 3 phút chờ OTP có thể đã có người khác dùng email này: kiểm tra lại.
        await EnsureEmailAvailableAsync(change.NewEmail, member.UserId, now);

        var oldEmail = member.Email ?? "";
        member.Email = change.NewEmail;
        db.EmailChanges.Remove(change);
        var log = new ActivityLog
        {
            ActorUserId = member.UserId,
            Action = "Đổi email",
            EntityName = "user",
            EntityId = member.UserId,
            Detail = $"{oldEmail} → {member.Email}. Đã xác thực OTP.",
            CreatedAt = DateTime.Now,
        };
        db.ActivityLogs.Add(log);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException exception) when (IsUniqueViolation(exception))
        {
            throw new InvalidOperationException("Email đã được tài khoản khác sử dụng.");
        }

        // Báo cho email cũ để chủ tài khoản biết nếu không phải họ đổi. Gửi lỗi thì bỏ qua.
        if (!string.IsNullOrWhiteSpace(oldEmail))
        {
            try
            {
                await services.GetRequiredService<SmtpEmailSender>().SendAsync(
                    oldEmail,
                    "[AnhDuy Sport] Email đăng nhập đã được thay đổi",
                    $"Xin chào {member.FullName},{Environment.NewLine}{Environment.NewLine}" +
                    $"Email đăng nhập AnhDuy Sport của bạn vừa được đổi sang {member.Email}. " +
                    "Nếu không phải bạn thực hiện, hãy liên hệ ngay lễ tân trung tâm.");
            }
            catch (Exception)
            {
            }
        }

        return new MemberProfileMutationResponse(
            ToProfileDto(member),
            "Đổi email thành công. Lần đăng nhập sau hãy dùng email mới.",
            ToLogDto(log, member.FullName));
    }

    // ===== Edit personal information → đổi ảnh đại diện =====
    public async Task<MemberProfileMutationResponse> UpdateAvatarAsync(string memberUserId, IFormFile? file)
    {
        var member = await FindActiveProfileUserAsync(memberUserId);
        var contentRoot = services.GetRequiredService<IWebHostEnvironment>().ContentRootPath;
        var oldAvatar = member.AvatarUrl;
        member.AvatarUrl = await AvatarStorage.SaveAsync(contentRoot, member.UserId, file);

        var log = new ActivityLog
        {
            ActorUserId = member.UserId,
            Action = "Cập nhật ảnh đại diện",
            EntityName = "user",
            EntityId = member.UserId,
            Detail = "Đã đổi ảnh đại diện.",
            CreatedAt = DateTime.Now,
        };
        db.ActivityLogs.Add(log);
        await db.SaveChangesAsync();
        AvatarStorage.DeleteIfUploaded(contentRoot, oldAvatar);

        return new MemberProfileMutationResponse(
            ToProfileDto(member),
            "Cập nhật ảnh đại diện thành công.",
            ToLogDto(log, member.FullName));
    }

    // ===== Renew/Upgrade Package → View membership management =====
    public async Task<MembershipManagementDto> ViewMembershipManagementAsync(string memberUserId)
    {
        var member = await FindActiveMemberAsync(memberUserId);
        await SyncPendingPaymentsAsync(member.UserId, CancellationToken.None);
        var today = DateOnly.FromDateTime(DateTime.Now);
        await ClassMembershipBonus.PromoteAsync(db, member.UserId, today);

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
        // Tính cả các gói đang chờ (scheduled) vì chúng nối tiếp gói hiện tại.
        var endDate = history
            .Where(item => item.Status is "active" or "scheduled" && item.EndDate >= today)
            .Select(item => (DateOnly?)item.EndDate)
            .Max();

        var packages = await db.MembershipPackages
            .AsNoTracking()
            .Where(item => item.Status == "active")
            .OrderBy(item => item.Fee)
            .ToListAsync();

        var highest = await ClassMembershipBonus.HighestOwnedPackageAsync(db, member.UserId, today);
        return new MembershipManagementDto(
            ToProfileDto(member),
            current,
            endDate,
            history,
            packages.Select(AccountFlowMapper.ToDto).ToList(),
            highest?.MembershipPackageId.ToString());
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

    // ===== Select Membership Package → Process Payment (tạo link payOS) =====
    // Chỉ tạo đơn chờ thanh toán. Hạn gói chỉ được cập nhật ở ConfirmPaidAsync khi payment đã paid.
    public async Task<MembershipCheckoutDto> SelectMembershipPackageAsync(string memberUserId, RenewMembershipRequest request)
    {
        var member = await FindActiveMemberAsync(memberUserId);
        var package = await FindActivePackageAsync(request.PackageId);
        var amount = RequirePayableAmount(package.Fee);
        RequirePayOs();

        // Hỏi lại payOS trước: đơn cũ đã trả tiền thì kích hoạt, không hủy nhầm và không thu tiền lần nữa.
        if (await SyncPendingPaymentsAsync(member.UserId, CancellationToken.None) > 0)
        {
            throw new InvalidOperationException(
                "Đơn gói trước đó đã thanh toán và vừa được kích hoạt. Tải lại trang để xem hạn mới.");
        }

        var now = DateTime.Now;
        var today = DateOnly.FromDateTime(now);
        await ClassMembershipBonus.PromoteAsync(db, member.UserId, today);

        // ---- Đơn gói đang chờ: mỗi học viên chỉ giữ 1 đơn (UX_membership_one_pending) ----
        // Cùng gói, còn mã QR → trả lại đơn cũ. Khác gói → hủy đơn cũ rồi tạo đơn mới.
        var waiting = await db.Memberships
            .Include(item => item.Payment!)
            .ThenInclude(payment => payment.Invoice)
            .Where(item => item.UserId == member.UserId && item.Status == "pending")
            .ToListAsync();
        foreach (var item in waiting)
        {
            var oldPayment = item.Payment ?? throw new InvalidOperationException("Đơn gói thiếu thanh toán.");
            if (CanReuse(item, oldPayment, package, amount))
            {
                var reusePlan = await PlanRenewalAsync(member.UserId, package, today);
                return ToCheckoutDto(item, oldPayment, reusePlan.Type,
                    "Bạn đang có đơn chờ thanh toán cho gói này. Quét mã QR để thanh toán.");
            }

            await CancelPaymentAsync(oldPayment, "Chọn gói khác, đóng đơn gói cũ");
            item.Status = "cancelled";
        }

        await db.SaveChangesAsync();

        // ---- Tính loại gia hạn để báo trước cho học viên (tính lại theo ngày thanh toán khi kích hoạt) ----
        var plan = await PlanRenewalAsync(member.UserId, package, today);

        // ---- Tạo hóa đơn + payment pending + membership pending ----
        Payment payment;
        Membership membership;
        try
        {
            await using var transaction = await db.Database.BeginTransactionAsync();
            var invoice = new Invoice
            {
                UserId = member.UserId,
                InvoiceCode = await NextInvoiceCodeAsync(now),
                IssuedAt = now,
                TotalAmount = amount,
                Status = "issued",
            };
            payment = new Payment
            {
                Invoice = invoice,
                UserId = member.UserId,
                ClassId = null, // payment gói hội viên không gắn lớp
                Amount = amount,
                PaymentMethod = PayOsMethod,
                Status = "pending",
            };
            // Ngày ở đây chỉ là tạm tính. Khi thanh toán xong sẽ tính lại theo ngày thanh toán.
            membership = new Membership
            {
                UserId = member.UserId,
                Payment = payment,
                MembershipPackageId = package.MembershipPackageId,
                PlanName = package.PackageName,
                StartDate = plan.StartDate,
                EndDate = plan.EndDate,
                Status = "pending",
            };
            db.Invoices.Add(invoice);
            db.Payments.Add(payment);
            db.Memberships.Add(membership);
            await db.SaveChangesAsync();

            // Mã đơn payOS không dùng thẳng payment_id: chạy lại setup.ps1 thì payment_id đếm lại từ đầu
            // và payOS báo "Đơn thanh toán đã tồn tại". Ghép thời điểm tạo + 3 số cuối payment_id cho khác nhau.
            payment.PayosOrderCode = long.Parse(now.ToString("yyMMddHHmmss")) * 1000 + payment.PaymentId % 1000;
            AddHistory(payment, "pending", "Tạo đơn thanh toán gói");
            db.ActivityLogs.Add(new ActivityLog
            {
                ActorUserId = member.UserId,
                Action = Trim($"Tạo thanh toán gói cho {member.FullName}", 100),
                EntityName = "payment",
                EntityId = payment.PaymentId,
                Detail = $"{plan.Type} {package.PackageName} · {Money(amount)} · hóa đơn {invoice.InvoiceCode}",
                CreatedAt = now,
            });
            await db.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (DbUpdateException exception) when (IsUniqueViolation(exception, "UX_membership_one_pending"))
        {
            // Hai yêu cầu chọn gói cùng lúc: request kia đã tạo đơn chờ trước (UX_membership_one_pending).
            db.ChangeTracker.Clear();
            var existing = await db.Memberships
                .Include(item => item.Payment!)
                .ThenInclude(item => item.Invoice)
                .FirstOrDefaultAsync(item => item.UserId == member.UserId && item.Status == "pending");
            if (existing?.Payment is Payment existingPayment && CanReuse(existing, existingPayment, package, amount))
            {
                return ToCheckoutDto(existing, existingPayment, plan.Type,
                    "Bạn đang có đơn chờ thanh toán cho gói này. Quét mã QR để thanh toán.");
            }

            throw new InvalidOperationException("Bạn đang có một đơn gói khác chờ thanh toán. Hãy thử lại sau giây lát.");
        }

        // ---- Process Payment: tạo link / mã QR payOS ----
        await CreateLinkAsync(payment, membership);

        return ToCheckoutDto(membership, payment, plan.Type,
            $"Quét mã QR để thanh toán {Money(amount)} cho {package.PackageName}. Gói có hiệu lực sau khi thanh toán.{PlanNote(plan, package)}");
    }

    // ===== Process Payment → Update Membership Expiry → Validate & Update database =====
    // → Display Success Message → Receive Updated Membership Info
    // Gọi khi payOS chuyển về ReturnUrl (payOS gắn ?orderCode=...), hoặc khi học viên bấm kiểm tra.
    // paymentId nhận payment_id hoặc orderCode payOS.
    // Payment có thể đã được webhook / job nền xử lý trước. Gọi lại nhiều lần không cộng hạn hai lần.
    public async Task<MembershipPaymentResultDto> ConfirmMembershipPaymentAsync(string memberUserId, string paymentId)
    {
        var member = await FindActiveMemberAsync(memberUserId);
        var found = await FindOwnMembershipPaymentAsync(member.UserId, paymentId);
        var paymentKey = found.PaymentId ?? throw new KeyNotFoundException("Không tìm thấy thanh toán gói.");

        var log = await SyncWithPayOsAsync(paymentKey, "Học viên kiểm tra thanh toán gói");

        db.ChangeTracker.Clear();
        var membership = await db.Memberships
            .AsNoTracking()
            .Include(item => item.Payment!)
            .ThenInclude(payment => payment.Invoice)
            .FirstAsync(item => item.MembershipId == found.MembershipId);
        var payment = membership.Payment ?? throw new KeyNotFoundException("Không tìm thấy thanh toán gói.");
        var today = DateOnly.FromDateTime(DateTime.Now);

        var endDate = await db.Memberships
            .AsNoTracking()
            .Where(item => item.UserId == member.UserId
                && (item.Status == "active" || item.Status == "scheduled") && item.EndDate >= today)
            .Select(item => (DateOnly?)item.EndDate)
            .MaxAsync();

        var endText = endDate?.ToString("dd/MM/yyyy") ?? "";
        var startText = membership.Status == "scheduled" ? $" Gói bắt đầu từ {membership.StartDate:dd/MM/yyyy}." : "";
        var message = membership.Status switch
        {
            "pending" => "Chưa nhận được thanh toán. Hoàn tất thanh toán trên payOS rồi kiểm tra lại.",
            "cancelled" => "Đơn thanh toán đã hủy hoặc hết hạn. Hãy chọn gói lại.",
            _ when log is not null =>
                $"{GetRenewalType(log)} {membership.PlanName} thành công.{startText} Hội viên có hiệu lực đến hết {endText}.",
            _ => $"Đơn này đã thanh toán và gói đã được cập nhật trước đó.{startText} Hội viên có hiệu lực đến hết {endText}.",
        };

        return new MembershipPaymentResultDto(
            payment.PaymentId.ToString(),
            payment.Status,
            ToMembershipDto(membership, today),
            endDate,
            message,
            log is null ? null : ToLogDto(log, member.FullName));
    }

    // ===== Webhook payOS cho đơn gói (payment.class_id NULL) =====
    // PayOsPaymentService và ComboPayOsPaymentService kiểm tra chữ ký rồi chuyển đơn gói sang đây.
    // Đơn đã hủy mà payOS vẫn báo nhận tiền: lấy tiền làm chuẩn, mở lại đơn và kích hoạt gói.
    public async Task HandlePayOsPaidAsync(int paymentId, long amount)
    {
        var payment = await db.Payments
            .AsNoTracking()
            .Where(item => item.PaymentId == paymentId)
            .Select(item => new { item.Amount, item.ClassId })
            .FirstOrDefaultAsync();
        if (payment is null || payment.ClassId is not null)
        {
            return;
        }

        if (amount != decimal.ToInt64(payment.Amount))
        {
            throw new InvalidOperationException("Số tiền webhook không khớp hóa đơn.");
        }

        await ConfirmPaidAsync(paymentId, "Webhook payOS: thanh toán gói thành công");
    }

    // ===== Đối chiếu đơn gói với payOS (job nền gọi với userId = null, trang hồ sơ gọi cho 1 học viên) =====
    // Trả số gói vừa được kích hoạt.
    public async Task<int> SyncPendingPaymentsAsync(int? userId, CancellationToken cancellationToken)
    {
        var since = DateTime.Now.AddHours(-24);
        var paymentIds = await db.Memberships
            .AsNoTracking()
            .Where(item => item.PaymentId != null && (userId == null || item.UserId == userId))
            .Where(item =>
                // Đơn đang chờ: hỏi payOS.
                (item.Status == "pending" && item.Payment!.Status == "pending"
                    && item.Payment.PayosOrderCode != null && item.Payment.Invoice!.IssuedAt > since)
                // Tiền đã vào (webhook cũ, hoặc trả cho đơn đã hủy) nhưng gói chưa kích hoạt.
                || ((item.Status == "pending" || item.Status == "cancelled") && item.Payment!.Status == "paid")
                // Payment đã hủy ở nơi khác nhưng membership còn pending.
                || (item.Status == "pending" && (item.Payment!.Status == "cancel" || item.Payment.Status == "failed")))
            .Select(item => item.PaymentId!.Value)
            .ToListAsync(cancellationToken);

        var activated = 0;
        foreach (var paymentId in paymentIds)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (await SyncWithPayOsAsync(paymentId, "Đối chiếu thanh toán gói") is not null)
            {
                activated++;
            }
        }

        return activated;
    }

    // Hỏi payOS (ngoài khóa, không giữ khóa trong lúc chờ mạng) rồi cập nhật trong khóa.
    // Trả log nếu lần gọi này kích hoạt gói.
    private async Task<ActivityLog?> SyncWithPayOsAsync(int paymentId, string note)
    {
        var snapshot = await db.Payments
            .AsNoTracking()
            .Where(item => item.PaymentId == paymentId)
            .Select(item => new { item.Status, item.PayosOrderCode, item.UserId })
            .FirstOrDefaultAsync();
        if (snapshot is null)
        {
            return null;
        }

        if (snapshot.Status == "paid")
        {
            return await ConfirmPaidAsync(paymentId, note);
        }

        if (snapshot.Status is "cancel" or "failed")
        {
            // Payment bị hủy ở nơi khác (vd. POST /api/payments/{id}/cancel) nhưng membership còn pending:
            // đóng membership để học viên chọn gói lại được (UX_membership_one_pending).
            await InMemberLockAsync(snapshot.UserId, async () =>
            {
                var membership = await db.Memberships.FirstOrDefaultAsync(item => item.PaymentId == paymentId);
                if (membership?.Status == "pending")
                {
                    membership.Status = "cancelled";
                }

                return 0;
            });
            return null;
        }

        if (snapshot.Status != "pending")
        {
            return null;
        }

        var status = await PayOsStatusAsync(snapshot.PayosOrderCode);
        if (status == "PAID")
        {
            return await ConfirmPaidAsync(paymentId, "payOS báo đã thanh toán gói");
        }

        if (status is "CANCELLED" or "CANCELED" or "EXPIRED")
        {
            await InMemberLockAsync(snapshot.UserId, async () =>
            {
                var membership = await db.Memberships
                    .Include(item => item.Payment!)
                    .ThenInclude(item => item.Invoice)
                    .FirstOrDefaultAsync(item => item.PaymentId == paymentId);
                if (membership?.Payment is Payment payment && payment.Status == "pending")
                {
                    // Link đã hủy / hết hạn trên payOS nên không cần gọi payOS hủy lần nữa.
                    await CancelPaymentAsync(payment, "payOS trả trạng thái " + status, callPayOs: false);
                    if (membership.Status == "pending")
                    {
                        membership.Status = "cancelled";
                    }
                }

                return 0;
            });
        }

        return null;
    }

    // ---- Update Membership Expiry: nơi duy nhất ghi payment gói 'paid' từ payOS và kích hoạt membership ----
    // Khóa dòng user của học viên: webhook, job nền và học viên bấm kiểm tra có thể tới cùng lúc;
    // kích hoạt sửa nhiều dòng membership của cùng người (tách gói cũ, dời hàng chờ) nên phải chạy lần lượt.
    // Chỉ gọi khi chắc chắn payOS đã nhận tiền (hoặc payment đã paid). Gọi lặp lại không ghi thêm gì.
    private async Task<ActivityLog?> ConfirmPaidAsync(int paymentId, string note)
    {
        var userId = await db.Payments
            .AsNoTracking()
            .Where(item => item.PaymentId == paymentId)
            .Select(item => (int?)item.UserId)
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Không tìm thấy thanh toán gói.");

        return await InMemberLockAsync(userId, async () =>
        {
            // Đọc lại sau khi đã khóa: luồng khác có thể vừa xử lý xong.
            var membership = await db.Memberships
                .Include(item => item.Payment!)
                .ThenInclude(item => item.Invoice)
                .FirstOrDefaultAsync(item => item.PaymentId == paymentId);
            if (membership?.Payment is not Payment payment || payment.Status == "refunded")
            {
                return null;
            }

            var revived = membership.Status == "cancelled";
            if (payment.Status != "paid")
            {
                revived |= payment.Status != "pending";
                MarkPaid(payment, revived ? "payOS báo đã nhận tiền cho đơn đã hủy" : note);
            }

            if (membership.Status is not ("pending" or "cancelled"))
            {
                return null;
            }

            var member = await db.UserAccounts.FirstAsync(user => user.UserId == membership.UserId);
            var now = DateTime.Now;
            var log = await ActivateAsync(member, membership, payment, now);
            if (revived)
            {
                db.Notifications.Add(new AccountNotification
                {
                    UserId = member.UserId,
                    Title = $"Đã kích hoạt {membership.PlanName}",
                    Content = $"AnhDuy Sport đã nhận {Money(payment.Amount)} cho đơn {payment.Invoice?.InvoiceCode} " +
                        $"(đơn này đã bị hủy trước đó). Gói được kích hoạt theo đúng số tiền đã trả.",
                    IsRead = false,
                    CreatedAt = now,
                });
            }

            return log;
        });
    }

    private async Task<T> InMemberLockAsync<T>(int userId, Func<Task<T>> work)
    {
        db.ChangeTracker.Clear();
        await using var transaction = await db.Database.BeginTransactionAsync();
        await db.Database
            .SqlQuery<int>($"SELECT user_id AS [Value] FROM [user] WITH (UPDLOCK, HOLDLOCK) WHERE user_id = {userId}")
            .ToListAsync();
        var result = await work();
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return result;
    }

    // Kích hoạt membership pending sau khi payment paid. Tính lại ngày theo thời điểm thanh toán.
    // Phải chạy trong InMemberLockAsync.
    private async Task<ActivityLog> ActivateAsync(UserAccount member, Membership membership, Payment payment, DateTime now)
    {
        var today = DateOnly.FromDateTime(now);
        await ClassMembershipBonus.PromoteAsync(db, member.UserId, today);
        var package = await db.MembershipPackages.FirstOrDefaultAsync(item => item.MembershipPackageId == membership.MembershipPackageId)
            ?? throw new KeyNotFoundException("Không tìm thấy gói hội viên của đơn này.");
        var plan = await PlanRenewalAsync(member.UserId, package, today);

        // Gói 'active' đã quá hạn: đóng lại để unique index UX_membership_one_active không báo trùng.
        var stale = await db.Memberships
            .Where(item => item.UserId == member.UserId && item.Status == "active"
                && item.EndDate < today && item.MembershipId != membership.MembershipId)
            .ToListAsync();
        foreach (var item in stale)
        {
            item.Status = "expired";
        }

        // Nâng cấp: phần còn lại của gói cũ chạy tiếp ngay sau gói mới.
        Membership? remainder = null;
        if (plan.Current is Membership current)
        {
            if (plan.Kind == RenewalKind.Renew)
            {
                current.Status = "renewed";
            }
            else if (plan.Kind == RenewalKind.Upgrade)
            {
                var remainingDays = MembershipDuration.Length(today, current.EndDate);
                if (current.StartDate < today)
                {
                    // Giữ phần đã dùng làm lịch sử (upgraded), tách phần còn lại thành dòng chờ.
                    remainder = new Membership
                    {
                        UserId = current.UserId,
                        PaymentId = null,
                        PlanName = Trim($"{current.PlanName} (phần còn lại sau nâng cấp)", 200),
                        MembershipPackageId = current.MembershipPackageId,
                        IsFree = current.IsFree,
                        StartDate = today,
                        EndDate = today.AddDays(remainingDays - 1),
                        Status = "scheduled",
                    };
                    db.Memberships.Add(remainder);
                    current.EndDate = today.AddDays(-1);
                    current.Status = "upgraded";
                }
                else
                {
                    // Gói cũ mới bắt đầu hôm nay: cả gói lùi ra sau, ngày được dời ở dưới.
                    current.Status = "scheduled";
                    remainder = current;
                }
            }
        }

        // Lưu trước để unique index UX_membership_one_active không báo trùng khi dòng mới chuyển 'active'.
        await db.SaveChangesAsync();

        membership.StartDate = plan.StartDate;
        membership.EndDate = plan.EndDate;
        membership.Status = plan.Kind == RenewalKind.Queued ? "scheduled" : "active";

        // Gói mới chạy ngay: các gói đang chờ lùi ra sau ngày hết hạn mới, giữ nguyên số ngày.
        // Thứ tự: phần còn lại của gói cũ (nếu nâng cấp) rồi tới các gói chờ khác theo ngày bắt đầu.
        if (plan.Kind != RenewalKind.Queued)
        {
            var queued = await db.Memberships
                .Where(item => item.UserId == member.UserId && item.Status == "scheduled"
                    && item.MembershipId != membership.MembershipId)
                .OrderBy(item => item.StartDate)
                .ToListAsync();
            if (remainder is not null)
            {
                queued.Remove(remainder);
                queued.Insert(0, remainder);
            }

            var cursor = plan.EndDate;
            foreach (var item in queued)
            {
                var days = MembershipDuration.Length(item.StartDate, item.EndDate);
                item.StartDate = cursor.AddDays(1);
                item.EndDate = item.StartDate.AddDays(days - 1);
                cursor = item.EndDate;
            }
        }

        var detail = $"{membership.PlanName} · {Money(payment.Amount)} · {PaymentMethodLabel(payment.PaymentMethod)} · " +
            $"hiệu lực {plan.StartDate:dd/MM/yyyy} → {plan.EndDate:dd/MM/yyyy} · hóa đơn {payment.Invoice?.InvoiceCode}";
        if (remainder is not null)
        {
            detail += $" · {remainder.PlanName}: {remainder.StartDate:dd/MM/yyyy} → {remainder.EndDate:dd/MM/yyyy}";
        }

        var log = new ActivityLog
        {
            ActorUserId = member.UserId,
            Action = Trim($"{plan.Type} gói cho {member.FullName}", 100),
            EntityName = "membership",
            EntityId = membership.MembershipId,
            Detail = detail,
            CreatedAt = now,
        };
        db.ActivityLogs.Add(log);
        return log;
    }

    // So gói mới với gói đang dùng (active). Hạng gói = phí trung bình mỗi tháng (MembershipDuration.MonthlyRate).
    //   Chưa có gói đang dùng         → Đăng ký mới:      bắt đầu hôm nay.
    //   Cùng gói                      → Gia hạn:          bắt đầu hôm nay, hạn = hạn cũ + thời hạn gói.
    //   Gói mới cao hơn (hoặc ngang)  → Nâng cấp:         bắt đầu hôm nay, gói cũ chạy tiếp sau gói mới.
    //   Gói mới thấp hơn              → Đăng ký nối tiếp: bắt đầu sau ngày hết hạn cuối cùng của các gói đang có.
    // Dòng cũ chưa gắn gói (membership_package_id NULL) được coi là thấp hơn mọi gói.
    private async Task<RenewalPlan> PlanRenewalAsync(int userId, MembershipPackage package, DateOnly today)
    {
        var months = package.ValidityMonths;
        var current = (await db.Memberships
                .Include(item => item.Package)
                .Where(item => item.UserId == userId && item.Status == "active" && item.EndDate >= today)
                .OrderBy(item => item.EndDate)
                .ToListAsync())
            .LastOrDefault();

        if (current is null)
        {
            return new RenewalPlan(RenewalKind.New, TypeNew, today, MembershipDuration.EndFrom(today, months), null);
        }

        if (current.MembershipPackageId == package.MembershipPackageId)
        {
            // Gia hạn: dòng mới thay dòng cũ, giữ số ngày còn lại + thêm thời hạn gói.
            return new RenewalPlan(RenewalKind.Renew, TypeRenew, today,
                current.EndDate.AddDays(MembershipDuration.Days(months)), current);
        }

        var isLower = current.Package is not null
            && MembershipDuration.MonthlyRate(package) < MembershipDuration.MonthlyRate(current.Package);
        if (!isLower)
        {
            return new RenewalPlan(RenewalKind.Upgrade, TypeUpgrade, today, MembershipDuration.EndFrom(today, months), current);
        }

        var lastEnd = await db.Memberships
            .Where(item => item.UserId == userId
                && (item.Status == "active" || item.Status == "scheduled")
                && item.EndDate >= today)
            .MaxAsync(item => (DateOnly?)item.EndDate) ?? current.EndDate;
        var start = lastEnd.AddDays(1);
        return new RenewalPlan(RenewalKind.Queued, TypeQueued, start, MembershipDuration.EndFrom(start, months), current);
    }

    // Câu giải thích thêm cho học viên trước khi thanh toán.
    private static string PlanNote(RenewalPlan plan, MembershipPackage package)
    {
        if (plan.Current is not Membership current)
        {
            return "";
        }

        return plan.Kind switch
        {
            RenewalKind.Upgrade =>
                $" {current.PlanName} còn {MembershipDuration.Length(plan.StartDate, current.EndDate)} ngày sẽ được dùng tiếp sau khi {package.PackageName} kết thúc.",
            RenewalKind.Queued =>
                $" Gói đang dùng cao cấp hơn nên {package.PackageName} sẽ bắt đầu sau khi các gói hiện có hết hạn (dự kiến {plan.StartDate:dd/MM/yyyy}).",
            _ => "",
        };
    }

    private static bool CanReuse(Membership membership, Payment payment, MembershipPackage package, int amount) =>
        payment.Status == "pending"
        && membership.MembershipPackageId == package.MembershipPackageId
        && payment.Amount == amount
        && payment.Invoice is not null
        && PaymentTimeout.SecondsLeft(payment.Invoice.IssuedAt) > 0
        && !string.IsNullOrWhiteSpace(payment.CheckoutUrl)
        && !string.IsNullOrWhiteSpace(payment.QrCode);

    // ---- payOS ----
    private async Task CreateLinkAsync(Payment payment, Membership membership)
    {
        if (payment.PayosOrderCode is not long orderCode)
        {
            throw new InvalidOperationException("Đơn thanh toán gói chưa có mã payOS.");
        }

        var invoiceCode = payment.Invoice?.InvoiceCode ?? "";
        var description = invoiceCode.Length <= 25 ? invoiceCode : invoiceCode[..25];
        try
        {
            var link = await RequirePayOs().PaymentRequests.CreateAsync(new CreatePaymentLinkRequest
            {
                OrderCode = orderCode,
                Amount = decimal.ToInt32(payment.Amount),
                Description = description,
                ReturnUrl = PayOsUrl("PayOS:MembershipReturnUrl", "http://localhost:5173/ho-so"),
                CancelUrl = PayOsUrl("PayOS:MembershipCancelUrl", "http://localhost:5173/ho-so"),
                ExpiredAt = new DateTimeOffset(PaymentTimeout.ExpiresAt(payment.Invoice?.IssuedAt ?? DateTime.Now)).ToUnixTimeSeconds(),
            });
            payment.CheckoutUrl = link.CheckoutUrl;
            payment.PaymentLinkId = link.PaymentLinkId;
            payment.QrCode = link.QrCode;
            AddHistory(payment, "pending", "Tạo mã QR thanh toán gói");
            await db.SaveChangesAsync();
        }
        catch (ApiException exception)
        {
            await CancelPaymentAsync(payment, "payOS từ chối tạo mã QR thanh toán gói");
            membership.Status = "cancelled";
            await db.SaveChangesAsync();
            throw new InvalidOperationException(string.IsNullOrWhiteSpace(exception.Message)
                ? "payOS từ chối tạo link thanh toán."
                : exception.Message);
        }

        if (string.IsNullOrWhiteSpace(payment.QrCode))
        {
            await CancelPaymentAsync(payment, "payOS không trả mã QR thanh toán gói");
            membership.Status = "cancelled";
            await db.SaveChangesAsync();
            throw new InvalidOperationException("payOS không trả mã QR.");
        }
    }

    // Trạng thái link payOS viết hoa (PAID, PENDING, CANCELLED, EXPIRED...), null nếu không hỏi được.
    private async Task<string?> PayOsStatusAsync(long? orderCode)
    {
        if (orderCode is not long code || PayOsClient is not PayOSClient payOs)
        {
            return null;
        }

        try
        {
            return (await payOs.PaymentRequests.GetAsync(code)).Status.ToString().ToUpperInvariant();
        }
        catch (ApiException)
        {
            return null;
        }
    }

    // Ghi nhận payOS đã nhận tiền. Chỉ đổi trong bộ nhớ, nơi gọi tự lưu.
    private void MarkPaid(Payment payment, string note)
    {
        payment.Status = "paid";
        payment.PaidAt = DateTime.Now;
        if (payment.Invoice is not null)
        {
            payment.Invoice.Status = "paid";
        }

        AddHistory(payment, "paid", note);
        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = payment.UserId,
            Action = "Thanh toán payOS thành công",
            EntityName = "payment",
            EntityId = payment.PaymentId,
            Detail = $"{payment.Invoice?.InvoiceCode} · {note}",
            CreatedAt = DateTime.Now,
        });
    }

    // Đóng đơn pending: báo payOS hủy link (lỗi thì bỏ qua), payment → cancel, hóa đơn → cancelled.
    // Chỉ đổi trong bộ nhớ, nơi gọi tự lưu.
    private async Task CancelPaymentAsync(Payment payment, string reason, bool callPayOs = true)
    {
        if (payment.Status != "pending")
        {
            return;
        }

        if (callPayOs && payment.PayosOrderCode is long orderCode && PayOsClient is PayOSClient payOs)
        {
            try
            {
                await payOs.PaymentRequests.CancelAsync(orderCode, reason);
            }
            catch (ApiException)
            {
            }
        }

        payment.Status = "cancel";
        if (payment.Invoice is not null)
        {
            payment.Invoice.Status = "cancelled";
        }

        AddHistory(payment, "cancel", reason);
        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = payment.UserId,
            Action = "Hủy thanh toán gói",
            EntityName = "payment",
            EntityId = payment.PaymentId,
            Detail = reason,
            CreatedAt = DateTime.Now,
        });
    }

    private void AddHistory(Payment payment, string status, string note)
    {
        db.PaymentHistories.Add(new PaymentHistory
        {
            PaymentId = payment.PaymentId,
            Status = status,
            Note = note,
            CreatedAt = DateTime.Now,
        });
    }

    private string PayOsUrl(string key, string fallback)
    {
        var url = configuration[key];
        return string.IsNullOrWhiteSpace(url) ? fallback : url;
    }

    // payOS chỉ nhận số tiền nguyên, tối thiểu 2.000đ.
    private static int RequirePayableAmount(decimal fee)
    {
        if (fee < 2000 || fee != decimal.Truncate(fee) || fee > int.MaxValue)
        {
            throw new InvalidOperationException("Phí gói không hợp lệ để thanh toán payOS (cần số nguyên từ 2.000đ).");
        }

        return decimal.ToInt32(fee);
    }

    private async Task<Membership> FindOwnMembershipPaymentAsync(int memberUserId, string paymentId)
    {
        if (!long.TryParse(paymentId, out var code))
        {
            throw new KeyNotFoundException("Không tìm thấy thanh toán gói.");
        }

        // Nhận payment_id, hoặc orderCode payOS gắn vào ReturnUrl.
        int? id = code is > 0 and <= int.MaxValue ? (int)code : null;
        return await db.Memberships
            .AsNoTracking()
            .Include(item => item.Payment!)
            .ThenInclude(payment => payment.Invoice)
            .FirstOrDefaultAsync(item => item.UserId == memberUserId
                && ((id != null && item.PaymentId == id) || item.Payment!.PayosOrderCode == code))
            ?? throw new KeyNotFoundException("Không tìm thấy thanh toán gói.");
    }

    // ---- Đổi email ----
    private async Task EnsureEmailAvailableAsync(string email, int userId, DateTime utcNow)
    {
        var taken = await db.UserAccounts.AnyAsync(user =>
            user.UserId != userId && user.Email != null && user.Email.ToLower() == email);
        if (taken)
        {
            throw new InvalidOperationException("Email đã được tài khoản khác sử dụng.");
        }

        var registering = await db.PendingRegistrations.AnyAsync(row => row.Email == email && row.ExpiresAt > utcNow);
        if (registering)
        {
            throw new InvalidOperationException("Email này đang được dùng để đăng ký tài khoản mới. Hãy thử lại sau.");
        }
    }

    // Cùng cách băm với OTP quên mật khẩu (AuthService.HashOtp).
    private static string HashOtp(string code)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(code));
        return Convert.ToHexString(hash);
    }

    private static bool IsUniqueViolation(DbUpdateException exception, string? indexName = null) =>
        exception.InnerException is SqlException { Number: 2601 or 2627 } sql
        && (indexName is null || sql.Message.Contains(indexName, StringComparison.OrdinalIgnoreCase));

    // Action của log có dạng "{loại} gói cho {tên}".
    private static string GetRenewalType(ActivityLog log)
    {
        var index = log.Action.IndexOf(" gói cho ", StringComparison.Ordinal);
        return index > 0 ? log.Action[..index] : "Cập nhật";
    }

    private static MembershipCheckoutDto ToCheckoutDto(Membership membership, Payment payment, string renewalType, string message) =>
        new(
            payment.PaymentId.ToString(),
            membership.MembershipId.ToString(),
            payment.Invoice?.InvoiceCode ?? "",
            membership.MembershipPackageId?.ToString() ?? "",
            membership.PlanName,
            renewalType,
            decimal.ToInt32(payment.Amount),
            payment.Status,
            payment.CheckoutUrl,
            payment.QrCode,
            message,
            PayOsQrImage.ToDataUrl(payment.QrCode),
            payment.Status == "pending" && payment.Invoice is not null ? PaymentTimeout.SecondsLeft(payment.Invoice.IssuedAt) : 0);

    private enum RenewalKind
    {
        New,
        Renew,
        Upgrade,
        Queued,
    }

    // Current: gói đang dùng (active) lúc tính, null khi chưa có.
    private sealed record RenewalPlan(RenewalKind Kind, string Type, DateOnly StartDate, DateOnly EndDate, Membership? Current);

    // Mã hóa đơn INV-{năm}-{số}, số lấy từ dbo.invoice_code_seq.
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

    private static readonly string[] ProfileRoles = ["MEMBER", "RECEPTIONIST", "COACH", "ADMIN"];

    private async Task<UserAccount> FindActiveProfileUserAsync(string userId)
    {
        if (!int.TryParse(userId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy tài khoản.");
        }

        var user = await db.UserAccounts
            .Include(account => account.Role)
            .FirstOrDefaultAsync(account => account.UserId == id);
        if (user is null || user.Role is null || !ProfileRoles.Contains(user.Role.RoleCode))
        {
            throw new KeyNotFoundException("Không tìm thấy tài khoản.");
        }

        if (user.Status != "active")
        {
            throw new InvalidOperationException("Tài khoản không hoạt động.");
        }

        return user;
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
            user.Status,
            user.AvatarUrl);

    // Cần có Payment và Payment.Invoice (Include hoặc vừa tạo) trước khi gọi.
    private static MembershipDto ToMembershipDto(Membership membership, DateOnly today)
    {
        var issuedAt = membership.Payment?.Invoice?.IssuedAt;
        var waitingSeconds = membership.Status == "pending" && membership.Payment is { Status: "pending" } && issuedAt is DateTime issued
            ? PaymentTimeout.SecondsLeft(issued)
            : 0;
        return new(
            membership.MembershipId.ToString(),
            membership.MembershipPackageId?.ToString(),
            membership.PlanName,
            membership.StartDate,
            membership.EndDate,
            // Trong DB vẫn là active nhưng đã qua ngày hết hạn thì hiển thị expired.
            // Đơn chờ thanh toán giữ nhãn pending (lịch sử có cột thời gian tạo để học viên tự đối chiếu).
            membership.Status == "active" && membership.EndDate < today ? "expired" : membership.Status,
            // Gói lên cấp kèm lớp gắn với payment của lớp: chỉ tính phần tiền gói.
            membership.Payment is { ClassId: not null } classPayment
                ? classPayment.UpgradeAmount
                : membership.Payment?.Amount ?? 0,
            membership.Payment?.Invoice?.InvoiceCode ?? "",
            membership.Payment?.PaymentMethod ?? "",
            issuedAt,
            waitingSeconds);
    }

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
        "payos" => "payOS",
        _ => method,
    };

    private static string Trim(string value, int max) => value.Length <= max ? value : value[..max];

    private static string Money(decimal value) =>
        string.Create(CultureInfo.GetCultureInfo("vi-VN"), $"{decimal.Round(value, 0):N0}đ");
}
