using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

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
            _ => null,
        };
        return result is not null;
    }
}
