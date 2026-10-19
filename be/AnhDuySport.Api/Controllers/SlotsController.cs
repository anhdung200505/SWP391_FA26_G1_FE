using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

[AllowAnonymous]
[ApiController]
[Route("api/slots")]
public class SlotsController(SlotFlowService slots) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("Xem slot sắp diễn ra và số chỗ còn lại")]
    [EndpointDescription("Có thể lọc theo classId. Slot đã qua ngày không nằm trong danh sách.")]
    public async Task<ActionResult<IReadOnlyList<SlotAvailabilityDto>>> AccessSlots([FromQuery] string? classId)
    {
        try
        {
            return Ok(await slots.AccessSlotsAsync(classId));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [HttpGet("members/{memberUserId}")]
    [EndpointSummary("Xem slot một học viên đã đăng ký")]
    [EndpointDescription("Dùng memberUserId có sẵn trong bảng user vì học viên chưa đăng nhập được.")]
    public async Task<ActionResult<IReadOnlyList<SlotRegistrationDto>>> AccessMemberRegistrations(string memberUserId)
    {
        try
        {
            return Ok(await slots.AccessMemberRegistrationsAsync(memberUserId));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [HttpGet("{slotId}")]
    [EndpointSummary("Xem một slot")]
    public async Task<ActionResult<SlotAvailabilityDto>> SelectSlot(string slotId)
    {
        try
        {
            return Ok(await slots.SelectSlotAsync(slotId));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [HttpPost("{slotId}/register")]
    [EndpointSummary("Học viên đăng ký slot")]
    [EndpointDescription("Học viên phải đang ghi danh lớp của slot. Mỗi học viên một lần cho mỗi slot. Hết chỗ thì từ chối.")]
    public async Task<ActionResult<SlotRegistrationDto>> Register(string slotId, SlotMemberRequest request)
    {
        try
        {
            return Ok(await slots.RegisterAsync(slotId, request));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [HttpPost("{slotId}/cancel")]
    [EndpointSummary("Học viên hủy đăng ký slot")]
    public async Task<ActionResult<SlotRegistrationDto>> Cancel(string slotId, SlotMemberRequest request)
    {
        try
        {
            return Ok(await slots.CancelAsync(slotId, request));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    private bool MapFlowError(Exception exception, out ActionResult? result)
    {
        result = exception switch
        {
            KeyNotFoundException keyNotFound => NotFound(new { message = keyNotFound.Message }),
            InvalidOperationException invalid => BadRequest(new { message = invalid.Message }),
            _ => null,
        };
        return result is not null;
    }
}
