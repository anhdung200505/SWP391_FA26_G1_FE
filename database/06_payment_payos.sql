/*
    AnhDuy Sport - Migration 06
    Cot doi soat payOS tren payment.

    1. payos_order_code: ma don gui cho payOS, trung payment_id.
    2. checkout_url, payment_link_id: link da tao, de tra lai khi hoc vien mo lai don pending.
    3. Day invoice_code_seq vuot qua ma hoa don da co, tranh trung INV-2026-0001.

    Chay sau 05_payment_pending_unique.sql. Script chay lai nhieu lan khong loi.

    sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -f 65001 -d AnhDuySport -i database\06_payment_payos.sql
*/

USE AnhDuySport;
GO

SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH(N'dbo.payment', N'payos_order_code') IS NULL
BEGIN
    ALTER TABLE payment ADD payos_order_code BIGINT NULL;
END
GO

IF COL_LENGTH(N'dbo.payment', N'checkout_url') IS NULL
BEGIN
    ALTER TABLE payment ADD checkout_url NVARCHAR(500) NULL;
END
GO

IF COL_LENGTH(N'dbo.payment', N'payment_link_id') IS NULL
BEGIN
    ALTER TABLE payment ADD payment_link_id NVARCHAR(100) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_payment_payos_order_code' AND object_id = OBJECT_ID(N'dbo.payment'))
BEGIN
    CREATE UNIQUE INDEX UX_payment_payos_order_code
        ON payment (payos_order_code)
        WHERE payos_order_code IS NOT NULL;
END
GO

DECLARE @maxSuffix INT = (
    SELECT MAX(TRY_CONVERT(INT, RIGHT(invoice_code, NULLIF(CHARINDEX(N'-', REVERSE(invoice_code)), 0) - 1)))
    FROM invoice
);
DECLARE @current INT = (
    SELECT CONVERT(INT, current_value)
    FROM sys.sequences
    WHERE name = N'invoice_code_seq'
);
IF OBJECT_ID(N'dbo.invoice_code_seq', N'SO') IS NOT NULL
   AND (@current IS NULL OR @current <= ISNULL(@maxSuffix, 0))
BEGIN
    DECLARE @restart INT = ISNULL(@maxSuffix, 0) + 1;
    DECLARE @sql NVARCHAR(200) = N'ALTER SEQUENCE dbo.invoice_code_seq RESTART WITH ' + CONVERT(NVARCHAR(20), @restart) + N';';
    EXEC (@sql);
END
GO
