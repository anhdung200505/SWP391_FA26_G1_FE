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
    [HttpGet("registrations")]
    [EndpointSummary("Lễ tân xem học viên đã đăng ký và mọi thông tin")]
    [EndpointDescription("Mỗi dòng là 1 học viên trong 1 lớp: hồ sơ, lớp, đơn thanh toán, ai đăng ký (registeredBy), ai xếp lớp (classAssignedBy: SYSTEM là hệ thống tự xếp), slot mong muốn, slot đã đăng ký và lịch sử thao tác. scope=mine (mặc định) chỉ trả học viên tài khoản đang đăng nhập đã thao tác; scope=all trả tất cả, kể cả học viên tự đăng ký. Lọc theo sportId, classId, memberUserId; search theo tên, email, số điện thoại, tên lớp, mã hóa đơn.")]
    public async Task<ActionResult<IReadOnlyList<ReceptionRegistrationDto>>> AccessRegistrations(
        [FromQuery] string? scope,
        [FromQuery] string? search,
        [FromQuery] string? sportId,
        [FromQuery] string? classId,
        [FromQuery] string? memberUserId) =>
        Ok(await reception.AccessRegistrationsAsync(scope, search, sportId, classId, memberUserId));

    [HttpGet("members/lookup")]
    [EndpointSummary("Lễ tân tra học viên để đăng ký giùm")]
    [EndpointDescription("Nhập đúng email hoặc số điện thoại 10 số của học viên. Trả 1 học viên, không liệt kê danh sách.")]
    public async Task<ActionResult<ReceptionMemberDto>> LookupMember([FromQuery] string? keyword) =>
        Ok(await reception.LookupMemberAsync(keyword));

    [HttpPost("members/{memberUserId}/class-registrations")]
    [EndpointSummary("Lễ tân đăng ký lớp giùm học viên")]
    [EndpointDescription("Body giống POST /api/class-registrations: bắt buộc sportId, classId và slotId không bắt buộc. Tạo hóa đơn và đơn thanh toán pending giữ chỗ 10 phút, ghi lễ tân là người đăng ký. Thu tiền xong gọi confirm-payment.")]
    public async Task<ActionResult<ClassRegistrationDto>> RegisterForMember(string memberUserId, CreateClassRegistrationRequest request) =>
        Ok(await reception.RegisterForMemberAsync(memberUserId, request));

    [HttpPost("class-registrations/{paymentId}/confirm-payment")]
    [EndpointSummary("Lễ tân xác nhận đã thu học phí tại quầy")]
    [EndpointDescription("paymentMethod: cash, transfer hoặc card. Chỉ đơn pending còn hạn giữ chỗ. Thành công thì học viên được ghi danh vào lớp.")]
    public async Task<ActionResult<RegistrationStatusDto>> ConfirmPayment(string paymentId, ConfirmCounterPaymentRequest request) =>
        Ok(await reception.ConfirmCounterPaymentAsync(paymentId, request));

    [HttpPost("members/{memberUserId}/slots/{slotId}/register")]
    [EndpointSummary("Lễ tân đăng ký slot giùm học viên")]
    [EndpointDescription("Học viên phải đang học lớp của slot. Slot đã đầy thì từ chối, khi đó chọn slot khác cùng lớp (xem GET /api/slots?classId=).")]
    public async Task<ActionResult<SlotRegistrationDto>> RegisterSlot(string memberUserId, string slotId) =>
        Ok(await reception.RegisterSlotAsync(memberUserId, slotId));

    [HttpPost("members/{memberUserId}/slots/{slotId}/move")]
    [EndpointSummary("Lễ tân dời slot cho học viên")]
    [EndpointDescription("Hủy slotId học viên đang đăng ký và đăng ký toSlotId cùng lớp. Slot mới đầy thì giữ nguyên slot cũ.")]
    public async Task<ActionResult<SlotRegistrationDto>> MoveSlot(string memberUserId, string slotId, MoveSlotRequest request) =>
        Ok(await reception.MoveSlotAsync(memberUserId, slotId, request));

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
}
