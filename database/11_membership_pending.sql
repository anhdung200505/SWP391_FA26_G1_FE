/*
    AnhDuy Sport - Migration 11
    Main flow: User Information Edit & Membership Renewal - thanh toan goi qua payOS.

    membership.status them 'pending': hoc vien chon goi thi tao 1 dong membership 'pending'
    gan voi payment 'pending' (class_id NULL). Khi payment chuyen 'paid' thi membership
    chuyen 'active' va tinh lai ngay hieu luc. Payment bi huy thi membership chuyen 'cancelled'.

    Khong doi bang payment: goi hoc vien chon duoc luu o membership.membership_package_id.

    Chay sau 10_password_reset.sql. Script chay lai nhieu lan khong loi.

    sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -f 65001 -d AnhDuySport -i database\11_membership_pending.sql
*/

USE AnhDuySport;
GO

IF EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = N'CK_membership_status' AND definition NOT LIKE N'%pending%')
BEGIN
    ALTER TABLE membership DROP CONSTRAINT CK_membership_status;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_membership_status')
BEGIN
    ALTER TABLE membership ADD CONSTRAINT CK_membership_status
        CHECK (status IN (N'pending', N'active', N'expired', N'cancelled', N'upgraded'));
END
GO
