/*
    AnhDuy Sport - Migration 09
    Moi mon dung 1 buoi 3 tieng moi tuan, thu 2 den thu 7.
    Sang 07:00-10:00 (trong khung 07:00-12:30).
    Chieu 15:00-18:00 (trong khung 13:30-18:00).
    Bong da va cau long dung chung san INDOOR nen khac ngay.

    sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -f 65001 -I -d AnhDuySport -i database\09_class_slots.sql
*/

USE AnhDuySport;
GO

SET QUOTED_IDENTIFIER ON;
GO

/* Bo cac slot ngan da them truoc do. Giu slot goc vi co dang ky, bai tap, diem danh. */
DELETE s
FROM slot AS s
WHERE NOT EXISTS (SELECT 1 FROM slot_registration AS r WHERE r.slot_id = s.slot_id)
  AND NOT EXISTS (SELECT 1 FROM assignment AS a WHERE a.slot_id = s.slot_id)
  AND NOT EXISTS (SELECT 1 FROM attendance AS at WHERE at.slot_id = s.slot_id);
GO

UPDATE cl
SET class_name = v.class_name
FROM class AS cl
INNER JOIN course AS c ON c.course_id = cl.course_id
INNER JOIN (VALUES
    (N'SWIM-01', N'Bơi lội - Sáng thứ 3'),
    (N'TT-01',   N'Bóng bàn - Chiều thứ 4'),
    (N'FB-01',   N'Bóng đá - Chiều thứ 2'),
    (N'BB-01',   N'Bóng rổ - Chiều thứ 3'),
    (N'BD-01',   N'Cầu lông - Sáng thứ 7'),
    (N'GOLF-01', N'Golf 3D - Chiều thứ 7'),
    (N'TN-01',   N'Quần vợt - Sáng thứ 5'),
    (N'TKD-01',  N'Taekwondo - Chiều thứ 6')
) AS v(course_code, class_name) ON v.course_code = c.course_code;
GO

DECLARE @today DATE = CAST(GETDATE() AS DATE);
DECLARE @monday DATE = '20260105'; /* 0 = Thu 2 ... 5 = Thu 7 */

/* Dua slot goc ve dung thu va dung 3 tieng. */
UPDATE s
SET slot_date = nxt.slot_date,
    start_time = v.start_time,
    end_time = v.end_time,
    title = v.title
FROM slot AS s
INNER JOIN class AS cl ON cl.class_id = s.class_id
INNER JOIN course AS c ON c.course_id = cl.course_id
INNER JOIN (VALUES
    (N'SWIM-01', 1, CAST('07:00' AS TIME), CAST('10:00' AS TIME), N'Bơi 3 tiếng', 10),
    (N'TT-01',   2, CAST('15:00' AS TIME), CAST('18:00' AS TIME), N'Bóng bàn 3 tiếng', 8),
    (N'FB-01',   0, CAST('15:00' AS TIME), CAST('18:00' AS TIME), N'Bóng đá 3 tiếng', 16),
    (N'BB-01',   1, CAST('15:00' AS TIME), CAST('18:00' AS TIME), N'Bóng rổ 3 tiếng', 12),
    (N'BD-01',   5, CAST('07:00' AS TIME), CAST('10:00' AS TIME), N'Cầu lông 3 tiếng', 8),
    (N'GOLF-01', 5, CAST('15:00' AS TIME), CAST('18:00' AS TIME), N'Golf 3 tiếng', 4),
    (N'TN-01',   3, CAST('07:00' AS TIME), CAST('10:00' AS TIME), N'Quần vợt 3 tiếng', 4),
    (N'TKD-01',  4, CAST('15:00' AS TIME), CAST('18:00' AS TIME), N'Taekwondo 3 tiếng', 15)
) AS v(course_code, weekday, start_time, end_time, title, registration_limit)
    ON v.course_code = c.course_code
CROSS APPLY (
    SELECT TOP (1) DATEADD(DAY, n.n, @today) AS slot_date
    FROM (VALUES (0),(1),(2),(3),(4),(5),(6)) AS n(n)
    WHERE DATEDIFF(DAY, @monday, DATEADD(DAY, n.n, @today)) % 7 = v.weekday
    ORDER BY n.n
) AS nxt;

/* Them 4 tuan toi. Slot trung thu va trung gio thi bo qua. */
INSERT INTO slot (class_id, room_id, slot_date, start_time, end_time, title, registration_limit)
SELECT cl.class_id, cl.room_id, cal.slot_date, v.start_time, v.end_time, v.title, v.registration_limit
FROM (VALUES
    (N'SWIM-01', 1, CAST('07:00' AS TIME), CAST('10:00' AS TIME), N'Bơi 3 tiếng', 10),
    (N'TT-01',   2, CAST('15:00' AS TIME), CAST('18:00' AS TIME), N'Bóng bàn 3 tiếng', 8),
    (N'FB-01',   0, CAST('15:00' AS TIME), CAST('18:00' AS TIME), N'Bóng đá 3 tiếng', 16),
    (N'BB-01',   1, CAST('15:00' AS TIME), CAST('18:00' AS TIME), N'Bóng rổ 3 tiếng', 12),
    (N'BD-01',   5, CAST('07:00' AS TIME), CAST('10:00' AS TIME), N'Cầu lông 3 tiếng', 8),
    (N'GOLF-01', 5, CAST('15:00' AS TIME), CAST('18:00' AS TIME), N'Golf 3 tiếng', 4),
    (N'TN-01',   3, CAST('07:00' AS TIME), CAST('10:00' AS TIME), N'Quần vợt 3 tiếng', 4),
    (N'TKD-01',  4, CAST('15:00' AS TIME), CAST('18:00' AS TIME), N'Taekwondo 3 tiếng', 15)
) AS v(course_code, weekday, start_time, end_time, title, registration_limit)
INNER JOIN (
    SELECT DATEADD(DAY, w.n * 7 + d.offset, @today) AS slot_date,
           DATEDIFF(DAY, @monday, DATEADD(DAY, w.n * 7 + d.offset, @today)) % 7 AS weekday
    FROM (VALUES (0),(1),(2),(3)) AS w(n)
    CROSS JOIN (VALUES (0),(1),(2),(3),(4),(5),(6)) AS d(offset)
) AS cal ON cal.weekday = v.weekday
INNER JOIN course AS c ON c.course_code = v.course_code
INNER JOIN class AS cl ON cl.course_id = c.course_id
WHERE cal.slot_date >= @today
  AND NOT EXISTS (
      SELECT 1
      FROM slot AS s
      WHERE s.class_id = cl.class_id
        AND s.slot_date = cal.slot_date
        AND s.start_time < v.end_time
        AND s.end_time > v.start_time
  );
GO
