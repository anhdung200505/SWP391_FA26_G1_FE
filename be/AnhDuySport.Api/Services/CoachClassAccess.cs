using AnhDuySport.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

public readonly record struct OwnedClass(int ClassId, string ClassName, int CoachUserId);

// Lớp mà coach đang đăng nhập phụ trách. Lớp của coach khác trả 404.
public class CoachClassAccess(AppDbContext db, CurrentActor actor)
{
    public int CoachUserId => actor.UserId;

    public async Task<OwnedClass> RequireAsync(string classId)
    {
        if (actor.UserId == 0)
        {
            throw new RegistrationException("Phiên đăng nhập không hợp lệ.");
        }

        if (!int.TryParse(classId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy lớp học.");
        }

        var item = await db.Classes.AsNoTracking()
            .Where(row => row.ClassId == id && row.CoachUserId == actor.UserId)
            .Select(row => new { row.ClassId, row.ClassName, row.CoachUserId })
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Không tìm thấy lớp học.");
        return new OwnedClass(item.ClassId, item.ClassName, item.CoachUserId);
    }
}
