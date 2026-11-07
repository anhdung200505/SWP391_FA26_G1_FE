using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Data;

// Cột nhớ học viên đã có gói và không chọn gia hạn khi đăng ký lớp.
public static class PaymentBonusSchema
{
    public static Task EnsureAsync(AppDbContext db) =>
        db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID(N'dbo.payment', N'U') IS NOT NULL
               AND COL_LENGTH(N'dbo.payment', N'skip_membership_bonus') IS NULL
                ALTER TABLE dbo.payment ADD skip_membership_bonus BIT NOT NULL
                    CONSTRAINT DF_payment_skip_membership_bonus DEFAULT (0);
            """);
}