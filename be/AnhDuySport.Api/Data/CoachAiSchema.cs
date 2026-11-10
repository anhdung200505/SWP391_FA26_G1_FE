using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Data;

// Bảng token AI của huấn luyện viên (khác ai_token_usage của hội viên, không gắn gói). Cơ sở tạo từ 01_schema mới thì bỏ qua.
public static class CoachAiSchema
{
    public static Task EnsureAsync(AppDbContext db) =>
        db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID(N'dbo.coach_ai_token_usage', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.coach_ai_token_usage (
                    coach_ai_token_usage_id INT IDENTITY(1,1) NOT NULL,
                    coach_user_id           INT           NOT NULL,
                    class_id                INT           NOT NULL,
                    session_id              INT           NULL,
                    action                  NVARCHAR(30)  NOT NULL,
                    total_tokens            INT           NOT NULL,
                    created_at              DATETIME2(0)  NOT NULL,
                    CONSTRAINT PK_coach_ai_token_usage PRIMARY KEY (coach_ai_token_usage_id),
                    CONSTRAINT FK_coach_ai_token_usage_coach FOREIGN KEY (coach_user_id) REFERENCES dbo.[user] (user_id),
                    CONSTRAINT FK_coach_ai_token_usage_class FOREIGN KEY (class_id) REFERENCES dbo.class (class_id),
                    CONSTRAINT CK_coach_ai_token_usage_action CHECK (action IN (N'generate', N'regenerate')),
                    CONSTRAINT CK_coach_ai_token_usage_tokens CHECK (total_tokens >= 0)
                );
                CREATE INDEX IX_coach_ai_token_usage_coach ON dbo.coach_ai_token_usage (coach_user_id, created_at);
            END

            IF OBJECT_ID(N'dbo.ai_workout_recommendation', N'U') IS NOT NULL
               AND COL_LENGTH(N'dbo.ai_workout_recommendation', N'total_sessions') IS NULL
                ALTER TABLE dbo.ai_workout_recommendation ADD total_sessions INT NULL;

            IF OBJECT_ID(N'dbo.ai_workout_recommendation', N'U') IS NOT NULL
               AND COL_LENGTH(N'dbo.ai_workout_recommendation', N'intensity_level') IS NULL
                ALTER TABLE dbo.ai_workout_recommendation ADD intensity_level NVARCHAR(30) NULL;

            -- Cho phép 1 đến 7 buổi mỗi tuần và lịch ngắn từ 1 tuần.
            IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_ai_workout_recommendation_sessions'
                       AND definition LIKE N'%(2)%')
            BEGIN
                ALTER TABLE dbo.ai_workout_recommendation DROP CONSTRAINT CK_ai_workout_recommendation_sessions;
                ALTER TABLE dbo.ai_workout_recommendation ADD CONSTRAINT CK_ai_workout_recommendation_sessions
                    CHECK (sessions_per_week >= 1 AND sessions_per_week <= 7);
            END
            IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_ai_workout_recommendation_weeks'
                       AND definition LIKE N'%>=(2)%')
            BEGIN
                ALTER TABLE dbo.ai_workout_recommendation DROP CONSTRAINT CK_ai_workout_recommendation_weeks;
                ALTER TABLE dbo.ai_workout_recommendation ADD CONSTRAINT CK_ai_workout_recommendation_weeks
                    CHECK (duration_weeks >= 1 AND duration_weeks <= 12);
            END
            """);
}
