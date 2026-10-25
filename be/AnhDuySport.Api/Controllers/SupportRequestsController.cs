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
    [EndpointDescription("requestType là chữ học viên tự nhập, không còn danh sách consultation, account, financial, discount. Tối đa 80 ký tự. Ví dụ: { \"memberUserId\": \"11\", \"requestType\": \"Đổi lịch học\", \"subject\": \"Đổi buổi thứ 3\", \"content\": \"Xin chuyển sang thứ 5.\" }. Loại này hiện trên đơn lễ tân và quản lý. Không nhận giảm giá, khuyến mãi hoặc ưu đãi. Mọi đơn vào hàng chờ lễ tân.")]
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
    [EndpointDescription("Đơn học viên tạo qua POST /api/support-requests. classificationReason bắt đầu bằng 'Loại:' là loại học viên tự nhập. Không gồm tư vấn ghi danh.")]
    public async Task<ActionResult<IReadOnlyList<SupportRequestDto>>> AccessServiceRequests() =>
        Ok(await flow.AccessServiceRequestsAsync());

    [Authorize(Roles = "ADMIN")]
    [HttpGet("enrollment/manager")]
    [EndpointSummary("Quản lý trung tâm xem đơn tư vấn ghi danh lễ tân chuyển lên")]
    [EndpointDescription("Đơn tư vấn ghi danh đang chờ quản lý, và đơn quản lý đã chấp nhận hoặc từ chối. Quyết định dùng POST /api/support-requests/{id}/decision.")]
    public async Task<ActionResult<IReadOnlyList<SupportRequestDto>>> AccessManagerEnrollment() =>
        Ok(await flow.AccessManagerEnrollmentConsultationsAsync());

    [Authorize(Roles = "RECEPTIONIST")]
    [HttpPost("enrollment/{requestId}/escalate")]
    [EndpointSummary("Lễ tân chuyển đơn tư vấn ghi danh lên quản lý trung tâm")]
    [EndpointDescription("Chỉ đơn tư vấn ghi danh đang chờ lễ tân. reason là lý do chuyển. Đơn sang trạng thái pending_manager và hiện ở tab Tư vấn ghi danh của quản lý.")]
    public async Task<ActionResult<SupportRequestDto>> EscalateEnrollment(string requestId, EscalateSupportRequest request)
    {
        try
        {
            return Ok(await flow.EscalateEnrollmentConsultationAsync(requestId, request));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

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
    [HttpPost("{requestId}/handle")]
    [EndpointSummary("Lễ tân xử lý đơn của học viên")]
    [EndpointDescription("Một API cho mọi cách lễ tân xử lý đơn học viên. action: resolve lưu kết quả, escalate chuyển quản trị, classify phân loại. note là kết quả hoặc lý do chuyển. category khi resolve hoặc classify: account_issue hoặc consultation. Đơn tư vấn ghi danh dùng PUT enrollment/{id}. Đơn cũ thuộc nhóm tài chính hoặc giảm giá chỉ được chuyển lên quản trị. Loại học viên tự nhập vẫn nằm trong classificationReason.")]
    public async Task<ActionResult<SupportRequestDto>> HandleMember(string requestId, HandleMemberSupportRequest request)
    {
        try
        {
            return Ok(await flow.HandleMemberRequestAsync(requestId, request));
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
