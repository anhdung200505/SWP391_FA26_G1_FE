using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

[ApiController]
[Route("api/class-registrations")]
public class ClassRegistrationsController(ClassRegistrationFlowService registrations) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost]
    [EndpointSummary("Học viên đăng ký lớp học theo nhóm")]
    [EndpointDescription("Chưa có đăng nhập cho học viên nên truyền memberUserId. Học viên cần có số điện thoại và email. Tạo hóa đơn và thanh toán ở trạng thái pending; nếu đã có đơn pending cho lớp này thì trả lại đơn cũ (isExisting = true).")]
    public async Task<ActionResult<ClassRegistrationDto>> Submit(CreateClassRegistrationRequest request)
    {
        try
        {
            return Ok(await registrations.SubmitRegistrationAsync(request));
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
