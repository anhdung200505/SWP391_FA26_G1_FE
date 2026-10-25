/*
    AnhDuy Sport - Doi ten lop (class.class_name)
    Bo phan "Sang/Chieu thu N" trong ten lop: thu va gio da co trong class_schedule.
    Ten moi chi gom ten mon va mot ten goi rieng cho lop, khong kem level, so dem hay ma.

    Chay sau 01..05 (setup.ps1 da goi san). Chay lai nhieu lan van an toan (chi doi dong con ten cu).
    Khong anh huong bang khac: cac bang khac tham chieu lop bang class_id, khong theo ten.

    sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -I -f 65001 -d AnhDuySport -i database\06_rename_class_names.sql
*/

USE AnhDuySport;
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
