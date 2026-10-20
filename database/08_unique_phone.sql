-- Mỗi tài khoản (học viên, lễ tân, huấn luyện viên, quản trị) chỉ giữ một số điện thoại,
-- và số đó không được trùng tài khoản khác. Số trống vẫn được phép với dữ liệu cũ.
SET QUOTED_IDENTIFIER ON;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UQ_user_phone' AND object_id = OBJECT_ID(N'dbo.[user]'))
BEGIN
    CREATE UNIQUE INDEX UQ_user_phone ON [user] (phone) WHERE phone IS NOT NULL;
END
GO

IF OBJECT_ID(N'dbo.pending_registration', N'U') IS NOT NULL
   AND NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = N'UQ_pending_registration_phone' AND object_id = OBJECT_ID(N'dbo.pending_registration'))
BEGIN
    CREATE UNIQUE INDEX UQ_pending_registration_phone
        ON pending_registration (phone) WHERE phone IS NOT NULL;
END
GO
