/*
    AnhDuy Sport - Migration 06
    Bỏ vai trò GUEST. Khách tự đăng ký là MEMBER.
    Học viên chưa thanh toán vẫn xem đủ tính năng, nhưng chỉ thao tác đăng ký lớp và thanh toán.
*/
USE AnhDuySport;
GO

UPDATE account
SET role_id = member.role_id
FROM [user] AS account
INNER JOIN role AS guest ON guest.role_id = account.role_id AND guest.role_code = N'GUEST'
INNER JOIN role AS member ON member.role_code = N'MEMBER';
GO

DELETE permission
FROM role_permission AS permission
INNER JOIN role AS guest ON guest.role_id = permission.role_id
WHERE guest.role_code = N'GUEST';
GO

DELETE FROM role WHERE role_code = N'GUEST';
GO
