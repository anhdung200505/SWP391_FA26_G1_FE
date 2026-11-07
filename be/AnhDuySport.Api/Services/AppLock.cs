using System.Data;
using AnhDuySport.Api.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Chạy body trong một transaction giữ khóa ứng dụng (sp_getapplock) theo resource: các thao tác cùng resource chạy lần lượt,
// và mọi thay đổi trong body thành công hoặc hủy cùng nhau. Không lồng trong transaction khác.
internal static class AppLock
{
    public static async Task<T> RunAsync<T>(AppDbContext db, string resource, Func<Task<T>> body)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();
        var result = new SqlParameter("@result", SqlDbType.Int) { Direction = ParameterDirection.Output };
        await db.Database.ExecuteSqlRawAsync(
            "EXEC @result = sp_getapplock @Resource = @resource, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000",
            result,
            new SqlParameter("@resource", resource));
        if ((int)result.Value < 0)
        {
            throw new RegistrationException("Hệ thống đang xử lý thao tác khác trên cùng dữ liệu này, hãy thử lại sau giây lát.");
        }

        var value = await body();
        await transaction.CommitAsync();
        return value;
    }
}
