/*
    AnhDuy Sport - Migration 08
    Trang thai payment:
      pending  khi vua tao link QR
      paid     khi thanh toan thanh cong
      cancel   khi khong thanh toan (het gio, huy, roi trang QR)
    payment_history giu tung buoc, khong xoa payment cu.

    Chay sau 07_payment_qr.sql. Script chay lai nhieu lan khong loi.

    sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -f 65001 -d AnhDuySport -i database\08_payment_cancel_history.sql
*/

USE AnhDuySport;
GO

IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = N'CK_payment_status'
      AND parent_object_id = OBJECT_ID(N'dbo.payment')
)
BEGIN
    ALTER TABLE payment DROP CONSTRAINT CK_payment_status;
END
GO

ALTER TABLE payment ADD CONSTRAINT CK_payment_status
    CHECK (status IN (N'pending', N'paid', N'failed', N'refunded', N'cancel'));
GO

IF OBJECT_ID(N'dbo.payment_history', N'U') IS NULL
BEGIN
    CREATE TABLE payment_history (
        payment_history_id INT IDENTITY(1,1) NOT NULL,
        payment_id         INT            NOT NULL,
        status             NVARCHAR(30)   NOT NULL,
        note               NVARCHAR(300)  NULL,
        created_at         DATETIME2(0)   NOT NULL CONSTRAINT DF_payment_history_created_at DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_payment_history PRIMARY KEY (payment_history_id),
        CONSTRAINT FK_payment_history_payment FOREIGN KEY (payment_id) REFERENCES payment (payment_id),
        CONSTRAINT CK_payment_history_status CHECK (status IN (N'pending', N'paid', N'cancel'))
    );

    CREATE INDEX IX_payment_history_payment_id ON payment_history (payment_id, created_at);
END
GO

INSERT INTO payment_history (payment_id, status, note, created_at)
SELECT
    p.payment_id,
    CASE WHEN p.status IN (N'pending', N'paid') THEN p.status ELSE N'cancel' END,
    CONCAT(N'Trạng thái hiện có: ', p.status),
    COALESCE(p.paid_at, SYSUTCDATETIME())
FROM payment AS p
WHERE NOT EXISTS (
    SELECT 1
    FROM payment_history AS h
    WHERE h.payment_id = p.payment_id
);
GO
