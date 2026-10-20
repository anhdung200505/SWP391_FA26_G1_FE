/*
    AnhDuy Sport - Migration 04
    Luong Customer Service: hoc vien tao yeu cau ho tro.

    Hoc vien gui moi yeu cau cho le tan (status pending_receptionist).
    system_category ghi loai hoc vien chon:
      financial_discount    tai chinh / giam gia
      consultation_account  tu van / tai khoan
        receptionist_category: account_issue | consultation
    Viec trong pham vi le tan xu ly. Viec ngoai pham vi le tan chuyen
    status sang pending_manager de quan tri xu ly.

    Neu bang da co thi script khong doi gi. Chay sau 01_schema.sql.

    sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -f 65001 -d AnhDuySport -i database\04_support_request.sql
*/

USE AnhDuySport;
GO

IF OBJECT_ID(N'dbo.support_request', N'U') IS NULL
BEGIN
    CREATE TABLE support_request (
        support_request_id      INT IDENTITY(1,1) NOT NULL,
        member_user_id          INT            NOT NULL,
        title                   NVARCHAR(200)  NOT NULL,
        description             NVARCHAR(MAX)  NOT NULL,
        system_category         NVARCHAR(30)   NOT NULL,
        classification_reason   NVARCHAR(500)  NULL,
        receptionist_category   NVARCHAR(30)   NULL,
        status                  NVARCHAR(30)   NOT NULL,
        assigned_to_user_id     INT            NULL,
        decision                NVARCHAR(30)   NULL,
        resolution_note         NVARCHAR(MAX)  NULL,
        created_at              DATETIME2(0)   NOT NULL CONSTRAINT DF_support_request_created_at DEFAULT (SYSUTCDATETIME()),
        resolved_at             DATETIME2(0)   NULL,
        CONSTRAINT PK_support_request PRIMARY KEY (support_request_id),
        CONSTRAINT FK_support_request_member FOREIGN KEY (member_user_id) REFERENCES [user] (user_id),
        CONSTRAINT FK_support_request_assignee FOREIGN KEY (assigned_to_user_id) REFERENCES [user] (user_id),
        CONSTRAINT CK_support_request_system_category CHECK (system_category IN (N'financial_discount', N'consultation_account')),
        CONSTRAINT CK_support_request_receptionist_category CHECK (receptionist_category IS NULL OR receptionist_category IN (N'account_issue', N'consultation')),
        CONSTRAINT CK_support_request_status CHECK (status IN (N'pending_manager', N'pending_receptionist', N'classified', N'resolved')),
        CONSTRAINT CK_support_request_decision CHECK (decision IS NULL OR decision IN (N'approved', N'rejected'))
    );

    CREATE INDEX IX_support_request_member ON support_request (member_user_id);
    CREATE INDEX IX_support_request_assignee ON support_request (assigned_to_user_id);
    CREATE INDEX IX_support_request_queue ON support_request (system_category, status);
END
GO
