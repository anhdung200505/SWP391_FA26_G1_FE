using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Lễ tân (hoặc quản trị) thao tác đăng ký lớp thay học viên. Mọi thao tác ghi vào class_registration_log.
public class ReceptionFlowService(AppDbContext db, CurrentActor actor, ClassRegistrationFlowService registrations)
{
    public async Task<IReadOnlyList<ReceptionMemberDto>> SearchMembersAsync(string? search)
    {
        var members = db.UserAccounts.AsNoTracking().Where(user => user.Role!.RoleCode == "MEMBER");
        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim();
            members = members.Where(user =>
                user.FullName.Contains(keyword)
                || (user.Email ?? "").Contains(keyword)
                || (user.Phone ?? "").Contains(keyword));
        }

        return await members
            .OrderBy(user => user.FullName)
            .Take(50)
            .Select(user => new ReceptionMemberDto(
                user.UserId.ToString(),
                user.FullName,
                user.Email ?? "",
                user.Phone ?? "",
                user.Status))
            .ToListAsync();
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

        return await registrations.MarkPaymentPaidAsync(id, performer.UserId, methodLabel);
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
        var today = DateOnly.FromDateTime(now);
        enrollment.Status = "cancelled";
        var futureSlots = await db.SlotRegistrations
            .Where(item => item.UserId == memberId
                && item.Status == "registered"
                && item.Slot!.ClassId == id
                && item.Slot.SlotDate >= today)
            .ToListAsync();
        foreach (var slot in futureSlots)
        {
            slot.Status = "cancelled";
        }

        ClassRegistrationLogs.Add(db, memberId, id, ClassRegistrationLogs.MoveOut, performer, now, reason: reason);
        db.Notifications.Add(new AccountNotification
        {
            UserId = memberId,
            Title = $"Bạn đã được cho ra khỏi lớp {className}",
            Content = $"Lý do: {reason}. Khi muốn học tiếp, hãy liên hệ lễ tân AnhDuy Sport để đăng ký học lại.",
            IsRead = false,
            CreatedAt = now,
        });
        AddActivity(performer, $"Cho {member.FullName} ra khỏi lớp {className}", enrollment.ClassEnrollmentId,
            $"Lý do: {reason}. Hủy {futureSlots.Count} buổi đã đăng ký sắp tới.", now);
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
            reason: targetId == sourceId ? reason : $"{reason} (chuyển từ lớp {sourceName})");
        db.Notifications.Add(new AccountNotification
        {
            UserId = memberId,
            Title = $"Bạn đã được đăng ký học lại lớp {target.ClassName}",
            Content = $"Lễ tân AnhDuy Sport đã đăng ký học lại cho bạn. Lý do: {reason}.",
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

    public async Task<IReadOnlyList<PaidRegistrationDto>> AccessPaidRegistrationsAsync(string? classId, string? search)
    {
        var payments = db.Payments.AsNoTracking().Where(payment => payment.ClassId != null && payment.Status == "paid");
        if (!string.IsNullOrWhiteSpace(classId))
        {
            var id = ParseId(classId, "Không tìm thấy lớp học.");
            payments = payments.Where(payment => payment.ClassId == id);
        }

        var rows = await (
            from payment in payments
            join member in db.UserAccounts on payment.UserId equals member.UserId
            join registrar in db.UserAccounts on payment.RegisteredByUserId equals (int?)registrar.UserId into registrars
            from registrar in registrars.DefaultIfEmpty()
            orderby payment.PaidAt descending
            select new
            {
                payment.PaymentId,
                InvoiceCode = payment.Invoice!.InvoiceCode,
                payment.UserId,
                member.FullName,
                member.Email,
                member.Phone,
                ClassId = payment.ClassId!.Value,
                ClassName = payment.Class!.ClassName,
                payment.Amount,
                payment.PaymentMethod,
                payment.PaidAt,
                EnrollmentStatus = db.ClassEnrollments
                    .Where(enrollment => enrollment.ClassId == payment.ClassId && enrollment.UserId == payment.UserId)
                    .Select(enrollment => enrollment.Status)
                    .FirstOrDefault(),
                payment.RegisteredByUserId,
                RegistrarName = registrar != null ? registrar.FullName : null,
                RegistrarRole = registrar != null ? registrar.Role!.RoleCode : null,
            })
            .ToListAsync();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim();
            rows = rows.Where(row =>
                    row.FullName.Contains(keyword, StringComparison.OrdinalIgnoreCase)
                    || (row.Email ?? "").Contains(keyword, StringComparison.OrdinalIgnoreCase)
                    || (row.Phone ?? "").Contains(keyword, StringComparison.OrdinalIgnoreCase)
                    || row.InvoiceCode.Contains(keyword, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        return rows
            .Select(row => new PaidRegistrationDto(
                row.PaymentId.ToString(),
                row.InvoiceCode,
                row.UserId.ToString(),
                row.FullName,
                row.Email ?? "",
                row.Phone ?? "",
                row.ClassId.ToString(),
                row.ClassName,
                row.Amount,
                row.PaymentMethod,
                row.PaidAt,
                row.EnrollmentStatus,
                row.RegisteredByUserId?.ToString(),
                row.RegistrarName,
                row.RegistrarRole))
            .ToList();
    }

    public async Task<IReadOnlyList<ClassRegistrationLogDto>> AccessRegistrationLogsAsync(string? memberUserId, string? classId)
    {
        var logs = db.ClassRegistrationLogs.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(memberUserId))
        {
            var id = ParseId(memberUserId, "Không tìm thấy học viên.");
            logs = logs.Where(item => item.MemberUserId == id);
        }

        if (!string.IsNullOrWhiteSpace(classId))
        {
            var id = ParseId(classId, "Không tìm thấy lớp học.");
            logs = logs.Where(item => item.ClassId == id);
        }

        var rows = await (
            from log in logs
            join member in db.UserAccounts on log.MemberUserId equals member.UserId
            join trainingClass in db.Classes on log.ClassId equals trainingClass.ClassId
            join performer in db.UserAccounts on log.PerformedByUserId equals (int?)performer.UserId into performers
            from performer in performers.DefaultIfEmpty()
            orderby log.CreatedAt descending, log.ClassRegistrationLogId descending
            select new
            {
                Log = log,
                MemberName = member.FullName,
                trainingClass.ClassName,
                PerformerName = performer != null ? performer.FullName : null,
            })
            .Take(500)
            .ToListAsync();

        return rows
            .Select(row => new ClassRegistrationLogDto(
                row.Log.ClassRegistrationLogId.ToString(),
                row.Log.Action,
                row.Log.MemberUserId.ToString(),
                row.MemberName,
                row.Log.ClassId.ToString(),
                row.ClassName,
                row.Log.PaymentId?.ToString(),
                row.Log.Reason,
                row.Log.PerformedByUserId?.ToString(),
                row.PerformerName,
                row.Log.PerformedByRole,
                row.Log.CreatedAt))
            .ToList();
    }

    public async Task EnsureSchemaAsync()
    {
        await db.Database.ExecuteSqlRawAsync(
            """
            SET QUOTED_IDENTIFIER ON;
            IF COL_LENGTH(N'dbo.payment', N'registered_by_user_id') IS NULL
            BEGIN
                ALTER TABLE payment ADD registered_by_user_id INT NULL
                    CONSTRAINT FK_payment_registered_by REFERENCES [user] (user_id);
                EXEC(N'UPDATE payment SET registered_by_user_id = user_id WHERE class_id IS NOT NULL;');
            END
            IF OBJECT_ID(N'dbo.class_registration_log', N'U') IS NULL
            BEGIN
                CREATE TABLE class_registration_log (
                    class_registration_log_id INT IDENTITY(1,1) NOT NULL,
                    member_user_id            INT            NOT NULL,
                    class_id                  INT            NOT NULL,
                    payment_id                INT            NULL,
                    action                    NVARCHAR(30)   NOT NULL,
                    reason                    NVARCHAR(500)  NULL,
                    performed_by_user_id      INT            NULL,
                    performed_by_role         NVARCHAR(50)   NOT NULL,
                    created_at                DATETIME2(0)   NOT NULL,
                    CONSTRAINT PK_class_registration_log PRIMARY KEY (class_registration_log_id),
                    CONSTRAINT FK_class_registration_log_member FOREIGN KEY (member_user_id) REFERENCES [user] (user_id),
                    CONSTRAINT FK_class_registration_log_class FOREIGN KEY (class_id) REFERENCES class (class_id),
                    CONSTRAINT FK_class_registration_log_payment FOREIGN KEY (payment_id) REFERENCES payment (payment_id),
                    CONSTRAINT FK_class_registration_log_performer FOREIGN KEY (performed_by_user_id) REFERENCES [user] (user_id),
                    CONSTRAINT CK_class_registration_log_action CHECK (action IN (N'register', N'move_out', N're_enroll'))
                );
                CREATE INDEX IX_class_registration_log_member ON class_registration_log (member_user_id, class_id, created_at);
                INSERT INTO class_registration_log (member_user_id, class_id, payment_id, action, performed_by_user_id, performed_by_role, created_at)
                SELECT p.user_id, p.class_id, p.payment_id, N'register', p.user_id, N'MEMBER', COALESCE(i.issued_at, p.paid_at, SYSUTCDATETIME())
                FROM payment AS p
                LEFT JOIN invoice AS i ON i.invoice_id = p.invoice_id
                WHERE p.class_id IS NOT NULL;
            END
            """);
    }

    private async Task<RegistrationActor> PerformerAsync()
    {
        var user = await db.UserAccounts.AsNoTracking()
            .Include(item => item.Role)
            .FirstOrDefaultAsync(item => item.UserId == actor.UserId)
            ?? throw new RegistrationException("Tài khoản thao tác không còn tồn tại.");
        return new RegistrationActor(user.UserId, user.Role?.RoleCode ?? "");
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
