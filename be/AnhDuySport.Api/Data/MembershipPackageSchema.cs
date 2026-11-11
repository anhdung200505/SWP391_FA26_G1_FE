using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Data;

// Gói bao nhiêu tháng cũng được (1 - 1200). Cơ sở cũ còn CHECK (validity_months = 1) thì nới ra; cơ sở mới thì bỏ qua.
public static class MembershipPackageSchema
{
    public static Task EnsureAsync(AppDbContext db) =>
        db.Database.ExecuteSqlRawAsync(
            """
            IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_membership_package_months'
                       AND definition NOT LIKE N'%1200%')
            BEGIN
                ALTER TABLE dbo.membership_package DROP CONSTRAINT CK_membership_package_months;
                ALTER TABLE dbo.membership_package ADD CONSTRAINT CK_membership_package_months
                    CHECK (validity_months >= 1 AND validity_months <= 1200);
            END
            """);
}
