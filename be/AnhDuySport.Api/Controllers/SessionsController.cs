using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

[Authorize]
[ApiController]
[FlowErrors]
[Route("api/sessions")]
public class SessionsController(SessionFlowService sessions, CurrentActor actor) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("Xem lịch buổi học")]
    [EndpointDescription("Cần đăng nhập (mọi vai trò). Mặc định các buổi từ hôm nay trở đi, mọi trạng thái (scheduled, held, cancelled, completed). Lọc tùy chọn theo classId, sportId, from, to (yyyy-MM-dd). Mỗi buổi kèm lớp, môn, HLV, phòng, sĩ số và ghi chú.")]
    public async Task<ActionResult<IReadOnlyList<SessionDto>>> AccessSessions(
        [FromQuery] string? classId,
        [FromQuery] string? sportId,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to) =>
        Ok(await sessions.AccessSessionsAsync(classId, sportId, from, to));

    [Authorize(Roles = "MEMBER")]
    [HttpGet("mine")]
    [EndpointSummary("Học viên xem lịch học của mình")]
    [EndpointDescription("Học viên lấy từ token đăng nhập. Mọi buổi của những lớp đang ghi danh, kể cả buổi đã hủy (status cancelled, lý do ở note), mặc định từ hôm nay trở đi. Mỗi buổi kèm attendanceStatus của học viên: present, late, absent hoặc null (chưa điểm danh). Lọc tùy chọn from, to (yyyy-MM-dd).")]
    public async Task<ActionResult<IReadOnlyList<SessionDto>>> AccessMine([FromQuery] DateOnly? from, [FromQuery] DateOnly? to) =>
        Ok(await sessions.AccessMemberSessionsAsync(actor.UserId, from, to));

    [Authorize(Roles = "COACH")]
    [HttpGet("coach/mine")]
    [EndpointSummary("Huấn luyện viên xem lịch dạy của mình")]
    [EndpointDescription("HLV lấy từ token đăng nhập. Các buổi chưa hủy mà HLV đó phụ trách (theo HLV của từng buổi, kể cả khi được đổi cho riêng buổi), mặc định từ hôm nay trở đi. Lọc tùy chọn from, to (yyyy-MM-dd).")]
    public async Task<ActionResult<IReadOnlyList<SessionDto>>> AccessCoachMine([FromQuery] DateOnly? from, [FromQuery] DateOnly? to) =>
        Ok(await sessions.AccessCoachSessionsAsync(actor.UserId, from, to));

    [HttpGet("{sessionId}")]
    [EndpointSummary("Xem một buổi học")]
    [EndpointDescription("Cần đăng nhập (mọi vai trò).")]
    public async Task<ActionResult<SessionDto>> SelectSession(string sessionId) =>
        Ok(await sessions.SelectSessionAsync(sessionId));

    [Authorize(Roles = "ADMIN,RECEPTIONIST")]
    [HttpGet("{sessionId}/options")]
    [EndpointSummary("Xem HLV và phòng có thể đổi cho một buổi")]
    [EndpointDescription("HLV dạy môn của lớp và phòng thuộc môn đó. isBusy = true khi trùng giờ với buổi khác hoặc phòng không đủ sức chứa (busyReason). isCurrent = HLV hoặc phòng đang xếp cho buổi.")]
    public async Task<ActionResult<SessionOptionsDto>> AccessOptions(string sessionId) =>
        Ok(await sessions.AccessOptionsAsync(sessionId));

    [Authorize(Roles = "ADMIN")]
    [HttpPut("{sessionId}")]
    [EndpointSummary("Quản trị đổi HLV, phòng hoặc ghi chú của một buổi")]
    [EndpointDescription("Chỉ buổi scheduled/held từ hôm nay trở đi. coachUserId, roomId để null thì giữ nguyên; note gửi chuỗi rỗng thì xóa ghi chú. Trùng lịch HLV hoặc phòng trả 400. Học viên của lớp nhận thông báo khi đổi HLV hoặc phòng.")]
    public async Task<ActionResult<SessionDto>> UpdateSession(string sessionId, UpdateSessionRequest request) =>
        Ok(await sessions.UpdateSessionAsync(sessionId, request));

    [Authorize(Roles = "ADMIN,RECEPTIONIST")]
    [HttpPut("{sessionId}/coach")]
    [EndpointSummary("Lễ tân đổi HLV khi HLV phụ trách bận")]
    [EndpointDescription("Chỉ đổi HLV, không đổi phòng. HLV mới phải dạy môn của lớp và không có buổi khác trùng giờ. note là lý do (ghi vào cột ghi chú của buổi). Học viên của lớp nhận thông báo.")]
    public async Task<ActionResult<SessionDto>> ChangeCoach(string sessionId, ChangeSessionCoachRequest request) =>
        Ok(await sessions.ChangeCoachAsync(sessionId, request));

    [Authorize(Roles = "ADMIN")]
    [HttpPost("{sessionId}/cancel")]
    [EndpointSummary("Quản trị hủy một buổi học")]
    [EndpointDescription("Bắt buộc có lý do, lưu vào ghi chú của buổi. Chỉ buổi hôm nay chưa kết thúc hoặc buổi sắp tới. Quản trị tự chọn ngày và khung giờ buổi bù (makeupDate, makeupTimeSlotId); hệ thống không tự nhét buổi bù vào cuối khóa. Bỏ trống thì hủy trước và chọn buổi bù sau bằng POST /{sessionId}/makeup. Học viên của lớp nhận thông báo.")]
    public async Task<ActionResult<CancelSessionResult>> CancelSession(string sessionId, CancelSessionRequest request) =>
        Ok(await sessions.CancelSessionAsync(sessionId, request));

    [Authorize(Roles = "ADMIN")]
    [HttpPost("{sessionId}/makeup")]
    [EndpointSummary("Quản trị xếp buổi bù cho một buổi đã hủy")]
    [EndpointDescription("Chọn ngày và khung giờ buổi bù cho buổi đã hủy chưa có buổi bù. Kiểm tra trùng lịch lớp, HLV, phòng và học viên.")]
    public async Task<ActionResult<SessionDto>> ScheduleMakeup(string sessionId, SessionSlotRequest request) =>
        Ok(await sessions.ScheduleMakeupAsync(sessionId, request));

    [Authorize(Roles = "ADMIN")]
    [HttpPost("{sessionId}/reschedule")]
    [EndpointSummary("Quản trị đổi lịch một buổi học")]
    [EndpointDescription("Dời buổi (chưa điểm danh, từ hôm nay trở đi) sang ngày và khung giờ khác, giữ nguyên số buổi. Kiểm tra trùng lịch lớp, HLV, phòng và học viên. Học viên và HLV nhận thông báo.")]
    public async Task<ActionResult<SessionDto>> RescheduleSession(string sessionId, SessionSlotRequest request) =>
        Ok(await sessions.RescheduleSessionAsync(sessionId, request));

    [Authorize(Roles = "ADMIN")]
    [HttpGet("{sessionId}/slots")]
    [EndpointSummary("Xem khung giờ trống của một ngày để đổi lịch hoặc xếp buổi bù")]
    [EndpointDescription("Trả các khung giờ đúng loại lớp; isBusy = true khi trùng lớp, HLV, phòng hoặc học viên (busyReason).")]
    public async Task<ActionResult<IReadOnlyList<SessionOptionDto>>> AccessSlots(string sessionId, [FromQuery] DateOnly date) =>
        Ok(await sessions.AccessSlotOptionsAsync(sessionId, date));

    [AllowAnonymous]
    [HttpGet("~/api/time-slots")]
    [EndpointSummary("Xem danh mục khung giờ cố định")]
    [EndpointDescription("Khung giờ đang dùng, lọc tùy chọn kind = group (lớp nhóm, 3 giờ) hoặc private (học 1-1, 90 phút). Dùng timeSlotId khi xếp lịch tuần cho lớp.")]
    public async Task<ActionResult<IReadOnlyList<TimeSlotDto>>> AccessTimeSlots([FromQuery] string? kind) =>
        Ok(await sessions.AccessTimeSlotsAsync(kind));
}
