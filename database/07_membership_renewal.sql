/*
    AnhDuy Sport - Migration 06
    Main flow: User Information Edit & Membership Renewal

    1. membership_package: tạo nếu chưa có (API /api/packages và luồng gia hạn đều cần).
       Thêm 3 gói mẫu nếu bảng đang rỗng.
    2. membership (đã có từ 01_schema.sql): thêm membership_package_id
       và cho phép status 'upgraded' (gói cũ bị thay khi nâng cấp).
    Nhánh tư vấn (Need Consultation = Yes) chỉ hiển thị số chăm sóc khách hàng lấy từ center.phone
    có sẵn (01_schema.sql), nên không cần bảng mới.

    Chạy sau 05_payment_pending_unique.sql (cần invoice_code_seq). Script chạy lại nhiều lần không lỗi.

    sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -f 65001 -d AnhDuySport -i database\06_membership_renewal.sql
*/

USE AnhDuySport;
GO

/* ---------- 1. membership_package ---------- */
IF OBJECT_ID(N'dbo.membership_package', N'U') IS NULL
BEGIN
    CREATE TABLE membership_package (
        membership_package_id INT IDENTITY(1,1) NOT NULL,
        package_code          NVARCHAR(20)   NOT NULL,
        package_name          NVARCHAR(200)  NOT NULL,
        fee                   DECIMAL(18,2)  NOT NULL,
        validity_months       INT            NOT NULL,
        benefits              NVARCHAR(MAX)  NULL,
        status                NVARCHAR(30)   NOT NULL CONSTRAINT DF_membership_package_status DEFAULT (N'active'),
        created_at            DATETIME2(0)   NOT NULL CONSTRAINT DF_membership_package_created_at DEFAULT (SYSUTCDATETIME()),
        updated_at            DATETIME2(0)   NULL,
        CONSTRAINT PK_membership_package PRIMARY KEY (membership_package_id),
        CONSTRAINT UQ_membership_package_code UNIQUE (package_code),
        CONSTRAINT CK_membership_package_fee CHECK (fee > 0),
        CONSTRAINT CK_membership_package_months CHECK (validity_months BETWEEN 1 AND 36),
        CONSTRAINT CK_membership_package_status CHECK (status IN (N'active', N'inactive'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM membership_package)
BEGIN
    INSERT INTO membership_package (package_code, package_name, fee, validity_months, benefits, status, updated_at) VALUES
        (N'PKG-001', N'Gói Cơ bản 1 tháng',   CAST(500000  AS DECIMAL(18,2)), 1, N'Tự do sử dụng phòng tập đa năng. Giảm 5% học phí khóa học.', N'active', SYSUTCDATETIME()),
        (N'PKG-002', N'Gói Học viên 3 tháng', CAST(1350000 AS DECIMAL(18,2)), 3, N'Tự do sử dụng phòng tập đa năng. Sử dụng hồ bơi giờ thấp điểm. Giảm 10% học phí khóa học.', N'active', SYSUTCDATETIME()),
        (N'PKG-003', N'Gói VIP 12 tháng',     CAST(4800000 AS DECIMAL(18,2)), 12, N'Tự do sử dụng toàn bộ cơ sở vật chất. 2 buổi tập riêng với HLV mỗi tháng. Giảm 20% học phí khóa học.', N'active', SYSUTCDATETIME());
END
GO

/* ---------- 2. membership: thêm cột ---------- */
IF COL_LENGTH(N'dbo.membership', N'membership_package_id') IS NULL
BEGIN
    ALTER TABLE membership ADD membership_package_id INT NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_membership_package')
BEGIN
    ALTER TABLE membership ADD CONSTRAINT FK_membership_package
        FOREIGN KEY (membership_package_id) REFERENCES membership_package (membership_package_id);
END
GO

-- Mở rộng trạng thái: thêm 'upgraded'
IF EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = N'CK_membership_status' AND definition NOT LIKE N'%upgraded%')
BEGIN
    ALTER TABLE membership DROP CONSTRAINT CK_membership_status;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_membership_status')
BEGIN
    ALTER TABLE membership ADD CONSTRAINT CK_membership_status
        CHECK (status IN (N'active', N'expired', N'cancelled', N'upgraded'));
END
GO
