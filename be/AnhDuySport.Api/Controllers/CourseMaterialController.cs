using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

[Authorize(Roles = "ADMIN,COACH,MEMBER")]
[ApiController]
[Route("api/course-materials")]
public class CourseMaterialController(CourseMaterialFlowService materials) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("Xem giáo trình các môn mình được phép thấy")]
    [EndpointDescription("Quản lý trung tâm thấy mọi môn. Huấn luyện viên thấy môn mình dạy. Học viên thấy môn của lớp đang học.")]
    public async Task<ActionResult<IReadOnlyList<CourseMaterialDto>>> List()
    {
        try
        {
            return Ok(await materials.ListAsync());
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpGet("{sportId:int}/pdf")]
    [EndpointSummary("Tải giáo trình một môn dưới dạng PDF")]
    public async Task<IActionResult> Pdf(int sportId)
    {
        try
        {
            var (fileName, content) = await materials.PdfAsync(sportId);
            return File(content, "application/pdf", fileName);
        }
        catch (KeyNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [Authorize(Roles = "ADMIN")]
    [HttpPut("{sportId:int}")]
    [EndpointSummary("Quản lý trung tâm sửa giáo trình một môn")]
    public async Task<ActionResult<CourseMaterialDto>> Save(int sportId, SaveCourseMaterialRequest request)
    {
        try
        {
            return Ok(await materials.SaveAsync(sportId, request));
        }
        catch (KeyNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }
}
