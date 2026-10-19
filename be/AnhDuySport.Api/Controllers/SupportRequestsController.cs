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
    [EndpointDescription("Chưa có trang học viên. Truyền memberUserId của học viên trong bảng user. Hệ thống nhận và phân loại: financial/discount sang quản trị trung tâm, consultation/account sang lễ tân.")]
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
    [EndpointSummary("Quản trị trung tâm xem yêu cầu tài chính")]
    public async Task<ActionResult<IReadOnlyList<SupportRequestDto>>> AccessFinancialRequests() =>
        Ok(await flow.AccessFinancialRequestsAsync());

    [Authorize(Roles = "ADMIN")]
    [HttpPost("{requestId}/decision")]
    [EndpointSummary("Quản trị trung tâm ra quyết định")]
    [EndpointDescription("decision: approved hoặc rejected. Hệ thống lưu kết quả và gửi email thông báo cho học viên.")]
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
    [EndpointSummary("Lễ tân xem yêu cầu tư vấn và tài khoản")]
    public async Task<ActionResult<IReadOnlyList<SupportRequestDto>>> AccessServiceRequests() =>
        Ok(await flow.AccessServiceRequestsAsync());

    [Authorize(Roles = "RECEPTIONIST")]
    [HttpPost("{requestId}/classify")]
    [EndpointSummary("Lễ tân phân loại yêu cầu")]
    [EndpointDescription("category: account_issue hoặc consultation. Sau đó gọi resolve-account hoặc provide-consultation.")]
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
