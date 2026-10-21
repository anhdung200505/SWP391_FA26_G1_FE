using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

[ApiController]
[Route("api/support-requests")]
public class SupportRequestsController(CustomerServiceFlowService flow) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost]
    [EndpointSummary("Học viên tạo yêu cầu hỗ trợ")]
    [EndpointDescription("Mọi yêu cầu của học viên vào hàng chờ lễ tân. Lễ tân xử lý tư vấn và sự cố tài khoản. Việc ngoài phạm vi do lễ tân chuyển lên quản trị trung tâm.")]
    public async Task<ActionResult<SupportRequestCreatedDto>> Create(CreateSupportRequest request)
    {
        try
        {
            return Ok(await flow.CreateSupportRequestAsync(request));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [AllowAnonymous]
    [HttpPost("enrollment")]
    [EndpointSummary("Khách gửi tư vấn ghi danh hoặc đăng ký tư vấn")]
    [EndpointDescription("kind: tu-van-ghi-danh hoặc dang-ky-tu-van. Gắn với học viên đang đăng nhập, hoặc học viên có cùng email. Yêu cầu vào hàng chờ lễ tân.")]
    public async Task<ActionResult<SupportRequestCreatedDto>> CreateEnrollment(CreateEnrollmentConsultationRequest request)
    {
        try
        {
            return Ok(await flow.CreateEnrollmentConsultationAsync(request));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [AllowAnonymous]
    [HttpGet("members/{memberUserId}")]
    [EndpointSummary("Xem yêu cầu của một học viên")]
    [EndpointDescription("Dùng memberUserId có sẵn trong bảng user vì học viên chưa đăng nhập được.")]
    public async Task<ActionResult<IReadOnlyList<SupportRequestDto>>> AccessMemberRequests(string memberUserId)
    {
        try
        {
            return Ok(await flow.AccessMemberRequestsAsync(memberUserId));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [Authorize(Roles = "ADMIN")]
    [HttpGet("financial")]
    [EndpointSummary("Quản trị trung tâm xem yêu cầu lễ tân chuyển lên")]
    [EndpointDescription("Chỉ các yêu cầu lễ tân đã chuyển vì ngoài phạm vi, và các yêu cầu quản trị đã quyết định.")]
    public async Task<ActionResult<IReadOnlyList<SupportRequestDto>>> AccessFinancialRequests() =>
        Ok(await flow.AccessFinancialRequestsAsync());

    [Authorize(Roles = "ADMIN")]
    [HttpPost("{requestId}/decision")]
    [EndpointSummary("Quản trị trung tâm xử lý yêu cầu lễ tân chuyển lên")]
    [EndpointDescription("decision: approved hoặc rejected. Chỉ yêu cầu đang chờ quản trị. Hệ thống lưu kết quả và gửi email cho học viên.")]
    public async Task<ActionResult<SupportRequestResultDto>> Decide(string requestId, FinancialDecisionRequest request)
    {
        try
        {
            return Ok(await flow.DecideFinancialRequestAsync(requestId, request));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [Authorize(Roles = "RECEPTIONIST")]
    [HttpGet("service")]
    [EndpointSummary("Lễ tân xem yêu cầu học viên gửi")]
    public async Task<ActionResult<IReadOnlyList<SupportRequestDto>>> AccessServiceRequests() =>
        Ok(await flow.AccessServiceRequestsAsync());

    [Authorize(Roles = "RECEPTIONIST")]
    [HttpPost("{requestId}/classify")]
    [EndpointSummary("Lễ tân phân loại yêu cầu")]
    [EndpointDescription("category: account_issue hoặc consultation, chỉ với yêu cầu trong phạm vi lễ tân. Việc ngoài phạm vi dùng escalate.")]
    public async Task<ActionResult<SupportRequestDto>> Classify(string requestId, ClassifySupportRequest request)
    {
        try
        {
            return Ok(await flow.ClassifyServiceRequestAsync(requestId, request));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [Authorize(Roles = "RECEPTIONIST")]
    [HttpPost("{requestId}/escalate")]
    [EndpointSummary("Lễ tân chuyển yêu cầu ngoài phạm vi lên quản trị")]
    [EndpointDescription("reason: lý do yêu cầu vượt phạm vi lễ tân. Sau đó quản trị xem tại GET financial và quyết định.")]
    public async Task<ActionResult<SupportRequestDto>> Escalate(string requestId, EscalateSupportRequest request)
    {
        try
        {
            return Ok(await flow.EscalateToManagerAsync(requestId, request));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [Authorize(Roles = "RECEPTIONIST")]
    [HttpPost("{requestId}/resolve-account")]
    [EndpointSummary("Lễ tân xử lý sự cố tài khoản")]
    [EndpointDescription("Hệ thống lưu kết quả và gửi email thông báo cho học viên.")]
    public async Task<ActionResult<SupportRequestResultDto>> ResolveAccount(string requestId, SupportResultRequest request)
    {
        try
        {
            return Ok(await flow.ResolveAccountIssueAsync(requestId, request));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [Authorize(Roles = "RECEPTIONIST")]
    [HttpPost("{requestId}/provide-consultation")]
    [EndpointSummary("Lễ tân tư vấn")]
    [EndpointDescription("Hệ thống lưu kết quả và gửi email thông báo cho học viên.")]
    public async Task<ActionResult<SupportRequestResultDto>> ProvideConsultation(string requestId, SupportResultRequest request)
    {
        try
        {
            return Ok(await flow.ProvideConsultationAsync(requestId, request));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    private bool MapFlowError(Exception exception, out ActionResult? result)
    {
        result = exception switch
        {
            KeyNotFoundException keyNotFound => NotFound(new { message = keyNotFound.Message }),
            InvalidOperationException invalid => BadRequest(new { message = invalid.Message }),
            UnauthorizedAccessException unauthorized => Unauthorized(new { message = unauthorized.Message }),
            _ => null,
        };
        return result is not null;
    }
}
