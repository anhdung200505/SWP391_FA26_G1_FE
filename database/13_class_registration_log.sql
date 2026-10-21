/*
    AnhDuy Sport - Migration 13
    Lễ tân đăng ký lớp giùm học viên, cho học viên ra khỏi lớp và đăng ký học lại khi nghỉ đột xuất.

    1. payment.registered_by_user_id: ai tạo đơn đăng ký lớp (học viên tự đăng ký thì là chính học viên).
       Đơn lớp cũ được điền bằng user_id của học viên.
    2. class_registration_log: mỗi lần đăng ký (register), cho ra lớp (move_out), đăng ký học lại (re_enroll)
       ghi 1 dòng gồm người thao tác, vai trò lúc thao tác (MEMBER, RECEPTIONIST, ADMIN...) và lý do.
       Đơn lớp cũ được ghi bù 1 dòng register do chính học viên thực hiện.

    API cũng tự chạy các lệnh này lúc khởi động. Chạy sau 12_membership_package_discount.sql. Script chạy lại nhiều lần không lỗi.

    sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -I -f 65001 -d AnhDuySport -i database\13_class_registration_log.sql
*/

USE AnhDuySport;
GO

IF COL_LENGTH(N'dbo.payment', N'registered_by_user_id') IS NULL
BEGIN
    ALTER TABLE payment ADD registered_by_user_id INT NULL
        CONSTRAINT FK_payment_registered_by REFERENCES [user] (user_id);
END
GO

UPDATE payment SET registered_by_user_id = user_id
WHERE registered_by_user_id IS NULL AND class_id IS NOT NULL;
GO

IF OBJECT_ID(N'dbo.class_registration_log', N'U') IS NULL
BEGIN
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
        CONSTRAINT PK_class_registration_log PRIMARY KEY (class_registration_log_id),
        CONSTRAINT FK_class_registration_log_member FOREIGN KEY (member_user_id) REFERENCES [user] (user_id),
        CONSTRAINT FK_class_registration_log_class FOREIGN KEY (class_id) REFERENCES class (class_id),
        CONSTRAINT FK_class_registration_log_payment FOREIGN KEY (payment_id) REFERENCES payment (payment_id),
        CONSTRAINT FK_class_registration_log_performer FOREIGN KEY (performed_by_user_id) REFERENCES [user] (user_id),
        CONSTRAINT CK_class_registration_log_action CHECK (action IN (N'register', N'move_out', N're_enroll'))
    );
    CREATE INDEX IX_class_registration_log_member ON class_registration_log (member_user_id, class_id, created_at);

    INSERT INTO class_registration_log (member_user_id, class_id, payment_id, action, performed_by_user_id, performed_by_role, created_at)
    SELECT p.user_id, p.class_id, p.payment_id, N'register', p.user_id, N'MEMBER', COALESCE(i.issued_at, p.paid_at, SYSUTCDATETIME())
    FROM payment AS p
    LEFT JOIN invoice AS i ON i.invoice_id = p.invoice_id
    WHERE p.class_id IS NOT NULL;
END
GO
