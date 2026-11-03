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
