/*
    AnhDuy Sport - SQL Server
    Database: AnhDuySport
    Server dev: (localdb)\MSSQLLocalDB

    Script này tạo lại database từ đầu theo sơ đồ logic.
    Chạy file này trước, rồi chạy 02_seed.sql.
    Trong SSMS: mở file bằng UTF-8. Trong terminal:

    sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -f 65001 -i database\01_schema.sql
    sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -f 65001 -d AnhDuySport -i database\02_seed.sql

    Quan hệ trên sơ đồ -> khóa ngoại
    ----------------------------------------------------------
    role assigned_to user              user.role_id
    role defines role_permission       role_permission.role_id
    center localizes user              user.center_id
    center includes room               room.center_id
    room hosts class                   class.room_id
    user creates training_plan         training_plan.created_by_user_id
    user teaches class                 class.coach_user_id
    user enrolls class                 class_enrollment (user_id, class_id)
    class follows training_plan        class.training_plan_id
    class is_offered_as course         class.course_id
    course classifies sport            course.sport_id
    course has material                material.course_id
    user pays_for course               payment.user_id + payment.course_id
    invoice generates payment          payment.invoice_id
    payment issues membership          membership.payment_id
    user makes membership              membership.user_id
    class consists of slot             slot.class_id
    slot registration_limit            slot.registration_limit
    user registers slot                slot_registration (slot_id, user_id)
    assignment has slot                assignment.slot_id
    slot check_in attendance           attendance.slot_id + attendance.user_id
    evaluation is_assessed_through class   evaluation.class_id
    evaluation evaluates assignment        evaluation.assignment_id
    user evaluates evaluation              evaluation.evaluator_user_id
    user evaluated_in evaluation           evaluation.evaluated_user_id
    user reviews evaluation                evaluation.reviewer_user_id
    user receives consultation_request     consultation_request.received_by_user_id
    user receives notification             notification.user_id
    audit_log thuộc user                   audit_log.user_id
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

CREATE TABLE room (
    room_id     INT IDENTITY(1,1) NOT NULL,
    center_id   INT            NOT NULL,
    room_code   NVARCHAR(50)   NOT NULL,
    room_name   NVARCHAR(200)  NOT NULL,
    room_type   NVARCHAR(100)  NULL,
    capacity    INT            NULL,
    area_m2     DECIMAL(10,2)  NULL,
    description NVARCHAR(MAX)  NULL,
    image_path  NVARCHAR(500)  NULL,
    CONSTRAINT PK_room PRIMARY KEY (room_id),
    CONSTRAINT UQ_room_code UNIQUE (room_code),
    CONSTRAINT FK_room_center FOREIGN KEY (center_id) REFERENCES center (center_id),
    CONSTRAINT CK_room_capacity CHECK (capacity IS NULL OR capacity > 0)
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

CREATE TABLE sport (
    sport_id    INT IDENTITY(1,1) NOT NULL,
    sport_code  NVARCHAR(50)  NOT NULL,
    sport_name  NVARCHAR(100) NOT NULL,
    category    NVARCHAR(100) NULL,
    CONSTRAINT PK_sport PRIMARY KEY (sport_id),
    CONSTRAINT UQ_sport_code UNIQUE (sport_code)
);
GO

CREATE TABLE course (
    course_id   INT IDENTITY(1,1) NOT NULL,
    sport_id    INT            NOT NULL,
    course_code NVARCHAR(50)   NOT NULL,
    course_name NVARCHAR(200)  NOT NULL,
    level_name  NVARCHAR(50)   NULL,
    age_range   NVARCHAR(50)   NULL,
    description NVARCHAR(MAX)  NULL,
    price       DECIMAL(18,2)  NOT NULL CONSTRAINT DF_course_price DEFAULT (0),
    image_path  NVARCHAR(500)  NULL,
    status      NVARCHAR(30)   NOT NULL CONSTRAINT DF_course_status DEFAULT (N'active'),
    CONSTRAINT PK_course PRIMARY KEY (course_id),
    CONSTRAINT UQ_course_code UNIQUE (course_code),
    CONSTRAINT FK_course_sport FOREIGN KEY (sport_id) REFERENCES sport (sport_id),
    CONSTRAINT CK_course_price CHECK (price >= 0),
    CONSTRAINT CK_course_status CHECK (status IN (N'active', N'inactive'))
);
GO

CREATE TABLE material (
    material_id   INT IDENTITY(1,1) NOT NULL,
    course_id     INT            NOT NULL,
    title         NVARCHAR(200)  NOT NULL,
    material_type NVARCHAR(50)   NULL,
    file_url      NVARCHAR(500)  NULL,
    description   NVARCHAR(MAX)  NULL,
    CONSTRAINT PK_material PRIMARY KEY (material_id),
    CONSTRAINT FK_material_course FOREIGN KEY (course_id) REFERENCES course (course_id)
);
GO

CREATE TABLE training_plan (
    training_plan_id    INT IDENTITY(1,1) NOT NULL,
    created_by_user_id  INT            NOT NULL,
    plan_name           NVARCHAR(200)  NOT NULL,
    description         NVARCHAR(MAX)  NULL,
    duration_weeks      INT            NULL,
    created_at          DATETIME2(0)   NOT NULL CONSTRAINT DF_training_plan_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_training_plan PRIMARY KEY (training_plan_id),
    CONSTRAINT FK_training_plan_user FOREIGN KEY (created_by_user_id) REFERENCES [user] (user_id),
    CONSTRAINT CK_training_plan_weeks CHECK (duration_weeks IS NULL OR duration_weeks > 0)
);
GO

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
    CONSTRAINT PK_class PRIMARY KEY (class_id),
    CONSTRAINT FK_class_course FOREIGN KEY (course_id) REFERENCES course (course_id),
    CONSTRAINT FK_class_training_plan FOREIGN KEY (training_plan_id) REFERENCES training_plan (training_plan_id),
    CONSTRAINT FK_class_coach FOREIGN KEY (coach_user_id) REFERENCES [user] (user_id),
    CONSTRAINT FK_class_room FOREIGN KEY (room_id) REFERENCES room (room_id),
    CONSTRAINT CK_class_capacity CHECK (capacity IS NULL OR capacity > 0),
    CONSTRAINT CK_class_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
    CONSTRAINT CK_class_status CHECK (status IN (N'open', N'ongoing', N'closed', N'cancelled'))
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

CREATE TABLE slot (
    slot_id            INT IDENTITY(1,1) NOT NULL,
    class_id           INT           NOT NULL,
    room_id            INT           NULL,
    slot_date          DATE          NOT NULL,
    start_time         TIME(0)       NOT NULL,
    end_time           TIME(0)       NOT NULL,
    title              NVARCHAR(200) NULL,
    registration_limit INT           NOT NULL,
    CONSTRAINT PK_slot PRIMARY KEY (slot_id),
    CONSTRAINT FK_slot_class FOREIGN KEY (class_id) REFERENCES class (class_id),
    CONSTRAINT FK_slot_room FOREIGN KEY (room_id) REFERENCES room (room_id),
    CONSTRAINT CK_slot_time CHECK (end_time > start_time),
    CONSTRAINT CK_slot_registration_limit CHECK (registration_limit > 0)
);
GO

CREATE TABLE slot_registration (
    slot_registration_id INT IDENTITY(1,1) NOT NULL,
    slot_id              INT          NOT NULL,
    user_id              INT          NOT NULL,
    registered_at        DATETIME2(0) NOT NULL CONSTRAINT DF_slot_registration_registered_at DEFAULT (SYSUTCDATETIME()),
    status               NVARCHAR(30) NOT NULL CONSTRAINT DF_slot_registration_status DEFAULT (N'registered'),
    CONSTRAINT PK_slot_registration PRIMARY KEY (slot_registration_id),
    CONSTRAINT UQ_slot_registration UNIQUE (slot_id, user_id),
    CONSTRAINT FK_slot_registration_slot FOREIGN KEY (slot_id) REFERENCES slot (slot_id),
    CONSTRAINT FK_slot_registration_user FOREIGN KEY (user_id) REFERENCES [user] (user_id),
    CONSTRAINT CK_slot_registration_status CHECK (status IN (N'registered', N'cancelled'))
);
GO

CREATE TRIGGER TR_slot_registration_limit
ON slot_registration
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        INNER JOIN slot AS s ON s.slot_id = i.slot_id
        WHERE i.status = N'registered'
          AND NOT EXISTS (
              SELECT 1
              FROM class_enrollment AS e
              WHERE e.class_id = s.class_id
                AND e.user_id = i.user_id
                AND e.status = N'enrolled'
          )
    )
    BEGIN
        THROW 50001, N'Chỉ đăng ký slot khi đã ghi danh lớp của môn đó.', 1;
    END

    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        INNER JOIN slot AS s WITH (UPDLOCK, HOLDLOCK) ON s.slot_id = i.slot_id
        WHERE (
            SELECT COUNT(*)
            FROM slot_registration AS r
            WHERE r.slot_id = s.slot_id
              AND r.status = N'registered'
        ) > s.registration_limit
    )
    BEGIN
        THROW 50002, N'Slot đã đạt giới hạn đăng ký.', 1;
    END
END
GO

CREATE TABLE assignment (
    assignment_id INT IDENTITY(1,1) NOT NULL,
    slot_id       INT            NOT NULL,
    title         NVARCHAR(200)  NOT NULL,
    description   NVARCHAR(MAX)  NULL,
    due_at        DATETIME2(0)   NULL,
    CONSTRAINT PK_assignment PRIMARY KEY (assignment_id),
    CONSTRAINT FK_assignment_slot FOREIGN KEY (slot_id) REFERENCES slot (slot_id)
);
GO

CREATE TABLE attendance (
    attendance_id INT IDENTITY(1,1) NOT NULL,
    slot_id       INT          NOT NULL,
    user_id       INT          NOT NULL,
    check_in_at   DATETIME2(0) NULL,
    status        NVARCHAR(30) NOT NULL,
    CONSTRAINT PK_attendance PRIMARY KEY (attendance_id),
    CONSTRAINT UQ_attendance UNIQUE (slot_id, user_id),
    CONSTRAINT FK_attendance_slot FOREIGN KEY (slot_id) REFERENCES slot (slot_id),
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

CREATE TABLE payment (
    payment_id     INT IDENTITY(1,1) NOT NULL,
    invoice_id     INT            NOT NULL,
    user_id        INT            NOT NULL,
    course_id      INT            NULL,
    amount         DECIMAL(18,2)  NOT NULL,
    payment_method NVARCHAR(50)   NOT NULL,
    paid_at        DATETIME2(0)   NULL,
    status         NVARCHAR(30)   NOT NULL CONSTRAINT DF_payment_status DEFAULT (N'pending'),
    CONSTRAINT PK_payment PRIMARY KEY (payment_id),
    CONSTRAINT FK_payment_invoice FOREIGN KEY (invoice_id) REFERENCES invoice (invoice_id),
    CONSTRAINT FK_payment_user FOREIGN KEY (user_id) REFERENCES [user] (user_id),
    CONSTRAINT FK_payment_course FOREIGN KEY (course_id) REFERENCES course (course_id),
    CONSTRAINT CK_payment_amount CHECK (amount >= 0),
    CONSTRAINT CK_payment_status CHECK (status IN (N'pending', N'paid', N'failed', N'refunded', N'cancel'))
);
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
    membership_id INT IDENTITY(1,1) NOT NULL,
    user_id       INT           NOT NULL,
    payment_id    INT           NULL,
    plan_name     NVARCHAR(200) NOT NULL,
    start_date    DATE          NOT NULL,
    end_date      DATE          NOT NULL,
    status        NVARCHAR(30)  NOT NULL CONSTRAINT DF_membership_status DEFAULT (N'active'),
    CONSTRAINT PK_membership PRIMARY KEY (membership_id),
    CONSTRAINT UQ_membership_payment UNIQUE (payment_id),
    CONSTRAINT FK_membership_user FOREIGN KEY (user_id) REFERENCES [user] (user_id),
    CONSTRAINT FK_membership_payment FOREIGN KEY (payment_id) REFERENCES payment (payment_id),
    CONSTRAINT CK_membership_dates CHECK (end_date >= start_date),
    CONSTRAINT CK_membership_status CHECK (status IN (N'active', N'expired', N'cancelled'))
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

CREATE TABLE consultation_request (
    consultation_request_id INT IDENTITY(1,1) NOT NULL,
    received_by_user_id     INT            NULL,
    full_name               NVARCHAR(200)  NOT NULL,
    phone                   NVARCHAR(20)   NOT NULL,
    email                   NVARCHAR(200)  NULL,
    age                     INT            NULL,
    interested_sports       NVARCHAR(500)  NULL,
    status                  NVARCHAR(30)   NOT NULL CONSTRAINT DF_consultation_status DEFAULT (N'new'),
    created_at              DATETIME2(0)   NOT NULL CONSTRAINT DF_consultation_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_consultation_request PRIMARY KEY (consultation_request_id),
    CONSTRAINT FK_consultation_request_user FOREIGN KEY (received_by_user_id) REFERENCES [user] (user_id),
    CONSTRAINT CK_consultation_age CHECK (age IS NULL OR (age >= 1 AND age <= 99)),
    CONSTRAINT CK_consultation_status CHECK (status IN (N'new', N'received', N'closed'))
);
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

CREATE INDEX IX_role_permission_role_id ON role_permission (role_id);
CREATE INDEX IX_room_center_id ON room (center_id);
CREATE INDEX IX_user_role_id ON [user] (role_id);
CREATE INDEX IX_user_center_id ON [user] (center_id);
CREATE INDEX IX_course_sport_id ON course (sport_id);
CREATE INDEX IX_material_course_id ON material (course_id);
CREATE INDEX IX_training_plan_created_by ON training_plan (created_by_user_id);
CREATE INDEX IX_class_course_id ON class (course_id);
CREATE INDEX IX_class_training_plan_id ON class (training_plan_id);
CREATE INDEX IX_class_coach_user_id ON class (coach_user_id);
CREATE INDEX IX_class_room_id ON class (room_id);
CREATE INDEX IX_class_enrollment_user_id ON class_enrollment (user_id);
CREATE INDEX IX_slot_class_id ON slot (class_id);
CREATE INDEX IX_slot_room_id ON slot (room_id);
CREATE INDEX IX_slot_registration_user_id ON slot_registration (user_id);
CREATE INDEX IX_assignment_slot_id ON assignment (slot_id);
CREATE INDEX IX_attendance_user_id ON attendance (user_id);
CREATE INDEX IX_evaluation_class_id ON evaluation (class_id);
CREATE INDEX IX_evaluation_assignment_id ON evaluation (assignment_id);
CREATE INDEX IX_evaluation_evaluator ON evaluation (evaluator_user_id);
CREATE INDEX IX_evaluation_evaluated ON evaluation (evaluated_user_id);
CREATE INDEX IX_invoice_user_id ON invoice (user_id);
CREATE INDEX IX_payment_invoice_id ON payment (invoice_id);
CREATE INDEX IX_payment_user_id ON payment (user_id);
CREATE INDEX IX_payment_course_id ON payment (course_id);
CREATE INDEX IX_membership_user_id ON membership (user_id);
CREATE INDEX IX_audit_log_user_id ON audit_log (user_id);
CREATE INDEX IX_consultation_received_by ON consultation_request (received_by_user_id);
CREATE INDEX IX_notification_user_id ON notification (user_id);
GO

CREATE VIEW vw_course_catalog AS
SELECT
    c.course_id,
    c.course_code,
    c.course_name,
    c.level_name,
    c.age_range,
    c.description,
    c.price,
    c.image_path,
    c.status,
    s.sport_code,
    s.sport_name,
    s.category
FROM course AS c
INNER JOIN sport AS s ON s.sport_id = c.sport_id;
GO

CREATE VIEW vw_coach_catalog AS
SELECT
    u.user_id,
    u.full_name,
    u.email,
    u.phone,
    u.avatar_url,
    s.sport_name,
    cl.class_name
FROM [user] AS u
INNER JOIN role AS r ON r.role_id = u.role_id AND r.role_code = N'COACH'
INNER JOIN class AS cl ON cl.coach_user_id = u.user_id
INNER JOIN course AS c ON c.course_id = cl.course_id
INNER JOIN sport AS s ON s.sport_id = c.sport_id;
GO

CREATE VIEW vw_slot_availability AS
SELECT
    s.slot_id,
    sp.sport_name,
    c.course_name,
    cl.class_name,
    s.slot_date,
    s.start_time,
    s.end_time,
    s.title,
    s.registration_limit,
    SUM(CASE WHEN r.status = N'registered' THEN 1 ELSE 0 END) AS registered_count,
    s.registration_limit - SUM(CASE WHEN r.status = N'registered' THEN 1 ELSE 0 END) AS remaining
FROM slot AS s
INNER JOIN class AS cl ON cl.class_id = s.class_id
INNER JOIN course AS c ON c.course_id = cl.course_id
INNER JOIN sport AS sp ON sp.sport_id = c.sport_id
LEFT JOIN slot_registration AS r ON r.slot_id = s.slot_id
GROUP BY
    s.slot_id,
    sp.sport_name,
    c.course_name,
    cl.class_name,
    s.slot_date,
    s.start_time,
    s.end_time,
    s.title,
    s.registration_limit;
GO

CREATE VIEW vw_facility_catalog AS
SELECT
    r.room_id,
    r.room_code,
    r.room_name,
    r.room_type,
    r.capacity,
    r.area_m2,
    r.description,
    r.image_path,
    ct.center_name
FROM room AS r
INNER JOIN center AS ct ON ct.center_id = r.center_id;
GO
