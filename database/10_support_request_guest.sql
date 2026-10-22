/*
    Don tu van ghi danh co the khong gan tai khoan hoc vien.
    sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -f 65001 -I -d AnhDuySport -i database\10_support_request_guest.sql
*/
SET QUOTED_IDENTIFIER ON;
IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.support_request')
      AND name = N'member_user_id'
      AND is_nullable = 0)
BEGIN
    ALTER TABLE dbo.support_request ALTER COLUMN member_user_id INT NULL;
END
GO
