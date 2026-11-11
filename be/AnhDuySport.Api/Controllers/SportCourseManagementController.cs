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
    [EndpointDescription("Chỉ thêm liên kết, không gỡ phòng nào. Gắn lại phòng đã có thì chỉ bật thêm cờ lớp nhóm / 1-1 (gộp, không tắt cờ đang bật). Phòng phải đang hoạt động và bật ít nhất một cờ.")]
    public async Task<ActionResult<SportAdminDto>> AddRoom(string sportId, SportRoomRequest request) =>
        Ok(await catalog.AddRoomAsync(sportId, request));

    [HttpPost("sports/{sportId}/coaches")]
    [EndpointSummary("Quản trị gắn thêm HLV cho môn")]
    [EndpointDescription("Chỉ thêm HLV chưa dạy môn này, không gỡ ai. HLV phải đang hoạt động.")]
    public async Task<ActionResult<SportAdminDto>> AddCoaches(string sportId, AddSportCoachesRequest request) =>
        Ok(await catalog.AddCoachesAsync(sportId, request));

    [HttpGet("sports/{sportId}/delete-check")]
    [EndpointSummary("Quản trị xem trước khi xóa môn")]
    [EndpointDescription("Chỉ đọc, không đổi dữ liệu. Cho biết môn có xóa được không (blockReason là đúng lý do mà lệnh xóa sẽ trả), số khóa học, phòng, HLV sẽ bị gỡ và các HLV sẽ không còn môn nào.")]
    public async Task<ActionResult<DeleteSportCheckDto>> DeleteSportCheck(string sportId) =>
        Ok(await catalog.CheckDeleteSportAsync(sportId));

    [HttpDelete("sports/{sportId}")]
    [EndpointSummary("Quản trị xóa môn")]
    [EndpointDescription("Chỉ xóa được khi mọi khóa học của môn chưa có lớp nào (mọi trạng thái), chưa có yêu cầu học 1-1, và không lớp nào dùng giáo án của môn. Xóa trong một giao dịch: đơn vị và tài liệu khóa học, liên kết HLV và phòng, khóa học, giáo án, rồi môn. Không xóa phòng hay HLV. Trả về danh sách HLV không còn môn nào.")]
    public async Task<ActionResult<DeleteSportResultDto>> DeleteSport(string sportId) =>
        Ok(await catalog.DeleteSportAsync(sportId));
}

[Authorize(Roles = "ADMIN")]
[ApiController]
[FlowErrors]
[Route("api/management/catalog")]
public class CourseCatalogController(SportCourseManagementFlowService catalog) : ControllerBase
{
    [HttpGet("courses")]
    [EndpointSummary("Quản trị xem danh sách khóa học")]
    [EndpointDescription("Gồm cả khóa đã ngưng. Có thể lọc theo môn bằng sportId.")]
    public async Task<ActionResult<IReadOnlyList<CourseAdminDto>>> Courses([FromQuery] string? sportId) =>
        Ok(await catalog.ListCoursesAsync(sportId));

    [HttpPost("courses")]
    [EndpointSummary("Quản trị tạo khóa học")]
    [EndpointDescription("Mã khóa (tự in hoa, không trùng, tối đa 50 ký tự), tên, học phí không âm, hình thức group hoặc private. Khóa 1-1 bắt buộc số phút và số buổi; khóa nhóm thì không. Môn phải có HLV đang hoạt động và phòng đang hoạt động dùng được cho hình thức đó.")]
    public async Task<ActionResult<CourseAdminDto>> CreateCourse(CreateCourseRequest request) =>
        Ok(await catalog.CreateCourseAsync(request));

    [HttpPut("courses/{courseId}")]
    [EndpointSummary("Quản trị sửa khóa học")]
    [EndpointDescription("Sửa tên, mô tả, học phí, hình ảnh, số buổi và số phút. Không đổi mã, môn và hình thức. Học phí mới áp dụng ngay cho mọi lớp thuộc khóa.")]
    public async Task<ActionResult<CourseAdminDto>> UpdateCourse(string courseId, UpdateCourseRequest request) =>
        Ok(await catalog.UpdateCourseAsync(courseId, request));

    [HttpPut("courses/{courseId}/status")]
    [EndpointSummary("Quản trị ngưng hoặc mở lại khóa học")]
    [EndpointDescription("isActive=false để ngưng: khóa không còn hiện khi tạo lớp. Không xóa dữ liệu, bật lại bằng isActive=true.")]
    public async Task<ActionResult<CourseAdminDto>> SetCourseStatus(string courseId, SetCourseStatusRequest request) =>
        Ok(await catalog.SetCourseActiveAsync(courseId, request.IsActive));
}
