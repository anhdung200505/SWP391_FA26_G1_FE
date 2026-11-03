using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Data;

// Cột đánh dấu buổi đổi phòng, đổi HLV. Cơ sở đã tạo từ 01_schema thì bỏ qua; cơ sở cũ được gán theo dữ liệu hiện có.
public static class SessionChangeSchema
{
    public static Task EnsureAsync(AppDbContext db) =>
        db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID(N'dbo.session', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.session', N'coach_change') IS NULL
            BEGIN
                BEGIN TRY
                    BEGIN TRANSACTION;
                    ALTER TABLE dbo.[session] ADD
                        room_changed BIT NOT NULL CONSTRAINT DF_session_room_changed DEFAULT (0),
                        coach_change NVARCHAR(12) NULL;
                    EXEC(N'ALTER TABLE dbo.[session] ADD CONSTRAINT CK_session_coach_change CHECK (coach_change IS NULL OR coach_change IN (N''substitute'', N''permanent''))');
                    EXEC(N'UPDATE s SET coach_change = CASE WHEN s.coach_user_id <> c.coach_user_id THEN N''substitute'' END,
                                       room_changed = CASE WHEN c.room_id IS NOT NULL AND s.room_id <> c.room_id THEN 1 ELSE 0 END
                           FROM dbo.[session] AS s INNER JOIN dbo.class AS c ON c.class_id = s.class_id');
                    COMMIT TRANSACTION;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    THROW;
                END CATCH
            END
            """);
}
