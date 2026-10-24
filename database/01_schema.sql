/*
    AnhDuy Sport - SQL Server
    Database: AnhDuySport (schema V2)

    Schema gộp: tạo toàn bộ bảng ở trạng thái cuối cùng (đã gồm mọi migration 03-15 của bản V1),
    rồi thay mô hình slot bằng time_slot + class_schedule + session. Không còn file migration riêng.

    So với V1:
      BỎ:  slot, slot_registration, TR_slot_registration_limit, vw_slot_availability,
           material, consultation_request, sysdiagrams, vw_course_catalog, vw_coach_catalog, vw_facility_catalog.
      MỚI: time_slot, class_schedule, session, sport_room, coach_sport, TR_session_rules.
      ĐỔI: room (capacity NOT NULL, private_concurrency), course (format, session_minutes, session_count),
           class (class_type), assignment/attendance (slot_id -> session_id),
           payment (bỏ requested_slot_id), class_registration_log (bỏ slot_id và 2 action slot_*),
           training_plan (sport_id, mỗi môn tối đa 1 giáo án chuẩn).

    Mô hình lịch học
      time_slot       danh mục khung giờ cố định (kind = group: 3 giờ, private: 90 phút), không phụ thuộc thứ.
      class_schedule  lớp học vào thứ mấy (2..7 = thứ 2..thứ 7) và khung giờ nào mỗi tuần.
      session         buổi học cụ thể (một ngày). Lưu sẵn coach_user_id và room_id để đổi HLV hoặc phòng
                      cho riêng một buổi khi có sự cố. Giờ cố định, không đổi.

    Quy tắc do TR_session_rules bảo đảm (bỏ qua buổi cancelled):
      - khung giờ đúng loại lớp (group/private)
      - HLV dạy môn đó (coach_sport), phòng thuộc môn đó (sport_room, allow_group/allow_private)
      - lớp nhóm: sĩ số lớp <= room.capacity
      - HLV không có hai buổi trùng giờ
      - phòng: buổi nhóm độc quyền; buổi 1-1 dùng chung tối đa room.private_concurrency buổi cùng lúc
        (tính bảo thủ: đếm các buổi 1-1 giao với khoảng giờ của buổi đang xét)

    Chạy: powershell -ExecutionPolicy Bypass -File database\setup.ps1
    Hoặc:
      sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -I -f 65001 -i database\01_schema.sql
      sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -I -f 65001 -d AnhDuySport -i database\02_seed.sql

    CẢNH BÁO: file này XÓA và tạo lại database AnhDuySport (mất toàn bộ dữ liệu cũ).
*/

USE master;
GO

IF DB_ID(N'AnhDuySport') IS NOT NULL
BEGIN
    ALTER DATABASE AnhDuySport SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE AnhDuySport;
END
GO

CREATE DATABASE AnhDuySport COLLATE Vietnamese_CI_AS;
GO

USE AnhDuySport;
GO

SET QUOTED_IDENTIFIER ON;
GO

/* ===================== Người dùng và phân quyền ===================== */

CREATE TABLE role (
    role_id     INT IDENTITY(1,1) NOT NULL,
    role_code   NVARCHAR(50)  NOT NULL,
    role_name   NVARCHAR(100) NOT NULL,
    description NVARCHAR(500) NULL,
    CONSTRAINT PK_role PRIMARY KEY (role_id),
    CONSTRAINT UQ_role_code UNIQUE (role_code)
);
GO

CREATE TABLE role_permission (
    role_permission_id INT IDENTITY(1,1) NOT NULL,
    role_id            INT            NOT NULL,
    permission_code    NVARCHAR(100)  NOT NULL,
    permission_name    NVARCHAR(200)  NOT NULL,
    CONSTRAINT PK_role_permission PRIMARY KEY (role_permission_id),
    CONSTRAINT UQ_role_permission UNIQUE (role_id, permission_code),
    CONSTRAINT FK_role_permission_role FOREIGN KEY (role_id) REFERENCES role (role_id)
);
GO

CREATE TABLE center (
    center_id   INT IDENTITY(1,1) NOT NULL,
    center_name NVARCHAR(200) NOT NULL,
    address     NVARCHAR(500) NULL,
    phone       NVARCHAR(20)  NULL,
    email       NVARCHAR(200) NULL,
    area_m2     DECIMAL(10,2) NULL,
    description NVARCHAR(MAX) NULL,
    CONSTRAINT PK_center PRIMARY KEY (center_id)
);
GO

CREATE TABLE [user] (
    user_id       INT IDENTITY(1,1) NOT NULL,
    role_id       INT            NOT NULL,
    center_id     INT            NULL,
    full_name     NVARCHAR(200)  NOT NULL,
    email         NVARCHAR(200)  NULL,
    phone         NVARCHAR(20)   NULL,
    password_hash NVARCHAR(255)  NULL,
    date_of_birth DATE           NULL,
    gender        NVARCHAR(20)   NULL,
    avatar_url    NVARCHAR(500)  NULL,
    status        NVARCHAR(30)   NOT NULL CONSTRAINT DF_user_status DEFAULT (N'active'),
    created_at    DATETIME2(0)   NOT NULL CONSTRAINT DF_user_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_user PRIMARY KEY (user_id),
    CONSTRAINT UQ_user_email UNIQUE (email),
    CONSTRAINT FK_user_role FOREIGN KEY (role_id) REFERENCES role (role_id),
    CONSTRAINT FK_user_center FOREIGN KEY (center_id) REFERENCES center (center_id),
    CONSTRAINT CK_user_status CHECK (status IN (N'active', N'inactive', N'locked'))
);
GO

CREATE UNIQUE INDEX UQ_user_phone ON [user] (phone) WHERE phone IS NOT NULL;
GO

CREATE TABLE pending_registration (
    email          NVARCHAR(200) NOT NULL,
    full_name      NVARCHAR(200) NOT NULL,
    phone          NVARCHAR(20)  NULL,
    password_hash  NVARCHAR(255) NOT NULL,
    otp_hash       NVARCHAR(64)  NOT NULL,
    attempts       INT           NOT NULL CONSTRAINT DF_pending_registration_attempts DEFAULT (0),
    created_at     DATETIME2(0)  NOT NULL,
    expires_at     DATETIME2(0)  NOT NULL,
    CONSTRAINT PK_pending_registration PRIMARY KEY (email)
);
GO

CREATE UNIQUE INDEX UQ_pending_registration_phone ON pending_registration (phone) WHERE phone IS NOT NULL;
GO

CREATE TABLE password_reset (
    email       NVARCHAR(200) NOT NULL,
    otp_hash    NVARCHAR(64)  NOT NULL,
    attempts    INT           NOT NULL CONSTRAINT DF_password_reset_attempts DEFAULT (0),
    created_at  DATETIME2(0)  NOT NULL,
    expires_at  DATETIME2(0)  NOT NULL,
    CONSTRAINT PK_password_reset PRIMARY KEY (email)
);
GO

/* ===================== Môn, phòng, khóa học ===================== */

CREATE TABLE sport (
    sport_id    INT IDENTITY(1,1) NOT NULL,
    sport_code  NVARCHAR(50)  NOT NULL,
    sport_name  NVARCHAR(100) NOT NULL,
    category    NVARCHAR(100) NULL,
    CONSTRAINT PK_sport PRIMARY KEY (sport_id),
    CONSTRAINT UQ_sport_code UNIQUE (sport_code)
);
GO

-- capacity: số người tối đa của phòng. private_concurrency: số buổi 1-1 tối đa diễn ra cùng lúc trong phòng.
CREATE TABLE room (
    room_id             INT IDENTITY(1,1) NOT NULL,
    center_id           INT            NOT NULL,
    room_code           NVARCHAR(50)   NOT NULL,
    room_name           NVARCHAR(200)  NOT NULL,
    room_type           NVARCHAR(100)  NULL,
    capacity            INT            NOT NULL,
    private_concurrency INT            NOT NULL CONSTRAINT DF_room_private_concurrency DEFAULT (1),
    area_m2             DECIMAL(10,2)  NULL,
    description         NVARCHAR(MAX)  NULL,
    image_path          NVARCHAR(500)  NULL,
    CONSTRAINT PK_room PRIMARY KEY (room_id),
    CONSTRAINT UQ_room_code UNIQUE (room_code),
    CONSTRAINT FK_room_center FOREIGN KEY (center_id) REFERENCES center (center_id),
    CONSTRAINT CK_room_capacity CHECK (capacity > 0),
    CONSTRAINT CK_room_private_concurrency CHECK (private_concurrency > 0)
);
GO

-- Phòng nào dùng được cho môn nào, cho lớp nhóm và/hoặc học 1-1.
CREATE TABLE sport_room (
    sport_room_id INT IDENTITY(1,1) NOT NULL,
    sport_id      INT NOT NULL,
    room_id       INT NOT NULL,
    allow_group   BIT NOT NULL CONSTRAINT DF_sport_room_group DEFAULT (1),
    allow_private BIT NOT NULL CONSTRAINT DF_sport_room_private DEFAULT (1),
    CONSTRAINT PK_sport_room PRIMARY KEY (sport_room_id),
    CONSTRAINT UQ_sport_room UNIQUE (sport_id, room_id),
    CONSTRAINT FK_sport_room_sport FOREIGN KEY (sport_id) REFERENCES sport (sport_id),
    CONSTRAINT FK_sport_room_room FOREIGN KEY (room_id) REFERENCES room (room_id)
);
GO

-- HLV dạy được môn nào.
CREATE TABLE coach_sport (
    coach_sport_id INT IDENTITY(1,1) NOT NULL,
    coach_user_id  INT NOT NULL,
    sport_id       INT NOT NULL,
    CONSTRAINT PK_coach_sport PRIMARY KEY (coach_sport_id),
    CONSTRAINT UQ_coach_sport UNIQUE (coach_user_id, sport_id),
    CONSTRAINT FK_coach_sport_user FOREIGN KEY (coach_user_id) REFERENCES [user] (user_id),
    CONSTRAINT FK_coach_sport_sport FOREIGN KEY (sport_id) REFERENCES sport (sport_id)
);
GO

-- format = group: học phí là course.price cho cả lớp. format = private: gói 1-1 gồm session_count buổi, mỗi buổi session_minutes phút, giá là course.price.
CREATE TABLE course (
    course_id       INT IDENTITY(1,1) NOT NULL,
    sport_id        INT            NOT NULL,
    course_code     NVARCHAR(50)   NOT NULL,
    course_name     NVARCHAR(200)  NOT NULL,
    level_name      NVARCHAR(50)   NULL,
    age_range       NVARCHAR(50)   NULL,
    description     NVARCHAR(MAX)  NULL,
    price           DECIMAL(18,2)  NOT NULL CONSTRAINT DF_course_price DEFAULT (0),
    image_path      NVARCHAR(500)  NULL,
    status          NVARCHAR(30)   NOT NULL CONSTRAINT DF_course_status DEFAULT (N'active'),
    format          NVARCHAR(20)   NOT NULL CONSTRAINT DF_course_format DEFAULT (N'group'),
    session_minutes INT            NULL,
    session_count   INT            NULL,
    CONSTRAINT PK_course PRIMARY KEY (course_id),
    CONSTRAINT UQ_course_code UNIQUE (course_code),
    CONSTRAINT FK_course_sport FOREIGN KEY (sport_id) REFERENCES sport (sport_id),
    CONSTRAINT CK_course_price CHECK (price >= 0),
    CONSTRAINT CK_course_status CHECK (status IN (N'active', N'inactive')),
    CONSTRAINT CK_course_format CHECK (format IN (N'group', N'private')),
    CONSTRAINT CK_course_private_fields CHECK (
        format = N'group'
        OR (session_minutes IS NOT NULL AND session_minutes > 0 AND session_count IS NOT NULL AND session_count > 0))
);
GO

-- sport_id: giáo án chuẩn của một môn (mỗi môn tối đa một). NULL với giáo án AI gợi ý cho học viên.
CREATE TABLE training_plan (
    training_plan_id    INT IDENTITY(1,1) NOT NULL,
    created_by_user_id  INT            NOT NULL,
    plan_name           NVARCHAR(200)  NOT NULL,
    description         NVARCHAR(MAX)  NULL,
    duration_weeks      INT            NULL,
    created_at          DATETIME2(0)   NOT NULL CONSTRAINT DF_training_plan_created_at DEFAULT (SYSUTCDATETIME()),
    sport_id            INT            NULL,
    CONSTRAINT PK_training_plan PRIMARY KEY (training_plan_id),
    CONSTRAINT FK_training_plan_user FOREIGN KEY (created_by_user_id) REFERENCES [user] (user_id),
    CONSTRAINT FK_training_plan_sport FOREIGN KEY (sport_id) REFERENCES sport (sport_id),
    CONSTRAINT CK_training_plan_weeks CHECK (duration_weeks IS NULL OR duration_weeks > 0)
);
GO

CREATE UNIQUE INDEX UX_training_plan_sport ON training_plan (sport_id) WHERE sport_id IS NOT NULL;
GO

/* ===================== Lớp học và lịch ===================== */

-- coach_user_id, room_id: giá trị mặc định khi sinh buổi học (session lưu bản sao riêng).
-- class_type = private: lớp 1-1 của một học viên, bắt buộc capacity = 1.
CREATE TABLE class (
    class_id          INT IDENTITY(1,1) NOT NULL,
    course_id         INT            NOT NULL,
    training_plan_id  INT            NOT NULL,
    coach_user_id     INT            NOT NULL,
    room_id           INT            NULL,
    class_name        NVARCHAR(200)  NOT NULL,
    start_date        DATE           NULL,
    end_date          DATE           NULL,
    capacity          INT            NULL,
    status            NVARCHAR(30)   NOT NULL CONSTRAINT DF_class_status DEFAULT (N'open'),
    class_type        NVARCHAR(20)   NOT NULL CONSTRAINT DF_class_type DEFAULT (N'group'),
    CONSTRAINT PK_class PRIMARY KEY (class_id),
    CONSTRAINT FK_class_course FOREIGN KEY (course_id) REFERENCES course (course_id),
    CONSTRAINT FK_class_training_plan FOREIGN KEY (training_plan_id) REFERENCES training_plan (training_plan_id),
    CONSTRAINT FK_class_coach FOREIGN KEY (coach_user_id) REFERENCES [user] (user_id),
    CONSTRAINT FK_class_room FOREIGN KEY (room_id) REFERENCES room (room_id),
    CONSTRAINT CK_class_capacity CHECK (capacity IS NULL OR capacity > 0),
    CONSTRAINT CK_class_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
    CONSTRAINT CK_class_status CHECK (status IN (N'open', N'ongoing', N'closed', N'cancelled')),
    CONSTRAINT CK_class_type CHECK (class_type IN (N'group', N'private')),
    CONSTRAINT CK_class_private_capacity CHECK (class_type = N'group' OR capacity = 1)
);
GO

CREATE TABLE class_enrollment (
    class_enrollment_id INT IDENTITY(1,1) NOT NULL,
    class_id            INT          NOT NULL,
    user_id             INT          NOT NULL,
    enrolled_at         DATETIME2(0) NOT NULL CONSTRAINT DF_class_enrollment_enrolled_at DEFAULT (SYSUTCDATETIME()),
    status              NVARCHAR(30) NOT NULL CONSTRAINT DF_class_enrollment_status DEFAULT (N'enrolled'),
    CONSTRAINT PK_class_enrollment PRIMARY KEY (class_enrollment_id),
    CONSTRAINT UQ_class_enrollment UNIQUE (class_id, user_id),
    CONSTRAINT FK_class_enrollment_class FOREIGN KEY (class_id) REFERENCES class (class_id),
    CONSTRAINT FK_class_enrollment_user FOREIGN KEY (user_id) REFERENCES [user] (user_id),
    CONSTRAINT CK_class_enrollment_status CHECK (status IN (N'enrolled', N'completed', N'cancelled'))
);
GO

-- Danh mục khung giờ cố định, dùng chung cho mọi thứ trong tuần.
CREATE TABLE time_slot (
    time_slot_id INT IDENTITY(1,1) NOT NULL,
    kind         NVARCHAR(20)  NOT NULL,
    start_time   TIME(0)       NOT NULL,
    end_time     TIME(0)       NOT NULL,
    label        NVARCHAR(100) NULL,
    is_active    BIT           NOT NULL CONSTRAINT DF_time_slot_active DEFAULT (1),
    CONSTRAINT PK_time_slot PRIMARY KEY (time_slot_id),
    CONSTRAINT UQ_time_slot UNIQUE (kind, start_time, end_time),
    CONSTRAINT CK_time_slot_kind CHECK (kind IN (N'group', N'private')),
    CONSTRAINT CK_time_slot_time CHECK (end_time > start_time)
);
GO

-- Lớp học vào thứ mấy, khung giờ nào mỗi tuần (weekday: 2..7 = thứ 2..thứ 7).
CREATE TABLE class_schedule (
    class_schedule_id INT IDENTITY(1,1) NOT NULL,
    class_id          INT     NOT NULL,
    weekday           TINYINT NOT NULL,
    time_slot_id      INT     NOT NULL,
    CONSTRAINT PK_class_schedule PRIMARY KEY (class_schedule_id),
    CONSTRAINT UQ_class_schedule UNIQUE (class_id, weekday, time_slot_id),
    CONSTRAINT FK_class_schedule_class FOREIGN KEY (class_id) REFERENCES class (class_id),
    CONSTRAINT FK_class_schedule_time_slot FOREIGN KEY (time_slot_id) REFERENCES time_slot (time_slot_id),
    CONSTRAINT CK_class_schedule_weekday CHECK (weekday BETWEEN 2 AND 7)
);
GO

-- Buổi học cụ thể. start_time/end_time sao chép từ time_slot lúc sinh buổi.
-- coach_user_id, room_id: người dạy và phòng của riêng buổi này (đổi khi có sự cố, giờ không đổi).
-- status: scheduled (đã xếp), held (giữ chỗ chờ thanh toán), cancelled, completed.
CREATE TABLE [session] (
    session_id    INT IDENTITY(1,1) NOT NULL,
    class_id      INT           NOT NULL,
    session_no    INT           NULL,
    session_date  DATE          NOT NULL,
    time_slot_id  INT           NOT NULL,
    start_time    TIME(0)       NOT NULL,
    end_time      TIME(0)       NOT NULL,
    coach_user_id INT           NOT NULL,
    room_id       INT           NOT NULL,
    status        NVARCHAR(20)  NOT NULL CONSTRAINT DF_session_status DEFAULT (N'scheduled'),
    note          NVARCHAR(500) NULL,
    created_at    DATETIME2(0)  NOT NULL CONSTRAINT DF_session_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_session PRIMARY KEY (session_id),
    CONSTRAINT UQ_session UNIQUE (class_id, session_date, time_slot_id),
    CONSTRAINT FK_session_class FOREIGN KEY (class_id) REFERENCES class (class_id),
    CONSTRAINT FK_session_time_slot FOREIGN KEY (time_slot_id) REFERENCES time_slot (time_slot_id),
    CONSTRAINT FK_session_coach FOREIGN KEY (coach_user_id) REFERENCES [user] (user_id),
    CONSTRAINT FK_session_room FOREIGN KEY (room_id) REFERENCES room (room_id),
    CONSTRAINT CK_session_time CHECK (end_time > start_time),
    CONSTRAINT CK_session_status CHECK (status IN (N'scheduled', N'held', N'cancelled', N'completed'))
);
GO

CREATE INDEX IX_session_coach_date ON [session] (coach_user_id, session_date);
CREATE INDEX IX_session_room_date ON [session] (room_id, session_date);
CREATE INDEX IX_session_class_date ON [session] (class_id, session_date);
GO

CREATE TRIGGER TR_session_rules
ON [session]
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM inserted WHERE status <> N'cancelled')
    BEGIN
        RETURN;
    END

    -- Khung giờ phải đúng loại lớp.
    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        INNER JOIN class AS c ON c.class_id = i.class_id
        INNER JOIN time_slot AS t ON t.time_slot_id = i.time_slot_id
        WHERE i.status <> N'cancelled' AND t.kind <> c.class_type
    )
    BEGIN
        THROW 50010, N'Khung giờ không đúng loại lớp (nhóm hoặc 1-1).', 1;
    END

    -- HLV phải dạy môn của lớp.
    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        INNER JOIN class AS c ON c.class_id = i.class_id
        INNER JOIN course AS co ON co.course_id = c.course_id
        WHERE i.status <> N'cancelled'
          AND NOT EXISTS (
              SELECT 1 FROM coach_sport AS cs
              WHERE cs.coach_user_id = i.coach_user_id AND cs.sport_id = co.sport_id)
    )
    BEGIN
        THROW 50011, N'Huấn luyện viên không dạy môn này.', 1;
    END

    -- Phòng phải thuộc môn của lớp (và cho phép loại lớp tương ứng).
    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        INNER JOIN class AS c ON c.class_id = i.class_id
        INNER JOIN course AS co ON co.course_id = c.course_id
        WHERE i.status <> N'cancelled'
          AND NOT EXISTS (
              SELECT 1 FROM sport_room AS sr
              WHERE sr.room_id = i.room_id
                AND sr.sport_id = co.sport_id
                AND ((c.class_type = N'group' AND sr.allow_group = 1)
                  OR (c.class_type = N'private' AND sr.allow_private = 1)))
    )
    BEGIN
        THROW 50012, N'Phòng không dùng được cho môn hoặc loại lớp này.', 1;
    END

    -- Lớp nhóm: sĩ số không vượt sức chứa phòng.
    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        INNER JOIN class AS c ON c.class_id = i.class_id
        INNER JOIN room AS r ON r.room_id = i.room_id
        WHERE i.status <> N'cancelled'
          AND c.class_type = N'group'
          AND c.capacity IS NOT NULL
          AND c.capacity > r.capacity
    )
    BEGIN
        THROW 50013, N'Sĩ số lớp vượt sức chứa của phòng.', 1;
    END

    -- HLV không có hai buổi trùng giờ.
    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        INNER JOIN [session] AS o WITH (UPDLOCK, HOLDLOCK)
            ON o.session_id <> i.session_id
           AND o.coach_user_id = i.coach_user_id
           AND o.session_date = i.session_date
           AND o.status <> N'cancelled'
           AND i.start_time < o.end_time
           AND i.end_time > o.start_time
        WHERE i.status <> N'cancelled'
    )
    BEGIN
        THROW 50014, N'Huấn luyện viên đã có buổi khác trùng giờ.', 1;
    END

    -- Phòng: buổi nhóm độc quyền, không trùng giờ với bất kỳ buổi nào khác.
    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        INNER JOIN class AS ci ON ci.class_id = i.class_id
        INNER JOIN [session] AS o WITH (UPDLOCK, HOLDLOCK)
            ON o.session_id <> i.session_id
           AND o.room_id = i.room_id
           AND o.session_date = i.session_date
           AND o.status <> N'cancelled'
           AND i.start_time < o.end_time
           AND i.end_time > o.start_time
        INNER JOIN class AS co ON co.class_id = o.class_id
        WHERE i.status <> N'cancelled'
          AND (ci.class_type = N'group' OR co.class_type = N'group')
    )
    BEGIN
        THROW 50015, N'Phòng đã có buổi học khác trùng giờ.', 1;
    END

    -- Phòng: buổi 1-1 dùng chung tối đa private_concurrency buổi cùng lúc.
    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        INNER JOIN class AS ci ON ci.class_id = i.class_id AND ci.class_type = N'private'
        INNER JOIN room AS r ON r.room_id = i.room_id
        WHERE i.status <> N'cancelled'
          AND (
              SELECT COUNT(*)
              FROM [session] AS o
              INNER JOIN class AS co ON co.class_id = o.class_id AND co.class_type = N'private'
              WHERE o.room_id = i.room_id
                AND o.session_date = i.session_date
                AND o.status <> N'cancelled'
                AND i.start_time < o.end_time
                AND i.end_time > o.start_time
          ) > r.private_concurrency
    )
    BEGIN
        THROW 50016, N'Phòng đã đủ số buổi 1-1 cùng lúc.', 1;
    END
END
GO

CREATE TABLE assignment (
    assignment_id INT IDENTITY(1,1) NOT NULL,
    session_id    INT            NOT NULL,
    title         NVARCHAR(200)  NOT NULL,
    description   NVARCHAR(MAX)  NULL,
    due_at        DATETIME2(0)   NULL,
    CONSTRAINT PK_assignment PRIMARY KEY (assignment_id),
    CONSTRAINT FK_assignment_session FOREIGN KEY (session_id) REFERENCES [session] (session_id)
);
GO

CREATE TABLE attendance (
    attendance_id INT IDENTITY(1,1) NOT NULL,
    session_id    INT          NOT NULL,
    user_id       INT          NOT NULL,
    check_in_at   DATETIME2(0) NULL,
    status        NVARCHAR(30) NOT NULL,
    CONSTRAINT PK_attendance PRIMARY KEY (attendance_id),
    CONSTRAINT UQ_attendance UNIQUE (session_id, user_id),
    CONSTRAINT FK_attendance_session FOREIGN KEY (session_id) REFERENCES [session] (session_id),
    CONSTRAINT FK_attendance_user FOREIGN KEY (user_id) REFERENCES [user] (user_id),
    CONSTRAINT CK_attendance_status CHECK (status IN (N'present', N'absent', N'late'))
);
GO

CREATE TABLE evaluation (
    evaluation_id      INT IDENTITY(1,1) NOT NULL,
    class_id           INT            NOT NULL,
    assignment_id      INT            NULL,
    evaluator_user_id  INT            NOT NULL,
    evaluated_user_id  INT            NOT NULL,
    reviewer_user_id   INT            NULL,
    score              DECIMAL(4,1)   NULL,
    comment            NVARCHAR(MAX)  NULL,
    evaluated_at       DATETIME2(0)   NOT NULL CONSTRAINT DF_evaluation_evaluated_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_evaluation PRIMARY KEY (evaluation_id),
    CONSTRAINT FK_evaluation_class FOREIGN KEY (class_id) REFERENCES class (class_id),
    CONSTRAINT FK_evaluation_assignment FOREIGN KEY (assignment_id) REFERENCES assignment (assignment_id),
    CONSTRAINT FK_evaluation_evaluator FOREIGN KEY (evaluator_user_id) REFERENCES [user] (user_id),
    CONSTRAINT FK_evaluation_evaluated FOREIGN KEY (evaluated_user_id) REFERENCES [user] (user_id),
    CONSTRAINT FK_evaluation_reviewer FOREIGN KEY (reviewer_user_id) REFERENCES [user] (user_id),
    CONSTRAINT CK_evaluation_score CHECK (score IS NULL OR (score >= 0 AND score <= 10)),
    CONSTRAINT CK_evaluation_users CHECK (evaluator_user_id <> evaluated_user_id)
);
GO

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
GO

/* Bài tập theo buổi, đề thi và tiêu chí do AI sinh cho đúng lớp của coach. slot: preview, draft, published. */
CREATE TABLE coach_course_brief (
    class_id      INT            NOT NULL,
    coach_user_id INT            NOT NULL,
    brief         NVARCHAR(2000) NOT NULL,
    updated_at    DATETIME2(0)   NOT NULL,
    CONSTRAINT PK_coach_course_brief PRIMARY KEY (class_id),
    CONSTRAINT FK_coach_course_brief_class FOREIGN KEY (class_id) REFERENCES class (class_id),
    CONSTRAINT FK_coach_course_brief_coach FOREIGN KEY (coach_user_id) REFERENCES [user] (user_id)
);
GO

CREATE TABLE coach_course_plan (
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
GO

CREATE TABLE coach_course_exercise (
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
GO

CREATE TABLE coach_course_exam_question (
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
GO

CREATE TABLE coach_course_rubric (
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
GO

/* ===================== Hóa đơn, thanh toán, hội viên ===================== */

CREATE TABLE invoice (
    invoice_id   INT IDENTITY(1,1) NOT NULL,
    user_id      INT            NOT NULL,
    invoice_code NVARCHAR(50)   NOT NULL,
    issued_at    DATETIME2(0)   NOT NULL CONSTRAINT DF_invoice_issued_at DEFAULT (SYSUTCDATETIME()),
    total_amount DECIMAL(18,2)  NOT NULL,
    status       NVARCHAR(30)   NOT NULL CONSTRAINT DF_invoice_status DEFAULT (N'issued'),
    CONSTRAINT PK_invoice PRIMARY KEY (invoice_id),
    CONSTRAINT UQ_invoice_code UNIQUE (invoice_code),
    CONSTRAINT FK_invoice_user FOREIGN KEY (user_id) REFERENCES [user] (user_id),
    CONSTRAINT CK_invoice_amount CHECK (total_amount >= 0),
    CONSTRAINT CK_invoice_status CHECK (status IN (N'draft', N'issued', N'paid', N'cancelled'))
);
GO

CREATE SEQUENCE dbo.invoice_code_seq AS INT START WITH 2 INCREMENT BY 1;
GO

-- Mỗi gói mua kèm lớp hoặc gia hạn là một payment. Gói hội viên: upgrade_package_id + upgrade_amount.
CREATE TABLE membership_package (
    membership_package_id    INT IDENTITY(1,1) NOT NULL,
    package_code             NVARCHAR(20)   NOT NULL,
    package_name             NVARCHAR(200)  NOT NULL,
    fee                      DECIMAL(18,2)  NOT NULL,
    validity_months          INT            NOT NULL,
    benefits                 NVARCHAR(MAX)  NULL,
    status                   NVARCHAR(30)   NOT NULL CONSTRAINT DF_membership_package_status DEFAULT (N'active'),
    created_at               DATETIME2(0)   NOT NULL CONSTRAINT DF_membership_package_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at               DATETIME2(0)   NULL,
    upgrade_discount_percent DECIMAL(5,2)   NOT NULL CONSTRAINT DF_membership_package_upgrade_discount DEFAULT (0),
    ai_regeneration_limit    INT            NOT NULL CONSTRAINT DF_membership_package_ai_regeneration DEFAULT (0),
    ai_token_limit           INT            NOT NULL CONSTRAINT DF_membership_package_ai_token DEFAULT (0),
    CONSTRAINT PK_membership_package PRIMARY KEY (membership_package_id),
    CONSTRAINT UQ_membership_package_code UNIQUE (package_code),
    CONSTRAINT CK_membership_package_fee CHECK (fee > 0),
    CONSTRAINT CK_membership_package_months CHECK (validity_months = 1),
    CONSTRAINT CK_membership_package_status CHECK (status IN (N'active', N'inactive')),
    CONSTRAINT CK_membership_package_upgrade_discount CHECK (upgrade_discount_percent >= 0 AND upgrade_discount_percent <= 100),
    CONSTRAINT CK_membership_package_ai_regeneration CHECK (ai_regeneration_limit >= 0),
    CONSTRAINT CK_membership_package_ai_token CHECK (ai_token_limit >= 0)
);
GO

CREATE TABLE payment (
    payment_id            INT IDENTITY(1,1) NOT NULL,
    invoice_id            INT            NOT NULL,
    user_id               INT            NOT NULL,
    class_id              INT            NULL,
    amount                DECIMAL(18,2)  NOT NULL,
    payment_method        NVARCHAR(50)   NOT NULL,
    paid_at               DATETIME2(0)   NULL,
    status                NVARCHAR(30)   NOT NULL CONSTRAINT DF_payment_status DEFAULT (N'pending'),
    payos_order_code      BIGINT         NULL,
    checkout_url          NVARCHAR(500)  NULL,
    payment_link_id       NVARCHAR(100)  NULL,
    qr_code               NVARCHAR(1000) NULL,
    registered_by_user_id INT            NULL,
    upgrade_package_id    INT            NULL,
    upgrade_amount        DECIMAL(18,2)  NOT NULL CONSTRAINT DF_payment_upgrade_amount DEFAULT (0),
    CONSTRAINT PK_payment PRIMARY KEY (payment_id),
    CONSTRAINT FK_payment_invoice FOREIGN KEY (invoice_id) REFERENCES invoice (invoice_id),
    CONSTRAINT FK_payment_user FOREIGN KEY (user_id) REFERENCES [user] (user_id),
    CONSTRAINT FK_payment_class FOREIGN KEY (class_id) REFERENCES class (class_id),
    CONSTRAINT FK_payment_registered_by FOREIGN KEY (registered_by_user_id) REFERENCES [user] (user_id),
    CONSTRAINT FK_payment_upgrade_package FOREIGN KEY (upgrade_package_id) REFERENCES membership_package (membership_package_id),
    CONSTRAINT CK_payment_amount CHECK (amount >= 0),
    CONSTRAINT CK_payment_status CHECK (status IN (N'pending', N'paid', N'failed', N'refunded', N'cancel'))
);
GO

CREATE UNIQUE INDEX UX_payment_pending_per_class
    ON payment (user_id, class_id)
    WHERE status = N'pending' AND class_id IS NOT NULL;
CREATE UNIQUE INDEX UX_payment_payos_order_code
    ON payment (payos_order_code)
    WHERE payos_order_code IS NOT NULL;
GO

CREATE TABLE payment_history (
    payment_history_id INT IDENTITY(1,1) NOT NULL,
    payment_id         INT            NOT NULL,
    status             NVARCHAR(30)   NOT NULL,
    note               NVARCHAR(300)  NULL,
    created_at         DATETIME2(0)   NOT NULL CONSTRAINT DF_payment_history_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_payment_history PRIMARY KEY (payment_history_id),
    CONSTRAINT FK_payment_history_payment FOREIGN KEY (payment_id) REFERENCES payment (payment_id),
    CONSTRAINT CK_payment_history_status CHECK (status IN (N'pending', N'paid', N'cancel'))
);
GO

CREATE INDEX IX_payment_history_payment_id ON payment_history (payment_id, created_at);
GO

CREATE TABLE membership (
    membership_id         INT IDENTITY(1,1) NOT NULL,
    user_id               INT           NOT NULL,
    payment_id            INT           NULL,
    plan_name             NVARCHAR(200) NOT NULL,
    start_date            DATE          NOT NULL,
    end_date              DATE          NOT NULL,
    status                NVARCHAR(30)  NOT NULL CONSTRAINT DF_membership_status DEFAULT (N'active'),
    membership_package_id INT           NULL,
    is_free               BIT           NOT NULL CONSTRAINT DF_membership_is_free DEFAULT (0),
    CONSTRAINT PK_membership PRIMARY KEY (membership_id),
    CONSTRAINT FK_membership_user FOREIGN KEY (user_id) REFERENCES [user] (user_id),
    CONSTRAINT FK_membership_payment FOREIGN KEY (payment_id) REFERENCES payment (payment_id),
    CONSTRAINT FK_membership_package FOREIGN KEY (membership_package_id) REFERENCES membership_package (membership_package_id),
    CONSTRAINT CK_membership_dates CHECK (end_date >= start_date),
    CONSTRAINT CK_membership_status CHECK (status IN (N'pending', N'scheduled', N'active', N'expired', N'cancelled', N'upgraded', N'renewed'))
);
GO

CREATE UNIQUE INDEX UX_membership_payment ON membership (payment_id) WHERE payment_id IS NOT NULL;
CREATE UNIQUE INDEX UX_membership_one_active ON membership (user_id) WHERE status = N'active';
GO

-- Lịch sử đăng ký lớp (ai xếp học viên vào lớp, rút lớp, học lại...).
CREATE TABLE class_registration_log (
    class_registration_log_id INT IDENTITY(1,1) NOT NULL,
    member_user_id            INT            NOT NULL,
    class_id                  INT            NOT NULL,
    payment_id                INT            NULL,
    action                    NVARCHAR(30)   NOT NULL,
    reason                    NVARCHAR(500)  NULL,
    performed_by_user_id      INT            NULL,
    performed_by_role         NVARCHAR(50)   NOT NULL,
    created_at                DATETIME2(0)   NOT NULL,
    class_assigned_by         NVARCHAR(50)   NULL,
    CONSTRAINT PK_class_registration_log PRIMARY KEY (class_registration_log_id),
    CONSTRAINT FK_class_registration_log_member FOREIGN KEY (member_user_id) REFERENCES [user] (user_id),
    CONSTRAINT FK_class_registration_log_class FOREIGN KEY (class_id) REFERENCES class (class_id),
    CONSTRAINT FK_class_registration_log_payment FOREIGN KEY (payment_id) REFERENCES payment (payment_id),
    CONSTRAINT FK_class_registration_log_performer FOREIGN KEY (performed_by_user_id) REFERENCES [user] (user_id),
    CONSTRAINT CK_class_registration_log_action CHECK (action IN (N'register', N'move_out', N're_enroll', N'confirm_payment'))
);
GO

CREATE INDEX IX_class_registration_log_member ON class_registration_log (member_user_id, class_id, created_at);
GO

/* ===================== Hỗ trợ, thông báo, nhật ký ===================== */

CREATE TABLE support_request (
    support_request_id    INT IDENTITY(1,1) NOT NULL,
    member_user_id        INT            NULL,
    title                 NVARCHAR(200)  NOT NULL,
    description           NVARCHAR(MAX)  NOT NULL,
    system_category       NVARCHAR(30)   NOT NULL,
    classification_reason NVARCHAR(500)  NULL,
    receptionist_category NVARCHAR(30)   NULL,
    status                NVARCHAR(30)   NOT NULL,
    assigned_to_user_id   INT            NULL,
    decision              NVARCHAR(30)   NULL,
    resolution_note       NVARCHAR(MAX)  NULL,
    created_at            DATETIME2(0)   NOT NULL CONSTRAINT DF_support_request_created_at DEFAULT (SYSUTCDATETIME()),
    resolved_at           DATETIME2(0)   NULL,
    CONSTRAINT PK_support_request PRIMARY KEY (support_request_id),
    CONSTRAINT FK_support_request_member FOREIGN KEY (member_user_id) REFERENCES [user] (user_id),
    CONSTRAINT FK_support_request_assignee FOREIGN KEY (assigned_to_user_id) REFERENCES [user] (user_id),
    CONSTRAINT CK_support_request_system_category CHECK (system_category IN (N'consultation_account', N'financial_discount')),
    CONSTRAINT CK_support_request_receptionist_category CHECK (receptionist_category IS NULL OR receptionist_category IN (N'consultation', N'account_issue')),
    CONSTRAINT CK_support_request_status CHECK (status IN (N'pending_receptionist', N'pending_manager', N'classified', N'resolved')),
    CONSTRAINT CK_support_request_decision CHECK (decision IS NULL OR decision IN (N'approved', N'rejected'))
);
GO

CREATE INDEX IX_support_request_member ON support_request (member_user_id);
CREATE INDEX IX_support_request_assignee ON support_request (assigned_to_user_id);
CREATE INDEX IX_support_request_queue ON support_request (system_category, status);
GO

CREATE TABLE notification (
    notification_id INT IDENTITY(1,1) NOT NULL,
    user_id         INT            NOT NULL,
    title           NVARCHAR(200)  NOT NULL,
    content         NVARCHAR(MAX)  NOT NULL,
    is_read         BIT            NOT NULL CONSTRAINT DF_notification_is_read DEFAULT (0),
    created_at      DATETIME2(0)   NOT NULL CONSTRAINT DF_notification_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_notification PRIMARY KEY (notification_id),
    CONSTRAINT FK_notification_user FOREIGN KEY (user_id) REFERENCES [user] (user_id)
);
GO

CREATE TABLE audit_log (
    audit_log_id INT IDENTITY(1,1) NOT NULL,
    user_id      INT            NULL,
    action       NVARCHAR(100)  NOT NULL,
    entity_name  NVARCHAR(100)  NOT NULL,
    entity_id    INT            NULL,
    detail       NVARCHAR(MAX)  NULL,
    created_at   DATETIME2(0)   NOT NULL CONSTRAINT DF_audit_log_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_audit_log PRIMARY KEY (audit_log_id),
    CONSTRAINT FK_audit_log_user FOREIGN KEY (user_id) REFERENCES [user] (user_id)
);
GO

/* ===================== Gợi ý bài tập AI ===================== */

CREATE TABLE member_body_metric (
    body_metric_id INT IDENTITY(1,1) NOT NULL,
    user_id        INT           NOT NULL,
    height_cm      DECIMAL(5,1)  NOT NULL,
    weight_kg      DECIMAL(5,1)  NOT NULL,
    bmi            DECIMAL(4,1)  NOT NULL,
    bmi_category   NVARCHAR(50)  NOT NULL,
    recorded_at    DATETIME2(0)  NOT NULL,
    CONSTRAINT PK_member_body_metric PRIMARY KEY (body_metric_id),
    CONSTRAINT FK_member_body_metric_user FOREIGN KEY (user_id) REFERENCES [user] (user_id),
    CONSTRAINT CK_member_body_metric_height CHECK (height_cm >= 100 AND height_cm <= 250),
    CONSTRAINT CK_member_body_metric_weight CHECK (weight_kg >= 20 AND weight_kg <= 300)
);
GO

CREATE INDEX IX_member_body_metric_user ON member_body_metric (user_id, recorded_at);
GO

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
    CONSTRAINT CK_ai_workout_recommendation_sessions CHECK (sessions_per_week >= 2 AND sessions_per_week <= 6),
    CONSTRAINT CK_ai_workout_recommendation_minutes CHECK (session_minutes >= 20 AND session_minutes <= 90),
    CONSTRAINT CK_ai_workout_recommendation_weeks CHECK (duration_weeks >= 2 AND duration_weeks <= 12),
    CONSTRAINT CK_ai_workout_recommendation_revision CHECK (revision >= 1),
    CONSTRAINT CK_ai_workout_recommendation_status CHECK (status IN (N'proposed', N'saved', N'archived'))
);
GO

CREATE INDEX IX_ai_workout_recommendation_user ON ai_workout_recommendation (user_id, status);
GO

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
    CONSTRAINT FK_ai_workout_session_recommendation FOREIGN KEY (recommendation_id) REFERENCES ai_workout_recommendation (recommendation_id),
    CONSTRAINT CK_ai_workout_session_weekday CHECK (weekday >= 0 AND weekday <= 6)
);
GO

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
    CONSTRAINT FK_personal_exercise_recommendation FOREIGN KEY (recommendation_id) REFERENCES ai_workout_recommendation (recommendation_id),
    CONSTRAINT CK_personal_exercise_time CHECK (end_time > start_time),
    CONSTRAINT CK_personal_exercise_status CHECK (status IN (N'scheduled', N'cancelled'))
);
GO

CREATE INDEX IX_personal_exercise_user_date ON personal_exercise (user_id, exercise_date);
GO

CREATE TABLE ai_token_usage (
    ai_token_usage_id INT IDENTITY(1,1) NOT NULL,
    user_id           INT           NOT NULL,
    membership_id     INT           NOT NULL,
    action            NVARCHAR(30)  NOT NULL,
    total_tokens      INT           NOT NULL,
    created_at        DATETIME2(0)  NOT NULL,
    CONSTRAINT PK_ai_token_usage PRIMARY KEY (ai_token_usage_id),
    CONSTRAINT FK_ai_token_usage_user FOREIGN KEY (user_id) REFERENCES [user] (user_id),
    CONSTRAINT FK_ai_token_usage_membership FOREIGN KEY (membership_id) REFERENCES membership (membership_id),
    CONSTRAINT CK_ai_token_usage_action CHECK (action IN (N'generate', N'regenerate')),
    CONSTRAINT CK_ai_token_usage_tokens CHECK (total_tokens >= 0)
);
GO

CREATE INDEX IX_ai_token_usage_membership ON ai_token_usage (membership_id, action);
CREATE INDEX IX_ai_token_usage_user ON ai_token_usage (user_id);
GO

/* ===================== Chỉ mục khóa ngoại ===================== */

CREATE INDEX IX_role_permission_role_id ON role_permission (role_id);
CREATE INDEX IX_room_center_id ON room (center_id);
CREATE INDEX IX_user_role_id ON [user] (role_id);
CREATE INDEX IX_user_center_id ON [user] (center_id);
CREATE INDEX IX_sport_room_room_id ON sport_room (room_id);
CREATE INDEX IX_coach_sport_sport_id ON coach_sport (sport_id);
CREATE INDEX IX_course_sport_id ON course (sport_id);
CREATE INDEX IX_training_plan_created_by ON training_plan (created_by_user_id);
CREATE INDEX IX_class_course_id ON class (course_id);
CREATE INDEX IX_class_training_plan_id ON class (training_plan_id);
CREATE INDEX IX_class_coach_user_id ON class (coach_user_id);
CREATE INDEX IX_class_room_id ON class (room_id);
CREATE INDEX IX_class_enrollment_user_id ON class_enrollment (user_id);
CREATE INDEX IX_class_schedule_time_slot ON class_schedule (time_slot_id);
CREATE INDEX IX_session_time_slot ON [session] (time_slot_id);
CREATE INDEX IX_assignment_session_id ON assignment (session_id);
CREATE INDEX IX_attendance_user_id ON attendance (user_id);
CREATE INDEX IX_evaluation_class_id ON evaluation (class_id);
CREATE INDEX IX_evaluation_assignment_id ON evaluation (assignment_id);
CREATE INDEX IX_evaluation_evaluator ON evaluation (evaluator_user_id);
CREATE INDEX IX_evaluation_evaluated ON evaluation (evaluated_user_id);
CREATE INDEX IX_coach_training_history_member ON coach_training_history (member_user_id, recorded_at);
CREATE INDEX IX_coach_course_plan_class ON coach_course_plan (class_id);
CREATE INDEX IX_coach_course_exercise_plan ON coach_course_exercise (plan_id);
CREATE INDEX IX_coach_course_exercise_session ON coach_course_exercise (session_id);
CREATE INDEX IX_coach_course_exam_question_plan ON coach_course_exam_question (plan_id);
CREATE INDEX IX_coach_course_rubric_plan ON coach_course_rubric (plan_id);
CREATE INDEX IX_invoice_user_id ON invoice (user_id);
CREATE INDEX IX_payment_invoice_id ON payment (invoice_id);
CREATE INDEX IX_payment_user_id ON payment (user_id);
CREATE INDEX IX_payment_class_id ON payment (class_id);
CREATE INDEX IX_payment_registered_by ON payment (registered_by_user_id);
CREATE INDEX IX_payment_upgrade_package ON payment (upgrade_package_id);
CREATE INDEX IX_membership_user_id ON membership (user_id);
CREATE INDEX IX_membership_package_id ON membership (membership_package_id);
CREATE INDEX IX_class_registration_log_class ON class_registration_log (class_id);
CREATE INDEX IX_class_registration_log_payment ON class_registration_log (payment_id);
CREATE INDEX IX_notification_user_id ON notification (user_id);
CREATE INDEX IX_audit_log_user_id ON audit_log (user_id);
GO
