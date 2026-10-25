/*
    AnhDuy Sport - Bổ sung cho luồng "User Information Edit & Membership Renewal"

    Chạy sau 01_schema.sql (setup.ps1 tự chạy file này). Chạy lại nhiều lần không lỗi.
      1. Bảng email_change: đổi email đang chờ xác thực OTP (cùng cách làm với password_reset).
      2. Gói hội viên bao nhiêu tháng cũng được (1 tháng = 30 ngày), không còn chỉ 1 tháng.
      3. Mỗi học viên chỉ giữ 1 đơn gói chờ thanh toán.
*/
USE AnhDuySport;
GO

-- 1. Đổi email đang chờ xác thực OTP. OTP gửi tới new_email, chỉ lưu hash.
-- ON DELETE CASCADE: học viên tự xóa tài khoản thì yêu cầu đổi email cũng mất theo.
IF OBJECT_ID(N'dbo.email_change', N'U') IS NULL
BEGIN
    CREATE TABLE email_change (
        user_id     INT           NOT NULL,
        new_email   NVARCHAR(200) NOT NULL,
        otp_hash    NVARCHAR(64)  NOT NULL,
        attempts    INT           NOT NULL CONSTRAINT DF_email_change_attempts DEFAULT (0),
        created_at  DATETIME2(0)  NOT NULL,
        expires_at  DATETIME2(0)  NOT NULL,
        CONSTRAINT PK_email_change PRIMARY KEY (user_id),
        CONSTRAINT FK_email_change_user FOREIGN KEY (user_id) REFERENCES [user] (user_id) ON DELETE CASCADE
    );
END
GO

-- 2. Gói bao nhiêu tháng cũng được; chặn trên 1200 tháng chỉ để không tràn ngày.
IF OBJECT_ID(N'dbo.CK_membership_package_months', N'C') IS NOT NULL
    ALTER TABLE membership_package DROP CONSTRAINT CK_membership_package_months;
GO

ALTER TABLE membership_package ADD CONSTRAINT CK_membership_package_months
    CHECK (validity_months >= 1 AND validity_months <= 1200);
GO

-- 3. Mỗi học viên chỉ giữ 1 đơn gói chờ thanh toán (hai yêu cầu chọn gói cùng lúc không tạo được 2 đơn).
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_membership_one_pending' AND object_id = OBJECT_ID(N'dbo.membership'))
    CREATE UNIQUE INDEX UX_membership_one_pending ON membership (user_id) WHERE status = N'pending';
GO
