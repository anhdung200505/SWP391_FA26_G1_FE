/*
    AnhDuy Sport - Migration 12
    1. membership_package.class_discount_percent: % giảm học phí lớp cho học viên đang có gói.
    2. Gói mẫu đổi thành hạng Đồng / Bạc / Vàng, thời hạn 1 tháng.
    3. Mỗi học viên chỉ có 1 membership 'active' (thêm trạng thái 'renewed' cho gói cũ khi gia hạn).

    Chạy sau 11_membership_pending.sql. Script chạy lại nhiều lần không lỗi.

    sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -I -f 65001 -d AnhDuySport -i database\12_membership_package_discount.sql
*/

USE AnhDuySport;
GO

/* ---------- 1. Cột % giảm học phí ---------- */
IF COL_LENGTH(N'dbo.membership_package', N'class_discount_percent') IS NULL
BEGIN
    ALTER TABLE membership_package ADD class_discount_percent DECIMAL(5,2) NOT NULL
        CONSTRAINT DF_membership_package_discount DEFAULT (0);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_membership_package_discount')
BEGIN
    ALTER TABLE membership_package ADD CONSTRAINT CK_membership_package_discount
        CHECK (class_discount_percent BETWEEN 0 AND 100);
END
GO

/* ---------- 2. Gói mẫu: Đồng / Bạc / Vàng, 1 tháng ---------- */
UPDATE membership_package SET
    package_name = N'Hạng Đồng', fee = 200000, validity_months = 1, class_discount_percent = 5,
    benefits = N'Tự do sử dụng phòng tập đa năng. Giảm 5% học phí lớp học.',
    status = N'active', updated_at = SYSUTCDATETIME()
WHERE package_code = N'PKG-001';

UPDATE membership_package SET
    package_name = N'Hạng Bạc', fee = 350000, validity_months = 1, class_discount_percent = 10,
    benefits = N'Tự do sử dụng phòng tập đa năng. Sử dụng hồ bơi giờ thấp điểm. Giảm 10% học phí lớp học.',
    status = N'active', updated_at = SYSUTCDATETIME()
WHERE package_code = N'PKG-002';

UPDATE membership_package SET
    package_name = N'Hạng Vàng', fee = 500000, validity_months = 1, class_discount_percent = 15,
    benefits = N'Tự do sử dụng toàn bộ cơ sở vật chất. 1 buổi tập riêng với HLV mỗi tháng. Giảm 15% học phí lớp học.',
    status = N'active', updated_at = SYSUTCDATETIME()
WHERE package_code = N'PKG-003';
GO

-- Gói khác (nếu có) cũng về 1 tháng để ràng buộc bên dưới không lỗi
UPDATE membership_package SET validity_months = 1, updated_at = SYSUTCDATETIME()
WHERE validity_months <> 1;
GO

-- Mọi gói đều 1 tháng
IF EXISTS (SELECT 1 FROM sys.check_constraints
           WHERE name = N'CK_membership_package_months' AND definition <> N'([validity_months]=(1))')
BEGIN
    ALTER TABLE membership_package DROP CONSTRAINT CK_membership_package_months;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_membership_package_months')
BEGIN
    ALTER TABLE membership_package ADD CONSTRAINT CK_membership_package_months CHECK (validity_months = 1);
END
GO

-- Membership mẫu của 02_seed.sql chưa gắn gói: gắn vào Hạng Đồng, 1 tháng
UPDATE m SET
    m.membership_package_id = p.membership_package_id,
    m.plan_name = p.package_name,
    m.end_date = DATEADD(DAY, -1, DATEADD(MONTH, 1, m.start_date))
FROM membership AS m
CROSS JOIN membership_package AS p
WHERE p.package_code = N'PKG-001'
  AND m.membership_package_id IS NULL
  AND m.status = N'active';
GO

/* ---------- 3. Mỗi học viên chỉ 1 gói active ---------- */
IF EXISTS (SELECT 1 FROM sys.check_constraints
           WHERE name = N'CK_membership_status' AND definition NOT LIKE N'%renewed%')
BEGIN
    ALTER TABLE membership DROP CONSTRAINT CK_membership_status;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_membership_status')
BEGIN
    ALTER TABLE membership ADD CONSTRAINT CK_membership_status
        CHECK (status IN (N'pending', N'active', N'expired', N'cancelled', N'upgraded', N'renewed'));
END
GO

-- Gói đã quá hạn nhưng vẫn để 'active' → 'expired'
UPDATE membership SET status = N'expired'
WHERE status = N'active' AND end_date < CAST(GETDATE() AS DATE);
GO

-- Dữ liệu cũ có nhiều dòng active (gia hạn chồng nhau): gộp vào dòng hết hạn muộn nhất
;WITH ranked AS (
    SELECT membership_id,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY end_date DESC, membership_id DESC) AS rn,
           MIN(start_date) OVER (PARTITION BY user_id) AS first_start
    FROM membership
    WHERE status = N'active')
UPDATE m SET m.start_date = r.first_start
FROM membership AS m
INNER JOIN ranked AS r ON r.membership_id = m.membership_id
WHERE r.rn = 1;

;WITH ranked AS (
    SELECT membership_id,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY end_date DESC, membership_id DESC) AS rn
    FROM membership
    WHERE status = N'active')
UPDATE m SET m.status = N'renewed'
FROM membership AS m
INNER JOIN ranked AS r ON r.membership_id = m.membership_id
WHERE r.rn > 1;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_membership_one_active')
BEGIN
    CREATE UNIQUE INDEX UX_membership_one_active ON membership (user_id) WHERE status = N'active';
END
GO
