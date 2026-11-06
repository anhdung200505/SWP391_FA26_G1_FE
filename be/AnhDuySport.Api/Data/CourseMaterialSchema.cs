using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Data;

public static class CourseMaterialSchema
{
    public static async Task EnsureAsync(AppDbContext db)
    {
        await db.Database.ExecuteSqlRawAsync(
            """
            IF COL_LENGTH(N'dbo.sport_course_material', N'overview') IS NOT NULL
            BEGIN
                IF OBJECT_ID(N'dbo.sport_course_unit', N'U') IS NOT NULL DROP TABLE dbo.sport_course_unit;
                DROP TABLE dbo.sport_course_material;
            END

            IF OBJECT_ID(N'dbo.sport_course_material', N'U') IS NULL
            CREATE TABLE dbo.sport_course_material (
                sport_id            INT            NOT NULL,
                source_name         NVARCHAR(300)  NOT NULL CONSTRAINT DF_sport_material_source DEFAULT (N''),
                source_url          NVARCHAR(500)  NOT NULL CONSTRAINT DF_sport_material_url DEFAULT (N''),
                note                NVARCHAR(2000) NOT NULL CONSTRAINT DF_sport_material_note DEFAULT (N''),
                updated_by_user_id  INT            NULL,
                updated_at          DATETIME2(0)   NOT NULL CONSTRAINT DF_sport_material_updated DEFAULT (SYSUTCDATETIME()),
                CONSTRAINT PK_sport_course_material PRIMARY KEY (sport_id),
                CONSTRAINT FK_sport_course_material_sport FOREIGN KEY (sport_id) REFERENCES sport (sport_id),
                CONSTRAINT FK_sport_course_material_user FOREIGN KEY (updated_by_user_id) REFERENCES [user] (user_id)
            );

            IF OBJECT_ID(N'dbo.sport_course_unit', N'U') IS NULL
            CREATE TABLE dbo.sport_course_unit (
                unit_id     INT IDENTITY(1,1) NOT NULL,
                sport_id    INT            NOT NULL,
                sort_order  INT            NOT NULL,
                label       NVARCHAR(200)  NOT NULL,
                work        NVARCHAR(MAX)  NOT NULL,
                review      NVARCHAR(2000) NOT NULL CONSTRAINT DF_sport_course_unit_review DEFAULT (N''),
                CONSTRAINT PK_sport_course_unit PRIMARY KEY (unit_id),
                CONSTRAINT UQ_sport_course_unit UNIQUE (sport_id, sort_order),
                CONSTRAINT FK_sport_course_unit_sport FOREIGN KEY (sport_id) REFERENCES sport (sport_id)
            );

            IF OBJECT_ID(N'dbo.class_intake_note', N'U') IS NULL
            CREATE TABLE dbo.class_intake_note (
                intake_note_id  INT IDENTITY(1,1) NOT NULL,
                class_id        INT            NOT NULL,
                member_user_id  INT            NOT NULL,
                session_id      INT            NOT NULL,
                coach_user_id   INT            NOT NULL,
                comment         NVARCHAR(2000) NOT NULL,
                updated_at      DATETIME2(0)   NOT NULL,
                CONSTRAINT PK_class_intake_note PRIMARY KEY (intake_note_id),
                CONSTRAINT UQ_class_intake_note UNIQUE (class_id, member_user_id),
                CONSTRAINT FK_class_intake_note_class FOREIGN KEY (class_id) REFERENCES class (class_id),
                CONSTRAINT FK_class_intake_note_member FOREIGN KEY (member_user_id) REFERENCES [user] (user_id),
                CONSTRAINT FK_class_intake_note_session FOREIGN KEY (session_id) REFERENCES [session] (session_id),
                CONSTRAINT FK_class_intake_note_coach FOREIGN KEY (coach_user_id) REFERENCES [user] (user_id)
            );

            IF COL_LENGTH(N'dbo.sport_course_unit', N'review') IS NULL
                ALTER TABLE dbo.sport_course_unit ADD review NVARCHAR(2000) NOT NULL CONSTRAINT DF_sport_course_unit_review DEFAULT (N'');

            IF EXISTS (
                SELECT 1
                FROM sys.columns
                WHERE object_id = OBJECT_ID(N'dbo.sport_course_unit')
                  AND name = N'work'
                  AND max_length <> -1)
                ALTER TABLE dbo.sport_course_unit ALTER COLUMN work NVARCHAR(MAX) NOT NULL;
            """);

        var refresh = await db.SportCourseUnits.AnyAsync(item =>
            item.Work.StartsWith("Theo đúng tiêu đề buổi")
            || (item.Label == "Taegeuk 1 Jang" && item.Work.StartsWith("Kukkiwon gắn"))
            || item.Work == "Một người chơi với bóng."
            || item.Work.StartsWith("Nêu được cầu lông"));
        if (await db.SportCourseUnits.AnyAsync() && !refresh)
        {
            await FillSportsWithoutUnitsAsync(db);
            await RewriteAssembledCoursesAsync(db);
            return;
        }

        if (refresh)
        {
            var oldUnits = await db.SportCourseUnits.ToListAsync();
            db.SportCourseUnits.RemoveRange(oldUnits);
            await db.SaveChangesAsync();
        }

        var sports = await db.Sports.ToListAsync();
        var now = DateTime.UtcNow;
        foreach (var sport in sports)
        {
            if (!OfficialCourseCatalog.TryGet(sport.SportCode, out var entry))
            {
                continue;
            }

            var material = await db.SportCourseMaterials.FirstOrDefaultAsync(item => item.SportId == sport.SportId);
            if (material is null)
            {
                material = new Models.SportCourseMaterial { SportId = sport.SportId };
                db.SportCourseMaterials.Add(material);
            }

            material.SourceName = entry.SourceName;
            material.SourceUrl = entry.SourceUrl;
            material.Note = entry.Note;
            material.UpdatedAt = now;
            var order = 1;
            foreach (var unit in entry.Units)
            {
                db.SportCourseUnits.Add(new Models.SportCourseUnit
                {
                    SportId = sport.SportId,
                    SortOrder = order,
                    Label = unit.Label,
                    Work = unit.Work,
                    Review = unit.Review,
                });
                order++;
            }
        }

        await db.SaveChangesAsync();
    }

    private static async Task FillSportsWithoutUnitsAsync(AppDbContext db)
    {
        var sports = await db.Sports.ToListAsync();
        var now = DateTime.UtcNow;
        var added = false;
        foreach (var sport in sports)
        {
            if (!OfficialCourseCatalog.TryGet(sport.SportCode, out var entry) || entry.Units.Count == 0)
            {
                continue;
            }

            if (await db.SportCourseUnits.AnyAsync(item => item.SportId == sport.SportId))
            {
                continue;
            }

            var material = await db.SportCourseMaterials.FirstOrDefaultAsync(item => item.SportId == sport.SportId);
            if (material is null)
            {
                material = new Models.SportCourseMaterial { SportId = sport.SportId };
                db.SportCourseMaterials.Add(material);
            }

            material.SourceName = entry.SourceName;
            material.SourceUrl = entry.SourceUrl;
            material.Note = entry.Note;
            material.UpdatedAt = now;
            var order = 1;
            foreach (var unit in entry.Units)
            {
                db.SportCourseUnits.Add(new Models.SportCourseUnit
                {
                    SportId = sport.SportId,
                    SortOrder = order,
                    Label = unit.Label,
                    Work = unit.Work,
                    Review = unit.Review,
                });
                order++;
            }

            added = true;
        }

        if (added)
        {
            await db.SaveChangesAsync();
        }
    }

    private static async Task RewriteAssembledCoursesAsync(AppDbContext db)
    {
        var stale = await db.SportCourseUnits.AnyAsync(item =>
            item.Work.StartsWith("FIFA lấy chơi")
            || item.Work.Contains("Ailey liệt kê")
            || item.Work.Contains("chứng chỉ hạng 1"));
        if (!stale)
        {
            return;
        }

        var codes = new[] { "soccer", "tabletennis", "fencing", "dance", "golf" };
        var sports = await db.Sports.Where(item => codes.Contains(item.SportCode)).ToListAsync();
        var ids = sports.Select(item => item.SportId).ToList();
        var oldUnits = await db.SportCourseUnits.Where(item => ids.Contains(item.SportId)).ToListAsync();
        db.SportCourseUnits.RemoveRange(oldUnits);
        await db.SaveChangesAsync();

        var now = DateTime.UtcNow;
        foreach (var sport in sports)
        {
            if (!OfficialCourseCatalog.TryGet(sport.SportCode, out var entry) || entry.Units.Count == 0)
            {
                continue;
            }

            var material = await db.SportCourseMaterials.FirstOrDefaultAsync(item => item.SportId == sport.SportId);
            if (material is null)
            {
                material = new Models.SportCourseMaterial { SportId = sport.SportId };
                db.SportCourseMaterials.Add(material);
            }

            material.SourceName = entry.SourceName;
            material.SourceUrl = entry.SourceUrl;
            material.Note = entry.Note;
            material.UpdatedAt = now;
            var order = 1;
            foreach (var unit in entry.Units)
            {
                db.SportCourseUnits.Add(new Models.SportCourseUnit
                {
                    SportId = sport.SportId,
                    SortOrder = order,
                    Label = unit.Label,
                    Work = unit.Work,
                    Review = unit.Review,
                });
                order++;
            }
        }

        await db.SaveChangesAsync();
    }
}
