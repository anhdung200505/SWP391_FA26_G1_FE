using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

[Authorize(Roles = "RECEPTIONIST,ADMIN")]
[ApiController]
[FlowErrors]
[Route("api/reception")]
public class ReceptionController(ReceptionFlowService reception) : ControllerBase
{
    [HttpGet("members")]
    [EndpointSummary("Lễ tân tìm học viên")]
    [EndpointDescription("Tìm theo họ tên, email hoặc số điện thoại. Trả tối đa 50 học viên.")]
    public async Task<ActionResult<IReadOnlyList<ReceptionMemberDto>>> SearchMembers([FromQuery] string? search) =>
        Ok(await reception.SearchMembersAsync(search));

    [HttpPost("members/{memberUserId}/class-registrations")]
    [EndpointSummary("Lễ tân đăng ký lớp giùm học viên")]
    [EndpointDescription("Tạo hóa đơn và đơn thanh toán pending giữ chỗ 10 phút, ghi lễ tân là người đăng ký. Thu tiền xong gọi confirm-payment.")]
    public async Task<ActionResult<ClassRegistrationDto>> RegisterForMember(string memberUserId, CreateClassRegistrationRequest request) =>
        Ok(await reception.RegisterForMemberAsync(memberUserId, request));

    [HttpPost("class-registrations/{paymentId}/confirm-payment")]
    [EndpointSummary("Lễ tân xác nhận đã thu học phí tại quầy")]
    [EndpointDescription("paymentMethod: cash, transfer hoặc card. Chỉ đơn pending còn hạn giữ chỗ. Thành công thì học viên được ghi danh vào lớp.")]
    public async Task<ActionResult<RegistrationStatusDto>> ConfirmPayment(string paymentId, ConfirmCounterPaymentRequest request) =>
        Ok(await reception.ConfirmCounterPaymentAsync(paymentId, request));

    [HttpPost("members/{memberUserId}/classes/{classId}/move-out")]
    [EndpointSummary("Lễ tân cho học viên ra khỏi lớp")]
    [EndpointDescription("Bắt buộc có lý do. Ghi danh chuyển cancelled, các buổi đã đăng ký từ hôm nay trở đi bị hủy. Không hoàn tiền.")]
    public async Task<ActionResult<ReceptionEnrollmentDto>> MoveOut(string memberUserId, string classId, MoveOutRequest request) =>
        Ok(await reception.MoveOutAsync(memberUserId, classId, request));

    [HttpPost("members/{memberUserId}/classes/{classId}/re-enroll")]
    [EndpointSummary("Lễ tân đăng ký học lại khi học viên nghỉ đột xuất")]
    [EndpointDescription("Bắt buộc có lý do. Học viên phải đã ra khỏi lớp classId và đã đóng học phí khóa này, không đóng thêm tiền. targetClassId để trống thì học lại lớp cũ, có giá trị thì chuyển sang lớp khác cùng khóa.")]
    public async Task<ActionResult<ReceptionEnrollmentDto>> ReEnroll(string memberUserId, string classId, ReEnrollRequest request) =>
        Ok(await reception.ReEnrollAsync(memberUserId, classId, request));

    [HttpGet("paid-registrations")]
    [EndpointSummary("Danh sách học viên đăng ký lớp đã đóng tiền")]
    [EndpointDescription("Lọc theo classId, tìm theo tên, email, số điện thoại hoặc mã hóa đơn. Kèm người đăng ký và vai trò hiện tại của họ.")]
    public async Task<ActionResult<IReadOnlyList<PaidRegistrationDto>>> AccessPaidRegistrations(
        [FromQuery] string? classId,
        [FromQuery] string? search) =>
        Ok(await reception.AccessPaidRegistrationsAsync(classId, search));

    [HttpGet("registration-logs")]
    [EndpointSummary("Lịch sử ai đăng ký, cho ra lớp, đăng ký học lại")]
    [EndpointDescription("action: register, move_out, re_enroll. performedByRole là vai trò lúc thao tác. Lọc theo memberUserId và classId.")]
    public async Task<ActionResult<IReadOnlyList<ClassRegistrationLogDto>>> AccessRegistrationLogs(
        [FromQuery] string? memberUserId,
        [FromQuery] string? classId) =>
        Ok(await reception.AccessRegistrationLogsAsync(memberUserId, classId));
}
