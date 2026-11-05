using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Data;

// Cột nhớ đã gửi thư nhắc gói sắp hết hạn. Cơ sở tạo từ 01_schema mới thì bỏ qua.
public static class MembershipNoticeSchema
{
    public static Task EnsureAsync(AppDbContext db) =>
        db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID(N'dbo.membership', N'U') IS NOT NULL
               AND COL_LENGTH(N'dbo.membership', N'expiry_notice_end_date') IS NULL
                ALTER TABLE dbo.membership ADD expiry_notice_end_date DATE NULL;
            """);
}
