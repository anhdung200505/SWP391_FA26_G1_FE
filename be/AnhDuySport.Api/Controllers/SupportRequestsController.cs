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
    [EndpointSummary("Khách gửi tư vấn ghi danh")]
    [EndpointDescription("Không cần tài khoản học viên. title là tiêu đề đơn, ví dụ Tư vấn ghi danh hoặc Đăng ký tư vấn. Nếu người gửi đang đăng nhập bằng tài khoản học viên, hoặc email trùng học viên, đơn vẫn được gắn với học viên đó.")]
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

    [Authorize(Roles = "MEMBER")]
    [HttpGet("mine")]
    [EndpointSummary("Học viên xem đơn của mình và kết quả xử lý")]
    public async Task<ActionResult<IReadOnlyList<SupportRequestDto>>> Mine()
    {
        try
        {
            return Ok(await flow.AccessMyRequestsAsync());
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [Authorize(Roles = "ADMIN")]
    [HttpGet("all")]
    [EndpointSummary("Quản trị xem toàn bộ đơn hỗ trợ")]
    [EndpointDescription("Gồm tư vấn ghi danh và đơn của học viên, kể cả đơn đã xử lý. assigneeName là người đang xử lý hoặc người đã xử lý xong.")]
    public async Task<ActionResult<IReadOnlyList<SupportRequestDto>>> AccessAll() =>
        Ok(await flow.AccessAllRequestsAsync());

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
    [EndpointSummary("Lễ tân xem đơn support request của học viên")]
    [EndpointDescription("Đơn học viên tạo qua POST /api/support-requests. Không gồm tư vấn ghi danh.")]
    public async Task<ActionResult<IReadOnlyList<SupportRequestDto>>> AccessServiceRequests() =>
        Ok(await flow.AccessServiceRequestsAsync());

    [Authorize(Roles = "RECEPTIONIST")]
    [HttpGet("enrollment")]
    [EndpointSummary("Lễ tân xem đơn tư vấn ghi danh")]
    [EndpointDescription("Đơn khách gửi từ form tư vấn ghi danh và đăng ký tư vấn.")]
    public async Task<ActionResult<IReadOnlyList<SupportRequestDto>>> AccessEnrollmentRequests() =>
        Ok(await flow.AccessEnrollmentRequestsAsync());

    [Authorize(Roles = "RECEPTIONIST")]
    [HttpPut("enrollment/{requestId}")]
    [EndpointSummary("Lễ tân chỉnh sửa hoặc giải quyết đơn tư vấn khách")]
    [EndpointDescription("Chỉ đơn tư vấn khách. Không áp dụng cho support request của học viên. Gửi resolutionNote để giải quyết đơn. Bỏ trống trường nào thì giữ nguyên.")]
    public async Task<ActionResult<SupportRequestDto>> UpdateEnrollment(string requestId, UpdateEnrollmentConsultationRequest request)
    {
        try
        {
            return Ok(await flow.UpdateEnrollmentConsultationAsync(requestId, request));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [Authorize(Roles = "RECEPTIONIST")]
    [HttpPost("{requestId}/classify")]
    [EndpointSummary("Lễ tân phân loại yêu cầu")]
    [EndpointDescription("category: account_issue hoặc consultation. Chỉ đơn support request của học viên. Đơn tư vấn khách dùng PUT enrollment/{id}.")]
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
    [HttpPost("{requestId}/resolve")]
    [EndpointSummary("Lễ tân lưu kết quả xử lý đơn của học viên")]
    [EndpointDescription("Lưu resolution note và chuyển trạng thái resolved. Học viên xem lại tại GET /api/support-requests/mine.")]
    public async Task<ActionResult<SupportRequestResultDto>> ResolveMember(string requestId, SupportResultRequest request)
    {
        try
        {
            return Ok(await flow.ResolveMemberRequestAsync(requestId, request));
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
