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
            Status = category == "financial_discount" ? "pending_manager" : "pending_receptionist",
            CreatedAt = now,
        };
        var log = new ActivityLog
        {
            ActorUserId = member.UserId,
            Action = "Tạo yêu cầu hỗ trợ",
            EntityName = "support_request",
            Detail = $"{TypeLabel(requestType)} → {RouteLabel(category)}",
            CreatedAt = now,
        };
        db.SupportRequests.Add(item);
        db.ActivityLogs.Add(log);
        await db.SaveChangesAsync();
        log.EntityId = item.SupportRequestId;
        await db.SaveChangesAsync();

        return new SupportRequestCreatedDto(ClassificationMessage(category), await ToDtoAsync(item.SupportRequestId));
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

    public Task<IReadOnlyList<SupportRequestDto>> AccessFinancialRequestsAsync() =>
        AccessByCategoryAsync("financial_discount");

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
            "financial_discount",
            expectedStatus: "pending_manager",
            expectedReceptionistCategory: null,
            decision: decision,
            receptionistCategory: null,
            result: $"Quản trị trung tâm {verb} yêu cầu. {note}",
            action: "Quyết định yêu cầu tài chính");
    }

    public Task<IReadOnlyList<SupportRequestDto>> AccessServiceRequestsAsync() =>
        AccessByCategoryAsync("consultation_account");

    public async Task<SupportRequestDto> ClassifyServiceRequestAsync(string requestId, ClassifySupportRequest request)
    {
        var category = request.Category?.Trim().ToLowerInvariant() ?? "";
        if (category is not ("account_issue" or "consultation"))
        {
            throw new InvalidOperationException("Phân loại phải là account_issue hoặc consultation.");
        }

        var item = await FindRequestAsync(requestId);
        if (item.SystemCategory != "consultation_account")
        {
            throw new InvalidOperationException("Yêu cầu này không thuộc hàng chờ lễ tân.");
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
            "consultation_account",
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
            "consultation_account",
            expectedStatus: "classified",
            expectedReceptionistCategory: "consultation",
            decision: null,
            receptionistCategory: "consultation",
            result: $"Lễ tân đã tư vấn. {note}",
            action: "Tư vấn học viên");
    }

    private async Task<IReadOnlyList<SupportRequestDto>> AccessByCategoryAsync(string category)
    {
        var ids = await db.SupportRequests
            .AsNoTracking()
            .Where(item => item.SystemCategory == category)
            .OrderBy(item => item.Status == "resolved")
            .ThenByDescending(item => item.CreatedAt)
            .Select(item => item.SupportRequestId)
            .ToListAsync();
        return await LoadDtosAsync(ids);
    }

    private async Task<SupportRequestResultDto> SaveResultAsync(
        string requestId,
        string expectedCategory,
        string expectedStatus,
        string? expectedReceptionistCategory,
        string? decision,
        string? receptionistCategory,
        string result,
        string action)
    {
        var item = await FindRequestAsync(requestId);
        if (item.SystemCategory != expectedCategory)
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
        var (subject, body) = emailNotifications.BuildSupportResultEmail(member, item.Title, result);
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
            Title = subject,
            Content = body,
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
            new EmailDto(member.Email ?? "", subject, body));
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
                MemberName = item.Member!.FullName,
                MemberEmail = item.Member.Email,
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
                row.MemberUserId.ToString(),
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

    private static string ClassificationMessage(string category) =>
        category == "financial_discount"
            ? "Hệ thống phân loại Tài chính / Giảm giá và chuyển quản trị trung tâm."
            : "Hệ thống phân loại Tư vấn / Tài khoản và chuyển lễ tân.";

    private static string TypeLabel(string requestType) => requestType switch
    {
        "financial" => "Tài chính",
        "discount" => "Giảm giá",
        "consultation" => "Tư vấn",
        "account" => "Tài khoản",
        _ => requestType,
    };

    private static string RouteLabel(string category) =>
        category == "financial_discount" ? "Quản trị trung tâm" : "Lễ tân";

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
