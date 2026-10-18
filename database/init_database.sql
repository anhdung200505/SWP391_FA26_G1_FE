/*
    ====================================================================
    AnhDuy Sport - Full Database Initialization Script
    Database: AnhDuySport
    Server dev: (localdb)\MSSQLLocalDB

    Lưu ý:
    - Ngắt toàn bộ kết nối tới AnhDuySport, XÓA DATABASE CŨ và tạo lại.
    - Tất cả tài khoản có mật khẩu mặc định: 123 (Format Custom PBKDF2 SHA256)
    ====================================================================
*/

USE master;
GO

-- 1. NGẮT KẾT NỐI VÀ XÓA DATABASE CŨ NẾU TỒN TẠI
IF DB_ID(N'AnhDuySport') IS NOT NULL
BEGIN
    DECLARE @kill_spid VARCHAR(MAX) = '';
    
    SELECT @kill_spid = @kill_spid + 'KILL ' + CAST(session_id AS VARCHAR(5)) + ';'
    FROM sys.dm_exec_sessions
    WHERE database_id = DB_ID(N'AnhDuySport');

    EXEC(@kill_spid);

    ALTER DATABASE AnhDuySport SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE AnhDuySport;
END
GO

-- 2. TẠO DATABASE MỚI
CREATE DATABASE AnhDuySport COLLATE Vietnamese_CI_AS;
GO

USE AnhDuySport;
GO

SET QUOTED_IDENTIFIER ON;
GO

-- ====================================================================
-- PART 1: SCHEMA CREATION
-- ====================================================================

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
    class_id       INT            NULL,
    amount         DECIMAL(18,2)  NOT NULL,
    payment_method NVARCHAR(50)   NOT NULL,
    paid_at        DATETIME2(0)   NULL,
    status         NVARCHAR(30)   NOT NULL CONSTRAINT DF_payment_status DEFAULT (N'pending'),
    CONSTRAINT PK_payment PRIMARY KEY (payment_id),
    CONSTRAINT FK_payment_invoice FOREIGN KEY (invoice_id) REFERENCES invoice (invoice_id),
    CONSTRAINT FK_payment_user FOREIGN KEY (user_id) REFERENCES [user] (user_id),
    CONSTRAINT FK_payment_class FOREIGN KEY (class_id) REFERENCES class (class_id),
    CONSTRAINT CK_payment_amount CHECK (amount >= 0),
    CONSTRAINT CK_payment_status CHECK (status IN (N'pending', N'paid', N'failed', N'refunded'))
);
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

CREATE TABLE support_request (
    support_request_id      INT IDENTITY(1,1) NOT NULL,
    member_user_id          INT            NOT NULL,
    title                   NVARCHAR(200)  NOT NULL,
    description             NVARCHAR(MAX)  NOT NULL,
    system_category         NVARCHAR(30)   NOT NULL,
    classification_reason   NVARCHAR(500)  NULL,
    receptionist_category   NVARCHAR(30)   NULL,
    status                  NVARCHAR(30)   NOT NULL,
    assigned_to_user_id     INT            NULL,
    decision                NVARCHAR(30)   NULL,
    resolution_note         NVARCHAR(MAX)  NULL,
    created_at              DATETIME2(0)   NOT NULL CONSTRAINT DF_support_request_created_at DEFAULT (SYSUTCDATETIME()),
    resolved_at             DATETIME2(0)   NULL,
    CONSTRAINT PK_support_request PRIMARY KEY (support_request_id),
    CONSTRAINT FK_support_request_member FOREIGN KEY (member_user_id) REFERENCES [user] (user_id),
    CONSTRAINT FK_support_request_assignee FOREIGN KEY (assigned_to_user_id) REFERENCES [user] (user_id),
    CONSTRAINT CK_support_request_system_category CHECK (system_category IN (N'financial_discount', N'consultation_account')),
    CONSTRAINT CK_support_request_receptionist_category CHECK (receptionist_category IS NULL OR receptionist_category IN (N'account_issue', N'consultation')),
    CONSTRAINT CK_support_request_status CHECK (status IN (N'pending_manager', N'pending_receptionist', N'classified', N'resolved')),
    CONSTRAINT CK_support_request_decision CHECK (decision IS NULL OR decision IN (N'approved', N'rejected'))
);
GO

-- INDEXES
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
CREATE INDEX IX_payment_class_id ON payment (class_id);
CREATE INDEX IX_membership_user_id ON membership (user_id);
CREATE INDEX IX_audit_log_user_id ON audit_log (user_id);
CREATE INDEX IX_consultation_received_by ON consultation_request (received_by_user_id);
CREATE INDEX IX_notification_user_id ON notification (user_id);
CREATE INDEX IX_support_request_member ON support_request (member_user_id);
CREATE INDEX IX_support_request_assignee ON support_request (assigned_to_user_id);
CREATE INDEX IX_support_request_queue ON support_request (system_category, status);
GO

CREATE UNIQUE INDEX UX_payment_pending_per_class
    ON payment (user_id, class_id)
    WHERE status = N'pending' AND class_id IS NOT NULL;
GO

CREATE SEQUENCE dbo.invoice_code_seq AS INT START WITH 1 INCREMENT BY 1;
GO

-- VIEWS
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

-- ====================================================================
-- PART 2: SEED DATA (MẬT KHẨU TOÀN BỘ LÀ 123)
-- ====================================================================

INSERT INTO role (role_code, role_name, description) VALUES
    (N'ADMIN',         N'Quản trị',        N'Quản trị toàn bộ trung tâm'),
    (N'COACH',         N'Huấn luyện viên', N'Dạy lớp, điểm danh và đánh giá học viên'),
    (N'MEMBER',        N'Học viên',        N'Đăng ký khóa học và tham gia lớp'),
    (N'RECEPTIONIST',  N'Lễ tân',          N'Tiếp nhận tư vấn, hóa đơn và gói thành viên');

INSERT INTO role_permission (role_id, permission_code, permission_name)
SELECT r.role_id, v.permission_code, v.permission_name
FROM (VALUES
    (N'ADMIN',        N'USER_MANAGE',         N'Quản lý người dùng'),
    (N'ADMIN',        N'COURSE_MANAGE',       N'Quản lý khóa học'),
    (N'ADMIN',        N'PAYMENT_MANAGE',      N'Quản lý thanh toán'),
    (N'ADMIN',        N'REPORT_VIEW',         N'Xem báo cáo'),
    (N'COACH',        N'CLASS_TEACH',         N'Phụ trách lớp học'),
    (N'COACH',        N'ATTENDANCE_WRITE',    N'Điểm danh'),
    (N'COACH',        N'EVALUATION_WRITE',    N'Đánh giá học viên'),
    (N'MEMBER',       N'COURSE_ENROLL',       N'Đăng ký khóa học'),
    (N'MEMBER',       N'PROFILE_VIEW',        N'Xem hồ sơ cá nhân'),
    (N'RECEPTIONIST', N'CONSULTATION_RECEIVE', N'Tiếp nhận yêu cầu tư vấn'),
    (N'RECEPTIONIST', N'PAYMENT_CREATE',      N'Tạo thanh toán'),
    (N'RECEPTIONIST', N'MEMBERSHIP_ISSUE',    N'Cấp gói thành viên')
) AS v(role_code, permission_code, permission_name)
INNER JOIN role AS r ON r.role_code = v.role_code;

INSERT INTO center (center_name, address, phone, email, area_m2, description)
VALUES (
    N'AnhDuy Sport',
    N'Nhà Văn hóa Sinh viên TP.HCM',
    N'02873000000',
    N'contact@anhduysport.vn',
    1976,
    N'Trung tâm thể thao AnhDuy Sport. Sân vận động 1.976m², hồ bơi 50m chuẩn Olympic.'
);

INSERT INTO room (center_id, room_code, room_name, room_type, capacity, area_m2, description, image_path)
SELECT c.center_id, v.room_code, v.room_name, v.room_type, v.capacity, v.area_m2, v.description, v.image_path
FROM center AS c
CROSS JOIN (VALUES
    (N'ARENA',    N'Sân vận động AnhDuy',              N'ARENA',          2500, CAST(1976 AS DECIMAL(10,2)), N'Sân vận động chuẩn FIBA, sức chứa 1.500–2.500 chỗ.', N'assets/facilities/facility-arena-1024x683.webp'),
    (N'INDOOR',   N'Sân thi đấu đa năng',              N'INDOOR COURT',   80,   CAST(540 AS DECIMAL(10,2)),  N'Sân trong nhà cho bóng rổ, bóng chuyền và futsal.', N'assets/facilities/facility-basketball-1024x683.webp'),
    (N'POOL',     N'Hồ bơi chuẩn Olympic',             N'AQUATICS',       60,   NULL,                        N'Hồ bơi 50m, 10 làn, lọc nước UV + Ozone.', N'assets/facilities/facility-pool-1024x682.webp'),
    (N'GOLF-SIM', N'Phòng mô phỏng XSWING – Golf 3D',  N'GOLF SIMULATOR', 8,    NULL,                        N'Phòng tập golf mô phỏng 3D.', N'assets/facilities/facility-golf-sim-1024x683.webp'),
    (N'PUTTING',  N'Sân tập golf putting green',       N'PUTTING GREEN',  12,   NULL,                        N'Sân tập ngoài trời, mặt cỏ cao cấp.', N'assets/facilities/facility-golf-green-1024x576.webp'),
    (N'TENNIS',   N'Sân tennis ngoài trời',            N'TENNIS COURT',   4,    NULL,                        N'Sân tennis mặt acrylic ngoài trời.', N'assets/facilities/facility-tennis-1024x576.webp'),
    (N'THEATER',  N'Nhà hát và sân khấu',              N'THEATER',        370,  CAST(408 AS DECIMAL(10,2)),  N'Không gian trình chiếu, biểu diễn và hội thảo.', N'assets/facilities/facility-theater-1024x331.webp'),
    (N'TT-ROOM',  N'Phòng tập đa năng (không gương)',  N'TABLE TENNIS',   24,   NULL,                        N'Phòng rộng cho bóng bàn và tập luyện.', N'assets/facilities/facility-tabletennis-1024x683.webp'),
    (N'STUDIO',   N'Phòng tập đa năng (có gương)',     N'STUDIO',         30,   CAST(266 AS DECIMAL(10,2)),  N'Phòng gương cho võ thuật, múa và nhảy.', N'assets/facilities/taekwondo-1-1024x683.webp')
) AS v(room_code, room_name, room_type, capacity, area_m2, description, image_path);

INSERT INTO sport (sport_code, sport_name, category) VALUES
    (N'swimming',    N'Bơi lội',       N'Cá nhân'),
    (N'tabletennis', N'Bóng bàn',      N'Cá nhân'),
    (N'volleyball',  N'Bóng chuyền',   N'Đồng đội'),
    (N'soccer',      N'Bóng đá',       N'Đồng đội'),
    (N'basketball',  N'Bóng rổ',       N'Đồng đội'),
    (N'badminton',   N'Cầu lông',      N'Racket'),
    (N'chess',       N'Cờ vua',        N'Cá nhân'),
    (N'golf',        N'Golf 3D',       N'Cá nhân'),
    (N'fencing',     N'Kiếm thuật',    N'Cá nhân'),
    (N'dance',       N'Nhảy hiện đại', N'Cá nhân'),
    (N'tennis',      N'Quần vợt',      N'Racket'),
    (N'taekwondo',   N'Taekwondo',     N'Võ thuật');

-- MẬT KHẨU TẤT CẢ TÀI KHOẢN = 123 (Format PBKDF2 khớp 100% với PasswordHasher.cs)
INSERT INTO [user] (role_id, center_id, full_name, email, phone, password_hash, gender, avatar_url, status)
SELECT r.role_id, c.center_id, v.full_name, v.email, v.phone, N'pbkdf2.100000.4p3U4qY6R2/g31G9+eQ/EA==.k6k2n3WjO2+dE4qJ+sN0XvA4uJv+e9E3L8jK1a/Q+oM=', v.gender, v.avatar_url, N'active'
FROM (VALUES
    (N'ADMIN',        N'Quản trị AnhDuy',     N'admin@anhduysport.vn',        N'0901000001', NULL,      NULL),
    (N'RECEPTIONIST', N'Lễ tân AnhDuy',       N'letan@anhduysport.vn',        N'0901000002', NULL,      NULL),
    (N'COACH',        N'Paul Villanova',      N'paul.villanova@anhduysport.vn', N'0901000011', N'Nam',  N'assets/coachs/coach-basketball.webp'),
    (N'COACH',        N'Nguyễn Thị Ánh Viên', N'anhvien.nguyen@anhduysport.vn', N'0901000012', N'Nữ',   N'assets/coachs/coach-swimming.webp'),
    (N'COACH',        N'Ngô Bảo Nghi',        N'baonghi.ngo@anhduysport.vn',    N'0901000013', N'Nữ',   N'assets/coachs/coach-golf.webp'),
    (N'COACH',        N'Nguyễn Tôn Nhuận',    N'nhuan.nguyen@anhduysport.vn',   N'0901000014', N'Nam',  N'assets/coachs/coach-tennis-687x1024.webp'),
    (N'COACH',        N'Phan Hoàng Đăng',     N'dang.phan@anhduysport.vn',      N'0901000015', N'Nam',  N'assets/coachs/coach-tabletennis-683x1024.webp'),
    (N'COACH',        N'Huỳnh Trí Thịnh',     N'thinh.huynh@anhduysport.vn',    N'0901000016', N'Nam',  N'assets/coachs/coach-badminton.webp'),
    (N'COACH',        N'Phan Thị Thúy Hằng',  N'hang.phan@anhduysport.vn',      N'0901000017', N'Nữ',   N'assets/coachs/coach-taekwondo-683x1024.webp'),
    (N'COACH',        N'Lê Đình Trọng',       N'trong.le@anhduysport.vn',       N'0901000018', N'Nam',  N'assets/coachs/coach-soccer-683x1024.webp'),
    (N'MEMBER',       N'Nguyễn Minh Khang',   N'khang.nguyen@gmail.com',        N'0912000001', N'Nam',  NULL),
    (N'MEMBER',       N'Trần Gia Hân',        N'han.tran@gmail.com',            N'0912000002', N'Nữ',   NULL)
) AS v(role_code, full_name, email, phone, gender, avatar_url)
INNER JOIN role AS r ON r.role_code = v.role_code
CROSS JOIN center AS c;

INSERT INTO course (sport_id, course_code, course_name, level_name, age_range, description, price, image_path, status)
SELECT s.sport_id, v.course_code, v.course_name, v.level_name, v.age_range, v.description, v.price, v.image_path, N'active'
FROM (VALUES
    (N'swimming',    N'SWIM-01', N'Bơi lội',    N'BEGINNER',     N'6+',   N'Xây dựng kỹ thuật bơi an toàn, kiểm soát hơi thở, sức bền và sự tự tin trong môi trường nước.', CAST(1200000 AS DECIMAL(18,2)), N'assets/page course/swimming.webp'),
    (N'tabletennis', N'TT-01',   N'Bóng bàn',   N'BEGINNER',     N'7-17', N'Rèn phản xạ nhanh, kiểm soát bóng, kỹ thuật xoáy và khả năng xử lý tình huống tốc độ cao.', CAST(1000000 AS DECIMAL(18,2)), N'assets/page course/facility-tabletennis-1024x683.webp'),
    (N'soccer',      N'FB-01',   N'Bóng đá',    N'MỌI CẤP ĐỘ',   N'6-17', N'Huấn luyện kỹ thuật cá nhân, phối hợp đội hình, thể lực nền và tinh thần thi đấu đồng đội.', CAST(1500000 AS DECIMAL(18,2)), N'assets/page course/soccer-768x1024.webp'),
    (N'basketball',  N'BB-01',   N'Bóng rổ',    N'INTERMEDIATE', N'8-17', N'Rèn kỹ năng kiểm soát bóng, ném rổ, phòng thủ và tư duy chiến thuật trong nhịp độ thi đấu cao.', CAST(1500000 AS DECIMAL(18,2)), N'assets/page course/basketball-683x1024.webp'),
    (N'badminton',   N'BD-01',   N'Cầu lông',   N'MỌI CẤP ĐỘ',   N'7-17', N'Nâng cao tốc độ di chuyển, kỹ thuật cầu và khả năng phối hợp chiến thuật đơn hoặc đôi.', CAST(1100000 AS DECIMAL(18,2)), N'assets/page course/badminton-1-1024x678.webp'),
    (N'golf',        N'GOLF-01', N'Golf 3D',    N'INTERMEDIATE', N'8-17', N'Làm chủ tư thế swing, kiểm soát lực đánh và etiquette sân golf trong môi trường hướng dẫn chuyên nghiệp.', CAST(2000000 AS DECIMAL(18,2)), N'assets/page course/facility-golf-sim-1024x683.webp'),
    (N'tennis',      N'TN-01',   N'Quần vợt',   N'INTERMEDIATE', N'8-17', N'Tập trung vào footwork, cú đánh ổn định, phản xạ và tư duy thi đấu theo lộ trình chuyên nghiệp.', CAST(1800000 AS DECIMAL(18,2)), N'assets/page course/tennis-1.webp'),
    (N'taekwondo',   N'TKD-01',  N'Taekwondo',  N'FOUNDATION',   N'6-17', N'Rèn kỷ luật, sức bền, phản xạ và kỹ thuật tự vệ qua hệ thống bài tập võ thuật chuẩn mực.', CAST(1200000 AS DECIMAL(18,2)), N'assets/page course/taekwondo-1-1024x683.webp')
) AS v(sport_code, course_code, course_name, level_name, age_range, description, price, image_path)
INNER JOIN sport AS s ON s.sport_code = v.sport_code;

INSERT INTO material (course_id, title, material_type, description)
SELECT c.course_id, c.course_name + N' - Giáo án tuần 1', N'lesson', N'Tài liệu kỹ thuật buổi nhập môn.'
FROM course AS c;

INSERT INTO training_plan (created_by_user_id, plan_name, description, duration_weeks)
SELECT u.user_id, v.plan_name, v.description, v.duration_weeks
FROM (VALUES
    (N'anhvien.nguyen@anhduysport.vn', N'Giáo án bơi lội 8 tuần',    N'Làm quen nước, thở và kỹ thuật bơi ếch.', 8),
    (N'dang.phan@anhduysport.vn',      N'Giáo án bóng bàn 8 tuần',    N'Cầm vợt, giao bóng và xoáy cơ bản.', 8),
    (N'trong.le@anhduysport.vn',       N'Giáo án bóng đá 12 tuần',    N'Kỹ thuật cá nhân, phối hợp và thể lực.', 12),
    (N'paul.villanova@anhduysport.vn', N'Giáo án bóng rổ 12 tuần',    N'Dẫn bóng, ném rổ và phòng thủ.', 12),
    (N'thinh.huynh@anhduysport.vn',    N'Giáo án cầu lông 8 tuần',    N'Di chuyển, cầu thuận tay và đánh đôi.', 8),
    (N'baonghi.ngo@anhduysport.vn',    N'Giáo án golf 3D 8 tuần',     N'Tư thế swing và kiểm soát lực.', 8),
    (N'nhuan.nguyen@anhduysport.vn',   N'Giáo án quần vợt 10 tuần',   N'Footwork và cú đánh nền.', 10),
    (N'hang.phan@anhduysport.vn',      N'Giáo án taekwondo 12 tuần',  N'Kỷ luật, phẩm chất và kỹ thuật căn bản.', 12)
) AS v(email, plan_name, description, duration_weeks)
INNER JOIN [user] AS u ON u.email = v.email;

INSERT INTO class (course_id, training_plan_id, coach_user_id, room_id, class_name, start_date, end_date, capacity, status)
SELECT c.course_id, tp.training_plan_id, u.user_id, rm.room_id, v.class_name,
       CAST(GETDATE() AS DATE), DATEADD(WEEK, tp.duration_weeks, CAST(GETDATE() AS DATE)), v.capacity, N'ongoing'
FROM (VALUES
    (N'SWIM-01', N'anhvien.nguyen@anhduysport.vn', N'POOL',     N'Bơi lội - Sáng thứ 3 & 5',     16),
    (N'TT-01',   N'dang.phan@anhduysport.vn',      N'TT-ROOM',  N'Bóng bàn - Chiều thứ 4 & 6',   12),
    (N'FB-01',   N'trong.le@anhduysport.vn',       N'INDOOR',   N'Bóng đá - Tối thứ 2 & 4',      20),
    (N'BB-01',   N'paul.villanova@anhduysport.vn', N'ARENA',    N'Bóng rổ - Tối thứ 3 & 5',      16),
    (N'BD-01',   N'thinh.huynh@anhduysport.vn',    N'INDOOR',   N'Cầu lông - Sáng thứ 7',        12),
    (N'GOLF-01', N'baonghi.ngo@anhduysport.vn',    N'GOLF-SIM', N'Golf 3D - Chiều thứ 7',        6),
    (N'TN-01',   N'nhuan.nguyen@anhduysport.vn',   N'TENNIS',   N'Quần vợt - Sáng chủ nhật',     4),
    (N'TKD-01',  N'hang.phan@anhduysport.vn',      N'STUDIO',   N'Taekwondo - Tối thứ 6',        20)
) AS v(course_code, coach_email, room_code, class_name, capacity)
INNER JOIN course AS c ON c.course_code = v.course_code
INNER JOIN [user] AS u ON u.email = v.coach_email
INNER JOIN room AS rm ON rm.room_code = v.room_code
INNER JOIN training_plan AS tp ON tp.created_by_user_id = u.user_id;

INSERT INTO class_enrollment (class_id, user_id, status)
SELECT cl.class_id, u.user_id, N'enrolled'
FROM (VALUES
    (N'SWIM-01', N'khang.nguyen@gmail.com'),
    (N'BB-01',   N'khang.nguyen@gmail.com'),
    (N'TKD-01',  N'han.tran@gmail.com')
) AS v(course_code, email)
INNER JOIN course AS c ON c.course_code = v.course_code
INNER JOIN class AS cl ON cl.course_id = c.course_id
INNER JOIN [user] AS u ON u.email = v.email;

INSERT INTO slot (class_id, room_id, slot_date, start_time, end_time, title, registration_limit)
SELECT cl.class_id, cl.room_id, DATEADD(DAY, 2, CAST(GETDATE() AS DATE)), v.start_time, v.end_time, v.title, v.registration_limit
FROM (VALUES
    (N'SWIM-01', CAST('07:00' AS TIME), CAST('08:00' AS TIME), N'Làm quen nước và thở', 10),
    (N'TT-01',   CAST('16:00' AS TIME), CAST('17:30' AS TIME), N'Cầm vợt và giao bóng', 8),
    (N'FB-01',   CAST('18:00' AS TIME), CAST('19:30' AS TIME), N'Kỹ thuật dẫn bóng', 16),
    (N'BB-01',   CAST('18:30' AS TIME), CAST('20:00' AS TIME), N'Dẫn bóng và ném rổ', 12),
    (N'BD-01',   CAST('08:00' AS TIME), CAST('09:30' AS TIME), N'Di chuyển và cầu thuận tay', 8),
    (N'GOLF-01', CAST('14:00' AS TIME), CAST('15:30' AS TIME), N'Tư thế swing', 4),
    (N'TN-01',   CAST('08:00' AS TIME), CAST('09:30' AS TIME), N'Footwork', 4),
    (N'TKD-01',  CAST('18:00' AS TIME), CAST('19:30' AS TIME), N'Tư thế và kỹ thuật căn bản', 15)
) AS v(course_code, start_time, end_time, title, registration_limit)
INNER JOIN course AS c ON c.course_code = v.course_code
INNER JOIN class AS cl ON cl.course_id = c.course_id;

INSERT INTO slot_registration (slot_id, user_id, status)
SELECT s.slot_id, u.user_id, N'registered'
FROM (VALUES
    (N'SWIM-01', N'khang.nguyen@gmail.com'),
    (N'BB-01',   N'khang.nguyen@gmail.com'),
    (N'TKD-01',  N'han.tran@gmail.com')
) AS v(course_code, email)
INNER JOIN course AS c ON c.course_code = v.course_code
INNER JOIN class AS cl ON cl.course_id = c.course_id
INNER JOIN slot AS s ON s.class_id = cl.class_id
INNER JOIN [user] AS u ON u.email = v.email;

INSERT INTO assignment (slot_id, title, description, due_at)
SELECT
    s.slot_id,
    s.title,
    N'Bài tập thực hành trong buổi học.',
    DATEADD(
        HOUR,
        2,
        DATEADD(SECOND, DATEDIFF(SECOND, CAST('00:00:00' AS TIME), s.end_time), CAST(s.slot_date AS DATETIME2))
    )
FROM slot AS s;

INSERT INTO attendance (slot_id, user_id, check_in_at, status)
SELECT
    s.slot_id,
    u.user_id,
    DATEADD(
        MINUTE,
        -5,
        DATEADD(SECOND, DATEDIFF(SECOND, CAST('00:00:00' AS TIME), s.start_time), CAST(s.slot_date AS DATETIME2))
    ),
    N'present'
FROM course AS c
INNER JOIN class AS cl ON cl.course_id = c.course_id
INNER JOIN slot AS s ON s.class_id = cl.class_id
INNER JOIN [user] AS u ON u.email = N'khang.nguyen@gmail.com'
WHERE c.course_code = N'SWIM-01';

INSERT INTO evaluation (class_id, assignment_id, evaluator_user_id, evaluated_user_id, reviewer_user_id, score, comment)
SELECT cl.class_id, a.assignment_id, coach.user_id, student.user_id, reviewer.user_id, 8.5, N'Kiểm soát hơi thở ổn, cần thêm sức bền.'
FROM course AS c
INNER JOIN class AS cl ON cl.course_id = c.course_id
INNER JOIN slot AS s ON s.class_id = cl.class_id
INNER JOIN assignment AS a ON a.slot_id = s.slot_id
INNER JOIN [user] AS coach ON coach.user_id = cl.coach_user_id
INNER JOIN [user] AS student ON student.email = N'khang.nguyen@gmail.com'
INNER JOIN [user] AS reviewer ON reviewer.email = N'admin@anhduysport.vn'
WHERE c.course_code = N'SWIM-01';

INSERT INTO invoice (user_id, invoice_code, total_amount, status)
SELECT u.user_id, N'INV-2026-0001', CAST(2700000 AS DECIMAL(18,2)), N'paid'
FROM [user] AS u
WHERE u.email = N'khang.nguyen@gmail.com';

INSERT INTO payment (invoice_id, user_id, class_id, amount, payment_method, paid_at, status)
SELECT i.invoice_id, u.user_id, cl.class_id, c.price, N'chuyen_khoan', SYSUTCDATETIME(), N'paid'
FROM invoice AS i
INNER JOIN [user] AS u ON u.user_id = i.user_id
INNER JOIN course AS c ON c.course_code IN (N'SWIM-01', N'BB-01')
INNER JOIN class AS cl ON cl.course_id = c.course_id
WHERE i.invoice_code = N'INV-2026-0001';

INSERT INTO membership (user_id, payment_id, plan_name, start_date, end_date, status)
SELECT u.user_id, p.payment_id, N'Thành viên AnhDuy 3 tháng',
       CAST(GETDATE() AS DATE), DATEADD(MONTH, 3, CAST(GETDATE() AS DATE)), N'active'
FROM [user] AS u
INNER JOIN payment AS p ON p.user_id = u.user_id
INNER JOIN class AS cl ON cl.class_id = p.class_id
INNER JOIN course AS c ON c.course_id = cl.course_id AND c.course_code = N'SWIM-01'
WHERE u.email = N'khang.nguyen@gmail.com';

INSERT INTO consultation_request (received_by_user_id, full_name, phone, email, age, interested_sports, status)
SELECT u.user_id, N'Lê Hoàng Phúc', N'0987654321', N'phuc.le@gmail.com', 10, N'Bơi lội, Bóng đá', N'received'
FROM [user] AS u
WHERE u.email = N'letan@anhduysport.vn';

INSERT INTO notification (user_id, title, content, is_read)
SELECT u.user_id, N'Yêu cầu tư vấn mới', N'Lê Hoàng Phúc (10 tuổi) đăng ký tư vấn Bơi lội và Bóng đá.', 0
FROM [user] AS u
WHERE u.email = N'letan@anhduysport.vn';

INSERT INTO audit_log (user_id, action, entity_name, entity_id, detail)
SELECT u.user_id, N'SEED', N'center', c.center_id, N'Khởi tạo dữ liệu trung tâm AnhDuy Sport.'
FROM [user] AS u
CROSS JOIN center AS c
WHERE u.email = N'admin@anhduysport.vn';
GO