using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

[Authorize(Roles = "MEMBER")]
[ApiController]
[FlowErrors]
[Route("api/private-classes")]
public class PrivateClassesController(PrivateClassFlowService privateClasses, CurrentActor actor) : ControllerBase
{
    [HttpGet("courses")]
    [EndpointSummary("Học viên xem các gói học 1-1")]
    [EndpointDescription("Chỉ khóa học format private đang active: số buổi, phút mỗi buổi, giá. Lọc tùy chọn theo sportId.")]
    public async Task<ActionResult<IReadOnlyList<PrivateCourseDto>>> AccessCourses([FromQuery] string? sportId) =>
        Ok(await privateClasses.AccessCoursesAsync(sportId));

    [HttpPost("availability")]
    [EndpointSummary("Xem HLV rảnh cho lịch học 1-1 đã chọn")]
    [EndpointDescription("Gửi gói, ngày bắt đầu (sau hôm nay) và lịch hằng tuần (thứ 2-7, khung giờ private). Trả số buổi, ngày đầu/cuối, còn phòng 1-1 trống cho cả gói không, và các HLV dạy môn kèm isBusy/busyReason (trùng buổi nào). Lịch của chính học viên trùng thì trả 400.")]
    public async Task<ActionResult<PrivateAvailabilityDto>> CheckAvailability([FromBody] PrivateAvailabilityRequest request) =>
        Ok(await privateClasses.CheckAvailabilityAsync(actor.UserId, request));

    [HttpPost("requests")]
    [EndpointSummary("Gửi yêu cầu học 1-1")]
    [EndpointDescription("Chưa giữ lịch: quản lý duyệt mới sinh lớp. HLV phải rảnh mọi buổi và còn phòng 1-1 trống. Tối đa 3 yêu cầu chờ duyệt mỗi học viên.")]
    public async Task<ActionResult<PrivateRequestDto>> CreateRequest([FromBody] CreatePrivateRequest request)
    {
        var created = await privateClasses.CreateRequestAsync(actor.UserId, request);
        return Created($"/api/private-classes/requests/{created.Id}", created);
    }

    [HttpGet("requests/mine")]
    [EndpointSummary("Học viên xem yêu cầu học 1-1 của mình")]
    [EndpointDescription("Mới nhất trước. status: pending, approved (chờ thanh toán đến approvalExpiresAt), paid, rejected (kèm rejectReason), cancelled, expired.")]
    public async Task<ActionResult<IReadOnlyList<PrivateRequestDto>>> AccessMine() =>
        Ok(await privateClasses.AccessMineAsync(actor.UserId));

    [HttpPost("requests/{requestId}/cancel")]
    [EndpointSummary("Học viên hủy yêu cầu học 1-1")]
    [EndpointDescription("Hủy được khi pending hoặc đã duyệt nhưng chưa thanh toán (lớp và buổi bị hủy). Đã thanh toán trả 400.")]
    public async Task<ActionResult<PrivateRequestDto>> Cancel(string requestId) =>
        Ok(await privateClasses.CancelAsync(actor.UserId, requestId));

    [HttpPost("requests/{requestId}/pay")]
    [EndpointSummary("Thanh toán yêu cầu học 1-1 đã được duyệt")]
    [EndpointDescription("Tạo (hoặc trả lại) đơn thanh toán của lớp 1-1 qua luồng đăng ký lớp: mã QR giữ 3 phút, thanh toán xong được ghi danh và tặng hạng hội viên thấp nhất. Chỉ yêu cầu approved còn trong hạn 24 giờ.")]
    public async Task<ActionResult<ClassRegistrationDto>> Pay(string requestId) =>
        Ok(await privateClasses.PayAsync(actor.UserId, requestId));
}

[Authorize(Roles = "ADMIN")]
[ApiController]
[FlowErrors]
[Route("api/management/private-requests")]
public class PrivateRequestManagementController(PrivateClassFlowService privateClasses) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("Quản lý xem yêu cầu học 1-1")]
    [EndpointDescription("Lọc tùy chọn theo status (pending, approved, paid, rejected, cancelled, expired). pending xếp cũ nhất trước, còn lại mới nhất trước.")]
    public async Task<ActionResult<IReadOnlyList<PrivateRequestDto>>> AccessAll([FromQuery] string? status) =>
        Ok(await privateClasses.AccessAllAsync(status));

    [HttpGet("{requestId}")]
    [EndpointSummary("Quản lý xem chi tiết một yêu cầu học 1-1")]
    [EndpointDescription("Kèm các buổi dự kiến, phòng sẽ gán, canApprove và blockReason (HLV bận, học viên trùng lịch, hết phòng 1-1).")]
    public async Task<ActionResult<PrivateRequestDto>> AccessDetail(string requestId) =>
        Ok(await privateClasses.AccessDetailAsync(requestId));

    [HttpPost("{requestId}/approve")]
    [EndpointSummary("Quản lý duyệt yêu cầu học 1-1")]
    [EndpointDescription("Kiểm tra lại HLV, phòng, lịch học viên rồi sinh lớp private (sĩ số 1) và toàn bộ buổi, gán một phòng cho cả gói, giữ 24 giờ chờ thanh toán. Gửi thông báo và email cho học viên và HLV.")]
    public async Task<ActionResult<PrivateRequestDto>> Approve(string requestId) =>
        Ok(await privateClasses.ApproveAsync(requestId));

    [HttpPost("{requestId}/reject")]
    [EndpointSummary("Quản lý từ chối yêu cầu học 1-1")]
    [EndpointDescription("Bắt buộc lý do. Chỉ gửi email cho học viên (kèm lý do), không thông báo hệ thống, không báo HLV.")]
    public async Task<ActionResult<PrivateRequestDto>> Reject(string requestId, [FromBody] RejectPrivateRequest request) =>
        Ok(await privateClasses.RejectAsync(requestId, request.Reason));
}
