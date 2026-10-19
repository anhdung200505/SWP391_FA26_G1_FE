/*
    Dữ liệu mẫu AnhDuy Sport.
    Khóa học, HLV và phòng tập lấy theo nội dung đang có trên frontend.
    Chạy sau 01_schema.sql.
*/
USE AnhDuySport;
GO

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

INSERT INTO room (center_id, room_code, room_name, room_type, capacity, area_m2, description, image_path)
SELECT c.center_id, v.room_code, v.room_name, v.room_type, v.capacity, v.area_m2, v.description, v.image_path
FROM center AS c
CROSS JOIN (VALUES
    (N'ARENA',    N'Sân vận động AnhDuy',              N'ARENA',          2500, CAST(1976 AS DECIMAL(10,2)), N'Sân vận động chuẩn FIBA, sức chứa 1.500–2.500 chỗ.', N'assets/facilities/facility-arena-1024x683.webp'),
    (N'INDOOR',   N'Sân thi đấu đa năng',              N'INDOOR COURT',   80,   CAST(540 AS DECIMAL(10,2)),  N'Sân trong nhà cho bóng rổ, bóng chuyền và futsal.', N'assets/facilities/facility-basketball-1024x683.webp'),
    (N'POOL',     N'Hồ bơi chuẩn Olympic',             N'AQUATICS',       60,   NULL,                        N'Hồ bơi 50m, 10 làn, lọc nước UV + Ozone.', N'assets/facilities/facility-pool-1024x682.webp'),
    (N'GOLF-SIM', N'Phòng mô phỏng XSWING – Golf 3D',  N'GOLF SIMULATOR', 8,    NULL,                        N'Phòng tập golf mô phỏng 3D.', N'assets/facilities/facility-golf-sim-1024x683.webp'),
    (N'PUTTING',  N'Sân tập golf putting green',       N'PUTTING GREEN',  12,   NULL,                        N'Sân tập ngoài trời, mặt cỏ cao cấp.', N'assets/facilities/facility-golf-green-1024x576.webp'),
    (N'TENNIS',   N'Sân tennis ngoài trời',            N'TENNIS COURT',   4,    NULL,                        N'Sân tennis mặt acrylic ngoài trời.', N'assets/facilities/facility-tennis-1024x576.webp'),
    (N'THEATER',  N'Nhà hát và sân khấu',              N'THEATER',        370,  CAST(408 AS DECIMAL(10,2)),  N'Không gian trình chiếu, biểu diễn và hội thảo.', N'assets/facilities/facility-theater-1024x331.webp'),
    (N'TT-ROOM',  N'Phòng tập đa năng (không gương)',  N'TABLE TENNIS',   24,   NULL,                        N'Phòng rộng cho bóng bàn và tập luyện.', N'assets/facilities/facility-tabletennis-1024x683.webp'),
    (N'STUDIO',   N'Phòng tập đa năng (có gương)',     N'STUDIO',         30,   CAST(266 AS DECIMAL(10,2)),  N'Phòng gương cho võ thuật, múa và nhảy.', N'assets/facilities/taekwondo-1-1024x683.webp')
) AS v(room_code, room_name, room_type, capacity, area_m2, description, image_path);

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

INSERT INTO [user] (role_id, center_id, full_name, email, phone, password_hash, gender, avatar_url, status)
SELECT r.role_id, c.center_id, v.full_name, v.email, v.phone, N'pbkdf2.100000.oiS/WGvU0MeybY5K6gbcZA==.ZFllnZtVBr5cGSCT7D98RgDFcDII0uMzP7LcddpBueo=', v.gender, v.avatar_url, N'active'
FROM (VALUES
    (N'ADMIN',        N'Quản trị AnhDuy',     N'admin@anhduysport.vn',        N'0901000001', NULL,      NULL),
    (N'RECEPTIONIST', N'Lễ tân AnhDuy',       N'letan@anhduysport.vn',        N'0901000002', NULL,      NULL),
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

INSERT INTO course (sport_id, course_code, course_name, level_name, age_range, description, price, image_path, status)
SELECT s.sport_id, v.course_code, v.course_name, v.level_name, v.age_range, v.description, v.price, v.image_path, N'active'
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

INSERT INTO material (course_id, title, material_type, description)
SELECT c.course_id, c.course_name + N' - Giáo án tuần 1', N'lesson', N'Tài liệu kỹ thuật buổi nhập môn.'
FROM course AS c;

INSERT INTO training_plan (created_by_user_id, plan_name, description, duration_weeks)
SELECT u.user_id, v.plan_name, v.description, v.duration_weeks
FROM (VALUES
    (N'anhvien.nguyen@anhduysport.vn', N'Giáo án bơi lội 8 tuần',    N'Làm quen nước, thở và kỹ thuật bơi ếch.', 8),
    (N'dang.phan@anhduysport.vn',      N'Giáo án bóng bàn 8 tuần',    N'Cầm vợt, giao bóng và xoáy cơ bản.', 8),
    (N'trong.le@anhduysport.vn',       N'Giáo án bóng đá 12 tuần',    N'Kỹ thuật cá nhân, phối hợp và thể lực.', 12),
    (N'paul.villanova@anhduysport.vn', N'Giáo án bóng rổ 12 tuần',    N'Dẫn bóng, ném rổ và phòng thủ.', 12),
    (N'thinh.huynh@anhduysport.vn',    N'Giáo án cầu lông 8 tuần',    N'Di chuyển, cầu thuận tay và đánh đôi.', 8),
    (N'baonghi.ngo@anhduysport.vn',    N'Giáo án golf 3D 8 tuần',     N'Tư thế swing và kiểm soát lực.', 8),
    (N'nhuan.nguyen@anhduysport.vn',   N'Giáo án quần vợt 10 tuần',   N'Footwork và cú đánh nền.', 10),
    (N'hang.phan@anhduysport.vn',      N'Giáo án taekwondo 12 tuần',  N'Kỷ luật, phẩm chất và kỹ thuật căn bản.', 12)
) AS v(email, plan_name, description, duration_weeks)
INNER JOIN [user] AS u ON u.email = v.email;

INSERT INTO class (course_id, training_plan_id, coach_user_id, room_id, class_name, start_date, end_date, capacity, status)
SELECT c.course_id, tp.training_plan_id, u.user_id, rm.room_id, v.class_name,
       CAST(GETDATE() AS DATE), DATEADD(WEEK, tp.duration_weeks, CAST(GETDATE() AS DATE)), v.capacity, N'ongoing'
FROM (VALUES
    (N'SWIM-01', N'anhvien.nguyen@anhduysport.vn', N'POOL',     N'Bơi lội - Sáng thứ 3 & 5',     16),
    (N'TT-01',   N'dang.phan@anhduysport.vn',      N'TT-ROOM',  N'Bóng bàn - Chiều thứ 4 & 6',   12),
    (N'FB-01',   N'trong.le@anhduysport.vn',       N'INDOOR',   N'Bóng đá - Tối thứ 2 & 4',      20),
    (N'BB-01',   N'paul.villanova@anhduysport.vn', N'ARENA',    N'Bóng rổ - Tối thứ 3 & 5',      16),
    (N'BD-01',   N'thinh.huynh@anhduysport.vn',    N'INDOOR',   N'Cầu lông - Sáng thứ 7',        12),
    (N'GOLF-01', N'baonghi.ngo@anhduysport.vn',    N'GOLF-SIM', N'Golf 3D - Chiều thứ 7',        6),
    (N'TN-01',   N'nhuan.nguyen@anhduysport.vn',   N'TENNIS',   N'Quần vợt - Sáng chủ nhật',     4),
    (N'TKD-01',  N'hang.phan@anhduysport.vn',      N'STUDIO',   N'Taekwondo - Tối thứ 6',        20)
) AS v(course_code, coach_email, room_code, class_name, capacity)
INNER JOIN course AS c ON c.course_code = v.course_code
INNER JOIN [user] AS u ON u.email = v.coach_email
INNER JOIN room AS rm ON rm.room_code = v.room_code
INNER JOIN training_plan AS tp ON tp.created_by_user_id = u.user_id;

INSERT INTO class_enrollment (class_id, user_id, status)
SELECT cl.class_id, u.user_id, N'enrolled'
FROM (VALUES
    (N'SWIM-01', N'khang.nguyen@gmail.com'),
    (N'BB-01',   N'khang.nguyen@gmail.com'),
    (N'TKD-01',  N'han.tran@gmail.com')
) AS v(course_code, email)
INNER JOIN course AS c ON c.course_code = v.course_code
INNER JOIN class AS cl ON cl.course_id = c.course_id
INNER JOIN [user] AS u ON u.email = v.email;

INSERT INTO slot (class_id, room_id, slot_date, start_time, end_time, title, registration_limit)
SELECT cl.class_id, cl.room_id, DATEADD(DAY, 2, CAST(GETDATE() AS DATE)), v.start_time, v.end_time, v.title, v.registration_limit
FROM (VALUES
    (N'SWIM-01', CAST('07:00' AS TIME), CAST('08:00' AS TIME), N'Làm quen nước và thở', 10),
    (N'TT-01',   CAST('16:00' AS TIME), CAST('17:30' AS TIME), N'Cầm vợt và giao bóng', 8),
    (N'FB-01',   CAST('18:00' AS TIME), CAST('19:30' AS TIME), N'Kỹ thuật dẫn bóng', 16),
    (N'BB-01',   CAST('18:30' AS TIME), CAST('20:00' AS TIME), N'Dẫn bóng và ném rổ', 12),
    (N'BD-01',   CAST('08:00' AS TIME), CAST('09:30' AS TIME), N'Di chuyển và cầu thuận tay', 8),
    (N'GOLF-01', CAST('14:00' AS TIME), CAST('15:30' AS TIME), N'Tư thế swing', 4),
    (N'TN-01',   CAST('08:00' AS TIME), CAST('09:30' AS TIME), N'Footwork', 4),
    (N'TKD-01',  CAST('18:00' AS TIME), CAST('19:30' AS TIME), N'Tư thế và kỹ thuật căn bản', 15)
) AS v(course_code, start_time, end_time, title, registration_limit)
INNER JOIN course AS c ON c.course_code = v.course_code
INNER JOIN class AS cl ON cl.course_id = c.course_id;

INSERT INTO slot_registration (slot_id, user_id, status)
SELECT s.slot_id, u.user_id, N'registered'
FROM (VALUES
    (N'SWIM-01', N'khang.nguyen@gmail.com'),
    (N'BB-01',   N'khang.nguyen@gmail.com'),
    (N'TKD-01',  N'han.tran@gmail.com')
) AS v(course_code, email)
INNER JOIN course AS c ON c.course_code = v.course_code
INNER JOIN class AS cl ON cl.course_id = c.course_id
INNER JOIN slot AS s ON s.class_id = cl.class_id
INNER JOIN [user] AS u ON u.email = v.email;

INSERT INTO assignment (slot_id, title, description, due_at)
SELECT
    s.slot_id,
    s.title,
    N'Bài tập thực hành trong buổi học.',
    DATEADD(
        HOUR,
        2,
        DATEADD(SECOND, DATEDIFF(SECOND, CAST('00:00:00' AS TIME), s.end_time), CAST(s.slot_date AS DATETIME2))
    )
FROM slot AS s;

INSERT INTO attendance (slot_id, user_id, check_in_at, status)
SELECT
    s.slot_id,
    u.user_id,
    DATEADD(
        MINUTE,
        -5,
        DATEADD(SECOND, DATEDIFF(SECOND, CAST('00:00:00' AS TIME), s.start_time), CAST(s.slot_date AS DATETIME2))
    ),
    N'present'
FROM course AS c
INNER JOIN class AS cl ON cl.course_id = c.course_id
INNER JOIN slot AS s ON s.class_id = cl.class_id
INNER JOIN [user] AS u ON u.email = N'khang.nguyen@gmail.com'
WHERE c.course_code = N'SWIM-01';

INSERT INTO evaluation (class_id, assignment_id, evaluator_user_id, evaluated_user_id, reviewer_user_id, score, comment)
SELECT cl.class_id, a.assignment_id, coach.user_id, student.user_id, reviewer.user_id, 8.5, N'Kiểm soát hơi thở ổn, cần thêm sức bền.'
FROM course AS c
INNER JOIN class AS cl ON cl.course_id = c.course_id
INNER JOIN slot AS s ON s.class_id = cl.class_id
INNER JOIN assignment AS a ON a.slot_id = s.slot_id
INNER JOIN [user] AS coach ON coach.user_id = cl.coach_user_id
INNER JOIN [user] AS student ON student.email = N'khang.nguyen@gmail.com'
INNER JOIN [user] AS reviewer ON reviewer.email = N'admin@anhduysport.vn'
WHERE c.course_code = N'SWIM-01';

INSERT INTO invoice (user_id, invoice_code, total_amount, status)
SELECT u.user_id, N'INV-2026-0001', CAST(2700000 AS DECIMAL(18,2)), N'paid'
FROM [user] AS u
WHERE u.email = N'khang.nguyen@gmail.com';

INSERT INTO payment (invoice_id, user_id, course_id, amount, payment_method, paid_at, status)
SELECT i.invoice_id, u.user_id, c.course_id, c.price, N'chuyen_khoan', SYSUTCDATETIME(), N'paid'
FROM invoice AS i
INNER JOIN [user] AS u ON u.user_id = i.user_id
INNER JOIN course AS c ON c.course_code IN (N'SWIM-01', N'BB-01')
WHERE i.invoice_code = N'INV-2026-0001';

INSERT INTO membership (user_id, payment_id, plan_name, start_date, end_date, status)
SELECT u.user_id, p.payment_id, N'Thành viên AnhDuy 3 tháng',
       CAST(GETDATE() AS DATE), DATEADD(MONTH, 3, CAST(GETDATE() AS DATE)), N'active'
FROM [user] AS u
INNER JOIN payment AS p ON p.user_id = u.user_id
INNER JOIN course AS c ON c.course_id = p.course_id AND c.course_code = N'SWIM-01'
WHERE u.email = N'khang.nguyen@gmail.com';

INSERT INTO consultation_request (received_by_user_id, full_name, phone, email, age, interested_sports, status)
SELECT u.user_id, N'Lê Hoàng Phúc', N'0987654321', N'phuc.le@gmail.com', 10, N'Bơi lội, Bóng đá', N'received'
FROM [user] AS u
WHERE u.email = N'letan@anhduysport.vn';

INSERT INTO notification (user_id, title, content, is_read)
SELECT u.user_id, N'Yêu cầu tư vấn mới', N'Lê Hoàng Phúc (10 tuổi) đăng ký tư vấn Bơi lội và Bóng đá.', 0
FROM [user] AS u
WHERE u.email = N'letan@anhduysport.vn';

INSERT INTO audit_log (user_id, action, entity_name, entity_id, detail)
SELECT u.user_id, N'SEED', N'center', c.center_id, N'Khởi tạo dữ liệu trung tâm AnhDuy Sport.'
FROM [user] AS u
CROSS JOIN center AS c
WHERE u.email = N'admin@anhduysport.vn';
GO
