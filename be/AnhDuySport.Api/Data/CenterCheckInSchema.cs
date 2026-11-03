using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Data;

// Bảng check-in trung tâm. Cơ sở đã tạo từ 01_schema thì bỏ qua.
public static class CenterCheckInSchema
{
    public static Task EnsureAsync(AppDbContext db) =>
        db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID(N'dbo.center_checkin', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.center_checkin (
                checkin_id             INT IDENTITY(1,1) NOT NULL,
                user_id                INT           NOT NULL,
                membership_id          INT           NULL,
                checked_in_at          DATETIME2(0)  NOT NULL,
                checked_in_by_user_id  INT           NOT NULL,
                checked_out_at         DATETIME2(0)  NULL,
                checked_out_by_user_id INT           NULL,
                status                 NVARCHAR(20)  NOT NULL CONSTRAINT DF_center_checkin_status DEFAULT (N'valid'),
                voided_at              DATETIME2(0)  NULL,
                voided_by_user_id      INT           NULL,
                void_reason            NVARCHAR(500) NULL,
                CONSTRAINT PK_center_checkin PRIMARY KEY (checkin_id),
                CONSTRAINT FK_center_checkin_user FOREIGN KEY (user_id) REFERENCES [user] (user_id),
                CONSTRAINT FK_center_checkin_membership FOREIGN KEY (membership_id) REFERENCES membership (membership_id),
                CONSTRAINT FK_center_checkin_in_by FOREIGN KEY (checked_in_by_user_id) REFERENCES [user] (user_id),
                CONSTRAINT FK_center_checkin_out_by FOREIGN KEY (checked_out_by_user_id) REFERENCES [user] (user_id),
                CONSTRAINT FK_center_checkin_void_by FOREIGN KEY (voided_by_user_id) REFERENCES [user] (user_id),
                CONSTRAINT CK_center_checkin_status CHECK (status IN (N'valid', N'voided')),
                CONSTRAINT CK_center_checkin_out CHECK (checked_out_at IS NULL OR checked_out_at >= checked_in_at)
                );
                CREATE INDEX IX_center_checkin_user_time ON dbo.center_checkin (user_id, checked_in_at);
                CREATE INDEX IX_center_checkin_time ON dbo.center_checkin (checked_in_at);
            END
            """);
}
