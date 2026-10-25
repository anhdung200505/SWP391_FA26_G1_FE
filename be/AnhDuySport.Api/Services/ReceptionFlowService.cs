using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Lễ tân (hoặc quản trị) thao tác đăng ký lớp thay học viên. Mọi thao tác ghi vào class_registration_log.
public class ReceptionFlowService(
    AppDbContext db,
    CurrentActor actor,
    ClassRegistrationFlowService registrations,
    PayOsPaymentService payOs)
{
    // Chỉ tìm đúng 1 học viên theo email hoặc số điện thoại đầy đủ, không liệt kê danh sách học viên.
    public async Task<ReceptionMemberDto> LookupMemberAsync(string? keyword)
    {
        var value = keyword?.Trim() ?? "";
        if (value.Length == 0)
        {
            throw new RegistrationException("Nhập email hoặc số điện thoại của học viên.");
        }

        var members = db.UserAccounts.AsNoTracking().Where(user => user.Role!.RoleCode == "MEMBER");
        var phone = AccountPhone.Digits(value);
        var member = value.Contains('@')
            ? await members.FirstOrDefaultAsync(user => user.Email != null && user.Email.ToLower() == value.ToLower())
            : phone.Length == 10
                ? (await members.Where(user => user.Phone != null && user.Phone != "").ToListAsync())
                    .FirstOrDefault(user => AccountPhone.Digits(user.Phone) == phone)
                : null;
        return member is null
            ? throw new KeyNotFoundException("Không tìm thấy học viên với email hoặc số điện thoại này.")
            : ToMemberDto(member);
    }

    public async Task<RegistrationStatusDto> AccessRegistrationStatusAsync(string paymentId)
    {
        var payment = await FindClassPaymentAsync(paymentId);
        return await registrations.SelectRegistrationStatusAsync(paymentId, payment.UserId);
    }

    public async Task CancelRegistrationAsync(string paymentId)
    {
        var payment = await FindClassPaymentAsync(paymentId);
        await payOs.CancelAsync(paymentId, payment.UserId);
    }

    // Check-in đúng buổi hôm nay: buổi đang diễn ra, không có thì buổi sắp tới. Không điểm danh hộ buổi đã qua.
    public async Task<ReceptionCheckInDto> CheckInAsync(string? keyword)
    {
        var member = await FindMemberByKeywordAsync(keyword);
        var now = DateTime.Now;
        var today = DateOnly.FromDateTime(now);
        var clock = TimeOnly.FromDateTime(now);
        var classIds = await db.ClassEnrollments.AsNoTracking()
            .Where(item => item.UserId == member.UserId && item.Status == "enrolled")
            .Select(item => item.ClassId)
            .ToListAsync();
        var sessions = await db.ClassSessions.AsNoTracking()
            .Include(item => item.Class)
            .Where(item => classIds.Contains(item.ClassId) && item.SessionDate == today && item.Status != "cancelled")
            .OrderBy(item => item.StartTime)
            .ThenBy(item => item.SessionId)
            .ToListAsync();
        var current = sessions.LastOrDefault(item => item.StartTime <= clock && clock < item.EndTime);
        var upcoming = sessions.FirstOrDefault(item => item.StartTime > clock);
        var target = current ?? upcoming;
        if (target is null)
        {
            throw new RegistrationException(sessions.Count == 0
                ? $"{member.FullName} không có buổi học hôm nay."
                : $"Buổi học hôm nay của {member.FullName} đã kết thúc.");
        }

        var row = await db.ClassAttendances
            .FirstOrDefaultAsync(item => item.SessionId == target.SessionId && item.UserId == member.UserId);
        var already = row?.Status == "present" && row.CheckInAt is not null;
        var checkedInAt = row?.CheckInAt ?? now;
        if (!already)
        {
            if (row is null)
            {
                row = new ClassAttendance
                {
                    SessionId = target.SessionId,
                    UserId = member.UserId,
                    Status = "present",
                    CheckInAt = now,
                };
                db.ClassAttendances.Add(row);
            }
            else
            {
                row.Status = "present";
                row.CheckInAt ??= now;
                checkedInAt = row.CheckInAt.Value;
            }

            var performer = await PerformerAsync();
            db.ActivityLogs.Add(new ActivityLog
            {
                ActorUserId = performer.UserId,
                Action = "Check-in học viên",
                EntityName = "attendance",
                EntityId = target.SessionId,
                Detail = $"{member.FullName} · {target.Class?.ClassName} · {target.StartTime:HH\\:mm}-{target.EndTime:HH\\:mm}",
                CreatedAt = now,
            });
            await db.SaveChangesAsync();
            checkedInAt = row.CheckInAt ?? now;
        }

        var label = $"{ClassSessionPlanner.SessionTitle(target.SessionNo)} · {target.StartTime:HH\\:mm}–{target.EndTime:HH\\:mm}";
        return new ReceptionCheckInDto(
            member.UserId.ToString(),
            member.FullName,
            member.Phone ?? "",
            target.ClassId.ToString(),
            target.Class?.ClassName ?? "",
            target.SessionId.ToString(),
            label,
            target.StartTime.ToString("HH:mm"),
            target.EndTime.ToString("HH:mm"),
            checkedInAt,
            already,
            already
                ? $"{member.FullName} đã check-in buổi này lúc {checkedInAt:HH:mm}."
                : $"Đã check-in {member.FullName} vào {target.Class?.ClassName}.");
    }

    public async Task<ClassRegistrationDto> RegisterForMemberAsync(string memberUserId, CreateClassRegistrationRequest request)
    {
        var performer = await PerformerAsync();
        return await registrations.SubmitRegistrationAsync(ParseId(memberUserId, "Không tìm thấy học viên."), request, performer);
    }

    public async Task<RegistrationStatusDto> ConfirmCounterPaymentAsync(string paymentId, ConfirmCounterPaymentRequest request)
    {
        var performer = await PerformerAsync();
        var id = ParseId(paymentId, "Không tìm thấy đơn đăng ký.");
        if (!ClassRegistrationFlowService.PaymentMethods.TryGetValue(request.PaymentMethod?.Trim() ?? "", out var methodLabel))
        {
            throw new RegistrationException("Hình thức thanh toán chỉ nhận cash, transfer hoặc card.");
        }

        var payment = await db.Payments.AsNoTracking()
            .FirstOrDefaultAsync(item => item.PaymentId == id && item.ClassId != null)
            ?? throw new KeyNotFoundException("Không tìm thấy đơn đăng ký.");
        if (payment.Status != "pending")
        {
            throw new RegistrationException("Chỉ xác nhận được đơn đang chờ thanh toán.");
        }

        // Đơn quá hạn giữ chỗ có thể đã mất chỗ: không thu tiền tại quầy cho đơn này.
        if (!await registrations.LiveHolds().AnyAsync(item => item.PaymentId == id))
        {
            throw new RegistrationException("Đơn đã hết hạn giữ chỗ. Hãy đăng ký lại cho học viên.");
        }

        var result = await registrations.MarkPaymentPaidAsync(id, performer.UserId, methodLabel);
        await payOs.CancelLinkQuietlyAsync(payment.PayosOrderCode, "Đã thu học phí tại quầy");
        ClassRegistrationLogs.Add(db, payment.UserId, payment.ClassId!.Value, ClassRegistrationLogs.ConfirmPayment, performer,
            DateTime.Now, reason: $"Thu {payment.Amount:N0} ({methodLabel})", paymentId: payment.PaymentId);
        await db.SaveChangesAsync();
        return result;
    }

    public async Task<ReceptionEnrollmentDto> MoveOutAsync(string memberUserId, string classId, MoveOutRequest request)
    {
        var performer = await PerformerAsync();
        var reason = RequireReason(request.Reason, "Nhập lý do cho học viên ra khỏi lớp.");
        var memberId = ParseId(memberUserId, "Không tìm thấy học viên.");
        var id = ParseId(classId, "Không tìm thấy lớp học.");
        var member = await FindMemberAsync(memberId);
        var className = await ClassNameAsync(id);

        var enrollment = await db.ClassEnrollments
            .FirstOrDefaultAsync(item => item.ClassId == id && item.UserId == memberId)
            ?? throw new KeyNotFoundException("Học viên không có trong lớp này.");
        if (enrollment.Status != "enrolled")
        {
            throw new RegistrationException("Học viên hiện không học lớp này.");
        }

        var now = DateTime.Now;
        enrollment.Status = "cancelled";
        ClassRegistrationLogs.Add(db, memberId, id, ClassRegistrationLogs.MoveOut, performer, now, reason: reason);
        db.Notifications.Add(new AccountNotification
        {
            UserId = memberId,
            Title = $"Bạn đã được cho ra khỏi lớp {className}",
            Content = $"Lý do: {TextFormat.Sentence(reason)} Khi muốn học tiếp, hãy liên hệ lễ tân AnhDuy Sport để đăng ký học lại.",
            IsRead = false,
            CreatedAt = now,
        });
        AddActivity(performer, $"Cho {member.FullName} ra khỏi lớp {className}", enrollment.ClassEnrollmentId,
            $"Lý do: {TextFormat.Sentence(reason)}", now);
        await db.SaveChangesAsync();

        return new ReceptionEnrollmentDto(
            memberId.ToString(), member.FullName, id.ToString(), className, enrollment.Status, enrollment.EnrolledAt,
            $"Đã cho {member.FullName} ra khỏi lớp {className}.");
    }

    public async Task<ReceptionEnrollmentDto> ReEnrollAsync(string memberUserId, string classId, ReEnrollRequest request)
    {
        var performer = await PerformerAsync();
        var reason = RequireReason(request.Reason, "Nhập lý do nghỉ đột xuất của học viên.");
        var memberId = ParseId(memberUserId, "Không tìm thấy học viên.");
        var sourceId = ParseId(classId, "Không tìm thấy lớp học.");
        var targetId = string.IsNullOrWhiteSpace(request.TargetClassId)
            ? sourceId
            : ParseId(request.TargetClassId, "Không tìm thấy lớp muốn học lại.");
        var member = await FindMemberAsync(memberId);
        if (member.Status != "active")
        {
            throw new RegistrationException("Tài khoản học viên không hoạt động.");
        }

        var source = await db.ClassEnrollments
            .FirstOrDefaultAsync(item => item.ClassId == sourceId && item.UserId == memberId)
            ?? throw new KeyNotFoundException("Học viên chưa từng học lớp này.");
        if (source.Status != "cancelled")
        {
            throw new RegistrationException(source.Status == "enrolled"
                ? "Học viên vẫn đang học lớp này."
                : "Học viên đã hoàn thành lớp này.");
        }

        var courseId = await db.Classes.Where(item => item.ClassId == sourceId).Select(item => item.CourseId).FirstAsync();
        var hasPaid = await db.Payments.AnyAsync(payment =>
            payment.UserId == memberId && payment.Status == "paid" && payment.Class!.CourseId == courseId);
        if (!hasPaid)
        {
            throw new RegistrationException("Học viên chưa đóng học phí khóa này nên không đăng ký học lại được. Hãy đăng ký lớp mới.");
        }

        // Một lần đóng học phí chỉ học một lớp của khóa tại một thời điểm.
        var studyingSameCourse = await db.Classes
            .Where(item => item.CourseId == courseId)
            .SelectMany(item => item.Enrollments)
            .AnyAsync(item => item.UserId == memberId && item.Status == "enrolled");
        if (studyingSameCourse)
        {
            throw new RegistrationException("Học viên đang học một lớp khác của khóa này.");
        }

        var now = DateTime.Now;
        var today = DateOnly.FromDateTime(now);
        await using var transaction = await db.Database.BeginTransactionAsync();
        await db.Database
            .SqlQuery<int>($"SELECT class_id AS [Value] FROM class WITH (UPDLOCK, HOLDLOCK) WHERE class_id = {targetId}")
            .ToListAsync();
        var target = await db.Classes.AsNoTracking()
            .Where(item => item.ClassId == targetId)
            .Select(item => new
            {
                item.ClassName,
                item.CourseId,
                item.Status,
                item.EndDate,
                item.Capacity,
                CourseStatus = item.Course!.Status,
                Enrolled = item.Enrollments.Count(enrollment => enrollment.Status == "enrolled"),
            })
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Không tìm thấy lớp muốn học lại.");
        if (target.CourseId != courseId)
        {
            throw new RegistrationException("Chỉ chuyển sang lớp cùng khóa học.");
        }

        if (target.Status is not ("open" or "ongoing") || target.EndDate < today || target.CourseStatus != "active")
        {
            throw new RegistrationException("Lớp không còn nhận học viên.");
        }

        var held = await registrations.LiveHolds().CountAsync(hold => hold.ClassId == targetId && hold.UserId != memberId);
        if (target.Capacity is int capacity && target.Enrolled + held >= capacity)
        {
            throw new RegistrationException("Lớp đã hết chỗ.");
        }

        var enrollment = targetId == sourceId
            ? source
            : await db.ClassEnrollments.FirstOrDefaultAsync(item => item.ClassId == targetId && item.UserId == memberId);
        if (enrollment is null)
        {
            enrollment = new ClassEnrollment { ClassId = targetId, UserId = memberId };
            db.ClassEnrollments.Add(enrollment);
        }

        enrollment.Status = "enrolled";
        enrollment.EnrolledAt = now;

        var sourceName = targetId == sourceId ? target.ClassName : await ClassNameAsync(sourceId);
        ClassRegistrationLogs.Add(db, memberId, targetId, ClassRegistrationLogs.ReEnroll, performer, now,
            reason: targetId == sourceId ? reason : $"{reason} (chuyển từ lớp {sourceName})",
            classAssignedBy: performer.RoleCode);
        db.Notifications.Add(new AccountNotification
        {
            UserId = memberId,
            Title = $"Bạn đã được đăng ký học lại lớp {target.ClassName}",
            Content = $"Lễ tân AnhDuy Sport đã đăng ký học lại cho bạn. Lý do: {TextFormat.Sentence(reason)}",
            IsRead = false,
            CreatedAt = now,
        });
        await db.SaveChangesAsync();
        AddActivity(performer, $"Đăng ký học lại cho {member.FullName}", enrollment.ClassEnrollmentId,
            targetId == sourceId
                ? $"Lớp {target.ClassName}. Lý do: {reason}"
                : $"{sourceName} → {target.ClassName}. Lý do: {reason}",
            now);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();

        return new ReceptionEnrollmentDto(
            memberId.ToString(), member.FullName, targetId.ToString(), target.ClassName, enrollment.Status, enrollment.EnrolledAt,
            $"Đã đăng ký học lại lớp {target.ClassName} cho {member.FullName}.");
    }

    // Mỗi dòng là 1 học viên trong 1 lớp với đủ thông tin: học viên, lớp, đơn thanh toán, ai đăng ký, ai xếp lớp, buổi học sắp tới và lịch sử.
    // scope = mine (mặc định): chỉ học viên mà tài khoản đang đăng nhập đã thao tác. scope = all: tất cả, kể cả học viên tự đăng ký.
    public async Task<IReadOnlyList<ReceptionRegistrationDto>> AccessRegistrationsAsync(
        string? scope,
        string? search,
        string? sportId,
        string? classId,
        string? memberUserId)
    {
        var performer = await PerformerAsync();
        var logs = db.ClassRegistrationLogs.AsNoTracking();
        var mode = string.IsNullOrWhiteSpace(scope) ? "mine" : scope.Trim().ToLowerInvariant();
        if (mode == "mine")
        {
            var mine = db.ClassRegistrationLogs.Where(log => log.PerformedByUserId == performer.UserId);
            logs = logs.Where(log => mine.Any(own => own.MemberUserId == log.MemberUserId && own.ClassId == log.ClassId));
        }
        else if (mode != "all")
        {
            throw new RegistrationException("scope chỉ nhận mine hoặc all.");
        }

        if (!string.IsNullOrWhiteSpace(memberUserId))
        {
            var id = ParseId(memberUserId, "Không tìm thấy học viên.");
            logs = logs.Where(log => log.MemberUserId == id);
        }

        if (!string.IsNullOrWhiteSpace(classId))
        {
            var id = ParseId(classId, "Không tìm thấy lớp học.");
            logs = logs.Where(log => log.ClassId == id);
        }

        if (!string.IsNullOrWhiteSpace(sportId))
        {
            var id = ParseId(sportId, "Không tìm thấy môn thể thao.");
            logs = logs.Where(log => db.Classes.Any(item => item.ClassId == log.ClassId && item.Course!.SportId == id));
        }

        var history = await (
            from log in logs
            join user in db.UserAccounts on log.PerformedByUserId equals (int?)user.UserId into users
            from user in users.DefaultIfEmpty()
            orderby log.CreatedAt descending, log.ClassRegistrationLogId descending
            select new { Log = log, PerformerName = user != null ? user.FullName : null })
            .ToListAsync();
        if (history.Count == 0)
        {
            return [];
        }

        var memberIds = history.Select(row => row.Log.MemberUserId).Distinct().ToList();
        var classIds = history.Select(row => row.Log.ClassId).Distinct().ToList();
        var members = await db.UserAccounts.AsNoTracking()
            .Where(user => memberIds.Contains(user.UserId))
            .ToDictionaryAsync(user => user.UserId);
        var classes = await db.Classes.AsNoTracking()
            .Where(item => classIds.Contains(item.ClassId))
            .Select(item => new ReceptionClassDto(
                item.ClassId.ToString(),
                item.ClassName,
                item.Status,
                item.Course!.SportId.ToString(),
                item.Course.Sport!.SportName,
                item.Course.CourseName,
                item.Coach!.FullName,
                item.StartDate,
                item.EndDate))
            .ToDictionaryAsync(item => int.Parse(item.Id));
        var enrollments = (await db.ClassEnrollments.AsNoTracking()
                .Where(item => memberIds.Contains(item.UserId) && classIds.Contains(item.ClassId))
                .Select(item => new { item.UserId, item.ClassId, item.Status })
                .ToListAsync())
            .ToDictionary(item => (item.UserId, item.ClassId), item => item.Status);
        var payments = await db.Payments.AsNoTracking()
            .Where(payment => payment.ClassId != null
                && memberIds.Contains(payment.UserId)
                && classIds.Contains(payment.ClassId.Value))
            .Select(payment => new
            {
                payment.PaymentId,
                payment.UserId,
                ClassId = payment.ClassId!.Value,
                payment.Invoice!.InvoiceCode,
                payment.Invoice.IssuedAt,
                payment.Amount,
                payment.PaymentMethod,
                payment.Status,
                payment.PaidAt,
                payment.UpgradePackageId,
                payment.UpgradeAmount,
            })
            .ToListAsync();
        var packages = await db.MembershipPackages.AsNoTracking().ToListAsync();
        var bronze = packages.FirstOrDefault(item => item.PackageCode == ClassMembershipBonus.BronzeCode);
        var today = DateOnly.FromDateTime(DateTime.Now);
        var nextSessions = (await db.ClassSessions.AsNoTracking()
                .Where(session => classIds.Contains(session.ClassId)
                    && session.Status != "cancelled"
                    && session.SessionDate >= today)
                .ToListAsync())
            .GroupBy(session => session.ClassId)
            .ToDictionary(
                group => group.Key,
                group => ClassSessionPlanner.ToSlotDto(group.OrderBy(session => session.SessionDate).ThenBy(session => session.StartTime).First()));

        var rows = history
            .GroupBy(row => (row.Log.MemberUserId, row.Log.ClassId))
            .Select(group =>
            {
                var (memberId, rowClassId) = group.Key;
                var member = members[memberId];
                var payment = payments
                    .Where(item => item.UserId == memberId && item.ClassId == rowClassId)
                    .OrderByDescending(item => item.Status == "paid")
                    .ThenByDescending(item => item.IssuedAt)
                    .FirstOrDefault();
                var register = group.FirstOrDefault(row => row.Log.Action == ClassRegistrationLogs.Register);
                var assigned = group.FirstOrDefault(row => row.Log.ClassAssignedBy is not null);
                return new ReceptionRegistrationDto(
                    ToMemberDto(member),
                    classes[rowClassId],
                    enrollments.GetValueOrDefault((memberId, rowClassId)),
                    payment is null
                        ? null
                        : new ReceptionPaymentDto(
                            payment.PaymentId.ToString(),
                            payment.InvoiceCode,
                            payment.Amount,
                            payment.PaymentMethod,
                            payment.Status,
                            payment.PaidAt,
                            payment.Amount - payment.UpgradeAmount,
                            (payment.UpgradePackageId is int packageId
                                ? packages.FirstOrDefault(item => item.MembershipPackageId == packageId)
                                : bronze) is { } package
                                ? ClassMembershipBonus.ToQuote(package, payment.UpgradePackageId is null, payment.UpgradeAmount)
                                : null),
                    register is null ? null : ToPerformerDto(register.Log, register.PerformerName),
                    assigned is null ? null : ToClassAssignedDto(assigned.Log, assigned.PerformerName),
                    nextSessions.GetValueOrDefault(rowClassId),
                    group
                        .Select(row => new ReceptionHistoryDto(
                            row.Log.ClassRegistrationLogId.ToString(),
                            row.Log.Action,
                            ClassRegistrationLogs.ActionLabel(row.Log.Action),
                            row.Log.Reason,
                            row.Log.PaymentId?.ToString(),
                            ToPerformerDto(row.Log, row.PerformerName),
                            row.Log.CreatedAt))
                        .ToList(),
                    group.First().Log.CreatedAt);
            })
            .OrderByDescending(row => row.LastActivityAt)
            .ToList();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim();
            rows = rows.Where(row =>
                    row.Member.FullName.Contains(keyword, StringComparison.OrdinalIgnoreCase)
                    || row.Member.Email.Contains(keyword, StringComparison.OrdinalIgnoreCase)
                    || row.Member.Phone.Contains(keyword, StringComparison.OrdinalIgnoreCase)
                    || row.Class.Name.Contains(keyword, StringComparison.OrdinalIgnoreCase)
                    || (row.Payment?.InvoiceCode ?? "").Contains(keyword, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        return rows;
    }

    private static RegisteredByDto ToPerformerDto(ClassRegistrationLog log, string? performerName) =>
        new(log.PerformedByUserId?.ToString(), performerName, log.PerformedByRole);

    private static ClassAssignedByDto ToClassAssignedDto(ClassRegistrationLog log, string? performerName)
    {
        var source = log.ClassAssignedBy!;
        return source == ClassRegistrationLogs.SystemAssigned
            ? new ClassAssignedByDto(source, ClassRegistrationLogs.ClassAssignedLabel(source), null, null)
            : new ClassAssignedByDto(source, ClassRegistrationLogs.ClassAssignedLabel(source), log.PerformedByUserId?.ToString(), performerName);
    }

    private static ReceptionMemberDto ToMemberDto(UserAccount user) =>
        new(user.UserId.ToString(), user.FullName, user.Email ?? "", user.Phone ?? "", user.Status);

    private async Task<RegistrationActor> PerformerAsync()
    {
        var user = await db.UserAccounts.AsNoTracking()
            .Include(item => item.Role)
            .FirstOrDefaultAsync(item => item.UserId == actor.UserId)
            ?? throw new RegistrationException("Tài khoản thao tác không còn tồn tại.");
        return new RegistrationActor(user.UserId, user.Role?.RoleCode ?? "");
    }

    private async Task<Payment> FindClassPaymentAsync(string paymentId)
    {
        if (!int.TryParse(paymentId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy đơn đăng ký.");
        }

        return await db.Payments.AsNoTracking()
            .FirstOrDefaultAsync(item => item.PaymentId == id && item.ClassId != null)
            ?? throw new KeyNotFoundException("Không tìm thấy đơn đăng ký.");
    }

    private async Task<UserAccount> FindMemberByKeywordAsync(string? keyword)
    {
        var value = keyword?.Trim() ?? "";
        if (value.Length == 0)
        {
            throw new RegistrationException("Nhập mã học viên hoặc số điện thoại.");
        }

        if (value.Contains('@') || AccountPhone.Digits(value).Length == 10)
        {
            var found = await LookupMemberAsync(value);
            return await FindMemberAsync(int.Parse(found.Id));
        }

        if (int.TryParse(value, out var id))
        {
            return await FindMemberAsync(id);
        }

        throw new RegistrationException("Nhập mã học viên hoặc số điện thoại 10 số.");
    }

    private async Task<UserAccount> FindMemberAsync(int memberId) =>
        await db.UserAccounts.AsNoTracking()
            .FirstOrDefaultAsync(user => user.UserId == memberId && user.Role!.RoleCode == "MEMBER")
        ?? throw new KeyNotFoundException("Không tìm thấy học viên.");

    private async Task<string> ClassNameAsync(int classId) =>
        await db.Classes.AsNoTracking()
            .Where(item => item.ClassId == classId)
            .Select(item => item.ClassName)
            .FirstOrDefaultAsync()
        ?? throw new KeyNotFoundException("Không tìm thấy lớp học.");

    private void AddActivity(RegistrationActor performer, string action, int entityId, string detail, DateTime at)
    {
        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = performer.UserId,
            Action = action.Length <= 100 ? action : action[..100],
            EntityName = "class_enrollment",
            EntityId = entityId,
            Detail = detail,
            CreatedAt = at,
        });
    }

    private static int ParseId(string? value, string notFound) =>
        int.TryParse(value, out var id) ? id : throw new KeyNotFoundException(notFound);

    private static string RequireReason(string? value, string message)
    {
        var reason = value?.Trim() ?? "";
        if (reason.Length == 0)
        {
            throw new RegistrationException(message);
        }

        if (reason.Length > 400)
        {
            throw new RegistrationException("Lý do không quá 400 ký tự.");
        }

        return reason;
    }
}
