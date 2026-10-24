using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Data;

// Bảng bài AI của coach. Cơ sở đã tạo từ 01_schema thì bỏ qua.
public static class CoachCourseSchema
{
    public static Task EnsureAsync(AppDbContext db) =>
        db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID(N'dbo.coach_course_brief', N'U') IS NULL
            CREATE TABLE dbo.coach_course_brief (
                class_id      INT            NOT NULL,
                coach_user_id INT            NOT NULL,
                brief         NVARCHAR(2000) NOT NULL,
                updated_at    DATETIME2(0)   NOT NULL,
                CONSTRAINT PK_coach_course_brief PRIMARY KEY (class_id),
                CONSTRAINT FK_coach_course_brief_class FOREIGN KEY (class_id) REFERENCES class (class_id),
                CONSTRAINT FK_coach_course_brief_coach FOREIGN KEY (coach_user_id) REFERENCES [user] (user_id)
            );

            IF OBJECT_ID(N'dbo.coach_course_plan', N'U') IS NULL
            CREATE TABLE dbo.coach_course_plan (
                plan_id       INT IDENTITY(1,1) NOT NULL,
                class_id      INT            NOT NULL,
                coach_user_id INT            NOT NULL,
                slot          NVARCHAR(20)   NOT NULL,
                summary       NVARCHAR(1000) NULL,
                change_note   NVARCHAR(1000) NULL,
                created_at    DATETIME2(0)   NOT NULL,
                CONSTRAINT PK_coach_course_plan PRIMARY KEY (plan_id),
                CONSTRAINT UQ_coach_course_plan_slot UNIQUE (class_id, slot),
                CONSTRAINT FK_coach_course_plan_class FOREIGN KEY (class_id) REFERENCES class (class_id),
                CONSTRAINT FK_coach_course_plan_coach FOREIGN KEY (coach_user_id) REFERENCES [user] (user_id),
                CONSTRAINT CK_coach_course_plan_slot CHECK (slot IN (N'preview', N'draft', N'published'))
            );

            IF OBJECT_ID(N'dbo.coach_course_exercise', N'U') IS NULL
            CREATE TABLE dbo.coach_course_exercise (
                exercise_id  INT IDENTITY(1,1) NOT NULL,
                plan_id      INT            NOT NULL,
                session_id   INT            NOT NULL,
                sort_order   INT            NOT NULL,
                title        NVARCHAR(200)  NOT NULL,
                dosage       NVARCHAR(120)  NOT NULL,
                instructions NVARCHAR(2000) NOT NULL,
                CONSTRAINT PK_coach_course_exercise PRIMARY KEY (exercise_id),
                CONSTRAINT FK_coach_course_exercise_plan FOREIGN KEY (plan_id) REFERENCES coach_course_plan (plan_id) ON DELETE CASCADE,
                CONSTRAINT FK_coach_course_exercise_session FOREIGN KEY (session_id) REFERENCES [session] (session_id)
            );

            IF OBJECT_ID(N'dbo.coach_course_exam_question', N'U') IS NULL
            CREATE TABLE dbo.coach_course_exam_question (
                question_id      INT IDENTITY(1,1) NOT NULL,
                plan_id          INT            NOT NULL,
                sort_order       INT            NOT NULL,
                prompt           NVARCHAR(1000) NOT NULL,
                suggested_answer NVARCHAR(2000) NOT NULL,
                points           DECIMAL(4,1)   NOT NULL,
                CONSTRAINT PK_coach_course_exam_question PRIMARY KEY (question_id),
                CONSTRAINT FK_coach_course_exam_question_plan FOREIGN KEY (plan_id) REFERENCES coach_course_plan (plan_id) ON DELETE CASCADE,
                CONSTRAINT CK_coach_course_exam_points CHECK (points > 0 AND points <= 10)
            );

            IF OBJECT_ID(N'dbo.coach_course_rubric', N'U') IS NULL
            CREATE TABLE dbo.coach_course_rubric (
                rubric_id  INT IDENTITY(1,1) NOT NULL,
                plan_id    INT            NOT NULL,
                sort_order INT            NOT NULL,
                criterion  NVARCHAR(200)  NOT NULL,
                max_score  DECIMAL(4,1)   NOT NULL,
                guidance   NVARCHAR(1000) NOT NULL,
                CONSTRAINT PK_coach_course_rubric PRIMARY KEY (rubric_id),
                CONSTRAINT FK_coach_course_rubric_plan FOREIGN KEY (plan_id) REFERENCES coach_course_plan (plan_id) ON DELETE CASCADE,
                CONSTRAINT CK_coach_course_rubric_score CHECK (max_score > 0 AND max_score <= 10)
            );
            """);
}
