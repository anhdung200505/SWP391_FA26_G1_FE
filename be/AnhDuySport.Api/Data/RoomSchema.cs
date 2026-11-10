using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Data;

// Cột trạng thái phòng: phòng ngưng dùng không còn hiện trong các ô chọn phòng, nhưng lớp và buổi học cũ vẫn giữ phòng đó.
// Cơ sở tạo từ 01_schema mới thì bỏ qua.
public static class RoomSchema
{
    public static Task EnsureAsync(AppDbContext db) =>
        db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID(N'dbo.room', N'U') IS NOT NULL
               AND COL_LENGTH(N'dbo.room', N'is_active') IS NULL
                ALTER TABLE dbo.room ADD is_active BIT NOT NULL CONSTRAINT DF_room_is_active DEFAULT (1);
            """);
}
