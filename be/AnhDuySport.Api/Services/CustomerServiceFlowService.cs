using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

public class CustomerServiceFlowService(
    AppDbContext db,
    EmailNotificationService emailNotifications,
    CurrentActor actor)
{
    public async Task<SupportRequestCreatedDto> CreateSupportRequestAsync(CreateSupportRequest request)
    {
        var member = await FindActiveMemberAsync(request.MemberUserId);
        var requestType = NormalizeType(request.RequestType);
        var title = RequireText(request.Subject, "Nhập tiêu đề yêu cầu.", 200);
        var description = RequireText(request.Content, "Nhập nội dung yêu cầu.", 4000);
        var category = Classify(requestType);
        var now = DateTime.Now;
        var item = new SupportRequest
        {
            MemberUserId = member.UserId,
            Title = title,
            Description = description,
            SystemCategory = category,
            ClassificationReason = $"Học viên chọn loại {TypeLabel(requestType)}.",
            Status = "pending_receptionist",
            CreatedAt = now,
        };
        var log = new ActivityLog
        {
            ActorUserId = member.UserId,
            Action = "Tạo yêu cầu hỗ trợ",
            EntityName = "support_request",
            Detail = $"{TypeLabel(requestType)} → lễ tân",
            CreatedAt = now,
        };
        db.SupportRequests.Add(item);
        db.ActivityLogs.Add(log);
        await db.SaveChangesAsync();
        log.EntityId = item.SupportRequestId;
        await db.SaveChangesAsync();

        return new SupportRequestCreatedDto(
            "Yêu cầu đã chuyển tới lễ tân.",
            await ToDtoAsync(item.SupportRequestId));
    }

    public async Task<SupportRequestCreatedDto> CreateEnrollmentConsultationAsync(CreateEnrollmentConsultationRequest request)
    {
        var title = RequireText(request.Title, "Nhập tiêu đề tư vấn ghi danh.", 200);
        var fullName = RequireText(request.FullName, "Nhập họ và tên.", 200);
        var phone = AccountPhone.Require(request.Phone);
        var email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();
        if (email is { Length: > 200 } || (email is not null && !email.Contains('@')))
        {
            throw new InvalidOperationException("Email không hợp lệ.");
        }

        if (request.Age is < 1 or > 99)
        {
            throw new InvalidOperationException("Độ tuổi học viên từ 1 đến 99.");
        }

        var sports = string.IsNullOrWhiteSpace(request.Sports) ? null : request.Sports.Trim();
        if (sports is { Length: > 500 })
        {
            throw new InvalidOperationException("Danh sách môn học quá dài.");
        }

        var note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        if (note is { Length: > 200 })
        {
            throw new InvalidOperationException("Ghi chú quá dài.");
        }

        var member = await TryFindConsultationMemberAsync(email);
        var description = BuildEnrollmentDescription(fullName, phone, email ?? member?.Email ?? "Chưa nhập", sports, request.Age, note);
        var now = DateTime.Now;
        var item = new SupportRequest
        {
            MemberUserId = member?.UserId,
            Title = title,
            Description = description,
            SystemCategory = "consultation_account",
            ClassificationReason = EnrollmentSource,
            Status = "pending_receptionist",
            CreatedAt = now,
        };
        db.SupportRequests.Add(item);
        var log = new ActivityLog
        {
            ActorUserId = member?.UserId,
            Action = "Tạo yêu cầu hỗ trợ",
            EntityName = "support_request",
            Detail = $"{title} → lễ tân",
            CreatedAt = now,
        };
        db.ActivityLogs.Add(log);
        await db.SaveChangesAsync();
        log.EntityId = item.SupportRequestId;
        await db.SaveChangesAsync();
        return new SupportRequestCreatedDto("Yêu cầu tư vấn đã chuyển tới lễ tân.", await ToDtoAsync(item.SupportRequestId));
    }

    public async Task<SupportRequestDto> UpdateEnrollmentConsultationAsync(string requestId, UpdateEnrollmentConsultationRequest request)
    {
        var item = await FindRequestAsync(requestId);
        EnsureEnrollment(item);
        if (item.Status is not ("pending_receptionist" or "classified"))
        {
            throw new InvalidOperationException("Chỉ chỉnh sửa được đơn tư vấn khách đang ở hàng chờ lễ tân.");
        }

        var hasEdit = request.Title is not null
            || request.FullName is not null
            || request.Phone is not null
            || request.Email is not null
            || request.Sports is not null
            || request.Age is not null
            || request.Note is not null;
        var resolving = !string.IsNullOrWhiteSpace(request.ResolutionNote);
        if (!hasEdit && !resolving)
        {
            throw new InvalidOperationException("Nhập nội dung cần chỉnh hoặc kết quả xử lý.");
        }

        var current = ReadEnrollment(item.Description);
        var title = request.Title is null ? item.Title : RequireText(request.Title, "Nhập tiêu đề tư vấn ghi danh.", 200);
        var fullName = request.FullName is null ? current.FullName : RequireText(request.FullName, "Nhập họ và tên.", 200);
        var phone = request.Phone is null ? current.Phone : AccountPhone.Require(request.Phone);
        var email = request.Email is null ? current.Email : NormalizeOptionalEmail(request.Email);
        var sports = request.Sports is null ? current.Sports : NormalizeSports(request.Sports);
        var age = request.Age ?? current.Age;
        if (age is < 1 or > 99)
        {
            throw new InvalidOperationException("Độ tuổi học viên từ 1 đến 99.");
        }

        var note = request.Note is null ? current.Note : NormalizeNote(request.Note);
        var handlerId = RequireActor();
        var now = DateTime.Now;
        item.Title = title;
        item.Description = BuildEnrollmentDescription(fullName, phone, email, sports, age, note);
        item.AssignedToUserId = handlerId;
        string action = "Chỉnh sửa đơn tư vấn khách";
        string detail = title;
        if (resolving)
        {
            var resolution = RequireText(request.ResolutionNote, "Nhập kết quả xử lý tư vấn khách.", 2000);
            var result = $"Lễ tân đã xử lý tư vấn khách hàng. {resolution}";
            if (item.Member is not null)
            {
                var emailNotice = await emailNotifications.SendSupportResultEmailAsync(item.Member, title, result);
                db.Notifications.Add(new AccountNotification
                {
                    UserId = item.Member.UserId,
                    Title = emailNotice.Subject,
                    Content = emailNotice.Body,
                    IsRead = false,
                    CreatedAt = now,
                });
            }
            else if (email.Contains('@'))
            {
                await emailNotifications.SendGuestResultEmailAsync(email, fullName, title, result);
            }
            item.Status = "resolved";
            item.ReceptionistCategory = "consultation";
            item.ResolutionNote = result;
            item.ResolvedAt = now;
            action = "Giải quyết đơn tư vấn khách";
            detail = result;
        }

        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = handlerId,
            Action = action,
            EntityName = "support_request",
            EntityId = item.SupportRequestId,
            Detail = detail,
            CreatedAt = now,
        });
        await db.SaveChangesAsync();
        return await ToDtoAsync(item.SupportRequestId);
    }

    private async Task<UserAccount?> TryFindConsultationMemberAsync(string? email)
    {
        if (actor.UserId != 0)
        {
            var current = await db.UserAccounts.Include(user => user.Role)
                .FirstOrDefaultAsync(user => user.UserId == actor.UserId);
            if (current?.Role?.RoleCode == "MEMBER" && current.Status == "active")
            {
                return current;
            }
        }

        if (!string.IsNullOrWhiteSpace(email))
        {
            var normalized = email.ToLowerInvariant();
            var byEmail = await db.UserAccounts.Include(user => user.Role)
                .FirstOrDefaultAsync(user => user.Email != null && user.Email.ToLower() == normalized);
            if (byEmail?.Role?.RoleCode == "MEMBER" && byEmail.Status == "active")
            {
                return byEmail;
            }
        }

        return null;
    }

    public async Task<IReadOnlyList<SupportRequestDto>> AccessMemberRequestsAsync(string memberUserId)
    {
        var member = await FindActiveMemberAsync(memberUserId);
        var ids = await db.SupportRequests
            .AsNoTracking()
            .Where(item => item.MemberUserId == member.UserId)
            .OrderByDescending(item => item.CreatedAt)
            .Select(item => item.SupportRequestId)
            .ToListAsync();
        return await LoadDtosAsync(ids);
    }

    public async Task<IReadOnlyList<SupportRequestDto>> AccessFinancialRequestsAsync()
    {
        var ids = await db.SupportRequests
            .AsNoTracking()
            .Where(item => item.Status == "pending_manager" || (item.Status == "resolved" && item.Decision != null))
            .OrderBy(item => item.Status == "resolved")
            .ThenByDescending(item => item.CreatedAt)
            .Select(item => item.SupportRequestId)
            .ToListAsync();
        return await LoadDtosAsync(ids);
    }

    public async Task<SupportRequestResultDto> DecideFinancialRequestAsync(string requestId, FinancialDecisionRequest request)
    {
        var decision = request.Decision?.Trim().ToLowerInvariant() ?? "";
        if (decision is not ("approved" or "rejected"))
        {
            throw new InvalidOperationException("Quyết định phải là approved hoặc rejected.");
        }

        var note = RequireText(request.Note, "Nhập nội dung quyết định.", 2000);
        var verb = decision == "approved" ? "chấp nhận" : "từ chối";
        return await SaveResultAsync(
            requestId,
            expectedCategory: null,
            expectedStatus: "pending_manager",
            expectedReceptionistCategory: null,
            decision: decision,
            receptionistCategory: null,
            result: $"Quản trị trung tâm {verb} yêu cầu. {note}",
            action: "Quyết định yêu cầu ngoài phạm vi lễ tân");
    }

    public Task<IReadOnlyList<SupportRequestDto>> AccessServiceRequestsAsync() =>
        LoadReceptionistQueueAsync(enrollment: false);

    public Task<IReadOnlyList<SupportRequestDto>> AccessEnrollmentRequestsAsync() =>
        LoadReceptionistQueueAsync(enrollment: true);

    public async Task<SupportRequestDto> EscalateToManagerAsync(string requestId, EscalateSupportRequest request)
    {
        var reason = RequireText(request.Reason, "Nhập lý do chuyển lên quản trị trung tâm.", 500);
        var item = await FindRequestAsync(requestId);
        EnsureMemberRequest(item);
        if (item.Status is not ("pending_receptionist" or "classified"))
        {
            throw new InvalidOperationException("Chỉ chuyển được yêu cầu đang ở hàng chờ lễ tân.");
        }

        var handlerId = RequireActor();
        item.Status = "pending_manager";
        item.AssignedToUserId = handlerId;
        item.ClassificationReason = $"Lễ tân chuyển lên vì ngoài phạm vi: {reason}";
        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = handlerId,
            Action = "Chuyển yêu cầu lên quản trị trung tâm",
            EntityName = "support_request",
            EntityId = item.SupportRequestId,
            Detail = reason,
            CreatedAt = DateTime.Now,
        });
        await db.SaveChangesAsync();
        return await ToDtoAsync(item.SupportRequestId);
    }

    public async Task<SupportRequestDto> ClassifyServiceRequestAsync(string requestId, ClassifySupportRequest request)
    {
        var category = request.Category?.Trim().ToLowerInvariant() ?? "";
        if (category is not ("account_issue" or "consultation"))
        {
            throw new InvalidOperationException("Phân loại phải là account_issue hoặc consultation.");
        }

        var item = await FindRequestAsync(requestId);
        EnsureMemberRequest(item);
        if (item.SystemCategory != "consultation_account")
        {
            throw new InvalidOperationException("Yêu cầu này ngoài phạm vi lễ tân. Hãy chuyển lên quản trị trung tâm.");
        }

        if (item.Status is not ("pending_receptionist" or "classified"))
        {
            throw new InvalidOperationException("Yêu cầu đã được xử lý.");
        }

        item.ReceptionistCategory = category;
        item.Status = "classified";
        item.AssignedToUserId = RequireActor();
        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = item.AssignedToUserId,
            Action = "Phân loại yêu cầu hỗ trợ",
            EntityName = "support_request",
            EntityId = item.SupportRequestId,
            Detail = category == "account_issue" ? "Sự cố tài khoản" : "Tư vấn",
            CreatedAt = DateTime.Now,
        });
        await db.SaveChangesAsync();
        return await ToDtoAsync(item.SupportRequestId);
    }

    public Task<SupportRequestResultDto> ResolveAccountIssueAsync(string requestId, SupportResultRequest request)
    {
        var note = RequireText(request.Note, "Nhập cách xử lý sự cố tài khoản.", 2000);
        return SaveResultAsync(
            requestId,
            expectedCategory: "consultation_account",
            expectedStatus: "classified",
            expectedReceptionistCategory: "account_issue",
            decision: null,
            receptionistCategory: "account_issue",
            result: $"Lễ tân đã xử lý sự cố tài khoản. {note}",
            action: "Xử lý sự cố tài khoản");
    }

    public Task<SupportRequestResultDto> ProvideConsultationAsync(string requestId, SupportResultRequest request)
    {
        var note = RequireText(request.Note, "Nhập nội dung tư vấn.", 2000);
        return SaveResultAsync(
            requestId,
            expectedCategory: "consultation_account",
            expectedStatus: "classified",
            expectedReceptionistCategory: "consultation",
            decision: null,
            receptionistCategory: "consultation",
            result: $"Lễ tân đã tư vấn. {note}",
            action: "Tư vấn học viên");
    }

    private const string EnrollmentSource = "Khách gửi form tư vấn ghi danh.";

    private static void EnsureEnrollment(SupportRequest item)
    {
        if (item.ClassificationReason is null || !item.ClassificationReason.StartsWith(EnrollmentSource))
        {
            throw new InvalidOperationException("Đây là đơn của học viên. Hãy xử lý bằng luồng support request của học viên.");
        }
    }

    private static void EnsureMemberRequest(SupportRequest item)
    {
        if (item.ClassificationReason is not null && item.ClassificationReason.StartsWith(EnrollmentSource))
        {
            throw new InvalidOperationException("Đây là đơn tư vấn khách hàng. Hãy chỉnh và giải quyết bằng PUT /api/support-requests/enrollment/{id}.");
        }
    }

    private static string BuildEnrollmentDescription(string fullName, string phone, string email, string? sports, int? age, string? note)
    {
        return string.Join(
            Environment.NewLine,
            new[]
            {
                $"Họ tên: {fullName}",
                $"Số điện thoại: {phone}",
                $"Email: {email}",
                $"Môn: {sports ?? "Chưa chọn"}",
                $"Độ tuổi: {(age is int value ? value.ToString() : "Chưa nhập")}",
                note is null ? null : $"Gói quan tâm: {note}",
            }.Where(line => line is not null));
    }

    private static (string FullName, string Phone, string Email, string? Sports, int? Age, string? Note) ReadEnrollment(string description)
    {
        var lines = description.Replace("\r", "").Split('\n');
        string? Read(string prefix) => lines
            .FirstOrDefault(line => line.StartsWith(prefix, StringComparison.Ordinal))
            ?[prefix.Length..]
            .Trim();

        var fullName = Read("Họ tên:");
        var phone = Read("Số điện thoại:");
        var email = Read("Email:");
        if (string.IsNullOrWhiteSpace(fullName) || string.IsNullOrWhiteSpace(phone) || string.IsNullOrWhiteSpace(email))
        {
            throw new InvalidOperationException("Không đọc được nội dung đơn tư vấn khách.");
        }

        var sports = Read("Môn:");
        if (sports is null or "" or "Chưa chọn")
        {
            sports = null;
        }

        var ageText = Read("Độ tuổi:");
        int? age = int.TryParse(ageText, out var parsed) ? parsed : null;
        return (fullName, phone, email, sports, age, Read("Gói quan tâm:"));
    }

    private static string NormalizeOptionalEmail(string? email)
    {
        var text = email?.Trim() ?? "";
        if (text.Length is 0 or > 200 || !text.Contains('@'))
        {
            throw new InvalidOperationException("Email không hợp lệ.");
        }

        return text;
    }

    private static string? NormalizeSports(string? sports)
    {
        var text = sports?.Trim() ?? "";
        if (text.Length == 0)
        {
            return null;
        }

        if (text.Length > 500)
        {
            throw new InvalidOperationException("Danh sách môn học quá dài.");
        }

        return text;
    }

    private static string? NormalizeNote(string? note)
    {
        var text = note?.Trim() ?? "";
        if (text.Length == 0)
        {
            return null;
        }

        if (text.Length > 200)
        {
            throw new InvalidOperationException("Ghi chú quá dài.");
        }

        return text;
    }

    private async Task<IReadOnlyList<SupportRequestDto>> LoadReceptionistQueueAsync(bool enrollment)
    {
        var ids = await db.SupportRequests
            .AsNoTracking()
            .Where(item => item.Status == "pending_receptionist" || item.Status == "classified")
            .Where(item => enrollment
                ? item.ClassificationReason != null && item.ClassificationReason.StartsWith(EnrollmentSource)
                : item.ClassificationReason == null || !item.ClassificationReason.StartsWith(EnrollmentSource))
            .OrderBy(item => item.Status == "classified")
            .ThenByDescending(item => item.CreatedAt)
            .Select(item => item.SupportRequestId)
            .ToListAsync();
        return await LoadDtosAsync(ids);
    }

    private async Task<SupportRequestResultDto> SaveResultAsync(
        string requestId,
        string? expectedCategory,
        string expectedStatus,
        string? expectedReceptionistCategory,
        string? decision,
        string? receptionistCategory,
        string result,
        string action)
    {
        var item = await FindRequestAsync(requestId);
        EnsureMemberRequest(item);
        if (expectedCategory is not null && item.SystemCategory != expectedCategory)
        {
            throw new InvalidOperationException("Yêu cầu không thuộc hàng chờ này.");
        }

        if (item.Status != expectedStatus)
        {
            throw new InvalidOperationException(
                expectedStatus == "classified"
                    ? "Hãy phân loại yêu cầu trước khi xử lý."
                    : "Yêu cầu không còn chờ quyết định.");
        }

        if (expectedReceptionistCategory is not null && item.ReceptionistCategory != expectedReceptionistCategory)
        {
            throw new InvalidOperationException(
                expectedReceptionistCategory == "account_issue"
                    ? "Yêu cầu này không phải sự cố tài khoản."
                    : "Yêu cầu này không phải tư vấn.");
        }

        var handlerId = RequireActor();
        var member = item.Member ?? throw new KeyNotFoundException("Không tìm thấy học viên.");
        var email = await emailNotifications.SendSupportResultEmailAsync(member, item.Title, result);
        var now = DateTime.Now;
        item.Status = "resolved";
        item.AssignedToUserId = handlerId;
        item.Decision = decision;
        item.ReceptionistCategory = receptionistCategory ?? item.ReceptionistCategory;
        item.ResolutionNote = result;
        item.ResolvedAt = now;
        db.Notifications.Add(new AccountNotification
        {
            UserId = member.UserId,
            Title = email.Subject,
            Content = email.Body,
            IsRead = false,
            CreatedAt = now,
        });
        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = handlerId,
            Action = action,
            EntityName = "support_request",
            EntityId = item.SupportRequestId,
            Detail = result,
            CreatedAt = now,
        });
        await db.SaveChangesAsync();

        return new SupportRequestResultDto(
            await ToDtoAsync(item.SupportRequestId),
            email);
    }

    private int RequireActor()
    {
        if (actor.UserId == 0)
        {
            throw new UnauthorizedAccessException("Phiên đăng nhập không hợp lệ.");
        }

        return actor.UserId;
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

    private async Task<SupportRequest> FindRequestAsync(string requestId)
    {
        if (!int.TryParse(requestId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy yêu cầu hỗ trợ.");
        }

        return await db.SupportRequests
            .Include(item => item.Member)
            .FirstOrDefaultAsync(item => item.SupportRequestId == id)
            ?? throw new KeyNotFoundException("Không tìm thấy yêu cầu hỗ trợ.");
    }

    private async Task<SupportRequestDto> ToDtoAsync(int id)
    {
        var items = await LoadDtosAsync([id]);
        return items[0];
    }

    private async Task<IReadOnlyList<SupportRequestDto>> LoadDtosAsync(IReadOnlyList<int> ids)
    {
        if (ids.Count == 0)
        {
            return [];
        }

        var rows = await db.SupportRequests
            .AsNoTracking()
            .Where(item => ids.Contains(item.SupportRequestId))
            .Select(item => new
            {
                item.SupportRequestId,
                item.MemberUserId,
                MemberName = item.Member != null ? item.Member.FullName : "",
                MemberEmail = item.Member != null ? item.Member.Email : "",
                item.Title,
                item.Description,
                item.SystemCategory,
                item.ClassificationReason,
                item.ReceptionistCategory,
                item.Status,
                item.AssignedToUserId,
                AssigneeName = item.Assignee != null ? item.Assignee.FullName : null,
                item.Decision,
                item.ResolutionNote,
                item.CreatedAt,
                item.ResolvedAt,
            })
            .ToListAsync();

        var order = ids.Select((id, index) => (id, index)).ToDictionary(pair => pair.id, pair => pair.index);
        return rows
            .OrderBy(row => order[row.SupportRequestId])
            .Select(row => new SupportRequestDto(
                row.SupportRequestId.ToString(),
                row.MemberUserId?.ToString() ?? "",
                row.MemberName,
                row.MemberEmail ?? "",
                row.Title,
                row.Description,
                row.SystemCategory,
                row.ClassificationReason,
                row.ReceptionistCategory,
                row.Status,
                row.AssignedToUserId?.ToString(),
                row.AssigneeName,
                row.Decision,
                row.ResolutionNote,
                row.CreatedAt,
                row.ResolvedAt))
            .ToList();
    }

    private static string NormalizeType(string? requestType)
    {
        var value = requestType?.Trim().ToLowerInvariant() ?? "";
        if (value is not ("financial" or "discount" or "consultation" or "account"))
        {
            throw new InvalidOperationException("Loại yêu cầu không hợp lệ. Chọn financial, discount, consultation hoặc account.");
        }

        return value;
    }

    private static string Classify(string requestType) =>
        requestType is "financial" or "discount" ? "financial_discount" : "consultation_account";

    private static string TypeLabel(string requestType) => requestType switch
    {
        "financial" => "Tài chính",
        "discount" => "Giảm giá",
        "consultation" => "Tư vấn",
        "account" => "Tài khoản",
        _ => requestType,
    };

    private static string RequireText(string? value, string message, int max)
    {
        var text = value?.Trim() ?? "";
        if (text.Length == 0)
        {
            throw new InvalidOperationException(message);
        }

        return text.Length <= max ? text : text[..max];
    }
}
