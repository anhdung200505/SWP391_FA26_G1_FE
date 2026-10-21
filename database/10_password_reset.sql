/*
    AnhDuy Sport - Migration 10
    Quen mat khau bang OTP gui qua email (API POST /api/auth/forgot-password va /api/auth/reset-password).

    password_reset: moi email toi da 1 ma OTP dang cho. Gui lai thi ghi de.
    OTP hieu luc 3 phut, nhap sai toi da 5 lan. Chi luu ma bam (SHA-256), khong luu ma goc.

    Chay sau 09_class_slots.sql. Script chay lai nhieu lan khong loi.

    sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -f 65001 -d AnhDuySport -i database\10_password_reset.sql
*/

USE AnhDuySport;
GO

IF OBJECT_ID(N'dbo.password_reset', N'U') IS NULL
BEGIN
    CREATE TABLE password_reset (
        email       NVARCHAR(200) NOT NULL,
        otp_hash    NVARCHAR(64)  NOT NULL,
        attempts    INT           NOT NULL CONSTRAINT DF_password_reset_attempts DEFAULT (0),
        created_at  DATETIME2(0)  NOT NULL,
        expires_at  DATETIME2(0)  NOT NULL,
        CONSTRAINT PK_password_reset PRIMARY KEY (email)
    );
END
GO
