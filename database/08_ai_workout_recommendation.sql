/*
    AnhDuy Sport - Migration 08
    Main flow: AI Workout Recommendation

    Access AI Recommendation → Input Body BMI Data → Input Personal Goals
    → Collect Health Data & Training History → Send Analysis Request
    → Analyze Health Metric & BMI → Generate Personalized Workout Plan
    → Receive AI Workout Plan → Edit Required?
         ├─ Yes → Enter Required Changes → Send New Analysis Request → tạo lại giáo án
         └─ No  → Save Plan to Member Account → Sync Schedule to Personal Calendar
                → View Daily Exercise Routine

    API tự tạo các bảng này lúc khởi động. Script chạy lại nhiều lần không lỗi.
    sqlcmd -S "localhost\SQLEXPRESS" -E -b -f 65001 -d AnhDuySport -i database\08_ai_workout_recommendation.sql
*/

IF OBJECT_ID(N'dbo.member_body_metric', N'U') IS NULL
BEGIN
    CREATE TABLE member_body_metric (
        body_metric_id INT IDENTITY(1,1) NOT NULL,
        user_id        INT            NOT NULL,
        height_cm      DECIMAL(5,1)   NOT NULL,
        weight_kg      DECIMAL(5,1)   NOT NULL,
        bmi            DECIMAL(4,1)   NOT NULL,
        bmi_category   NVARCHAR(50)   NOT NULL,
        recorded_at    DATETIME2(0)   NOT NULL,
        CONSTRAINT PK_member_body_metric PRIMARY KEY (body_metric_id),
        CONSTRAINT FK_member_body_metric_user FOREIGN KEY (user_id) REFERENCES [user] (user_id),
        CONSTRAINT CK_member_body_metric_height CHECK (height_cm BETWEEN 100 AND 250),
        CONSTRAINT CK_member_body_metric_weight CHECK (weight_kg BETWEEN 20 AND 300)
    );
END
GO

IF OBJECT_ID(N'dbo.ai_workout_recommendation', N'U') IS NULL
BEGIN
    CREATE TABLE ai_workout_recommendation (
        recommendation_id        INT IDENTITY(1,1) NOT NULL,
        user_id                  INT            NOT NULL,
        body_metric_id           INT            NOT NULL,
        goal                     NVARCHAR(500)  NOT NULL,
        sessions_per_week        INT            NOT NULL,
        session_minutes          INT            NOT NULL,
        change_note              NVARCHAR(1000) NULL,
        revision                 INT            NOT NULL CONSTRAINT DF_ai_workout_recommendation_revision DEFAULT (1),
        health_summary           NVARCHAR(MAX)  NOT NULL,
        training_history_summary NVARCHAR(MAX)  NOT NULL,
        analysis_request         NVARCHAR(MAX)  NOT NULL,
        analysis_summary         NVARCHAR(MAX)  NOT NULL,
        plan_name                NVARCHAR(200)  NOT NULL,
        duration_weeks           INT            NOT NULL,
        preferred_start_time     TIME(0)        NOT NULL,
        status                   NVARCHAR(30)   NOT NULL,
        training_plan_id         INT            NULL,
        created_at               DATETIME2(0)   NOT NULL,
        updated_at               DATETIME2(0)   NULL,
        CONSTRAINT PK_ai_workout_recommendation PRIMARY KEY (recommendation_id),
        CONSTRAINT FK_ai_workout_recommendation_user FOREIGN KEY (user_id) REFERENCES [user] (user_id),
        CONSTRAINT FK_ai_workout_recommendation_body FOREIGN KEY (body_metric_id) REFERENCES member_body_metric (body_metric_id),
        CONSTRAINT FK_ai_workout_recommendation_plan FOREIGN KEY (training_plan_id) REFERENCES training_plan (training_plan_id),
        CONSTRAINT CK_ai_workout_recommendation_sessions CHECK (sessions_per_week BETWEEN 2 AND 6),
        CONSTRAINT CK_ai_workout_recommendation_minutes CHECK (session_minutes BETWEEN 20 AND 90),
        CONSTRAINT CK_ai_workout_recommendation_weeks CHECK (duration_weeks BETWEEN 2 AND 12),
        CONSTRAINT CK_ai_workout_recommendation_revision CHECK (revision >= 1),
        CONSTRAINT CK_ai_workout_recommendation_status CHECK (status IN (N'proposed', N'saved', N'archived'))
    );
END
GO

IF OBJECT_ID(N'dbo.ai_workout_session', N'U') IS NULL
BEGIN
    CREATE TABLE ai_workout_session (
        workout_session_id INT IDENTITY(1,1) NOT NULL,
        recommendation_id  INT            NOT NULL,
        day_index          INT            NOT NULL,
        weekday_name       NVARCHAR(20)   NOT NULL,
        weekday            INT            NOT NULL,
        title              NVARCHAR(200)  NOT NULL,
        duration_minutes   INT            NOT NULL,
        intensity          NVARCHAR(30)   NOT NULL,
        exercises          NVARCHAR(MAX)  NOT NULL,
        CONSTRAINT PK_ai_workout_session PRIMARY KEY (workout_session_id),
        CONSTRAINT UQ_ai_workout_session_day UNIQUE (recommendation_id, day_index),
        CONSTRAINT FK_ai_workout_session_recommendation FOREIGN KEY (recommendation_id)
            REFERENCES ai_workout_recommendation (recommendation_id) ON DELETE CASCADE,
        CONSTRAINT CK_ai_workout_session_weekday CHECK (weekday BETWEEN 0 AND 6)
    );
END
GO

IF OBJECT_ID(N'dbo.personal_exercise', N'U') IS NULL
BEGIN
    CREATE TABLE personal_exercise (
        personal_exercise_id INT IDENTITY(1,1) NOT NULL,
        user_id              INT            NOT NULL,
        recommendation_id    INT            NOT NULL,
        exercise_date        DATE           NOT NULL,
        start_time           TIME(0)        NOT NULL,
        end_time             TIME(0)        NOT NULL,
        title                NVARCHAR(200)  NOT NULL,
        detail               NVARCHAR(MAX)  NOT NULL,
        status               NVARCHAR(30)   NOT NULL CONSTRAINT DF_personal_exercise_status DEFAULT (N'scheduled'),
        CONSTRAINT PK_personal_exercise PRIMARY KEY (personal_exercise_id),
        CONSTRAINT FK_personal_exercise_user FOREIGN KEY (user_id) REFERENCES [user] (user_id),
        CONSTRAINT FK_personal_exercise_recommendation FOREIGN KEY (recommendation_id)
            REFERENCES ai_workout_recommendation (recommendation_id),
        CONSTRAINT CK_personal_exercise_time CHECK (end_time > start_time),
        CONSTRAINT CK_personal_exercise_status CHECK (status IN (N'scheduled', N'cancelled'))
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_member_body_metric_user' AND object_id = OBJECT_ID(N'dbo.member_body_metric'))
    CREATE INDEX IX_member_body_metric_user ON member_body_metric (user_id, recorded_at);
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_ai_workout_recommendation_user' AND object_id = OBJECT_ID(N'dbo.ai_workout_recommendation'))
    CREATE INDEX IX_ai_workout_recommendation_user ON ai_workout_recommendation (user_id, status);
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_personal_exercise_user_date' AND object_id = OBJECT_ID(N'dbo.personal_exercise'))
    CREATE INDEX IX_personal_exercise_user_date ON personal_exercise (user_id, exercise_date);
GO

IF OBJECT_ID(N'dbo.coach_training_history', N'U') IS NULL
BEGIN
    CREATE TABLE coach_training_history (
        training_history_id INT IDENTITY(1,1) NOT NULL,
        member_user_id      INT            NOT NULL,
        coach_user_id       INT            NOT NULL,
        class_id            INT            NOT NULL,
        content             NVARCHAR(2000) NOT NULL,
        recorded_at         DATETIME2(0)   NOT NULL,
        CONSTRAINT PK_coach_training_history PRIMARY KEY (training_history_id),
        CONSTRAINT FK_coach_training_history_member FOREIGN KEY (member_user_id) REFERENCES [user] (user_id),
        CONSTRAINT FK_coach_training_history_coach FOREIGN KEY (coach_user_id) REFERENCES [user] (user_id),
        CONSTRAINT FK_coach_training_history_class FOREIGN KEY (class_id) REFERENCES class (class_id)
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_coach_training_history_member' AND object_id = OBJECT_ID(N'dbo.coach_training_history'))
    CREATE INDEX IX_coach_training_history_member ON coach_training_history (member_user_id, recorded_at);
