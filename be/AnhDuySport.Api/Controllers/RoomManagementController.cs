using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

[Authorize(Roles = "ADMIN")]
[ApiController]
[FlowErrors]
[Route("api/management/rooms")]
public class RoomManagementController(RoomManagementFlowService rooms) : ControllerBase
{
    [HttpGet("overview")]
    [EndpointSummary("Quản trị xem tất cả phòng, kể cả phòng ngưng dùng")]
    [EndpointDescription("Mỗi phòng kèm sức chứa, môn dùng được (lớp nhóm / 1-1), trạng thái và số buổi sắp tới (từ hôm nay, chưa học, chưa hủy) đang xếp trong phòng.")]
    public async Task<ActionResult<IReadOnlyList<RoomAdminDto>>> Overview() =>
        Ok(await rooms.ListAsync());

    [HttpGet("{roomId}/usage")]
    [EndpointSummary("Quản trị xem các lớp còn buổi sắp tới trong phòng")]
    [EndpointDescription("Buổi từ hôm nay trở đi, chưa học, chưa hủy. Mỗi lớp kèm số buổi, buổi đầu và buổi cuối. Dùng để báo trước khi ngưng dùng phòng.")]
    public async Task<ActionResult<RoomUsageDto>> Usage(string roomId) =>
        Ok(await rooms.RoomUsageAsync(roomId));

    [HttpPut("{roomId}/status")]
    [EndpointSummary("Quản trị ngưng dùng hoặc mở lại phòng")]
    [EndpointDescription("isActive = false: phòng không còn hiện khi tạo lớp, đổi phòng buổi học, xếp lịch 1-1; lớp và buổi đã có giữ nguyên phòng. Trả 409 kèm danh sách lớp nếu phòng còn buổi sắp tới, cần đổi phòng cho các buổi đó trước. isActive = true luôn được.")]
    public async Task<ActionResult<RoomAdminDto>> SetStatus(string roomId, SetRoomStatusRequest request) =>
        Ok(await rooms.SetActiveAsync(roomId, request.IsActive));
}
