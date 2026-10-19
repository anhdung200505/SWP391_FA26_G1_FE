/*
    AnhDuy Sport - Migration 05
    Dang ky lop hoc (API POST /api/class-registrations)

    1. UX_payment_pending_per_class: mot hoc vien chi co toi da 1 payment
       'pending' cho moi lop. Hai request dong thoi se khong tao duoc 2 don.
       Payment da paid/failed/refunded khong bi rang buoc.
    2. invoice_code_seq: bo dem cap so cho ma hoa don INV-{nam}-{so}.
       Hai request dong thoi luon nhan 2 so khac nhau. So khong reset theo nam.
       Bat dau sau so lon nhat dang co trong invoice.invoice_code.

    Chay sau 04_support_request.sql. Script chay lai nhieu lan khong loi.

    sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -f 65001 -d AnhDuySport -i database\05_payment_pending_unique.sql
*/

USE AnhDuySport;
GO

-- Filtered index bat buoc QUOTED_IDENTIFIER ON (sqlcmd mac dinh OFF).
SET QUOTED_IDENTIFIER ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_payment_pending_per_class' AND object_id = OBJECT_ID(N'dbo.payment'))
BEGIN
    IF EXISTS (
        SELECT 1
        FROM payment
        WHERE status = N'pending' AND class_id IS NOT NULL
        GROUP BY user_id, class_id
        HAVING COUNT(*) > 1
    )
    BEGIN
        THROW 50001, N'Da co hoc vien co nhieu payment pending cho cung 1 lop. Xu ly du lieu trung truoc khi chay 05.', 1;
    END

    CREATE UNIQUE INDEX UX_payment_pending_per_class
        ON payment (user_id, class_id)
        WHERE status = N'pending' AND class_id IS NOT NULL;
END
GO

-- Sequence phai bat dau sau so lon nhat cua ma INV-{nam}-{so} dang co (seed da co INV-2026-0001).
-- Neu sequence da ton tai nhung dang thap hon thi dat lai. Chay lai khong doi gi them.
-- START WITH / RESTART WITH can hang so nen dung SQL dong, chi ghep mot so nguyen.
DECLARE @next INT = ISNULL((
    SELECT MAX(TRY_CAST(SUBSTRING(invoice_code, 10, 20) AS INT))
    FROM invoice
    WHERE invoice_code LIKE N'INV-[0-9][0-9][0-9][0-9]-[0-9]%'
), 0) + 1;
DECLARE @sql NVARCHAR(200) = NULL;

IF OBJECT_ID(N'dbo.invoice_code_seq', N'SO') IS NULL
    SET @sql = N'CREATE SEQUENCE dbo.invoice_code_seq AS INT START WITH ' + CAST(@next AS NVARCHAR(12)) + N' INCREMENT BY 1';
ELSE IF (SELECT CAST(current_value AS BIGINT) FROM sys.sequences WHERE name = N'invoice_code_seq') < @next
    SET @sql = N'ALTER SEQUENCE dbo.invoice_code_seq RESTART WITH ' + CAST(@next AS NVARCHAR(12));

IF @sql IS NOT NULL EXEC (@sql);
GO
