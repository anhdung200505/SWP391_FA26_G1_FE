/*
    SportFlow / AnhDuy Sport - Azure SQL Server
    FILE 02 - SAMPLE DATA
    Target database: SWP391_DB
    Run after 01_SWP391_Azure_Tables.sql.
    Combines original seed, extra coaches, extra members, class-name updates,
    and private-course samples. Original sample records and values are retained.
*/
SET NOCOUNT ON;
GO


/* ===================== BEGIN 02_seed(2).sql ===================== */
/*
    AnhDuy Sport - Dữ liệu mẫu (schema V2)

    Gồm: vai trò, trung tâm, 12 môn, 36 phòng (mỗi môn 3 phòng), người dùng, HLV theo môn,
    khóa học nhóm, giáo án chuẩn theo môn, khung giờ, 12 lớp mẫu (8 đang học, 4 sắp mở) kèm lịch tuần và toàn bộ buổi học,
    ghi danh và thanh toán mẫu, gói hội viên. Mỗi môn có ít nhất 2 HLV.

    Mốc thời gian: lớp khai giảng thứ 2 tuần trước, học viên đăng ký và thanh toán một ngày trước đó.
    Buổi đã qua là completed (có điểm danh), buổi từ hôm nay trở đi là scheduled.

    Chạy sau 01_schema.sql:
      sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -I -f 65001 -d AnhDuySport -i database\02_seed.sql
*/

-- Chon database SWP391_DB trong dropdown cua SSMS truoc khi Execute.
GO

SET QUOTED_IDENTIFIER ON;
GO

-- 1900-01-01 là thứ 2, nên phép tính thứ không phụ thuộc SET DATEFIRST.
DECLARE @today DATE = CAST(GETDATE() AS DATE);
DECLARE @class_start DATE = DATEADD(DAY, -(DATEDIFF(DAY, '19000101', @today) % 7) - 7, @today);
DECLARE @registered_on DATE = DATEADD(DAY, -1, @class_start);
DECLARE @registered_at DATETIME2(0) = DATEADD(HOUR, 9, CAST(@registered_on AS DATETIME2(0)));

/* ===================== Vai trò, trung tâm, môn ===================== */

INSERT INTO role (role_code, role_name, description) VALUES
    (N'ADMIN',         N'Quản trị',        N'Quản trị toàn bộ trung tâm'),
    (N'COACH',         N'Huấn luyện viên', N'Dạy lớp, điểm danh và đánh giá học viên'),
    (N'MEMBER',        N'Học viên',        N'Đăng ký khóa học và tham gia lớp'),
    (N'RECEPTIONIST',  N'Lễ tân',          N'Tiếp nhận tư vấn, hóa đơn và gói thành viên');

INSERT INTO role_permission (role_id, permission_code, permission_name)
SELECT r.role_id, v.permission_code, v.permission_name
FROM (VALUES
    (N'ADMIN',        N'USER_MANAGE',         N'Quản lý người dùng'),
    (N'ADMIN',        N'COURSE_MANAGE',       N'Quản lý khóa học'),
    (N'ADMIN',        N'PAYMENT_MANAGE',      N'Quản lý thanh toán'),
    (N'ADMIN',        N'REPORT_VIEW',         N'Xem báo cáo'),
    (N'COACH',        N'CLASS_TEACH',         N'Phụ trách lớp học'),
    (N'COACH',        N'ATTENDANCE_WRITE',    N'Điểm danh'),
    (N'COACH',        N'EVALUATION_WRITE',    N'Đánh giá học viên'),
    (N'MEMBER',       N'COURSE_ENROLL',       N'Đăng ký khóa học'),
    (N'MEMBER',       N'PROFILE_VIEW',        N'Xem hồ sơ cá nhân'),
    (N'RECEPTIONIST', N'CONSULTATION_RECEIVE', N'Tiếp nhận yêu cầu tư vấn'),
    (N'RECEPTIONIST', N'PAYMENT_CREATE',      N'Tạo thanh toán'),
    (N'RECEPTIONIST', N'MEMBERSHIP_ISSUE',    N'Cấp gói thành viên')
) AS v(role_code, permission_code, permission_name)
INNER JOIN role AS r ON r.role_code = v.role_code;

INSERT INTO center (center_name, address, phone, email, area_m2, description)
VALUES (
    N'AnhDuy Sport',
    N'Nhà Văn hóa Sinh viên TP.HCM',
    N'02873000000',
    N'contact@anhduysport.vn',
    1976,
    N'Trung tâm thể thao AnhDuy Sport. Sân vận động 1.976m², hồ bơi 50m chuẩn Olympic.'
);

INSERT INTO sport (sport_code, sport_name, category) VALUES
    (N'swimming',    N'Bơi lội',       N'Cá nhân'),
    (N'tabletennis', N'Bóng bàn',      N'Cá nhân'),
    (N'volleyball',  N'Bóng chuyền',   N'Đồng đội'),
    (N'soccer',      N'Bóng đá',       N'Đồng đội'),
    (N'basketball',  N'Bóng rổ',       N'Đồng đội'),
    (N'badminton',   N'Cầu lông',      N'Racket'),
    (N'chess',       N'Cờ vua',        N'Cá nhân'),
    (N'golf',        N'Golf 3D',       N'Cá nhân'),
    (N'fencing',     N'Kiếm thuật',    N'Cá nhân'),
    (N'dance',       N'Nhảy hiện đại', N'Cá nhân'),
    (N'tennis',      N'Quần vợt',      N'Racket'),
    (N'taekwondo',   N'Taekwondo',     N'Võ thuật');

/* ===================== Phòng: mỗi môn 3 phòng riêng (36 phòng) ===================== */

-- capacity: sức chứa; private_concurrency: số buổi 1-1 tối đa cùng lúc trong phòng.
INSERT INTO room (center_id, room_code, room_name, room_type, capacity, private_concurrency, description, image_path)
SELECT c.center_id,
       UPPER(s.sport_code) + N'-' + CAST(n.n AS NVARCHAR(1)),
       v.base_name + N' ' + CAST(n.n AS NVARCHAR(1)),
       v.room_type, v.capacity, v.private_concurrency, v.description, v.image_path
FROM center AS c
CROSS JOIN (VALUES
    (N'swimming',    N'Hồ bơi',                     N'AQUATICS',        40, 6, N'Hồ bơi có làn riêng cho lớp nhóm và học 1-1.',            N'assets/facilities/facility-pool-1024x682.webp'),
    (N'tabletennis', N'Phòng bóng bàn',             N'TABLE TENNIS',    24, 4, N'Phòng bóng bàn nhiều bàn.',                               N'assets/facilities/facility-tabletennis-1024x683.webp'),
    (N'volleyball',  N'Sân bóng chuyền',            N'VOLLEYBALL COURT',24, 2, N'Sân bóng chuyền trong nhà.',                              N'assets/facilities/facility-basketball-1024x683.webp'),
    (N'soccer',      N'Sân bóng đá mini',           N'SOCCER FIELD',    30, 2, N'Sân bóng đá mini cỏ nhân tạo.',                           N'assets/facilities/facility-basketball-1024x683.webp'),
    (N'basketball',  N'Sân bóng rổ',                N'BASKETBALL COURT',30, 2, N'Sân bóng rổ tiêu chuẩn trong nhà.',                       N'assets/facilities/facility-basketball-1024x683.webp'),
    (N'badminton',   N'Sân cầu lông',               N'BADMINTON COURT', 16, 4, N'Sân cầu lông có nhiều sân đơn và đôi.',                   N'assets/facilities/facility-basketball-1024x683.webp'),
    (N'chess',       N'Phòng cờ vua',               N'CHESS ROOM',      30, 8, N'Phòng yên tĩnh, bàn cờ và đồng hồ cờ.',                   NULL),
    (N'golf',        N'Phòng mô phỏng golf 3D',     N'GOLF SIMULATOR',   8, 2, N'Phòng tập golf mô phỏng 3D XSWING.',                      N'assets/facilities/facility-golf-sim-1024x683.webp'),
    (N'fencing',     N'Phòng kiếm thuật',           N'FENCING HALL',    20, 2, N'Sàn đấu kiếm và khu trang bị bảo hộ.',                    N'assets/facilities/taekwondo-1-1024x683.webp'),
    (N'dance',       N'Phòng nhảy có gương',        N'DANCE STUDIO',    30, 3, N'Phòng gương cho nhảy hiện đại.',                          N'assets/facilities/taekwondo-1-1024x683.webp'),
    (N'tennis',      N'Sân tennis',                 N'TENNIS COURT',     8, 2, N'Sân tennis mặt acrylic.',                                 N'assets/facilities/facility-tennis-1024x576.webp'),
    (N'taekwondo',   N'Phòng võ thuật',             N'MARTIAL ARTS ROOM',30, 3, N'Phòng thảm võ thuật, có gương.',                         N'assets/facilities/taekwondo-1-1024x683.webp')
) AS v(sport_code, base_name, room_type, capacity, private_concurrency, description, image_path)
INNER JOIN sport AS s ON s.sport_code = v.sport_code
CROSS JOIN (VALUES (1), (2), (3)) AS n(n);

-- Mọi phòng của một môn dùng được cho lớp nhóm và học 1-1 của môn đó.
INSERT INTO sport_room (sport_id, room_id, allow_group, allow_private)
SELECT s.sport_id, r.room_id, 1, 1
FROM sport AS s
INNER JOIN room AS r ON r.room_code LIKE UPPER(s.sport_code) + N'-_';

/* ===================== Người dùng ===================== */

INSERT INTO [user] (role_id, center_id, full_name, email, phone, password_hash, gender, avatar_url, status)
SELECT r.role_id, c.center_id, v.full_name, v.email, v.phone, N'pbkdf2.100000.oiS/WGvU0MeybY5K6gbcZA==.ZFllnZtVBr5cGSCT7D98RgDFcDII0uMzP7LcddpBueo=', v.gender, v.avatar_url, N'active'
FROM (VALUES
    (N'ADMIN',        N'Quản trị AnhDuy',     N'admin@anhduysport.vn',          N'0901000001', NULL,      NULL),
    (N'RECEPTIONIST', N'Lễ tân AnhDuy',       N'letan@anhduysport.vn',          N'0901000002', NULL,      NULL),
    (N'COACH',        N'Paul Villanova',      N'paul.villanova@anhduysport.vn', N'0901000011', N'Nam',  N'assets/coachs/coach-basketball.webp'),
    (N'COACH',        N'Nguyễn Thị Ánh Viên', N'anhvien.nguyen@anhduysport.vn', N'0901000012', N'Nữ',   N'assets/coachs/coach-swimming.webp'),
    (N'COACH',        N'Ngô Bảo Nghi',        N'baonghi.ngo@anhduysport.vn',    N'0901000013', N'Nữ',   N'assets/coachs/coach-golf.webp'),
    (N'COACH',        N'Nguyễn Tôn Nhuận',    N'nhuan.nguyen@anhduysport.vn',   N'0901000014', N'Nam',  N'assets/coachs/coach-tennis-687x1024.webp'),
    (N'COACH',        N'Phan Hoàng Đăng',     N'dang.phan@anhduysport.vn',      N'0901000015', N'Nam',  N'assets/coachs/coach-tabletennis-683x1024.webp'),
    (N'COACH',        N'Huỳnh Trí Thịnh',     N'thinh.huynh@anhduysport.vn',    N'0901000016', N'Nam',  N'assets/coachs/coach-badminton.webp'),
    (N'COACH',        N'Phan Thị Thúy Hằng',  N'hang.phan@anhduysport.vn',      N'0901000017', N'Nữ',   N'assets/coachs/coach-taekwondo-683x1024.webp'),
    (N'COACH',        N'Lê Đình Trọng',       N'trong.le@anhduysport.vn',       N'0901000018', N'Nam',  N'assets/coachs/coach-soccer-683x1024.webp'),
    (N'COACH',        N'Trần Quốc Bảo',       N'bao.tran@anhduysport.vn',       N'0901000019', N'Nam',  NULL),
    (N'COACH',        N'Đặng Minh Khôi',      N'khoi.dang@anhduysport.vn',      N'0901000020', N'Nam',  NULL),
    (N'COACH',        N'Vũ Hoàng Long',       N'long.vu@anhduysport.vn',        N'0901000021', N'Nam',  NULL),
    (N'COACH',        N'Lâm Ngọc Trâm',       N'tram.lam@anhduysport.vn',       N'0901000022', N'Nữ',   NULL),
    (N'MEMBER',       N'Nguyễn Minh Khang',   N'khang.nguyen@gmail.com',        N'0912000001', N'Nam',  NULL),
    (N'MEMBER',       N'Trần Gia Hân',        N'han.tran@gmail.com',            N'0912000002', N'Nữ',   NULL)
) AS v(role_code, full_name, email, phone, gender, avatar_url)
INNER JOIN role AS r ON r.role_code = v.role_code
CROSS JOIN center AS c;

-- HLV dạy môn nào. Mỗi môn có ít nhất 2 HLV để đổi người khi HLV phụ trách bận.
INSERT INTO coach_sport (coach_user_id, sport_id)
SELECT u.user_id, s.sport_id
FROM (VALUES
    (N'paul.villanova@anhduysport.vn', N'basketball'),
    (N'paul.villanova@anhduysport.vn', N'volleyball'),
    (N'anhvien.nguyen@anhduysport.vn', N'swimming'),
    (N'baonghi.ngo@anhduysport.vn',    N'golf'),
    (N'baonghi.ngo@anhduysport.vn',    N'tennis'),
    (N'nhuan.nguyen@anhduysport.vn',   N'tennis'),
    (N'nhuan.nguyen@anhduysport.vn',   N'golf'),
    (N'nhuan.nguyen@anhduysport.vn',   N'chess'),
    (N'dang.phan@anhduysport.vn',      N'tabletennis'),
    (N'dang.phan@anhduysport.vn',      N'badminton'),
    (N'thinh.huynh@anhduysport.vn',    N'badminton'),
    (N'thinh.huynh@anhduysport.vn',    N'tabletennis'),
    (N'hang.phan@anhduysport.vn',      N'taekwondo'),
    (N'hang.phan@anhduysport.vn',      N'fencing'),
    (N'hang.phan@anhduysport.vn',      N'dance'),
    (N'trong.le@anhduysport.vn',       N'soccer'),
    (N'trong.le@anhduysport.vn',       N'basketball'),
    (N'bao.tran@anhduysport.vn',       N'volleyball'),
    (N'bao.tran@anhduysport.vn',       N'basketball'),
    (N'bao.tran@anhduysport.vn',       N'soccer'),
    (N'khoi.dang@anhduysport.vn',      N'chess'),
    (N'khoi.dang@anhduysport.vn',      N'tabletennis'),
    (N'long.vu@anhduysport.vn',        N'fencing'),
    (N'long.vu@anhduysport.vn',        N'taekwondo'),
    (N'long.vu@anhduysport.vn',        N'swimming'),
    (N'tram.lam@anhduysport.vn',       N'dance'),
    (N'tram.lam@anhduysport.vn',       N'badminton')
) AS v(email, sport_code)
INNER JOIN [user] AS u ON u.email = v.email
INNER JOIN sport AS s ON s.sport_code = v.sport_code;

/* ===================== Khóa học nhóm, giáo án chuẩn ===================== */

INSERT INTO course (sport_id, course_code, course_name, level_name, age_range, description, price, image_path, status, format)
SELECT s.sport_id, v.course_code, v.course_name, v.level_name, v.age_range, v.description, v.price, v.image_path, N'active', N'group'
FROM (VALUES
    (N'swimming',    N'SWIM-01', N'Bơi lội',    N'BEGINNER',     N'6+',   N'Xây dựng kỹ thuật bơi an toàn, kiểm soát hơi thở, sức bền và sự tự tin trong môi trường nước.', CAST(1200000 AS DECIMAL(18,2)), N'assets/page course/swimming.webp'),
    (N'tabletennis', N'TT-01',   N'Bóng bàn',   N'BEGINNER',     N'7-17', N'Rèn phản xạ nhanh, kiểm soát bóng, kỹ thuật xoáy và khả năng xử lý tình huống tốc độ cao.', CAST(1000000 AS DECIMAL(18,2)), N'assets/page course/facility-tabletennis-1024x683.webp'),
    (N'soccer',      N'FB-01',   N'Bóng đá',    N'MỌI CẤP ĐỘ',   N'6-17', N'Huấn luyện kỹ thuật cá nhân, phối hợp đội hình, thể lực nền và tinh thần thi đấu đồng đội.', CAST(1500000 AS DECIMAL(18,2)), N'assets/page course/soccer-768x1024.webp'),
    (N'basketball',  N'BB-01',   N'Bóng rổ',    N'INTERMEDIATE', N'8-17', N'Rèn kỹ năng kiểm soát bóng, ném rổ, phòng thủ và tư duy chiến thuật trong nhịp độ thi đấu cao.', CAST(1500000 AS DECIMAL(18,2)), N'assets/page course/basketball-683x1024.webp'),
    (N'badminton',   N'BD-01',   N'Cầu lông',   N'MỌI CẤP ĐỘ',   N'7-17', N'Nâng cao tốc độ di chuyển, kỹ thuật cầu và khả năng phối hợp chiến thuật đơn hoặc đôi.', CAST(1100000 AS DECIMAL(18,2)), N'assets/page course/badminton-1-1024x678.webp'),
    (N'golf',        N'GOLF-01', N'Golf 3D',    N'INTERMEDIATE', N'8-17', N'Làm chủ tư thế swing, kiểm soát lực đánh và etiquette sân golf trong môi trường hướng dẫn chuyên nghiệp.', CAST(2000000 AS DECIMAL(18,2)), N'assets/page course/facility-golf-sim-1024x683.webp'),
    (N'tennis',      N'TN-01',   N'Quần vợt',   N'INTERMEDIATE', N'8-17', N'Tập trung vào footwork, cú đánh ổn định, phản xạ và tư duy thi đấu theo lộ trình chuyên nghiệp.', CAST(1800000 AS DECIMAL(18,2)), N'assets/page course/tennis-1.webp'),
    (N'taekwondo',   N'TKD-01',  N'Taekwondo',  N'FOUNDATION',   N'6-17', N'Rèn kỷ luật, sức bền, phản xạ và kỹ thuật tự vệ qua hệ thống bài tập võ thuật chuẩn mực.', CAST(1200000 AS DECIMAL(18,2)), N'assets/page course/taekwondo-1-1024x683.webp')
) AS v(sport_code, course_code, course_name, level_name, age_range, description, price, image_path)
INNER JOIN sport AS s ON s.sport_code = v.sport_code;

-- Mỗi môn tối đa một giáo án chuẩn (sport_id).
INSERT INTO training_plan (created_by_user_id, plan_name, description, duration_weeks, sport_id)
SELECT u.user_id, v.plan_name, v.description, v.duration_weeks, s.sport_id
FROM (VALUES
    (N'anhvien.nguyen@anhduysport.vn', N'swimming',    N'Giáo án bơi lội 8 tuần',    N'Làm quen nước, thở và kỹ thuật bơi ếch.', 8),
    (N'dang.phan@anhduysport.vn',      N'tabletennis', N'Giáo án bóng bàn 8 tuần',    N'Cầm vợt, giao bóng và xoáy cơ bản.', 8),
    (N'trong.le@anhduysport.vn',       N'soccer',      N'Giáo án bóng đá 12 tuần',    N'Kỹ thuật cá nhân, phối hợp và thể lực.', 12),
    (N'paul.villanova@anhduysport.vn', N'basketball',  N'Giáo án bóng rổ 12 tuần',    N'Dẫn bóng, ném rổ và phòng thủ.', 12),
    (N'thinh.huynh@anhduysport.vn',    N'badminton',   N'Giáo án cầu lông 8 tuần',    N'Di chuyển, cầu thuận tay và đánh đôi.', 8),
    (N'baonghi.ngo@anhduysport.vn',    N'golf',        N'Giáo án golf 3D 8 tuần',     N'Tư thế swing và kiểm soát lực.', 8),
    (N'nhuan.nguyen@anhduysport.vn',   N'tennis',      N'Giáo án quần vợt 10 tuần',   N'Footwork và cú đánh nền.', 10),
    (N'hang.phan@anhduysport.vn',      N'taekwondo',   N'Giáo án taekwondo 12 tuần',  N'Kỷ luật, phẩm chất và kỹ thuật căn bản.', 12)
) AS v(email, sport_code, plan_name, description, duration_weeks)
INNER JOIN [user] AS u ON u.email = v.email
INNER JOIN sport AS s ON s.sport_code = v.sport_code;

/* ===================== Khung giờ cố định ===================== */

INSERT INTO time_slot (kind, start_time, end_time, label) VALUES
    (N'group',   '07:00', '10:00', N'Sáng 07:00-10:00'),
    (N'group',   '10:00', '13:00', N'Trưa 10:00-13:00'),
    (N'group',   '12:00', '15:00', N'Đầu chiều 12:00-15:00'),
    (N'group',   '15:00', '18:00', N'Chiều 15:00-18:00'),
    (N'group',   '18:00', '21:00', N'Tối 18:00-21:00'),
    (N'private', '07:00', '08:30', N'1-1 07:00-08:30'),
    (N'private', '08:30', '10:00', N'1-1 08:30-10:00'),
    (N'private', '10:00', '11:30', N'1-1 10:00-11:30'),
    (N'private', '13:30', '15:00', N'1-1 13:30-15:00'),
    (N'private', '15:00', '16:30', N'1-1 15:00-16:30'),
    (N'private', '16:30', '18:00', N'1-1 16:30-18:00'),
    (N'private', '18:00', '19:30', N'1-1 18:00-19:30'),
    (N'private', '19:30', '21:00', N'1-1 19:30-21:00');

/* ===================== Lớp mẫu, lịch tuần, ghi danh ===================== */

-- 8 lớp đang học (khai giảng thứ 2 tuần trước, phòng số 1) và 4 lớp sắp mở (khai giảng thứ 2 tuần sau, phòng số 2,
-- HLV thứ hai của môn, dùng thêm khung giờ trưa và tối). Tên lớp là duy nhất, các bảng bên dưới nối theo tên lớp.
INSERT INTO class (course_id, training_plan_id, coach_user_id, room_id, class_name, start_date, end_date, capacity, status, class_type)
SELECT c.course_id, tp.training_plan_id, u.user_id, rm.room_id, v.class_name,
       DATEADD(WEEK, v.start_week, @class_start),
       DATEADD(DAY, tp.duration_weeks * 7 - 1, DATEADD(WEEK, v.start_week, @class_start)),
       v.capacity,
       CASE WHEN v.start_week = 0 THEN N'ongoing' ELSE N'open' END,
       N'group'
FROM (VALUES
    (N'SWIM-01', N'anhvien.nguyen@anhduysport.vn', N'Bơi lội - Sáng thứ 3',             16, 1, 0),
    (N'TT-01',   N'dang.phan@anhduysport.vn',      N'Bóng bàn - Chiều thứ 4',           12, 1, 0),
    (N'FB-01',   N'trong.le@anhduysport.vn',       N'Bóng đá - Chiều thứ 2',            20, 1, 0),
    (N'BB-01',   N'paul.villanova@anhduysport.vn', N'Bóng rổ - Chiều thứ 3',            16, 1, 0),
    (N'BD-01',   N'thinh.huynh@anhduysport.vn',    N'Cầu lông - Sáng thứ 7',            12, 1, 0),
    (N'GOLF-01', N'baonghi.ngo@anhduysport.vn',    N'Golf 3D - Chiều thứ 7',            6,  1, 0),
    (N'TN-01',   N'nhuan.nguyen@anhduysport.vn',   N'Quần vợt - Sáng thứ 5',            4,  1, 0),
    (N'TKD-01',  N'hang.phan@anhduysport.vn',      N'Taekwondo - Chiều thứ 6',          20, 1, 0),
    (N'SWIM-01', N'long.vu@anhduysport.vn',        N'Bơi lội - Tối thứ 2 và thứ 5',     16, 2, 2),
    (N'BB-01',   N'trong.le@anhduysport.vn',       N'Bóng rổ - Trưa thứ 7',             16, 2, 2),
    (N'BD-01',   N'tram.lam@anhduysport.vn',       N'Cầu lông - Đầu chiều thứ 3 và thứ 6', 12, 2, 2),
    (N'TT-01',   N'khoi.dang@anhduysport.vn',      N'Bóng bàn - Tối thứ 2',             12, 2, 2)
) AS v(course_code, coach_email, class_name, capacity, room_no, start_week)
INNER JOIN course AS c ON c.course_code = v.course_code
INNER JOIN sport AS s ON s.sport_id = c.sport_id
INNER JOIN [user] AS u ON u.email = v.coach_email
INNER JOIN room AS rm ON rm.room_code = UPPER(s.sport_code) + N'-' + CAST(v.room_no AS NVARCHAR(1))
INNER JOIN training_plan AS tp ON tp.sport_id = s.sport_id;

-- weekday: 2..7 = thứ 2..thứ 7. start_time chọn khung giờ nhóm tương ứng.
INSERT INTO class_schedule (class_id, weekday, time_slot_id)
SELECT cl.class_id, v.weekday, ts.time_slot_id
FROM (VALUES
    (N'Bơi lội - Sáng thứ 3',                3, CAST('07:00' AS TIME)),
    (N'Bóng bàn - Chiều thứ 4',              4, CAST('15:00' AS TIME)),
    (N'Bóng đá - Chiều thứ 2',               2, CAST('15:00' AS TIME)),
    (N'Bóng rổ - Chiều thứ 3',               3, CAST('15:00' AS TIME)),
    (N'Cầu lông - Sáng thứ 7',               7, CAST('07:00' AS TIME)),
    (N'Golf 3D - Chiều thứ 7',               7, CAST('15:00' AS TIME)),
    (N'Quần vợt - Sáng thứ 5',               5, CAST('07:00' AS TIME)),
    (N'Taekwondo - Chiều thứ 6',             6, CAST('15:00' AS TIME)),
    (N'Bơi lội - Tối thứ 2 và thứ 5',        2, CAST('18:00' AS TIME)),
    (N'Bơi lội - Tối thứ 2 và thứ 5',        5, CAST('18:00' AS TIME)),
    (N'Bóng rổ - Trưa thứ 7',                7, CAST('10:00' AS TIME)),
    (N'Cầu lông - Đầu chiều thứ 3 và thứ 6', 3, CAST('12:00' AS TIME)),
    (N'Cầu lông - Đầu chiều thứ 3 và thứ 6', 6, CAST('12:00' AS TIME)),
    (N'Bóng bàn - Tối thứ 2',                2, CAST('18:00' AS TIME))
) AS v(class_name, weekday, start_time)
INNER JOIN class AS cl ON cl.class_name = v.class_name
INNER JOIN time_slot AS ts ON ts.kind = N'group' AND ts.start_time = v.start_time;

INSERT INTO class_enrollment (class_id, user_id, enrolled_at, status)
SELECT cl.class_id, u.user_id, @registered_at, N'enrolled'
FROM (VALUES
    (N'Bơi lội - Sáng thứ 3',    N'khang.nguyen@gmail.com'),
    (N'Bóng rổ - Chiều thứ 3',   N'khang.nguyen@gmail.com'),
    (N'Taekwondo - Chiều thứ 6', N'han.tran@gmail.com')
) AS v(class_name, email)
INNER JOIN class AS cl ON cl.class_name = v.class_name
INNER JOIN [user] AS u ON u.email = v.email;

/* ===================== Sinh toàn bộ buổi học từ lịch tuần ===================== */

;WITH n AS (
    SELECT TOP (120) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) - 1 AS n
    FROM sys.all_objects
),
planned AS (
    SELECT cl.class_id, cs.time_slot_id, ts.start_time, ts.end_time, cl.coach_user_id, cl.room_id,
           DATEADD(DAY, n.n, cl.start_date) AS session_date
    FROM class AS cl
    INNER JOIN class_schedule AS cs ON cs.class_id = cl.class_id
    INNER JOIN time_slot AS ts ON ts.time_slot_id = cs.time_slot_id
    CROSS JOIN n
    WHERE DATEADD(DAY, n.n, cl.start_date) <= cl.end_date
      AND DATEDIFF(DAY, '19000101', DATEADD(DAY, n.n, cl.start_date)) % 7 + 2 = cs.weekday
)
INSERT INTO [session] (class_id, session_no, session_date, time_slot_id, start_time, end_time, coach_user_id, room_id, status)
SELECT class_id,
       ROW_NUMBER() OVER (PARTITION BY class_id ORDER BY session_date),
       session_date, time_slot_id, start_time, end_time, coach_user_id, room_id,
       CASE WHEN session_date < @today THEN N'completed' ELSE N'scheduled' END
FROM planned;

INSERT INTO assignment (session_id, title, description, due_at)
SELECT s.session_id,
       cl.class_name + N' - Buổi ' + CAST(s.session_no AS NVARCHAR(10)),
       N'Bài tập thực hành trong buổi học.',
       DATEADD(HOUR, 2, DATEADD(SECOND, DATEDIFF(SECOND, CAST('00:00:00' AS TIME), s.end_time), CAST(s.session_date AS DATETIME2)))
FROM [session] AS s
INNER JOIN class AS cl ON cl.class_id = s.class_id;

-- Học viên đã ghi danh có mặt ở mọi buổi đã học xong.
INSERT INTO attendance (session_id, user_id, check_in_at, status)
SELECT s.session_id, e.user_id,
       DATEADD(MINUTE, -5, DATEADD(SECOND, DATEDIFF(SECOND, CAST('00:00:00' AS TIME), s.start_time), CAST(s.session_date AS DATETIME2))),
       N'present'
FROM [session] AS s
INNER JOIN class_enrollment AS e ON e.class_id = s.class_id AND e.status = N'enrolled'
WHERE s.status = N'completed';

INSERT INTO evaluation (class_id, assignment_id, evaluator_user_id, evaluated_user_id, reviewer_user_id, score, comment)
SELECT cl.class_id, a.assignment_id, coach.user_id, student.user_id, reviewer.user_id, 8.5, N'Kiểm soát hơi thở ổn, cần thêm sức bền.'
FROM class AS cl
INNER JOIN [session] AS s ON s.class_id = cl.class_id AND s.session_no = 1
INNER JOIN assignment AS a ON a.session_id = s.session_id
INNER JOIN [user] AS coach ON coach.user_id = cl.coach_user_id
INNER JOIN [user] AS student ON student.email = N'khang.nguyen@gmail.com'
INNER JOIN [user] AS reviewer ON reviewer.email = N'admin@anhduysport.vn'
WHERE cl.class_name = N'Bơi lội - Sáng thứ 3';

/* ===================== Gói hội viên, hóa đơn, thanh toán ===================== */

INSERT INTO membership_package (package_code, package_name, fee, validity_months, benefits, status, updated_at, upgrade_discount_percent) VALUES
    (N'PKG-001', N'Hạng Đồng', 200000, 1, N'Dùng phòng tập đa năng trong giờ mở cửa' + CHAR(10) + N'Gói bắt buộc khi đăng ký khóa học, được tặng 30 ngày' + CHAR(10) + N'Gợi ý tập cá nhân bằng AI: 5 lượt tạo lại và 50.000 token mỗi kỳ hội viên' + CHAR(10) + N'Không gồm hồ bơi giờ thấp điểm và buổi tập riêng với huấn luyện viên', N'active', SYSUTCDATETIME(), 0),
    (N'PKG-002', N'Hạng Bạc',  350000, 1, N'Gồm mọi quyền của Hạng Đồng' + CHAR(10) + N'Dùng hồ bơi trong giờ thấp điểm' + CHAR(10) + N'Giảm 50% phí gói khi nâng hạng cùng lúc đăng ký khóa học' + CHAR(10) + N'Gợi ý tập cá nhân bằng AI: 10 lượt tạo lại và 100.000 token mỗi kỳ hội viên', N'active', SYSUTCDATETIME(), 50),
    (N'PKG-003', N'Hạng Vàng', 500000, 1, N'Dùng toàn bộ cơ sở vật chất, kể cả giờ cao điểm' + CHAR(10) + N'Một buổi tập riêng với huấn luyện viên mỗi tháng' + CHAR(10) + N'Giảm 25% phí gói khi nâng hạng cùng lúc đăng ký khóa học' + CHAR(10) + N'Gợi ý tập cá nhân bằng AI: 25 lượt tạo lại và 250.000 token mỗi kỳ hội viên', N'active', SYSUTCDATETIME(), 25);

UPDATE membership_package SET ai_regeneration_limit = 5,  ai_token_limit = 50000  WHERE package_code = N'PKG-001';
UPDATE membership_package SET ai_regeneration_limit = 10, ai_token_limit = 100000 WHERE package_code = N'PKG-002';
UPDATE membership_package SET ai_regeneration_limit = 25, ai_token_limit = 250000 WHERE package_code = N'PKG-003';

-- Hóa đơn chỉ gồm học phí của 2 lớp Khang đã ghi danh (bơi sáng thứ 3 + bóng rổ chiều thứ 3); invoice_code_seq bắt đầu từ 2.
INSERT INTO invoice (user_id, invoice_code, issued_at, total_amount, status)
SELECT u.user_id, N'INV-2026-0001', @registered_at, CAST(2700000 AS DECIMAL(18,2)), N'paid'
FROM [user] AS u
WHERE u.email = N'khang.nguyen@gmail.com';

INSERT INTO payment (invoice_id, user_id, class_id, amount, payment_method, paid_at, status, registered_by_user_id)
SELECT i.invoice_id, u.user_id, cl.class_id, c.price, N'chuyen_khoan', @registered_at, N'paid', u.user_id
FROM invoice AS i
INNER JOIN [user] AS u ON u.user_id = i.user_id
INNER JOIN class AS cl ON cl.class_name IN (N'Bơi lội - Sáng thứ 3', N'Bóng rổ - Chiều thứ 3')
INNER JOIN course AS c ON c.course_id = cl.course_id
WHERE i.invoice_code = N'INV-2026-0001';

INSERT INTO payment_history (payment_id, status, note, created_at)
SELECT p.payment_id, N'paid', N'Thanh toán thành công', p.paid_at
FROM payment AS p;

INSERT INTO class_registration_log (member_user_id, class_id, payment_id, action, performed_by_user_id, performed_by_role, created_at, class_assigned_by)
SELECT p.user_id, p.class_id, p.payment_id, N'register', p.user_id, N'MEMBER', p.paid_at, N'MEMBER'
FROM payment AS p;

-- Mỗi lớp đã thanh toán (không kèm nâng hạng) được tặng 1 tháng (30 ngày) Hạng Đồng, gói sau nối tiếp gói trước
-- (cùng quy tắc ClassMembershipBonus.GrantAsync ở backend, 1 tháng = 30 ngày): lớp bơi -> active, lớp bóng rổ -> scheduled.
;WITH gift AS (
    SELECT p.user_id, pk.membership_package_id, pk.package_name,
           ROW_NUMBER() OVER (PARTITION BY p.user_id ORDER BY p.payment_id) - 1 AS k
    FROM payment AS p
    INNER JOIN membership_package AS pk ON pk.package_code = N'PKG-001'
    WHERE p.status = N'paid' AND p.class_id IS NOT NULL AND p.upgrade_package_id IS NULL
)
INSERT INTO membership (user_id, payment_id, plan_name, start_date, end_date, status, membership_package_id, is_free)
SELECT g.user_id, NULL, g.package_name + N' (tặng kèm lớp)',
       DATEADD(DAY, 30 * g.k, @registered_on),
       DATEADD(DAY, 30 * (g.k + 1) - 1, @registered_on),
       CASE WHEN DATEADD(DAY, 30 * g.k, @registered_on) <= @today THEN N'active' ELSE N'scheduled' END,
       g.membership_package_id, 1
FROM gift AS g;

INSERT INTO audit_log (user_id, action, entity_name, entity_id, detail)
SELECT u.user_id, N'SEED', N'center', c.center_id, N'Khởi tạo dữ liệu trung tâm AnhDuy Sport.'
FROM [user] AS u
CROSS JOIN center AS c
WHERE u.email = N'admin@anhduysport.vn';
GO

/* ===================== END 02_seed(2).sql ===================== */


/* ===================== BEGIN 03_seed_extra_coaches(2).sql ===================== */
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

/* ===================== END 03_seed_extra_coaches(2).sql ===================== */
GO

/* ===================== BEGIN 04_seed_extra_members(2).sql ===================== */
/*
    AnhDuy Sport - Thêm học viên mẫu và ghi danh vào các lớp đang học

    Tạo 60 học viên (MEMBER) rồi xếp vào mọi lớp có status = ongoing sao cho sĩ số mỗi lớp
    khoảng 60% đến 90% sức chứa (luôn còn ít nhất 1 chỗ). Học viên không bị trùng giờ giữa các lớp.
    Mỗi lượt ghi danh đi kèm hóa đơn, thanh toán đã trả, lịch sử đăng ký, gói hội viên tặng kèm lớp
    và điểm danh cho các buổi đã học xong, giống cách 02_seed.sql tạo dữ liệu mẫu.
    Mật khẩu dùng chung hash với tài khoản seed. Chạy lại không tạo trùng (chỉ bù cho lớp còn thiếu).

    Chạy sau 02_seed.sql (setup.ps1 đã gọi sẵn):
      sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -I -f 65001 -d AnhDuySport -i database\04_seed_extra_members.sql
*/
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;

DECLARE @memberSeedToday DATE = CAST(GETDATE() AS DATE);
DECLARE @memberSeedHash NVARCHAR(255) = (SELECT TOP 1 password_hash FROM [user] WHERE email = N'khang.nguyen@gmail.com');
DECLARE @memberRole INT = (SELECT role_id FROM role WHERE role_code = N'MEMBER');
DECLARE @memberSeedCenterId INT = (SELECT TOP 1 center_id FROM [user] WHERE email = N'khang.nguyen@gmail.com');

BEGIN TRANSACTION;

/* ===================== 60 học viên ===================== */

DECLARE @newMembers TABLE (full_name NVARCHAR(200), gender NVARCHAR(20), email NVARCHAR(200), phone NVARCHAR(20));
INSERT INTO @newMembers VALUES
    (N'Phạm Gia Bảo', N'Nam', N'bao.pham01@gmail.com', N'0913000001'),
    (N'Đỗ Bảo Ngọc', N'Nữ', N'ngoc.do02@gmail.com', N'0913000002'),
    (N'Lê Hoàng Long', N'Nam', N'long.le03@gmail.com', N'0913000003'),
    (N'Bùi Bích Phượng', N'Nữ', N'phuong.bui04@gmail.com', N'0913000004'),
    (N'Trần Minh Quân', N'Nam', N'quan.tran05@gmail.com', N'0913000005'),
    (N'Đặng Phương Thảo', N'Nữ', N'thao.dang06@gmail.com', N'0913000006'),
    (N'Nguyễn Nhật Nam', N'Nam', N'nam.nguyen07@gmail.com', N'0913000007'),
    (N'Võ Diệu Hiền', N'Nữ', N'hien.vo08@gmail.com', N'0913000008'),
    (N'Lý Quốc Việt', N'Nam', N'viet.ly09@gmail.com', N'0913000009'),
    (N'Vũ Thùy Dương', N'Nữ', N'duong.vu10@gmail.com', N'0913000010'),
    (N'Dương Bảo Long', N'Nam', N'long.duong11@gmail.com', N'0913000011'),
    (N'Huỳnh Tú Uyên', N'Nữ', N'uyen.huynh12@gmail.com', N'0913000012'),
    (N'Ngô Thanh Tùng', N'Nam', N'tung.ngo13@gmail.com', N'0913000013'),
    (N'Hoàng Hà My', N'Nữ', N'my.hoang14@gmail.com', N'0913000014'),
    (N'Hồ Trọng Nghĩa', N'Nam', N'nghia.ho15@gmail.com', N'0913000015'),
    (N'Phạm Thu Trang', N'Nữ', N'trang.pham16@gmail.com', N'0913000016'),
    (N'Đỗ Hữu Phước', N'Nam', N'phuoc.do17@gmail.com', N'0913000017'),
    (N'Lê Thanh Hằng', N'Nữ', N'hang.le18@gmail.com', N'0913000018'),
    (N'Bùi Khánh Duy', N'Nam', N'duy.bui19@gmail.com', N'0913000019'),
    (N'Trần Khánh Linh', N'Nữ', N'linh.tran20@gmail.com', N'0913000020'),
    (N'Đặng Anh Khoa', N'Nam', N'khoa.dang21@gmail.com', N'0913000021'),
    (N'Nguyễn Mỹ Linh', N'Nữ', N'linh.nguyen22@gmail.com', N'0913000022'),
    (N'Võ Thành Đạt', N'Nam', N'dat.vo23@gmail.com', N'0913000023'),
    (N'Lý Minh Châu', N'Nữ', N'chau.ly24@gmail.com', N'0913000024'),
    (N'Vũ Tuấn Kiệt', N'Nam', N'kiet.vu25@gmail.com', N'0913000025'),
    (N'Dương Kim Ngân', N'Nữ', N'ngan.duong26@gmail.com', N'0913000026'),
    (N'Huỳnh Gia Bảo', N'Nam', N'bao.huynh27@gmail.com', N'0913000027'),
    (N'Ngô Bảo Ngọc', N'Nữ', N'ngoc.ngo28@gmail.com', N'0913000028'),
    (N'Hoàng Hoàng Long', N'Nam', N'long.hoang29@gmail.com', N'0913000029'),
    (N'Hồ Bích Phượng', N'Nữ', N'phuong.ho30@gmail.com', N'0913000030'),
    (N'Phạm Quốc Việt', N'Nam', N'viet.pham31@gmail.com', N'0913000031'),
    (N'Đỗ Thùy Dương', N'Nữ', N'duong.do32@gmail.com', N'0913000032'),
    (N'Lê Bảo Long', N'Nam', N'long.le33@gmail.com', N'0913000033'),
    (N'Bùi Tú Uyên', N'Nữ', N'uyen.bui34@gmail.com', N'0913000034'),
    (N'Trần Thanh Tùng', N'Nam', N'tung.tran35@gmail.com', N'0913000035'),
    (N'Đặng Hà My', N'Nữ', N'my.dang36@gmail.com', N'0913000036'),
    (N'Nguyễn Trọng Nghĩa', N'Nam', N'nghia.nguyen37@gmail.com', N'0913000037'),
    (N'Võ Ngọc Anh', N'Nữ', N'anh.vo38@gmail.com', N'0913000038'),
    (N'Lý Đức Anh', N'Nam', N'anh.ly39@gmail.com', N'0913000039'),
    (N'Vũ Yến Nhi', N'Nữ', N'nhi.vu40@gmail.com', N'0913000040'),
    (N'Dương Công Minh', N'Nam', N'minh.duong41@gmail.com', N'0913000041'),
    (N'Huỳnh Thu Trang', N'Nữ', N'trang.huynh42@gmail.com', N'0913000042'),
    (N'Ngô Hữu Phước', N'Nam', N'phuoc.ngo43@gmail.com', N'0913000043'),
    (N'Hoàng Thanh Hằng', N'Nữ', N'hang.hoang44@gmail.com', N'0913000044'),
    (N'Hồ Khánh Duy', N'Nam', N'duy.ho45@gmail.com', N'0913000045'),
    (N'Phạm Minh Châu', N'Nữ', N'chau.pham46@gmail.com', N'0913000046'),
    (N'Đỗ Tuấn Kiệt', N'Nam', N'kiet.do47@gmail.com', N'0913000047'),
    (N'Lê Kim Ngân', N'Nữ', N'ngan.le48@gmail.com', N'0913000048'),
    (N'Bùi Gia Bảo', N'Nam', N'bao.bui49@gmail.com', N'0913000049'),
    (N'Trần Bảo Ngọc', N'Nữ', N'ngoc.tran50@gmail.com', N'0913000050'),
    (N'Đặng Hoàng Long', N'Nam', N'long.dang51@gmail.com', N'0913000051'),
    (N'Nguyễn Bích Phượng', N'Nữ', N'phuong.nguyen52@gmail.com', N'0913000052'),
    (N'Võ Minh Quân', N'Nam', N'quan.vo53@gmail.com', N'0913000053'),
    (N'Lý Phương Thảo', N'Nữ', N'thao.ly54@gmail.com', N'0913000054'),
    (N'Vũ Nhật Nam', N'Nam', N'nam.vu55@gmail.com', N'0913000055'),
    (N'Dương Diệu Hiền', N'Nữ', N'hien.duong56@gmail.com', N'0913000056'),
    (N'Huỳnh Quốc Việt', N'Nam', N'viet.huynh57@gmail.com', N'0913000057'),
    (N'Ngô Thùy Dương', N'Nữ', N'duong.ngo58@gmail.com', N'0913000058'),
    (N'Hoàng Bảo Long', N'Nam', N'long.hoang59@gmail.com', N'0913000059'),
    (N'Hồ Tú Uyên', N'Nữ', N'uyen.ho60@gmail.com', N'0913000060');

INSERT INTO [user] (role_id, center_id, full_name, email, phone, password_hash, gender, status)
SELECT @memberRole, @memberSeedCenterId, n.full_name, n.email, n.phone, @memberSeedHash, n.gender, N'active'
FROM @newMembers n
WHERE NOT EXISTS (SELECT 1 FROM [user] u WHERE u.email = n.email OR u.phone = n.phone);

CREATE TABLE #pool (user_id INT NOT NULL PRIMARY KEY);
INSERT INTO #pool (user_id)
SELECT u.user_id FROM [user] u INNER JOIN @newMembers n ON n.email = u.email;

/* ===================== Ghi danh vào lớp đang học ===================== */

DECLARE @classId INT, @start DATE, @capacity INT, @target INT, @have INT, @need INT;

DECLARE class_cursor CURSOR LOCAL FAST_FORWARD FOR
    SELECT class_id, start_date, capacity
    FROM class
    WHERE status = N'ongoing' AND capacity IS NOT NULL
    ORDER BY class_id;
OPEN class_cursor;
FETCH NEXT FROM class_cursor INTO @classId, @start, @capacity;
WHILE @@FETCH_STATUS = 0
BEGIN
    -- Mức lấp đầy 60%, 70%, 80%, 90% luân phiên theo lớp, luôn còn ít nhất 1 chỗ.
    SET @target = CEILING(@capacity * (0.6 + 0.1 * (@classId % 4)));
    IF @target > @capacity - 1 SET @target = @capacity - 1;
    SELECT @have = COUNT(*) FROM class_enrollment WHERE class_id = @classId AND status = N'enrolled';
    SET @need = @target - @have;

    IF @need > 0
    BEGIN
        INSERT INTO class_enrollment (class_id, user_id, enrolled_at, status)
        SELECT TOP (@need) @classId, p.user_id,
               DATEADD(HOUR, 9, CAST(DATEADD(DAY, -1, @start) AS DATETIME2(0))), N'enrolled'
        FROM #pool p
        WHERE NOT EXISTS (SELECT 1 FROM class_enrollment e WHERE e.class_id = @classId AND e.user_id = p.user_id)
          AND NOT EXISTS (
              SELECT 1
              FROM class_enrollment e2
              INNER JOIN class_schedule s2 ON s2.class_id = e2.class_id
              INNER JOIN time_slot t2 ON t2.time_slot_id = s2.time_slot_id
              INNER JOIN class_schedule s1 ON s1.class_id = @classId AND s1.weekday = s2.weekday
              INNER JOIN time_slot t1 ON t1.time_slot_id = s1.time_slot_id
              WHERE e2.user_id = p.user_id AND e2.status = N'enrolled'
                AND t1.start_time < t2.end_time AND t2.start_time < t1.end_time)
        ORDER BY (SELECT COUNT(*) FROM class_enrollment e3 WHERE e3.user_id = p.user_id AND e3.status = N'enrolled'),
                 (p.user_id * 37 + @classId * 11) % 101, p.user_id;
    END;

    FETCH NEXT FROM class_cursor INTO @classId, @start, @capacity;
END;
CLOSE class_cursor;
DEALLOCATE class_cursor;

/* ===================== Hóa đơn, thanh toán, lịch sử đăng ký ===================== */

-- Lượt ghi danh của học viên mẫu chưa có thanh toán đã trả.
SELECT e.user_id, e.class_id, c.price, e.enrolled_at AS paid_at
INTO #todo
FROM class_enrollment e
INNER JOIN #pool p ON p.user_id = e.user_id
INNER JOIN class cl ON cl.class_id = e.class_id
INNER JOIN course c ON c.course_id = cl.course_id
WHERE e.status = N'enrolled'
  AND NOT EXISTS (SELECT 1 FROM payment pay WHERE pay.user_id = e.user_id AND pay.class_id = e.class_id AND pay.status = N'paid');

-- Mỗi học viên một hóa đơn gộp học phí các lớp. Mã INV-{năm}-{số} nối tiếp mã lớn nhất hiện có.
DECLARE @lastNo INT = ISNULL((SELECT MAX(TRY_CAST(RIGHT(invoice_code, 4) AS INT)) FROM invoice WHERE invoice_code LIKE N'INV-____-____'), 0);

SELECT t.user_id,
       N'INV-' + CAST(YEAR(MIN(t.paid_at)) AS NVARCHAR(4)) + N'-'
         + RIGHT(N'0000' + CAST(@lastNo + ROW_NUMBER() OVER (ORDER BY t.user_id) AS NVARCHAR(10)), 4) AS invoice_code,
       SUM(t.price) AS total_amount,
       MIN(t.paid_at) AS issued_at
INTO #inv
FROM #todo t
GROUP BY t.user_id;

INSERT INTO invoice (user_id, invoice_code, issued_at, total_amount, status)
SELECT user_id, invoice_code, issued_at, total_amount, N'paid' FROM #inv;

INSERT INTO payment (invoice_id, user_id, class_id, amount, payment_method, paid_at, status, registered_by_user_id)
SELECT i.invoice_id, t.user_id, t.class_id, t.price, N'chuyen_khoan', t.paid_at, N'paid', t.user_id
FROM #todo t
INNER JOIN #inv v ON v.user_id = t.user_id
INNER JOIN invoice i ON i.invoice_code = v.invoice_code;

INSERT INTO payment_history (payment_id, status, note, created_at)
SELECT p.payment_id, N'paid', N'Thanh toán thành công', p.paid_at
FROM payment p
INNER JOIN #todo t ON t.user_id = p.user_id AND t.class_id = p.class_id
WHERE p.status = N'paid'
  AND NOT EXISTS (SELECT 1 FROM payment_history h WHERE h.payment_id = p.payment_id);

INSERT INTO class_registration_log (member_user_id, class_id, payment_id, action, performed_by_user_id, performed_by_role, created_at, class_assigned_by)
SELECT p.user_id, p.class_id, p.payment_id, N'register', p.user_id, N'MEMBER', p.paid_at, N'MEMBER'
FROM payment p
INNER JOIN #todo t ON t.user_id = p.user_id AND t.class_id = p.class_id
WHERE p.status = N'paid'
  AND NOT EXISTS (SELECT 1 FROM class_registration_log l WHERE l.payment_id = p.payment_id);

-- invoice_code_seq nối tiếp để backend cấp mã mới không trùng.
DECLARE @nextNo INT = ISNULL((SELECT MAX(TRY_CAST(RIGHT(invoice_code, 4) AS INT)) FROM invoice WHERE invoice_code LIKE N'INV-____-____'), 0) + 1;
DECLARE @seqSql NVARCHAR(200) = N'ALTER SEQUENCE dbo.invoice_code_seq RESTART WITH ' + CAST(@nextNo AS NVARCHAR(10));
EXEC sp_executesql @seqSql;

/* ===================== Gói hội viên tặng kèm lớp ===================== */

-- Mỗi lớp đã thanh toán được tặng 1 tháng Hạng Đồng, gói sau nối tiếp gói trước (như 02_seed.sql).
;WITH gift AS (
    SELECT p.user_id, pk.membership_package_id, pk.package_name,
           CAST(MIN(p.paid_at) OVER (PARTITION BY p.user_id) AS DATE) AS first_paid,
           ROW_NUMBER() OVER (PARTITION BY p.user_id ORDER BY p.payment_id) - 1 AS k
    FROM payment p
    INNER JOIN #pool pool ON pool.user_id = p.user_id
    INNER JOIN membership_package pk ON pk.package_code = N'PKG-001'
    WHERE p.status = N'paid' AND p.class_id IS NOT NULL AND p.upgrade_package_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM membership m WHERE m.user_id = p.user_id)
)
INSERT INTO membership (user_id, payment_id, plan_name, start_date, end_date, status, membership_package_id, is_free)
SELECT g.user_id, NULL, g.package_name + N' (tặng kèm lớp)',
       DATEADD(MONTH, g.k, g.first_paid),
       DATEADD(DAY, -1, DATEADD(MONTH, g.k + 1, g.first_paid)),
       CASE WHEN DATEADD(MONTH, g.k, g.first_paid) <= @memberSeedToday THEN N'active' ELSE N'scheduled' END,
       g.membership_package_id, 1
FROM gift g;

/* ===================== Điểm danh các buổi đã học xong ===================== */

-- Phần lớn có mặt, thỉnh thoảng đi trễ hoặc vắng.
INSERT INTO attendance (session_id, user_id, check_in_at, status)
SELECT s.session_id, e.user_id,
       CASE WHEN (s.session_id + e.user_id) % 10 = 0 THEN NULL
            ELSE DATEADD(MINUTE, CASE WHEN (s.session_id + e.user_id) % 10 = 1 THEN 8 ELSE -5 END,
                 DATEADD(SECOND, DATEDIFF(SECOND, CAST('00:00:00' AS TIME), s.start_time), CAST(s.session_date AS DATETIME2))) END,
       CASE (s.session_id + e.user_id) % 10 WHEN 0 THEN N'absent' WHEN 1 THEN N'late' ELSE N'present' END
FROM [session] s
INNER JOIN class_enrollment e ON e.class_id = s.class_id AND e.status = N'enrolled'
INNER JOIN #pool p ON p.user_id = e.user_id
WHERE s.status = N'completed'
  AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.session_id = s.session_id AND a.user_id = e.user_id);

COMMIT TRANSACTION;

DROP TABLE #todo;
DROP TABLE #inv;
DROP TABLE #pool;

SELECT cl.class_id, cl.class_name, cl.status, cl.capacity,
       (SELECT COUNT(*) FROM class_enrollment e WHERE e.class_id = cl.class_id AND e.status = N'enrolled') AS enrolled
FROM class cl
ORDER BY cl.class_id;

/* ===================== END 04_seed_extra_members(2).sql ===================== */


/* ===================== BEGIN 06_rename_class_names(2).sql ===================== */
/*
    AnhDuy Sport - Doi ten lop (class.class_name)
    Bo phan "Sang/Chieu thu N" trong ten lop: thu va gio da co trong class_schedule.
    Ten moi chi gom ten mon va mot ten goi rieng cho lop, khong kem level, so dem hay ma.

    Chay sau 01..05 (setup.ps1 da goi san). Chay lai nhieu lan van an toan (chi doi dong con ten cu).
    Khong anh huong bang khac: cac bang khac tham chieu lop bang class_id, khong theo ten.

    sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -I -f 65001 -d AnhDuySport -i database\06_rename_class_names.sql
*/

-- Chon database SWP391_DB trong dropdown cua SSMS truoc khi Execute.
GO

SET QUOTED_IDENTIFIER ON;
GO

UPDATE cl
SET class_name = v.new_name
FROM class AS cl
INNER JOIN (VALUES
    (N'Bơi lội - Sáng thứ 3',     N'Bơi lội Sóng Xanh'),
    (N'Bóng bàn - Chiều thứ 4',   N'Bóng bàn Vợt Vàng'),
    (N'Bóng đá - Chiều thứ 2',    N'Bóng đá Sân Cỏ Xanh'),
    (N'Bóng rổ - Chiều thứ 3',    N'Bóng rổ Slam Dunk'),
    (N'Cầu lông - Sáng thứ 7',    N'Cầu lông Lông Vũ'),
    (N'Golf 3D - Chiều thứ 7',    N'Golf 3D Birdie'),
    (N'Quần vợt - Sáng thứ 5',    N'Quần vợt Ace'),
    (N'Taekwondo - Chiều thứ 6',  N'Taekwondo Võ Đạo'),
    /* Hai lop them tay de thu chuc nang tao lop */
    (N'test add class',           N'Bóng bàn Xoáy Nhanh'),
    (N'Add Class Test',           N'Bóng đá Sút Thần')
) AS v(old_name, new_name) ON v.old_name = cl.class_name;
GO

SELECT class_id, class_name FROM class ORDER BY class_id;
GO

/* ===================== END 06_rename_class_names(2).sql ===================== */


/* ===================== BEGIN 07_seed_private_courses(2).sql ===================== */
/*
    AnhDuy Sport - Gói học 1-1 mẫu

    Mỗi môn một gói 1-1: 8 buổi, mỗi buổi 90 phút (khung giờ private của time_slot), học phí 3.200.000.
    Học viên gửi yêu cầu học 1-1 theo gói này, quản lý duyệt thì hệ thống sinh lớp private và các buổi học.
    Chạy lại nhiều lần không tạo trùng (theo course_code).

    Chạy sau 06 (setup.ps1 đã gọi sẵn):
      sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -I -f 65001 -d AnhDuySport -i database\07_seed_private_courses.sql
*/
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;

INSERT INTO course (sport_id, course_code, course_name, level_name, age_range, description, price, status, format, session_minutes, session_count)
SELECT s.sport_id,
       N'PRV-' + UPPER(s.sport_code) + N'-8',
       N'Học 1-1 ' + s.sport_name + N' (8 buổi)',
       NULL,
       NULL,
       N'Kèm riêng một học viên với huấn luyện viên đã chọn: 8 buổi, mỗi buổi 90 phút, lịch lặp hằng tuần.',
       3200000,
       N'active',
       N'private',
       90,
       8
FROM sport AS s
WHERE NOT EXISTS (SELECT 1 FROM course AS c WHERE c.course_code = N'PRV-' + UPPER(s.sport_code) + N'-8');

SELECT course_code, course_name, price, session_count, session_minutes FROM course WHERE format = N'private' ORDER BY sport_id;

/* ===================== END 07_seed_private_courses(2).sql ===================== */
