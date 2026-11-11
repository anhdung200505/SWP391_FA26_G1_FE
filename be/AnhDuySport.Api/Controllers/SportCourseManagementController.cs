using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

[Authorize(Roles = "ADMIN")]
[ApiController]
[FlowErrors]
[Route("api/management/catalog")]
public class SportManagementController(SportCourseManagementFlowService catalog) : ControllerBase
{
    [HttpGet("sports")]
    [EndpointSummary("Quản trị xem danh sách môn")]
    [EndpointDescription("Mỗi môn kèm các phòng dùng được (lớp nhóm / 1-1), HLV dạy được và số khóa học.")]
    public async Task<ActionResult<IReadOnlyList<SportAdminDto>>> Sports() =>
        Ok(await catalog.ListSportsAsync());

    [HttpGet("coach-options")]
    [EndpointSummary("Quản trị xem HLV đang hoạt động để gắn vào môn")]
    [EndpointDescription("Chỉ gồm huấn luyện viên có trạng thái hoạt động.")]
    public async Task<ActionResult<IReadOnlyList<SportCoachOptionDto>>> CoachOptions() =>
        Ok(await catalog.ListCoachOptionsAsync());

    [HttpPost("sports")]
    [EndpointSummary("Quản trị tạo môn mới")]
    [EndpointDescription("Mã môn (tự in hoa, không trùng, tối đa 50 ký tự), tên, nhóm, phòng dùng được và HLV. Hệ thống tự tạo một giáo án chuẩn cho môn. Phòng và HLV phải đang hoạt động. Lỗi thì không lưu gì.")]
    public async Task<ActionResult<SportAdminDto>> CreateSport(CreateSportRequest request) =>
        Ok(await catalog.CreateSportAsync(request));

    [HttpPost("sports/{sportId}/rooms")]
    [EndpointSummary("Quản trị gắn thêm phòng cho môn")]
    [EndpointDescription("Chỉ thêm liên kết, không gỡ phòng nào. Gắn lại phòng đã có thì cập nhật hai cờ lớp nhóm / 1-1. Phòng phải đang hoạt động và bật ít nhất một cờ.")]
    public async Task<ActionResult<SportAdminDto>> AddRoom(string sportId, SportRoomRequest request) =>
        Ok(await catalog.AddRoomAsync(sportId, request));

    [HttpPost("sports/{sportId}/coaches")]
    [EndpointSummary("Quản trị gắn thêm HLV cho môn")]
    [EndpointDescription("Chỉ thêm HLV chưa dạy môn này, không gỡ ai. HLV phải đang hoạt động.")]
    public async Task<ActionResult<SportAdminDto>> AddCoaches(string sportId, AddSportCoachesRequest request) =>
        Ok(await catalog.AddCoachesAsync(sportId, request));
}
