/*
    AnhDuy Sport - Migration 07
    Luu chuoi QR payOS de hien ma tren trang dang ky, khong mo trang payOS.

    Chay sau 06_payment_payos.sql. Script chay lai nhieu lan khong loi.

    sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -f 65001 -d AnhDuySport -i database\07_payment_qr.sql
*/

USE AnhDuySport;
GO

SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH(N'dbo.payment', N'qr_code') IS NULL
BEGIN
    ALTER TABLE payment ADD qr_code NVARCHAR(1000) NULL;
END
GO
