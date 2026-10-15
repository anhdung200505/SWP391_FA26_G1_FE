/*
    AnhDuy Sport - Migration 03
    payment.course_id -> payment.class_id

    Thanh toán học phí gắn với LỚP (class) thay vì khóa học (course),
    để khi thanh toán thành công hệ thống biết ghi danh vào lớp nào.
    class_id cho phép NULL vì payment của gói hội viên không gắn lớp.

    Chạy sau 01_schema.sql và 02_seed.sql. Script chạy lại nhiều lần không lỗi.

    sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -f 65001 -d AnhDuySport -i database\03_payment_class_id.sql
*/

USE AnhDuySport;
GO

IF COL_LENGTH(N'dbo.payment', N'class_id') IS NULL
BEGIN
    ALTER TABLE payment ADD class_id INT NULL;
END
GO

-- Backfill: mỗi course trong dữ liệu hiện có ứng với đúng 1 lớp.
IF COL_LENGTH(N'dbo.payment', N'course_id') IS NOT NULL
BEGIN
    EXEC(N'
        UPDATE p
        SET p.class_id = (
            SELECT TOP 1 cl.class_id
            FROM class AS cl
            WHERE cl.course_id = p.course_id
            ORDER BY cl.class_id)
        FROM payment AS p
        WHERE p.class_id IS NULL AND p.course_id IS NOT NULL;');
END
GO

IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_payment_course')
BEGIN
    ALTER TABLE payment DROP CONSTRAINT FK_payment_course;
END
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payment_course_id' AND object_id = OBJECT_ID(N'dbo.payment'))
BEGIN
    DROP INDEX IX_payment_course_id ON payment;
END
GO

IF COL_LENGTH(N'dbo.payment', N'course_id') IS NOT NULL
BEGIN
    ALTER TABLE payment DROP COLUMN course_id;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_payment_class')
BEGIN
    ALTER TABLE payment ADD CONSTRAINT FK_payment_class FOREIGN KEY (class_id) REFERENCES class (class_id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payment_class_id' AND object_id = OBJECT_ID(N'dbo.payment'))
BEGIN
    CREATE INDEX IX_payment_class_id ON payment (class_id);
END
GO
