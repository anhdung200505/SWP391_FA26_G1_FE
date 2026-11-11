/*
    SportFlow / AnhDuy Sport - Azure SQL Server
    FILE 03 - RESET DATA ONLY
    Target database: SWP391_DB
    Deletes all rows in dbo user tables; preserves schema objects.
    WARNING: irreversible. Back up first.
*/
USE [SWP391_DB];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;
    DECLARE @sql NVARCHAR(MAX) = N'';

    SELECT @sql += N'ALTER TABLE ' + QUOTENAME(SCHEMA_NAME(t.schema_id)) + N'.' + QUOTENAME(t.name) + N' NOCHECK CONSTRAINT ALL;' + CHAR(10)
    FROM sys.tables t WHERE t.schema_id = SCHEMA_ID(N'dbo') AND t.is_ms_shipped = 0;
    EXEC sys.sp_executesql @sql;

    SET @sql = N'';
    SELECT @sql += N'DISABLE TRIGGER ALL ON ' + QUOTENAME(SCHEMA_NAME(t.schema_id)) + N'.' + QUOTENAME(t.name) + N';' + CHAR(10)
    FROM sys.tables t WHERE t.schema_id = SCHEMA_ID(N'dbo') AND t.is_ms_shipped = 0;
    EXEC sys.sp_executesql @sql;

    SET @sql = N'';
    SELECT @sql += N'DELETE FROM ' + QUOTENAME(SCHEMA_NAME(t.schema_id)) + N'.' + QUOTENAME(t.name) + N';' + CHAR(10)
    FROM sys.tables t WHERE t.schema_id = SCHEMA_ID(N'dbo') AND t.is_ms_shipped = 0;
    EXEC sys.sp_executesql @sql;

    -- Reset IDENTITY columns so the next inserted row starts at 1.
    SET @sql = N'';
    SELECT @sql += N'DBCC CHECKIDENT (N''' + REPLACE(QUOTENAME(SCHEMA_NAME(t.schema_id)) + N'.' + QUOTENAME(t.name),'''','''''') + N''', RESEED, 0) WITH NO_INFOMSGS;' + CHAR(10)
    FROM sys.tables t
    WHERE t.schema_id = SCHEMA_ID(N'dbo') AND t.is_ms_shipped = 0
      AND EXISTS (SELECT 1 FROM sys.identity_columns ic WHERE ic.object_id = t.object_id);
    EXEC sys.sp_executesql @sql;

    SET @sql = N'';
    SELECT @sql += N'ENABLE TRIGGER ALL ON ' + QUOTENAME(SCHEMA_NAME(t.schema_id)) + N'.' + QUOTENAME(t.name) + N';' + CHAR(10)
    FROM sys.tables t WHERE t.schema_id = SCHEMA_ID(N'dbo') AND t.is_ms_shipped = 0;
    EXEC sys.sp_executesql @sql;

    SET @sql = N'';
    SELECT @sql += N'ALTER TABLE ' + QUOTENAME(SCHEMA_NAME(t.schema_id)) + N'.' + QUOTENAME(t.name) + N' WITH CHECK CHECK CONSTRAINT ALL;' + CHAR(10)
    FROM sys.tables t WHERE t.schema_id = SCHEMA_ID(N'dbo') AND t.is_ms_shipped = 0;
    EXEC sys.sp_executesql @sql;

    IF OBJECT_ID(N'dbo.invoice_code_seq', N'SO') IS NOT NULL
        ALTER SEQUENCE dbo.invoice_code_seq RESTART WITH 2;

    COMMIT TRANSACTION;
    PRINT N'DONE: All dbo table data deleted; schema preserved.';
    PRINT N'Next: run 02_SWP391_Azure_Sample_Data.sql once.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO

SELECT s.name AS schema_name, t.name AS table_name, SUM(p.rows) AS row_count
FROM sys.tables t
JOIN sys.schemas s ON s.schema_id = t.schema_id
LEFT JOIN sys.partitions p ON p.object_id = t.object_id AND p.index_id IN (0, 1)
WHERE s.name = N'dbo'
GROUP BY s.name, t.name
ORDER BY t.name;
GO
