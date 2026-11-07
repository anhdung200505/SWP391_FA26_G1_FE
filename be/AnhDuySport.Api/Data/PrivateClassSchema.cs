using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Data;

// Bảng yêu cầu học 1-1. Cơ sở đã tạo từ 01_schema thì bỏ qua.
public static class PrivateClassSchema
{
    public static Task EnsureAsync(AppDbContext db) =>
        db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID(N'dbo.private_class_request', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.private_class_request (
                        request_id          INT IDENTITY(1,1) NOT NULL,
                        member_user_id      INT           NOT NULL,
                        course_id           INT           NOT NULL,
                        coach_user_id       INT           NOT NULL,
                        start_date          DATE          NOT NULL,
                        note                NVARCHAR(500) NULL,
                        status              NVARCHAR(20)  NOT NULL CONSTRAINT DF_private_class_request_status DEFAULT (N'pending'),
                        created_at          DATETIME2(0)  NOT NULL,
                        decided_by_user_id  INT           NULL,
                        decided_at          DATETIME2(0)  NULL,
                        reject_reason       NVARCHAR(500) NULL,
                        class_id            INT           NULL,
                        approval_expires_at DATETIME2(0)  NULL,
                        membership_package_id INT          NULL,
                        renew_membership    BIT           NOT NULL CONSTRAINT DF_private_class_request_renew DEFAULT (0),
                        full_name           NVARCHAR(200) NULL,
                        phone               NVARCHAR(30)  NULL,
                        date_of_birth       DATE          NULL,
                        gender              NVARCHAR(10)  NULL,
                        CONSTRAINT PK_private_class_request PRIMARY KEY (request_id),
                        CONSTRAINT FK_private_class_request_member FOREIGN KEY (member_user_id) REFERENCES [user] (user_id),
                        CONSTRAINT FK_private_class_request_course FOREIGN KEY (course_id) REFERENCES course (course_id),
                        CONSTRAINT FK_private_class_request_coach FOREIGN KEY (coach_user_id) REFERENCES [user] (user_id),
                        CONSTRAINT FK_private_class_request_decider FOREIGN KEY (decided_by_user_id) REFERENCES [user] (user_id),
                        CONSTRAINT FK_private_class_request_class FOREIGN KEY (class_id) REFERENCES class (class_id),
                        CONSTRAINT FK_private_class_request_package FOREIGN KEY (membership_package_id) REFERENCES membership_package (membership_package_id),
                        CONSTRAINT CK_private_class_request_status CHECK (status IN (N'pending', N'approved', N'rejected', N'cancelled', N'expired'))
                );
                CREATE INDEX IX_private_class_request_member ON dbo.private_class_request (member_user_id, status);
                CREATE INDEX IX_private_class_request_status ON dbo.private_class_request (status, created_at);
            END

            IF OBJECT_ID(N'dbo.private_class_request', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.private_class_request', N'membership_package_id') IS NULL
            BEGIN
                ALTER TABLE dbo.private_class_request ADD
                    membership_package_id INT NULL,
                    renew_membership BIT NOT NULL CONSTRAINT DF_private_class_request_renew DEFAULT (0),
                    full_name NVARCHAR(200) NULL,
                    phone NVARCHAR(30) NULL,
                    date_of_birth DATE NULL,
                    gender NVARCHAR(10) NULL;
            END

            IF OBJECT_ID(N'dbo.private_class_request', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.private_class_request', N'membership_package_id') IS NOT NULL
               AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_private_class_request_package')
            BEGIN
                ALTER TABLE dbo.private_class_request ADD CONSTRAINT FK_private_class_request_package
                    FOREIGN KEY (membership_package_id) REFERENCES dbo.membership_package (membership_package_id);
            END

            IF OBJECT_ID(N'dbo.private_class_request_slot', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.private_class_request_slot (
                        request_slot_id INT IDENTITY(1,1) NOT NULL,
                        request_id      INT     NOT NULL,
                        weekday         TINYINT NOT NULL,
                        time_slot_id    INT     NOT NULL,
                        CONSTRAINT PK_private_class_request_slot PRIMARY KEY (request_slot_id),
                        CONSTRAINT UQ_private_class_request_slot UNIQUE (request_id, weekday, time_slot_id),
                        CONSTRAINT FK_private_class_request_slot_request FOREIGN KEY (request_id) REFERENCES private_class_request (request_id) ON DELETE CASCADE,
                        CONSTRAINT FK_private_class_request_slot_time FOREIGN KEY (time_slot_id) REFERENCES time_slot (time_slot_id),
                        CONSTRAINT CK_private_class_request_slot_weekday CHECK (weekday BETWEEN 2 AND 7)
                );
            END
            """);
}
