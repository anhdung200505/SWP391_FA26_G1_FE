using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Lỗi nghiệp vụ (trả 400). InvalidOperationException của .NET/EF vẫn ra 500.
public sealed class RegistrationException(string message) : InvalidOperationException(message);

public class ClassRegistrationFlowService(AppDbContext db, CurrentActor actor, AuthService auth, PayOsPaymentService payOs)
{
    public async Task<IReadOnlyList<CenterDto>> AccessCentersAsync()
    {
        var centers = await db.Centers
            .AsNoTracking()
            .OrderBy(center => center.CenterName)
            .ToListAsync();

        return centers
            .Select(center => new CenterDto(
                center.CenterId.ToString(),
                center.CenterName,
                center.Address ?? "",
                center.Phone ?? ""))
            .ToList();
    }

    public async Task<IReadOnlyList<SportDto>> AccessSportsAsync(string centerId)
    {
        if (!int.TryParse(centerId, out var id) || !await db.Centers.AnyAsync(center => center.CenterId == id))
        {
            throw new KeyNotFoundException("Không tìm thấy trung tâm.");
        }

        var today = DateOnly.FromDateTime(DateTime.Now);
        var sports = await OpenClasses(today)
            .Where(item => item.Room != null && item.Room.CenterId == id)
            .Select(item => new
            {
                item.Course!.Sport!.SportId,
                item.Course.Sport.SportCode,
                item.Course.Sport.SportName,
            })
            .GroupBy(item => new { item.SportId, item.SportCode, item.SportName })
            .Select(group => new
            {
                group.Key.SportId,
                group.Key.SportCode,
                group.Key.SportName,
                OpenClassCount = group.Count(),
            })
            .OrderBy(item => item.SportName)
            .ToListAsync();

        return sports
            .Select(item => new SportDto(item.SportId.ToString(), item.SportCode, item.SportName, item.OpenClassCount))
            .ToList();
    }

    public async Task<IReadOnlyList<ClassSummaryDto>> AccessUpcomingClassesAsync(string? centerId, string? sportId)
    {
        if (string.IsNullOrWhiteSpace(centerId))
        {
            throw new RegistrationException("Cần chọn trung tâm.");
        }

        var isValid = int.TryParse(centerId, out var centerKey)
                && await db.Centers.AnyAsync(center => center.CenterId == centerKey);

        if (!isValid)
        {
            throw new KeyNotFoundException("Không tìm thấy trung tâm.");
        }

        int? sportKey = null;
        if (!string.IsNullOrWhiteSpace(sportId))
        {
            isValid = int.TryParse(sportId, out var parsedSport) && await db.Sports.AnyAsync(sport => sport.SportId == parsedSport);

            if (!isValid)
            {
                throw new KeyNotFoundException("Không tìm thấy môn thể thao.");
            }

            sportKey = parsedSport;
        }

        var today = DateOnly.FromDateTime(DateTime.Now);
        var holds = LiveHolds();
        var classes = await OpenClasses(today)
            .Where(item => item.Room != null && item.Room.CenterId == centerKey)
            .Where(item => sportKey == null || item.Course!.SportId == sportKey)
            .OrderBy(item => item.StartDate)
            .ThenBy(item => item.ClassName)
            .Select(item => new
            {
                item.ClassId,
                item.ClassName,
                item.Course!.SportId,
                item.Course.Sport!.SportName,
                item.Course.CourseName,
                item.Course.LevelName,
                item.Course.Price,
                CoachName = item.Coach!.FullName,
                RoomName = item.Room!.RoomName,
                item.StartDate,
                item.EndDate,
                item.Capacity,
                EnrolledCount = item.Enrollments.Count(enrollment => enrollment.Status == "enrolled"),
                HeldCount = holds.Count(hold => hold.ClassId == item.ClassId),
                NextSlot = item.Sessions
                    .Where(session => session.Status != "cancelled" && session.SessionDate >= today)
                    .OrderBy(session => session.SessionDate)
                    .ThenBy(session => session.StartTime)
                    .FirstOrDefault(),
                Schedule = item.Schedules
                    .OrderBy(schedule => schedule.Weekday)
                    .ThenBy(schedule => schedule.TimeSlot!.StartTime)
                    .Select(schedule => new ClassSchedule
                    {
                        Weekday = schedule.Weekday,
                        TimeSlotId = schedule.TimeSlotId,
                        TimeSlot = schedule.TimeSlot,
                    })
                    .ToList(),
            })
            .ToListAsync();

        return classes
            .Select(item => new ClassSummaryDto(
                item.ClassId.ToString(),
                item.ClassName,
                item.SportId.ToString(),
                item.SportName,
                item.CourseName,
                item.LevelName ?? "",
                item.CoachName,
                item.RoomName,
                item.StartDate,
                item.EndDate,
                item.Capacity,
                item.EnrolledCount,
                AvailableSeats(item.Capacity, item.EnrolledCount + item.HeldCount),
                item.Price,
                item.NextSlot is null ? null : ClassSessionPlanner.ToSlotDto(item.NextSlot),
                item.Schedule.Select(ClassSessionPlanner.ToScheduleDto).ToList()))
            .ToList();
    }

    public async Task<ClassDetailDto> SelectClassAsync(string classId)
    {
        if (!int.TryParse(classId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy lớp học.");
        }

        var holds = LiveHolds();
        var item = await db.Classes
            .AsNoTracking()
            .Where(current => current.ClassId == id)
            .Select(current => new
            {
                current.ClassId,
                current.ClassName,
                current.Status,
                current.StartDate,
                current.EndDate,
                current.Course!.SportId,
                current.Course.Sport!.SportName,
                current.Course.CourseName,
                current.Course.LevelName,
                current.Course.AgeRange,
                current.Course.Description,
                CourseStatus = current.Course.Status,
                Tuition = current.Course.Price,
                CenterId = current.Room != null ? (int?)current.Room.CenterId : null,
                CenterName = current.Room != null ? current.Room.Center!.CenterName : "",
                RoomName = current.Room != null ? current.Room.RoomName : "",
                CoachName = current.Coach!.FullName,
                current.Capacity,
                EnrolledCount = current.Enrollments.Count(enrollment => enrollment.Status == "enrolled"),
                HeldCount = holds.Count(hold => hold.ClassId == current.ClassId),
                Slots = current.Sessions
                    .OrderBy(session => session.SessionDate)
                    .ThenBy(session => session.StartTime)
                    .ToList(),
                Schedule = current.Schedules
                    .OrderBy(schedule => schedule.Weekday)
                    .ThenBy(schedule => schedule.TimeSlot!.StartTime)
                    .Select(schedule => new ClassSchedule
                    {
                        Weekday = schedule.Weekday,
                        TimeSlotId = schedule.TimeSlotId,
                        TimeSlot = schedule.TimeSlot,
                    })
                    .ToList(),
            })
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Không tìm thấy lớp học.");

        var today = DateOnly.FromDateTime(DateTime.Now);
        var availableSeats = AvailableSeats(item.Capacity, item.EnrolledCount + item.HeldCount);
        var isOpen = IsOpenForRegistration(item.Status, item.EndDate, item.CourseStatus, availableSeats, today);

        return new ClassDetailDto(
            item.ClassId.ToString(),
            item.ClassName,
            item.Status,
            item.StartDate,
            item.EndDate,
            item.SportId.ToString(),
            item.SportName,
            item.CourseName,
            item.LevelName ?? "",
            item.AgeRange ?? "",
            item.Description ?? "",
            item.CenterId?.ToString() ?? "",
            item.CenterName,
            item.RoomName,
            item.CoachName,
            item.Capacity,
            item.EnrolledCount,
            availableSeats,
            item.Tuition,
            isOpen,
            item.Slots.Select(ClassSessionPlanner.ToSlotDto).ToList(),
            item.Schedule.Select(ClassSessionPlanner.ToScheduleDto).ToList());
    }

    public async Task<IReadOnlyList<CoachOptionDto>> AccessCoachesAsync(string sportId)
    {
        if (!int.TryParse(sportId, out var sportKey) || !await db.Sports.AnyAsync(sport => sport.SportId == sportKey))
        {
            throw new KeyNotFoundException("Không tìm thấy môn thể thao.");
        }

        var today = DateOnly.FromDateTime(DateTime.Now);
        var rows = await db.Classes
            .AsNoTracking()
            .Where(item => item.Course!.SportId == sportKey)
            .Where(item => item.Status == "open" || item.Status == "ongoing")
            .Where(item => item.EndDate == null || item.EndDate >= today)
            .Where(item => item.Course!.Status == "active")
            .Select(item => new
            {
                item.CoachUserId,
                item.Coach!.FullName,
                item.ClassId,
            })
            .ToListAsync();

        return rows
            .GroupBy(item => item.CoachUserId)
            .Select(group => new CoachOptionDto(
                group.Key.ToString(),
                group.First().FullName,
                group.First().ClassId.ToString()))
            .OrderBy(item => item.FullName)
            .ToList();
    }

    // registeredBy để trống nghĩa là học viên tự đăng ký.
    public async Task<ClassRegistrationDto> SubmitRegistrationAsync(
        int memberUserId,
        CreateClassRegistrationRequest request,
        RegistrationActor? registeredBy = null)
    {
        var member = await FindActiveMemberAsync(memberUserId);
        registeredBy ??= new RegistrationActor(member.UserId, "MEMBER");
        if (request.FullName is not null && string.IsNullOrWhiteSpace(request.FullName))
        {
            throw new RegistrationException("Họ tên không được để trống.");
        }

        if (request.DateOfBirth > DateOnly.FromDateTime(DateTime.Now))
        {
            throw new RegistrationException("Ngày sinh không hợp lệ.");
        }

        // Số điện thoại gửi lên thay số trong hồ sơ; hồ sơ thiếu và không gửi thì không đăng ký được.
        if (string.IsNullOrWhiteSpace(request.Phone) && string.IsNullOrWhiteSpace(member.Phone))
        {
            throw new RegistrationException("Hồ sơ chưa có số điện thoại, cần bổ sung trước khi đăng ký.");
        }

        if (string.IsNullOrWhiteSpace(member.Email))
        {
            throw new RegistrationException("Hồ sơ chưa có email, cần bổ sung trước khi đăng ký.");
        }

        var (classId, autoAssigned) = await ResolveClassAsync(member.UserId, request);
        var classAssignedBy = autoAssigned ? ClassRegistrationLogs.SystemAssigned : registeredBy.RoleCode;

        var item = await db.Classes
            .AsNoTracking()
            .Where(current => current.ClassId == classId)
            .Select(current => new
            {
                current.ClassName,
                current.Status,
                current.EndDate,
                CourseStatus = current.Course!.Status,
                Tuition = current.Course.Price,
                current.Capacity,
                EnrolledCount = current.Enrollments.Count(enrollment => enrollment.Status == "enrolled"),
            })
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Không tìm thấy lớp học.");

        if (await db.ClassEnrollments.AnyAsync(enrollment =>
                enrollment.ClassId == classId && enrollment.UserId == member.UserId && enrollment.Status == "enrolled"))
        {
            throw new RegistrationException("Bạn đã đăng ký lớp học này.");
        }

        var today = DateOnly.FromDateTime(DateTime.Now);
        // Chỗ người khác đang giữ cũng tính là hết chỗ. Chỗ giữ của chính học viên này thì không, để họ nhận lại được đơn cũ.
        var heldByOthers = await LiveHolds().CountAsync(hold => hold.ClassId == classId && hold.UserId != member.UserId);
        var availableSeats = AvailableSeats(item.Capacity, item.EnrolledCount + heldByOthers);
        if (!IsOpenForRegistration(item.Status, item.EndDate, item.CourseStatus, availableSeats, today))
        {
            throw new RegistrationException("Lớp học không còn nhận đăng ký.");
        }

        var upgrade = await ClassMembershipBonus.QuoteUpgradeAsync(db, request.MembershipPackageId);
        if (upgrade.Package is not null)
        {
            await ClassMembershipBonus.EnsureNotDowngradeAsync(db, member.UserId, upgrade.Package, today);
        }

        var pending = await FindPendingPaymentAsync(member.UserId, classId);
        if (pending is not null && pending.UpgradePackageId == upgrade.Package?.MembershipPackageId)
        {
            return await ToRegistrationDtoAsync(pending, item.ClassName, true);
        }

        if (pending is not null)
        {
            // Đổi lựa chọn lên cấp: hủy đơn cũ để chỉ mục UX_payment_pending_per_class cho tạo đơn mới.
            pending.Status = "failed";
            pending.Invoice!.Status = "cancelled";
            await db.SaveChangesAsync();
        }

        // shortcut: giới hạn mềm, hai request cùng lúc ở hai lớp khác nhau có thể vượt 1 đơn; đủ cho chặn spam giữ chỗ.
        if (await LiveHolds().CountAsync(hold => hold.UserId == member.UserId) >= MaxHoldsPerMember)
        {
            throw new RegistrationException($"Bạn đang giữ chỗ ở {MaxHoldsPerMember} lớp. Hãy thanh toán hoặc đợi hết hạn giữ chỗ trước khi đăng ký thêm.");
        }

        try
        {
            var created = await CreatePendingPaymentAsync(
                member, request, classId, item.ClassName, item.Tuition, upgrade, registeredBy, classAssignedBy);
            return await ToRegistrationDtoAsync(created, item.ClassName, false);
        }
        catch (DbUpdateException exception) when (exception.InnerException is SqlException { Number: 2601 or 2627 })
        {
            // Một request khác vừa tạo đơn pending cho cùng học viên và lớp: trả lại đơn đó.
            db.ChangeTracker.Clear();
            var existing = await FindPendingPaymentAsync(member.UserId, classId);
            if (existing is null)
            {
                throw;
            }

            return await ToRegistrationDtoAsync(existing, item.ClassName, true);
        }
    }

    // Đơn chờ thanh toán còn hạn của học viên (đăng ký lớp và mua gói), mới nhất lên đầu.
    public async Task<IReadOnlyList<PendingCheckoutDto>> AccessPendingCheckoutsAsync(int memberUserId)
    {
        var result = new List<(DateTime IssuedAt, PendingCheckoutDto Item)>();

        var classPayments = await LiveHolds()
            .Where(payment => payment.UserId == memberUserId)
            .Select(payment => new
            {
                payment.PaymentId,
                payment.Invoice!.IssuedAt,
                ClassName = payment.Class!.ClassName,
                PackageName = payment.UpgradePackageId == null
                    ? null
                    : db.MembershipPackages
                        .Where(item => item.MembershipPackageId == payment.UpgradePackageId)
                        .Select(item => item.PackageName)
                        .FirstOrDefault(),
            })
            .ToListAsync();
        foreach (var row in classPayments)
        {
            // Đơn chưa có link (vd. payOS lỗi lúc tạo) thì thử tạo lại.
            var linked = await payOs.EnsureRegistrationLinkAsync(row.PaymentId, PaymentTimeout.ExpiresAt(row.IssuedAt));
            var payment = linked ?? await db.Payments.AsNoTracking().FirstAsync(item => item.PaymentId == row.PaymentId);
            result.Add((row.IssuedAt, new PendingCheckoutDto(
                "class",
                payment.PaymentId.ToString(),
                await db.Invoices.Where(item => item.InvoiceId == payment.InvoiceId).Select(item => item.InvoiceCode).FirstAsync(),
                payment.Amount,
                payment.ClassId?.ToString(),
                row.ClassName,
                payment.UpgradePackageId?.ToString(),
                row.PackageName,
                payment.CheckoutUrl ?? "",
                payment.QrCode ?? "",
                PayOsQrImage.ToDataUrl(payment.QrCode),
                PaymentTimeout.SecondsLeft(row.IssuedAt))));
        }

        var since = DateTime.Now.AddMinutes(-PaymentTimeout.Minutes);
        var membershipPayments = await db.Memberships
            .AsNoTracking()
            .Where(item => item.UserId == memberUserId
                && item.Status == "pending"
                && item.Payment!.Status == "pending"
                && item.Payment.ClassId == null
                && item.Payment.Invoice!.IssuedAt > since)
            .Select(item => new
            {
                item.Payment!.PaymentId,
                item.Payment.Invoice!.InvoiceCode,
                item.Payment.Invoice.IssuedAt,
                item.Payment.Amount,
                item.Payment.CheckoutUrl,
                item.Payment.QrCode,
                item.MembershipPackageId,
                item.PlanName,
            })
            .ToListAsync();
        foreach (var row in membershipPayments.Where(row => !string.IsNullOrWhiteSpace(row.QrCode)))
        {
            result.Add((row.IssuedAt, new PendingCheckoutDto(
                "membership",
                row.PaymentId.ToString(),
                row.InvoiceCode,
                row.Amount,
                null,
                null,
                row.MembershipPackageId?.ToString(),
                row.PlanName,
                row.CheckoutUrl ?? "",
                row.QrCode ?? "",
                PayOsQrImage.ToDataUrl(row.QrCode),
                PaymentTimeout.SecondsLeft(row.IssuedAt))));
        }

        return result
            .Where(row => row.Item.ExpiresInSeconds > 0)
            .OrderByDescending(row => row.IssuedAt)
            .Select(row => row.Item)
            .ToList();
    }

    // Học viên xem các lớp mình đã ghi danh (enrolled), mới đăng ký nhất lên đầu.
    public async Task<IReadOnlyList<EnrolledClassDto>> AccessEnrolledClassesAsync(int memberUserId)
    {
        var rows = await db.ClassEnrollments
            .AsNoTracking()
            .Where(enrollment => enrollment.UserId == memberUserId && enrollment.Status == "enrolled")
            .Join(db.Classes, enrollment => enrollment.ClassId, item => item.ClassId, (enrollment, item) => new
            {
                enrollment.EnrolledAt,
                item.ClassId,
                item.ClassName,
                item.Status,
                item.StartDate,
                item.EndDate,
                item.Course!.SportId,
                item.Course.Sport!.SportName,
                item.Course.CourseName,
                item.Course.LevelName,
                Tuition = item.Course.Price,
                CenterId = item.Room != null ? (int?)item.Room.CenterId : null,
                CenterName = item.Room != null ? item.Room.Center!.CenterName : "",
                RoomName = item.Room != null ? item.Room.RoomName : "",
                CoachName = item.Coach!.FullName,
            })
            .OrderByDescending(row => row.EnrolledAt)
            .ToListAsync();

        var registeredBy = await ClassRegistrationLogs.LatestRegisteredByClassAsync(
            db, memberUserId, rows.Select(row => row.ClassId).ToList());
        return rows
            .Select(row => new EnrolledClassDto(
                row.ClassId.ToString(),
                row.ClassName,
                row.Status,
                row.EnrolledAt,
                row.StartDate,
                row.EndDate,
                row.SportId.ToString(),
                row.SportName,
                row.CourseName,
                row.LevelName ?? "",
                row.CenterId?.ToString() ?? "",
                row.CenterName,
                row.RoomName,
                row.CoachName,
                row.Tuition,
                registeredBy.GetValueOrDefault(row.ClassId)))
            .ToList();
    }

    // #7: học viên xem trạng thái đơn của mình. Sai chủ đơn và không có đơn cùng trả 404 để không lộ id nào có thật.
    public async Task<RegistrationStatusDto> SelectRegistrationStatusAsync(string paymentId, int memberId)
    {
        if (!int.TryParse(paymentId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy đơn đăng ký.");
        }

        var payment = await db.Payments
            .AsNoTracking()
            .Include(item => item.Invoice)
            .Include(item => item.Class)
            .FirstOrDefaultAsync(item => item.PaymentId == id && item.UserId == memberId && item.ClassId != null)
            ?? throw new KeyNotFoundException("Không tìm thấy đơn đăng ký.");

        // Webhook payOS không tới được máy local: hỏi thẳng payOS khi học viên xem trạng thái.
        if (payment.Status == "pending")
        {
            var status = (await payOs.PayOsStatusAsync(payment.PayosOrderCode))?.ToUpperInvariant();
            if (status == "PAID")
            {
                return await MarkPaymentPaidAsync(id, memberId, "payOS");
            }

            if (status is "CANCELLED" or "CANCELED" or "EXPIRED")
            {
                return await MarkPaymentFailedAsync(id, memberId);
            }
        }

        return await BuildStatusAsync(payment);
    }

    // Hệ thống xác nhận đã nhận tiền (webhook payOS gọi hàm này). Gọi lặp lại không ghi thêm gì.
    // paymentMethod có giá trị khi lễ tân thu tiền tại quầy.
    public async Task<RegistrationStatusDto> MarkPaymentPaidAsync(int paymentId, int? actorUserId = null, string? paymentMethod = null)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();
        var payment = await db.Payments
            .Include(item => item.Invoice)
            .Include(item => item.Class)
            .FirstOrDefaultAsync(item => item.PaymentId == paymentId)
            ?? throw new KeyNotFoundException("Không tìm thấy đơn thanh toán.");

        if (payment.Status == "refunded")
        {
            throw new RegistrationException("Đơn thanh toán đã được hoàn tiền.");
        }

        if (payment.Status == "paid")
        {
            return await BuildStatusAsync(payment);
        }

        var now = DateTime.Now;
        var className = payment.Class?.ClassName ?? "";
        var hasSeat = true;
        if (payment.ClassId is int classId)
        {
            // Khóa dòng lớp để hai thanh toán cùng lúc cho chỗ cuối không cùng qua.
            await db.Database
                .SqlQuery<int>($"SELECT class_id AS [Value] FROM class WITH (UPDLOCK, HOLDLOCK) WHERE class_id = {classId}")
                .ToListAsync();

            var capacity = await db.Classes
                .Where(item => item.ClassId == classId)
                .Select(item => item.Capacity)
                .FirstAsync();
            var enrolledCount = await db.ClassEnrollments
                .CountAsync(item => item.ClassId == classId && item.Status == "enrolled");
            var enrollment = await db.ClassEnrollments
                .FirstOrDefaultAsync(item => item.ClassId == classId && item.UserId == payment.UserId);

            var alreadyEnrolled = enrollment?.Status == "enrolled";
            hasSeat = alreadyEnrolled || capacity is null || enrolledCount < capacity;
            if (hasSeat && !alreadyEnrolled)
            {
                if (enrollment is null)
                {
                    db.ClassEnrollments.Add(new ClassEnrollment
                    {
                        ClassId = classId,
                        UserId = payment.UserId,
                        EnrolledAt = now,
                        Status = "enrolled",
                    });
                }
                else
                {
                    // Bảng có UNIQUE(class_id, user_id): mở lại dòng cũ thay vì tạo dòng mới.
                    enrollment.Status = "enrolled";
                    enrollment.EnrolledAt = now;
                }
            }
        }

        payment.Status = "paid";
        payment.PaidAt = now;
        if (paymentMethod is not null)
        {
            payment.PaymentMethod = paymentMethod;
        }

        if (payment.Invoice is not null)
        {
            payment.Invoice.Status = "paid";
        }

        if (payment.ClassId is not null)
        {
            var memberName = await db.UserAccounts
                .AsNoTracking()
                .Where(user => user.UserId == payment.UserId)
                .Select(user => user.FullName)
                .FirstOrDefaultAsync() ?? "";
            db.Notifications.Add(new AccountNotification
            {
                UserId = payment.UserId,
                Title = hasSeat ? "Cảm ơn bạn đã đăng ký lớp" : "Lớp đã đầy, AnhDuy Sport sẽ hoàn tiền",
                Content = hasSeat
                    ? $"Cảm ơn {memberName}. AnhDuy Sport đã nhận học phí lớp {className}. Tôi, {memberName}, cam kết tham gia đúng lịch lớp {className}, đóng học phí đã thống nhất và tuân thủ nội quy trung tâm AnhDuy Sport."
                    : $"Xin lỗi {memberName}. AnhDuy Sport đã nhận học phí nhưng lớp {className} đã đầy. Chúng tôi sẽ liên hệ để hoàn tiền cho bạn.",
                IsRead = false,
                CreatedAt = now,
            });
        }

        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = actorUserId ?? payment.UserId,
            Action = Shorten(hasSeat ? $"Thanh toán lớp {className}" : $"Lớp đầy, cần hoàn tiền: {className}", 100),
            EntityName = "payment",
            EntityId = payment.PaymentId,
            Detail = hasSeat
                ? $"Hóa đơn {payment.Invoice?.InvoiceCode}, học phí {payment.Amount:N0}"
                : $"Đã thu {payment.Amount:N0} (hóa đơn {payment.Invoice?.InvoiceCode}) nhưng lớp đầy, chưa ghi danh. Cần hoàn tiền.",
            CreatedAt = now,
        });

        // Lớp đầy (chờ hoàn tiền) thì không cấp gói.
        if (payment.ClassId is not null && hasSeat)
        {
            await ClassMembershipBonus.GrantAsync(db, payment, now);
        }

        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return await BuildStatusAsync(payment);
    }

    // Nhánh NO của "Payment Success?": đơn đang chờ chuyển sang thất bại. Gọi lặp lại không ghi thêm gì.
    public async Task<RegistrationStatusDto> MarkPaymentFailedAsync(int paymentId, int? actorUserId = null)
    {
        var payment = await db.Payments
            .Include(item => item.Invoice)
            .Include(item => item.Class)
            .FirstOrDefaultAsync(item => item.PaymentId == paymentId)
            ?? throw new KeyNotFoundException("Không tìm thấy đơn thanh toán.");

        if (payment.Status is "paid" or "refunded")
        {
            throw new RegistrationException("Đơn thanh toán đã hoàn tất, không thể đánh dấu thất bại.");
        }

        if (payment.Status == "pending")
        {
            payment.Status = "failed";
            if (payment.Invoice is not null)
            {
                payment.Invoice.Status = "cancelled";
            }

            db.ActivityLogs.Add(new ActivityLog
            {
                ActorUserId = actorUserId ?? payment.UserId,
                Action = Shorten($"Thanh toán thất bại: {payment.Class?.ClassName}", 100),
                EntityName = "payment",
                EntityId = payment.PaymentId,
                Detail = $"Hóa đơn {payment.Invoice?.InvoiceCode} bị hủy.",
                CreatedAt = DateTime.Now,
            });
            await db.SaveChangesAsync();
        }

        return await BuildStatusAsync(payment);
    }

    public async Task<RegistrationPaymentResponse> PayAsync(PayRegistrationRequest request)
    {
        if (actor.UserId == 0)
        {
            throw new UnauthorizedAccessException("Hãy đăng nhập bằng tài khoản khách.");
        }

        var user = await db.UserAccounts.Include(account => account.Role)
            .FirstOrDefaultAsync(account => account.UserId == actor.UserId)
            ?? throw new UnauthorizedAccessException("Hãy đăng nhập bằng tài khoản khách.");
        if (user.Role?.RoleCode is not "MEMBER")
        {
            throw new UnauthorizedAccessException("Chỉ học viên thanh toán học phí tại đây.");
        }

        var fullName = request.FullName?.Trim() ?? "";
        var phone = AccountPhone.Require(request.Phone);
        if (fullName.Length is 0 or > 200)
        {
            throw new InvalidOperationException("Nhập họ tên khách hàng.");
        }

        if (AccountPhone.Digits(user.Phone) != phone)
        {
            await AccountPhone.EnsureUniqueAsync(db, phone, user.UserId);
        }

        if (!PaymentMethods.TryGetValue(request.PaymentMethod?.Trim() ?? "", out var methodLabel))
        {
            throw new InvalidOperationException("Chọn hình thức thanh toán.");
        }

        if (!int.TryParse(request.ClassId, out var classId))
        {
            throw new KeyNotFoundException("Không tìm thấy lớp học.");
        }

        var trainingClass = await db.Classes
            .Include(item => item.Course)
            .Include(item => item.Room)
            .Include(item => item.Coach)
            .Include(item => item.Enrollments)
            .FirstOrDefaultAsync(item => item.ClassId == classId)
            ?? throw new KeyNotFoundException("Không tìm thấy lớp học.");

        if (!string.IsNullOrWhiteSpace(request.SlotId))
        {
            var sessionId = int.TryParse(request.SlotId, out var parsed) ? parsed : 0;
            if (!await db.ClassSessions.AnyAsync(session => session.SessionId == sessionId && session.ClassId == classId))
            {
                throw new InvalidOperationException("Buổi học không thuộc lớp đã chọn.");
            }
        }
        else if (!request.GroupStudy)
        {
            throw new InvalidOperationException("Hãy chọn giờ học và huấn luyện viên.");
        }

        var today = DateOnly.FromDateTime(DateTime.Now);
        var enrolledCount = trainingClass.Enrollments.Count(item => item.Status == "enrolled");
        var seatsLeft = trainingClass.Capacity is int capacity ? capacity - enrolledCount : int.MaxValue;
        var isOpen = trainingClass.Status is "open" or "ongoing"
            && (trainingClass.EndDate is null || trainingClass.EndDate >= today)
            && trainingClass.Course?.Status == "active"
            && seatsLeft > 0;
        if (!isOpen)
        {
            throw new InvalidOperationException("Thanh toán chưa thành công vì lớp không còn chỗ. Hãy chọn lớp khác.");
        }

        if (trainingClass.Enrollments.Any(item => item.UserId == user.UserId && item.Status == "enrolled"))
        {
            throw new InvalidOperationException("Bạn đã ghi danh lớp này.");
        }

        user.FullName = fullName;
        user.Phone = phone;
        if (trainingClass.Room is not null)
        {
            user.CenterId = trainingClass.Room.CenterId;
        }

        var now = DateTime.Now;
        var upgrade = await ClassMembershipBonus.QuoteUpgradeAsync(db, request.MembershipPackageId);
        await using var transaction = await db.Database.BeginTransactionAsync();
        var invoice = new Invoice
        {
            UserId = user.UserId,
            InvoiceCode = $"HD{now:yyyyMMddHHmmss}{user.UserId}",
            IssuedAt = now,
            TotalAmount = (trainingClass.Course?.Price ?? 0) + upgrade.Price,
            Status = "paid",
        };
        db.Invoices.Add(invoice);
        await db.SaveChangesAsync();

        var payment = new Payment
        {
            InvoiceId = invoice.InvoiceId,
            UserId = user.UserId,
            ClassId = trainingClass.ClassId,
            Amount = invoice.TotalAmount,
            PaymentMethod = methodLabel,
            PaidAt = now,
            Status = "paid",
            RegisteredByUserId = user.UserId,
            UpgradePackageId = upgrade.Package?.MembershipPackageId,
            UpgradeAmount = upgrade.Price,
        };
        db.Payments.Add(payment);
        ClassRegistrationLogs.Add(
            db, user.UserId, trainingClass.ClassId, ClassRegistrationLogs.Register,
            new RegistrationActor(user.UserId, "MEMBER"), now, payment, classAssignedBy: "MEMBER");
        db.ClassEnrollments.Add(new ClassEnrollment
        {
            ClassId = trainingClass.ClassId,
            UserId = user.UserId,
            EnrolledAt = now,
            Status = "enrolled",
        });

        var thankYou = $"Cảm ơn {user.FullName}. AnhDuy Sport đã nhận học phí lớp {trainingClass.ClassName}.";
        var commitment = $"Tôi, {user.FullName}, cam kết tham gia đúng lịch lớp {trainingClass.ClassName}, đóng học phí đã thống nhất và tuân thủ nội quy trung tâm AnhDuy Sport.";
        db.Notifications.Add(new AccountNotification
        {
            UserId = user.UserId,
            Title = "Cảm ơn bạn đã đăng ký lớp",
            Content = $"{thankYou} {commitment}",
            IsRead = false,
            CreatedAt = now,
        });
        await db.SaveChangesAsync();
        await ClassMembershipBonus.GrantAsync(db, payment, now);
        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = user.UserId,
            Action = Shorten($"Thanh toán lớp {trainingClass.ClassName}", 100),
            EntityName = "payment",
            EntityId = payment.PaymentId,
            Detail = $"Học viên {user.FullName} thanh toán học phí lớp {trainingClass.ClassName}.",
            CreatedAt = now,
        });
        await db.SaveChangesAsync();
        await transaction.CommitAsync();

        var session = await auth.IssueAsync(user);
        return new RegistrationPaymentResponse(
            true,
            "Thanh toán thành công. Bạn có thể dùng các thao tác còn lại của học viên.",
            thankYou,
            commitment,
            invoice.InvoiceCode,
            session.Token,
            session.User,
            new RegisteredByDto(user.UserId.ToString(), user.FullName, "MEMBER"),
            payment.Amount,
            payment.Amount - payment.UpgradeAmount,
            await ClassMembershipBonus.QuoteOfPaymentAsync(db, payment));
    }

    internal static readonly Dictionary<string, string> PaymentMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        ["cash"] = "Tiền mặt",
        ["transfer"] = "Chuyển khoản",
        ["card"] = "Thẻ",
    };

    private async Task<UserAccount> FindActiveMemberAsync(int id)
    {
        var member = await db.UserAccounts
            .Include(user => user.Role)
            .FirstOrDefaultAsync(user => user.UserId == id);
        if (member is null || member.Role?.RoleCode != "MEMBER")
        {
            throw new KeyNotFoundException("Không tìm thấy học viên.");
        }

        if (member.Status != "active")
        {
            throw new RegistrationException("Tài khoản học viên không hoạt động.");
        }

        return member;
    }

    // Lớp theo thứ tự: classId gửi lên, lớp của buổi học slotId, lớp học viên đang giữ chỗ, lớp còn chỗ bắt đầu sớm nhất của môn.
    // AutoAssigned = true khi người đăng ký không chọn lớp hay buổi học và hệ thống tự xếp lớp.
    private async Task<(int ClassId, bool AutoAssigned)> ResolveClassAsync(int memberUserId, CreateClassRegistrationRequest request)
    {
        if (!int.TryParse(request.SportId, out var sportId) || !await db.Sports.AnyAsync(sport => sport.SportId == sportId))
        {
            throw new KeyNotFoundException("Không tìm thấy môn thể thao.");
        }

        int? chosen = null;
        if (!string.IsNullOrWhiteSpace(request.ClassId))
        {
            chosen = int.TryParse(request.ClassId, out var classId)
                ? classId
                : throw new KeyNotFoundException("Không tìm thấy lớp học.");
        }
        else if (!string.IsNullOrWhiteSpace(request.SlotId))
        {
            chosen = int.TryParse(request.SlotId, out var sessionId)
                ? await db.ClassSessions.Where(session => session.SessionId == sessionId).Select(session => (int?)session.ClassId).FirstOrDefaultAsync()
                : null;
            if (chosen is null)
            {
                throw new KeyNotFoundException("Không tìm thấy buổi học.");
            }
        }

        if (chosen is int picked)
        {
            var classSport = await db.Classes
                .Where(item => item.ClassId == picked)
                .Select(item => (int?)item.Course!.SportId)
                .FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException("Không tìm thấy lớp học.");
            if (classSport != sportId)
            {
                throw new RegistrationException(string.IsNullOrWhiteSpace(request.ClassId)
                    ? "Buổi học không thuộc môn thể thao đã chọn."
                    : "Lớp không thuộc môn thể thao đã chọn.");
            }

            return (picked, false);
        }

        var held = await LiveHolds()
            .Where(hold => hold.UserId == memberUserId && hold.Class!.Course!.SportId == sportId)
            .Select(hold => hold.ClassId)
            .FirstOrDefaultAsync();
        if (held is int heldClassId)
        {
            return (heldClassId, true);
        }

        var today = DateOnly.FromDateTime(DateTime.Now);
        var candidates = await OpenClasses(today)
            .Where(item => item.Course!.SportId == sportId
                && !item.Enrollments.Any(enrollment => enrollment.UserId == memberUserId && enrollment.Status == "enrolled"))
            .OrderBy(item => item.StartDate == null)
            .ThenBy(item => item.StartDate)
            .ThenBy(item => item.ClassId)
            .Select(item => new
            {
                item.ClassId,
                item.Capacity,
                Enrolled = item.Enrollments.Count(enrollment => enrollment.Status == "enrolled"),
            })
            .ToListAsync();
        foreach (var candidate in candidates)
        {
            var heldByOthers = await LiveHolds().CountAsync(hold => hold.ClassId == candidate.ClassId && hold.UserId != memberUserId);
            if (AvailableSeats(candidate.Capacity, candidate.Enrolled + heldByOthers) is null or > 0)
            {
                return (candidate.ClassId, true);
            }
        }

        var studying = await db.Classes
            .Where(item => item.Course!.SportId == sportId)
            .SelectMany(item => item.Enrollments)
            .AnyAsync(enrollment => enrollment.UserId == memberUserId && enrollment.Status == "enrolled");
        throw new RegistrationException(studying && candidates.Count == 0
            ? "Bạn đã đăng ký lớp của môn này."
            : "Môn này hiện chưa có lớp còn chỗ.");
    }

    // Chỉ lấy đơn pending còn hạn giữ chỗ: đơn quá hạn không được trả lại cho học viên.
    private Task<Payment?> FindPendingPaymentAsync(int userId, int classId) =>
        LiveHolds()
            .Include(payment => payment.Invoice)
            .FirstOrDefaultAsync(payment => payment.UserId == userId && payment.ClassId == classId);

    private async Task<Payment> CreatePendingPaymentAsync(
        UserAccount member,
        CreateClassRegistrationRequest request,
        int classId,
        string className,
        decimal tuition,
        (MembershipPackage? Package, decimal Price) upgrade,
        RegistrationActor registeredBy,
        string classAssignedBy)
    {
        var userId = member.UserId;
        // Số lấy từ SEQUENCE nên hai đơn tạo cùng lúc không bao giờ trùng mã.
        // ToListAsync (không SingleAsync) để EF không bọc câu lệnh thành truy vấn con.
        var number = (await db.Database
            .SqlQuery<int>($"SELECT NEXT VALUE FOR dbo.invoice_code_seq AS [Value]")
            .ToListAsync()).Single();
        var now = DateTime.Now;

        await using var transaction = await db.Database.BeginTransactionAsync();

        // Khóa dòng lớp để hai đăng ký cùng lúc cho chỗ cuối không cùng qua (cùng cách với MarkPaymentPaidAsync).
        await db.Database
            .SqlQuery<int>($"SELECT class_id AS [Value] FROM class WITH (UPDLOCK, HOLDLOCK) WHERE class_id = {classId}")
            .ToListAsync();
        var capacity = await db.Classes.Where(item => item.ClassId == classId).Select(item => item.Capacity).FirstAsync();
        var enrolled = await db.ClassEnrollments.CountAsync(item => item.ClassId == classId && item.Status == "enrolled");
        var heldByOthers = await LiveHolds().CountAsync(hold => hold.ClassId == classId && hold.UserId != userId);
        if (AvailableSeats(capacity, enrolled + heldByOthers) == 0)
        {
            throw new RegistrationException("Lớp đã hết chỗ (đang có người giữ chỗ chờ thanh toán). Vui lòng thử lại sau ít phút.");
        }

        // Đơn pending cũ của chính học viên đã quá hạn giữ chỗ: hủy để chỉ mục UX_payment_pending_per_class cho tạo đơn mới.
        var holdSince = HoldSince();
        var expired = await db.Payments
            .Include(payment => payment.Invoice)
            .Where(payment => payment.UserId == userId && payment.ClassId == classId && payment.Status == "pending"
                && payment.Invoice!.IssuedAt <= holdSince)
            .ToListAsync();
        foreach (var old in expired)
        {
            old.Status = "failed";
            old.Invoice!.Status = "cancelled";
        }

        if (!string.IsNullOrWhiteSpace(request.Phone))
        {
            var phone = AccountPhone.Require(request.Phone);
            if (AccountPhone.Digits(member.Phone) != phone)
            {
                await AccountPhone.EnsureUniqueAsync(db, phone, member.UserId);
            }
        }

        var changedFields = ApplyProfile(member, request);
        if (changedFields.Count > 0)
        {
            db.ActivityLogs.Add(new ActivityLog
            {
                ActorUserId = registeredBy.UserId,
                Action = "Cập nhật hồ sơ khi đăng ký lớp",
                EntityName = "user",
                EntityId = userId,
                Detail = $"Đã đổi: {string.Join(", ", changedFields)}",
                CreatedAt = now,
            });
        }

        await db.SaveChangesAsync();

        var invoice = new Invoice
        {
            UserId = userId,
            InvoiceCode = $"INV-{now.Year}-{number:D4}",
            IssuedAt = now,
            TotalAmount = tuition + upgrade.Price,
            Status = "issued",
        };
        var payment = new Payment
        {
            Invoice = invoice,
            UserId = userId,
            ClassId = classId,
            Amount = tuition + upgrade.Price,
            PaymentMethod = "payos",
            Status = "pending",
            RegisteredByUserId = registeredBy.UserId,
            UpgradePackageId = upgrade.Package?.MembershipPackageId,
            UpgradeAmount = upgrade.Price,
        };
        db.Payments.Add(payment);
        ClassRegistrationLogs.Add(db, userId, classId, ClassRegistrationLogs.Register, registeredBy, now, payment,
            classAssignedBy: classAssignedBy);
        await db.SaveChangesAsync();

        var upgradeText = upgrade.Package is null
            ? ""
            : $", lên cấp {upgrade.Package.PackageName} {upgrade.Price:N0}";
        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = registeredBy.UserId,
            Action = Shorten($"Đăng ký lớp {className}", 100),
            EntityName = "payment",
            EntityId = payment.PaymentId,
            Detail = registeredBy.UserId == userId
                ? $"Hóa đơn {invoice.InvoiceCode}, học phí {tuition:N0}{upgradeText}"
                : $"Đăng ký giùm {member.FullName} ({registeredBy.RoleCode}). Hóa đơn {invoice.InvoiceCode}, học phí {tuition:N0}{upgradeText}",
            CreatedAt = now,
        });
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return payment;
    }

    // Người gọi phải Include(Invoice). Đơn pending được tạo link payOS, hết hạn cùng lúc nhả chỗ.
    private async Task<ClassRegistrationDto> ToRegistrationDtoAsync(Payment payment, string className, bool isExisting)
    {
        var linked = payment.Status == "pending"
            ? await payOs.EnsureRegistrationLinkAsync(payment.PaymentId, PaymentTimeout.ExpiresAt(payment.Invoice!.IssuedAt))
            : null;
        return new(
            payment.PaymentId.ToString(),
            payment.Invoice!.InvoiceCode,
            payment.ClassId.ToString()!,
            className,
            payment.Amount,
            payment.Status,
            linked?.CheckoutUrl ?? "",
            isExisting,
            await ClassRegistrationLogs.RegisteredByPaymentAsync(db, payment.PaymentId),
            payment.Amount - payment.UpgradeAmount,
            await ClassMembershipBonus.QuoteOfPaymentAsync(db, payment),
            linked?.QrCode ?? "",
            PayOsQrImage.ToDataUrl(linked?.QrCode),
            payment.Status == "pending" ? PaymentTimeout.SecondsLeft(payment.Invoice!.IssuedAt) : 0);
    }

    // Người gọi phải Include(Invoice), nếu không InvoiceCode và InvoiceStatus sẽ rỗng.
    private static RegistrationStatusDto ToRegistrationStatusDto(
        Payment payment,
        string className,
        string? enrollmentStatus,
        string message,
        RegisteredByDto? registeredBy,
        MembershipPackageQuoteDto? membershipPackage) =>
        new RegistrationStatusDto(
            payment.PaymentId.ToString(),
            payment.Invoice?.InvoiceCode ?? "",
            payment.ClassId?.ToString() ?? "",
            className,
            payment.Amount,
            payment.Status,
            payment.Invoice?.Status ?? "",
            enrollmentStatus,
            message,
            registeredBy,
            payment.Amount - payment.UpgradeAmount,
            membershipPackage);

    // Đơn có thể không gắn lớp (thanh toán gói hội viên): khi đó không có tên lớp và trạng thái ghi danh.
    private async Task<RegistrationStatusDto> BuildStatusAsync(Payment payment)
    {
        var className = payment.Class?.ClassName ?? "";
        string? enrollmentStatus = null;
        if (payment.ClassId is int classId)
        {
            enrollmentStatus = await db.ClassEnrollments
                .AsNoTracking()
                .Where(item => item.ClassId == classId && item.UserId == payment.UserId)
                .Select(item => item.Status)
                .FirstOrDefaultAsync();
        }

        var registeredBy = payment.ClassId is null
            ? null
            : await ClassRegistrationLogs.RegisteredByPaymentAsync(db, payment.PaymentId);
        return ToRegistrationStatusDto(
            payment,
            className,
            enrollmentStatus,
            StatusMessage(payment.Status, enrollmentStatus, className),
            registeredBy,
            await ClassMembershipBonus.QuoteOfPaymentAsync(db, payment));
    }

    private static string StatusMessage(string paymentStatus, string? enrollmentStatus, string className) =>
        paymentStatus switch
        {
            "paid" when enrollmentStatus is "enrolled" or "completed" =>
                $"Cảm ơn bạn đã thanh toán. Bạn đã được ghi danh vào lớp {className}.",
            "paid" =>
                $"AnhDuy Sport đã nhận thanh toán nhưng lớp {className} đã đầy. Chúng tôi sẽ liên hệ để hoàn tiền cho bạn.",
            "failed" => "Thanh toán không thành công.",
            _ => "",
        };

    // Ghi đè hồ sơ bằng các trường học viên gửi lên; trả tên các trường thực sự thay đổi.
    private static List<string> ApplyProfile(UserAccount member, CreateClassRegistrationRequest request)
    {
        var changed = new List<string>();
        var fullName = request.FullName?.Trim();
        if (fullName is not null && fullName != member.FullName)
        {
            member.FullName = fullName;
            changed.Add("họ tên");
        }

        if (!string.IsNullOrWhiteSpace(request.Phone))
        {
            var phone = AccountPhone.Require(request.Phone);
            if (phone != AccountPhone.Digits(member.Phone))
            {
                member.Phone = phone;
                changed.Add("số điện thoại");
            }
        }

        if (request.DateOfBirth is { } dateOfBirth && dateOfBirth != member.DateOfBirth)
        {
            member.DateOfBirth = dateOfBirth;
            changed.Add("ngày sinh");
        }

        if (request.Gender is not null && request.Gender != member.Gender)
        {
            member.Gender = request.Gender;
            changed.Add("giới tính");
        }

        return changed;
    }

    private static string Shorten(string value, int max) => value.Length > max ? value[..max] : value;

    // Đơn pending giữ chỗ HoldMinutes phút kể từ lúc phát hành hóa đơn; link payOS hết hạn cùng lúc nên QR hết hạn thì chỗ được nhả.
    private const int HoldMinutes = PaymentTimeout.Minutes;
    private const int MaxHoldsPerMember = 3;

    private static DateTime HoldSince() => DateTime.Now.AddMinutes(-HoldMinutes);

    internal IQueryable<Payment> LiveHolds()
    {
        var since = HoldSince();
        return db.Payments
            .AsNoTracking()
            .Where(payment => payment.ClassId != null && payment.Status == "pending" && payment.Invoice!.IssuedAt > since);
    }

    private static int? AvailableSeats(int? capacity, int enrolledCount) =>
        capacity is int total ? Math.Max(total - enrolledCount, 0) : null;

    // Cùng luật với IsOpenForRegistration (chưa tính chỗ trống): đổi một nơi thì đổi cả nơi kia.
    private IQueryable<TrainingClass> OpenClasses(DateOnly today) =>
        db.Classes
            .AsNoTracking()
            .Where(item => item.Status == "open" || item.Status == "ongoing")
            .Where(item => item.EndDate == null || item.EndDate >= today)
            .Where(item => item.Course!.Status == "active");

    private static bool IsOpenForRegistration(
        string classStatus,
        DateOnly? endDate,
        string courseStatus,
        int? availableSeats,
        DateOnly today) =>
        (classStatus is "open" or "ongoing")
        && (endDate is null || endDate >= today)
        && courseStatus == "active"
        && (availableSeats is null || availableSeats > 0);
}

