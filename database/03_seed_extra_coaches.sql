/*
    AnhDuy Sport - Thêm HLV để test đổi huấn luyện viên

    Thêm 14 HLV (mỗi HLV dạy 2 môn) để mỗi trong 12 môn có đúng 3 HLV, đủ lựa chọn
    khi lễ tân hoặc quản trị đổi HLV của một buổi (có cả ca HLV bận môn khác).
    Mật khẩu dùng chung hash với HLV seed. Chạy lại không tạo trùng (kiểm tra email, số điện thoại).

    Chạy sau 02_seed.sql (setup.ps1 đã gọi sẵn):
      sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -I -f 65001 -d AnhDuySport -i database\03_seed_extra_coaches.sql
*/
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
DECLARE @hash NVARCHAR(255) = (SELECT TOP 1 password_hash FROM [user] WHERE email = N'dang.phan@anhduysport.vn');
DECLARE @roleId INT = (SELECT role_id FROM role WHERE role_code = N'COACH');
DECLARE @centerId INT = (SELECT TOP 1 center_id FROM [user] WHERE email = N'dang.phan@anhduysport.vn');

DECLARE @new TABLE (full_name NVARCHAR(200), email NVARCHAR(200), phone NVARCHAR(20), gender NVARCHAR(20), sport_a INT, sport_b INT);
INSERT INTO @new VALUES
    (N'Nguyễn Văn Hải', N'hai.nguyen@anhduysport.vn', N'0901000101', N'Nam', 1, 3),
    (N'Trần Thị Mai Anh', N'maianh.tran@anhduysport.vn', N'0901000102', N'Nữ', 2, 4),
    (N'Lê Quang Vinh', N'vinh.le@anhduysport.vn', N'0901000103', N'Nam', 3, 5),
    (N'Phạm Thu Hà', N'ha.pham@anhduysport.vn', N'0901000104', N'Nữ', 4, 6),
    (N'Hoàng Minh Tuấn', N'tuan.hoang@anhduysport.vn', N'0901000105', N'Nam', 5, 7),
    (N'Vũ Thị Lan Phương', N'phuong.vu@anhduysport.vn', N'0901000106', N'Nữ', 6, 8),
    (N'Đỗ Quốc Hưng', N'hung.do@anhduysport.vn', N'0901000107', N'Nam', 7, 9),
    (N'Bùi Ngọc Diệp', N'diep.bui@anhduysport.vn', N'0901000108', N'Nữ', 8, 10),
    (N'Ngô Thanh Tùng', N'tung.ngo@anhduysport.vn', N'0901000109', N'Nam', 9, 11),
    (N'Dương Thị Kim Ngân', N'ngan.duong@anhduysport.vn', N'0901000110', N'Nữ', 10, 12),
    (N'Lý Hoàng Nam', N'nam.ly@anhduysport.vn', N'0901000111', N'Nam', 11, 3),
    (N'Đinh Thị Bích Ngọc', N'ngoc.dinh@anhduysport.vn', N'0901000112', N'Nữ', 12, 7),
    (N'Mai Văn Đạt', N'dat.mai@anhduysport.vn', N'0901000113', N'Nam', 1, 9),
    (N'Trương Thùy Dung', N'dung.truong@anhduysport.vn', N'0901000114', N'Nữ', 2, 10);

INSERT INTO [user] (role_id, center_id, full_name, email, phone, password_hash, gender, status)
SELECT @roleId, @centerId, n.full_name, n.email, n.phone, @hash, n.gender, N'active'
FROM @new n
WHERE NOT EXISTS (SELECT 1 FROM [user] u WHERE u.email = n.email OR u.phone = n.phone);

INSERT INTO coach_sport (coach_user_id, sport_id)
SELECT u.user_id, x.sport_id
FROM @new n
INNER JOIN [user] u ON u.email = n.email
CROSS APPLY (VALUES (n.sport_a), (n.sport_b)) AS x(sport_id)
WHERE NOT EXISTS (SELECT 1 FROM coach_sport cs WHERE cs.coach_user_id = u.user_id AND cs.sport_id = x.sport_id);

SELECT sp.sport_name, COUNT(DISTINCT cs.coach_user_id) AS coaches
FROM sport sp LEFT JOIN coach_sport cs ON cs.sport_id = sp.sport_id
GROUP BY sp.sport_id, sp.sport_name ORDER BY sp.sport_id;
