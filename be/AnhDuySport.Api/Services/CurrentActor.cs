using System.Security.Claims;
using AnhDuySport.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

public class CurrentActor(IHttpContextAccessor accessor, AppDbContext db)
{
    public int UserId
    {
        get
        {
            var value = accessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(value, out var id) ? id : 0;
        }
    }

    public async Task<string> NameAsync()
    {
        var id = UserId;
        if (id == 0)
        {
            return "Quản trị AnhDuy";
        }

        var name = await db.UserAccounts
            .Where(user => user.UserId == id)
            .Select(user => user.FullName)
            .FirstOrDefaultAsync();
        return string.IsNullOrWhiteSpace(name) ? "Quản trị AnhDuy" : name;
    }
}
