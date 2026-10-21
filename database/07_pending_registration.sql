-- Đăng ký học viên chưa xác nhận OTP. Hết 3 phút thì xóa, không tạo tài khoản.
USE AnhDuySport;
GO

IF OBJECT_ID(N'dbo.pending_registration', N'U') IS NULL
BEGIN
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
END
GO
