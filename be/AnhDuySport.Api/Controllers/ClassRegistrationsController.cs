using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

[Authorize(Roles = "MEMBER")]
[ApiController]
[FlowErrors]
[Route("api/class-registrations")]
public class ClassRegistrationsController(ClassRegistrationFlowService registrations, CurrentActor actor) : ControllerBase
{
    [HttpPost]
    [EndpointSummary("Học viên đăng ký khóa học theo môn thể thao")]
    [EndpointDescription("Bắt buộc sportId. classId và slotId (id buổi học) không bắt buộc: không có classId thì lấy lớp của buổi slotId, không có cả hai thì hệ thống chọn lớp còn chỗ bắt đầu sớm nhất của môn. Ghi danh lớp là học mọi buổi của lớp (xem GET /api/sessions/mine). Học viên lấy từ token đăng nhập. Có thể gửi kèm fullName, phone, dateOfBirth, gender để ghi đè hồ sơ (gender: Nam, Nữ, Khác). Hồ sơ cần có số điện thoại (gửi phone hoặc đã có sẵn) và email. Tạo hóa đơn và thanh toán ở trạng thái pending; nếu đã có đơn pending cho lớp này thì trả lại đơn cũ (isExisting = true).")]
    public async Task<ActionResult<ClassRegistrationDto>> Submit(CreateClassRegistrationRequest request) =>
        Ok(await registrations.SubmitRegistrationAsync(actor.UserId, request));

    [HttpGet("mine")]
    [EndpointSummary("Học viên xem các lớp đã đăng ký")]
    [EndpointDescription("Học viên lấy từ token đăng nhập. Chỉ trả lớp đã ghi danh (enrolled), đăng ký mới nhất lên đầu. Không kèm lịch học.")]
    public async Task<ActionResult<IReadOnlyList<EnrolledClassDto>>> AccessEnrolledClasses() =>
        Ok(await registrations.AccessEnrolledClassesAsync(actor.UserId));

    [HttpGet("pending")]
    [EndpointSummary("Học viên xem các đơn đang chờ thanh toán")]
    [EndpointDescription("Đơn đăng ký lớp (kind = class) và đơn mua gói (kind = membership) còn trong 3 phút giữ đơn, mới nhất lên đầu. Kèm ảnh QR payOS và số giây còn lại để quay lại màn hình thanh toán.")]
    public async Task<ActionResult<IReadOnlyList<PendingCheckoutDto>>> AccessPendingCheckouts() =>
        Ok(await registrations.AccessPendingCheckoutsAsync(actor.UserId));

    [HttpGet("{paymentId}")]
    [EndpointSummary("Học viên xem trạng thái đơn đăng ký")]
    [EndpointDescription("Chỉ trả đơn của chính học viên đang đăng nhập, ngược lại trả 404. Message có lời cảm ơn khi đã thanh toán.")]
    public async Task<ActionResult<RegistrationStatusDto>> SelectStatus(string paymentId) =>
        Ok(await registrations.SelectRegistrationStatusAsync(paymentId, actor.UserId));
}
