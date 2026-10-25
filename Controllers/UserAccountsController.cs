using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

[Authorize(Roles = "ADMIN")]
[ApiController]
[Route("api/user-accounts")]
public class UserAccountsController(UserAccountFlowService accounts) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UserAccountDto>>> AccessList(
        [FromQuery] string? search,
        [FromQuery] string? roleId,
        [FromQuery] string? status) =>
        Ok(await accounts.AccessUserAccountListAsync(search, roleId, status));

    [HttpPost]
    [EndpointSummary("Quản trị trung tâm tạo lễ tân hoặc huấn luyện viên")]
    [EndpointDescription("Chỉ tài khoản ADMIN. roleId nhận RECEPTIONIST hoặc COACH. HLV bắt buộc sportIds, một HLV có thể dạy nhiều môn. Mật khẩu từ 6 ký tự và có @, # hoặc !.")]
    public async Task<ActionResult<UserMutationResponse>> CreateStaff(CreateStaffRequest request)
    {
        try
        {
            var result = await accounts.CreateStaffAccountAsync(request);
            return CreatedAtAction(nameof(SelectAccount), new { userId = result.User.Id }, result);
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [HttpGet("{userId}")]
    public async Task<ActionResult<UserAccountDto>> SelectAccount(string userId)
    {
        var user = await accounts.SelectUserAccountAsync(userId);
        return user is null ? NotFound(new { message = "Không tìm thấy tài khoản." }) : Ok(user);
    }

    [HttpPut("{userId}/role")]
    public async Task<ActionResult<UserMutationResponse>> ModifyRole(string userId, UpdateRoleRequest request)
    {
        try
        {
            return Ok(await accounts.ModifyRoleAsync(userId, request.RoleId));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [HttpPut("{userId}/sports")]
    [EndpointSummary("Quản trị gán môn cho huấn luyện viên")]
    [EndpointDescription("Thay toàn bộ môn của HLV. sportIds là danh sách id môn, ít nhất một môn, một HLV có thể có nhiều môn. Không bỏ môn khi HLV còn lớp đang mở hoặc buổi sắp tới của môn đó.")]
    public async Task<ActionResult<UserMutationResponse>> UpdateCoachSports(string userId, UpdateCoachSportsRequest request)
    {
        try
        {
            return Ok(await accounts.UpdateCoachSportsAsync(userId, request.SportIds));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [HttpPut("{userId}/status")]
    public async Task<ActionResult<UserMutationResponse>> ActiveOrInactive(string userId, UpdateStatusRequest request)
    {
        try
        {
            return Ok(await accounts.ActiveOrInactiveUserAccountAsync(userId, request.Status));
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
            UnauthorizedAccessException denied => StatusCode(StatusCodes.Status403Forbidden, new { message = denied.Message }),
            _ => null,
        };
        return result is not null;
    }
}
