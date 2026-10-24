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

DECLARE @today DATE = CAST(GETDATE() AS DATE);
DECLARE @hash NVARCHAR(255) = (SELECT TOP 1 password_hash FROM [user] WHERE email = N'khang.nguyen@gmail.com');
DECLARE @memberRole INT = (SELECT role_id FROM role WHERE role_code = N'MEMBER');
DECLARE @centerId INT = (SELECT TOP 1 center_id FROM [user] WHERE email = N'khang.nguyen@gmail.com');

BEGIN TRANSACTION;

/* ===================== 60 học viên ===================== */

DECLARE @new TABLE (full_name NVARCHAR(200), gender NVARCHAR(20), email NVARCHAR(200), phone NVARCHAR(20));
INSERT INTO @new VALUES
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
SELECT @memberRole, @centerId, n.full_name, n.email, n.phone, @hash, n.gender, N'active'
FROM @new n
WHERE NOT EXISTS (SELECT 1 FROM [user] u WHERE u.email = n.email OR u.phone = n.phone);

CREATE TABLE #pool (user_id INT NOT NULL PRIMARY KEY);
INSERT INTO #pool (user_id)
SELECT u.user_id FROM [user] u INNER JOIN @new n ON n.email = u.email;

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
       CASE WHEN DATEADD(MONTH, g.k, g.first_paid) <= @today THEN N'active' ELSE N'scheduled' END,
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
