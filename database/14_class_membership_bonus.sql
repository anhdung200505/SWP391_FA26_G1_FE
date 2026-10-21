/*
    AnhDuy Sport - Migration 14
    Gói hội viên không còn giảm học phí lớp. Thay vào đó:
    - Thanh toán lớp xong được tặng Hạng Đồng 1 tháng (membership.is_free = 1, payment_id NULL).
    - Lên cấp ngay cùng lúc đăng ký lớp: Bạc giảm 50%, Vàng giảm 25%, cộng chung hóa đơn lớp
      (payment.upgrade_package_id, payment.upgrade_amount).
    - Đang có gói còn hạn: gói nhận kèm lớp ở trạng thái 'scheduled', bắt đầu khi gói hiện tại hết hạn.

    Chạy sau 13_class_registration_log.sql. Script chạy lại nhiều lần không lỗi.

    sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -I -f 65001 -d AnhDuySport -i database\14_class_membership_bonus.sql
*/

USE AnhDuySport;
GO

/* ---------- 1. % giảm học phí lớp → % giảm khi lên cấp kèm lớp ----------
   Không dùng sp_rename cho cột: SQL Server báo lỗi 15336 (enforced dependencies) vì ràng buộc CHECK
   của cột cũ. Làm theo cách: xóa ràng buộc của cột cũ → xóa cột cũ → tạo cột mới → đặt lại giá trị. */
IF COL_LENGTH(N'dbo.membership_package', N'class_discount_percent') IS NOT NULL
BEGIN
    DECLARE @sql NVARCHAR(MAX) = N'';
    SELECT @sql += N'ALTER TABLE dbo.membership_package DROP CONSTRAINT ' + QUOTENAME(cc.name) + N'; '
    FROM sys.check_constraints AS cc
    WHERE cc.parent_object_id = OBJECT_ID(N'dbo.membership_package')
      AND cc.definition LIKE N'%class_discount_percent%';
    SELECT @sql += N'ALTER TABLE dbo.membership_package DROP CONSTRAINT ' + QUOTENAME(dc.name) + N'; '
    FROM sys.default_constraints AS dc
    INNER JOIN sys.columns AS c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
    WHERE dc.parent_object_id = OBJECT_ID(N'dbo.membership_package')
      AND c.name = N'class_discount_percent';
    IF LEN(@sql) > 0 EXEC sp_executesql @sql;
END
GO

IF COL_LENGTH(N'dbo.membership_package', N'class_discount_percent') IS NOT NULL
BEGIN
    ALTER TABLE membership_package DROP COLUMN class_discount_percent;
END
GO

IF COL_LENGTH(N'dbo.membership_package', N'upgrade_discount_percent') IS NULL
BEGIN
    ALTER TABLE membership_package ADD upgrade_discount_percent DECIMAL(5,2) NOT NULL
        CONSTRAINT DF_membership_package_upgrade_discount DEFAULT (0);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_membership_package_upgrade_discount')
BEGIN
    ALTER TABLE membership_package ADD CONSTRAINT CK_membership_package_upgrade_discount
        CHECK (upgrade_discount_percent BETWEEN 0 AND 100);
END
GO

UPDATE membership_package SET upgrade_discount_percent = 0,
    benefits = N'Tự do sử dụng phòng tập đa năng. Tặng miễn phí khi đăng ký lớp học.',
    updated_at = SYSUTCDATETIME()
WHERE package_code = N'PKG-001';

UPDATE membership_package SET upgrade_discount_percent = 50,
    benefits = N'Tự do sử dụng phòng tập đa năng. Sử dụng hồ bơi giờ thấp điểm. Giảm 50% khi lên cấp cùng lúc đăng ký lớp.',
    updated_at = SYSUTCDATETIME()
WHERE package_code = N'PKG-002';

UPDATE membership_package SET upgrade_discount_percent = 25,
    benefits = N'Tự do sử dụng toàn bộ cơ sở vật chất. 1 buổi tập riêng với HLV mỗi tháng. Giảm 25% khi lên cấp cùng lúc đăng ký lớp.',
    updated_at = SYSUTCDATETIME()
WHERE package_code = N'PKG-003';
GO

/* ---------- 2. membership: gói tặng + trạng thái 'scheduled' ---------- */
IF COL_LENGTH(N'dbo.membership', N'is_free') IS NULL
BEGIN
    ALTER TABLE membership ADD is_free BIT NOT NULL CONSTRAINT DF_membership_is_free DEFAULT (0);
END
GO

-- Gói tặng có payment_id NULL. UNIQUE thường của SQL Server chỉ cho 1 dòng NULL trên cả bảng
-- → đổi sang unique index có lọc.
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = N'UQ_membership_payment')
BEGIN
    ALTER TABLE membership DROP CONSTRAINT UQ_membership_payment;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_membership_payment')
BEGIN
    CREATE UNIQUE INDEX UX_membership_payment ON membership (payment_id) WHERE payment_id IS NOT NULL;
END
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints
           WHERE name = N'CK_membership_status' AND definition NOT LIKE N'%scheduled%')
BEGIN
    ALTER TABLE membership DROP CONSTRAINT CK_membership_status;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_membership_status')
BEGIN
    ALTER TABLE membership ADD CONSTRAINT CK_membership_status
        CHECK (status IN (N'pending', N'scheduled', N'active', N'expired', N'cancelled', N'upgraded', N'renewed'));
END
GO

/* ---------- 3. payment: gói lên cấp chọn kèm đơn lớp ---------- */
IF COL_LENGTH(N'dbo.payment', N'upgrade_package_id') IS NULL
BEGIN
    ALTER TABLE payment ADD upgrade_package_id INT NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_payment_upgrade_package')
BEGIN
    ALTER TABLE payment ADD CONSTRAINT FK_payment_upgrade_package
        FOREIGN KEY (upgrade_package_id) REFERENCES membership_package (membership_package_id);
END
GO

IF COL_LENGTH(N'dbo.payment', N'upgrade_amount') IS NULL
BEGIN
    ALTER TABLE payment ADD upgrade_amount DECIMAL(18,2) NOT NULL CONSTRAINT DF_payment_upgrade_amount DEFAULT (0);
END
GO
