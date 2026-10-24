/*
    AnhDuy Sport - Dữ liệu mẫu (schema V2)

    Gồm: vai trò, trung tâm, 12 môn, 36 phòng (mỗi môn 3 phòng), người dùng, HLV theo môn,
    khóa học nhóm, giáo án chuẩn theo môn, khung giờ, 8 lớp mẫu kèm lịch tuần và toàn bộ buổi học,
    ghi danh và thanh toán mẫu, gói hội viên.

    Mốc thời gian: lớp khai giảng thứ 2 tuần trước, học viên đăng ký và thanh toán một ngày trước đó.
    Buổi đã qua là completed (có điểm danh), buổi từ hôm nay trở đi là scheduled.

    Chạy sau 01_schema.sql:
      sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -I -f 65001 -d AnhDuySport -i database\02_seed.sql
*/

USE AnhDuySport;
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
    (N'MEMBER',       N'Nguyễn Minh Khang',   N'khang.nguyen@gmail.com',        N'0912000001', N'Nam',  NULL),
    (N'MEMBER',       N'Trần Gia Hân',        N'han.tran@gmail.com',            N'0912000002', N'Nữ',   NULL)
) AS v(role_code, full_name, email, phone, gender, avatar_url)
INNER JOIN role AS r ON r.role_code = v.role_code
CROSS JOIN center AS c;

-- HLV dạy môn nào.
INSERT INTO coach_sport (coach_user_id, sport_id)
SELECT u.user_id, s.sport_id
FROM (VALUES
    (N'paul.villanova@anhduysport.vn', N'basketball'),
    (N'anhvien.nguyen@anhduysport.vn', N'swimming'),
    (N'baonghi.ngo@anhduysport.vn',    N'golf'),
    (N'nhuan.nguyen@anhduysport.vn',   N'tennis'),
    (N'dang.phan@anhduysport.vn',      N'tabletennis'),
    (N'thinh.huynh@anhduysport.vn',    N'badminton'),
    (N'hang.phan@anhduysport.vn',      N'taekwondo'),
    (N'trong.le@anhduysport.vn',       N'soccer')
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

INSERT INTO class (course_id, training_plan_id, coach_user_id, room_id, class_name, start_date, end_date, capacity, status, class_type)
SELECT c.course_id, tp.training_plan_id, u.user_id, rm.room_id, v.class_name,
       @class_start, DATEADD(DAY, tp.duration_weeks * 7 - 1, @class_start), v.capacity, N'ongoing', N'group'
FROM (VALUES
    (N'SWIM-01', N'anhvien.nguyen@anhduysport.vn', N'Bơi lội - Sáng thứ 3',     16),
    (N'TT-01',   N'dang.phan@anhduysport.vn',      N'Bóng bàn - Chiều thứ 4',   12),
    (N'FB-01',   N'trong.le@anhduysport.vn',       N'Bóng đá - Chiều thứ 2',    20),
    (N'BB-01',   N'paul.villanova@anhduysport.vn', N'Bóng rổ - Chiều thứ 3',    16),
    (N'BD-01',   N'thinh.huynh@anhduysport.vn',    N'Cầu lông - Sáng thứ 7',    12),
    (N'GOLF-01', N'baonghi.ngo@anhduysport.vn',    N'Golf 3D - Chiều thứ 7',    6),
    (N'TN-01',   N'nhuan.nguyen@anhduysport.vn',   N'Quần vợt - Sáng thứ 5',    4),
    (N'TKD-01',  N'hang.phan@anhduysport.vn',      N'Taekwondo - Chiều thứ 6',  20)
) AS v(course_code, coach_email, class_name, capacity)
INNER JOIN course AS c ON c.course_code = v.course_code
INNER JOIN sport AS s ON s.sport_id = c.sport_id
INNER JOIN [user] AS u ON u.email = v.coach_email
INNER JOIN room AS rm ON rm.room_code = UPPER(s.sport_code) + N'-1'
INNER JOIN training_plan AS tp ON tp.sport_id = s.sport_id;

-- weekday: 2..7 = thứ 2..thứ 7. Khung giờ nhóm: 07:00 (sáng) hoặc 15:00 (chiều).
INSERT INTO class_schedule (class_id, weekday, time_slot_id)
SELECT cl.class_id, v.weekday, ts.time_slot_id
FROM (VALUES
    (N'SWIM-01', 3, CAST('07:00' AS TIME)),
    (N'TT-01',   4, CAST('15:00' AS TIME)),
    (N'FB-01',   2, CAST('15:00' AS TIME)),
    (N'BB-01',   3, CAST('15:00' AS TIME)),
    (N'BD-01',   7, CAST('07:00' AS TIME)),
    (N'GOLF-01', 7, CAST('15:00' AS TIME)),
    (N'TN-01',   5, CAST('07:00' AS TIME)),
    (N'TKD-01',  6, CAST('15:00' AS TIME))
) AS v(course_code, weekday, start_time)
INNER JOIN course AS c ON c.course_code = v.course_code
INNER JOIN class AS cl ON cl.course_id = c.course_id
INNER JOIN time_slot AS ts ON ts.kind = N'group' AND ts.start_time = v.start_time;

INSERT INTO class_enrollment (class_id, user_id, enrolled_at, status)
SELECT cl.class_id, u.user_id, @registered_at, N'enrolled'
FROM (VALUES
    (N'SWIM-01', N'khang.nguyen@gmail.com'),
    (N'BB-01',   N'khang.nguyen@gmail.com'),
    (N'TKD-01',  N'han.tran@gmail.com')
) AS v(course_code, email)
INNER JOIN course AS c ON c.course_code = v.course_code
INNER JOIN class AS cl ON cl.course_id = c.course_id
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
FROM course AS c
INNER JOIN class AS cl ON cl.course_id = c.course_id
INNER JOIN [session] AS s ON s.class_id = cl.class_id AND s.session_no = 1
INNER JOIN assignment AS a ON a.session_id = s.session_id
INNER JOIN [user] AS coach ON coach.user_id = cl.coach_user_id
INNER JOIN [user] AS student ON student.email = N'khang.nguyen@gmail.com'
INNER JOIN [user] AS reviewer ON reviewer.email = N'admin@anhduysport.vn'
WHERE c.course_code = N'SWIM-01';

/* ===================== Gói hội viên, hóa đơn, thanh toán ===================== */

INSERT INTO membership_package (package_code, package_name, fee, validity_months, benefits, status, updated_at, upgrade_discount_percent) VALUES
    (N'PKG-001', N'Hạng Đồng', 200000, 1, N'Tự do sử dụng phòng tập đa năng. Tặng miễn phí khi đăng ký lớp học.', N'active', SYSUTCDATETIME(), 0),
    (N'PKG-002', N'Hạng Bạc',  350000, 1, N'Tự do sử dụng phòng tập đa năng. Sử dụng hồ bơi giờ thấp điểm. Giảm 50% khi lên cấp cùng lúc đăng ký lớp.', N'active', SYSUTCDATETIME(), 50),
    (N'PKG-003', N'Hạng Vàng', 500000, 1, N'Tự do sử dụng toàn bộ cơ sở vật chất. 1 buổi tập riêng với HLV mỗi tháng. Giảm 25% khi lên cấp cùng lúc đăng ký lớp.', N'active', SYSUTCDATETIME(), 25);

-- Hóa đơn chỉ gồm học phí của 2 lớp Khang đã ghi danh (SWIM-01 + BB-01); invoice_code_seq bắt đầu từ 2.
INSERT INTO invoice (user_id, invoice_code, issued_at, total_amount, status)
SELECT u.user_id, N'INV-2026-0001', @registered_at, CAST(2700000 AS DECIMAL(18,2)), N'paid'
FROM [user] AS u
WHERE u.email = N'khang.nguyen@gmail.com';

INSERT INTO payment (invoice_id, user_id, class_id, amount, payment_method, paid_at, status, registered_by_user_id)
SELECT i.invoice_id, u.user_id, cl.class_id, c.price, N'chuyen_khoan', @registered_at, N'paid', u.user_id
FROM invoice AS i
INNER JOIN [user] AS u ON u.user_id = i.user_id
INNER JOIN course AS c ON c.course_code IN (N'SWIM-01', N'BB-01')
INNER JOIN class AS cl ON cl.course_id = c.course_id
WHERE i.invoice_code = N'INV-2026-0001';

INSERT INTO payment_history (payment_id, status, note, created_at)
SELECT p.payment_id, N'paid', N'Thanh toán thành công', p.paid_at
FROM payment AS p;

INSERT INTO class_registration_log (member_user_id, class_id, payment_id, action, performed_by_user_id, performed_by_role, created_at, class_assigned_by)
SELECT p.user_id, p.class_id, p.payment_id, N'register', p.user_id, N'MEMBER', p.paid_at, N'MEMBER'
FROM payment AS p;

-- Mỗi lớp đã thanh toán (không kèm nâng hạng) được tặng 1 tháng Hạng Đồng, gói sau nối tiếp gói trước
-- (cùng quy tắc ClassMembershipBonus.GrantAsync ở backend): lớp bơi -> active, lớp bóng rổ -> scheduled.
;WITH gift AS (
    SELECT p.user_id, pk.membership_package_id, pk.package_name,
           ROW_NUMBER() OVER (PARTITION BY p.user_id ORDER BY p.payment_id) - 1 AS k
    FROM payment AS p
    INNER JOIN membership_package AS pk ON pk.package_code = N'PKG-001'
    WHERE p.status = N'paid' AND p.class_id IS NOT NULL AND p.upgrade_package_id IS NULL
)
INSERT INTO membership (user_id, payment_id, plan_name, start_date, end_date, status, membership_package_id, is_free)
SELECT g.user_id, NULL, g.package_name + N' (tặng kèm lớp)',
       DATEADD(MONTH, g.k, @registered_on),
       DATEADD(DAY, -1, DATEADD(MONTH, g.k + 1, @registered_on)),
       CASE WHEN DATEADD(MONTH, g.k, @registered_on) <= @today THEN N'active' ELSE N'scheduled' END,
       g.membership_package_id, 1
FROM gift AS g;

INSERT INTO audit_log (user_id, action, entity_name, entity_id, detail)
SELECT u.user_id, N'SEED', N'center', c.center_id, N'Khởi tạo dữ liệu trung tâm AnhDuy Sport.'
FROM [user] AS u
CROSS JOIN center AS c
WHERE u.email = N'admin@anhduysport.vn';
GO
