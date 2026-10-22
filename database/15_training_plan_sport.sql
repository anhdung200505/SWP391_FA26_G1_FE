/*
    AnhDuy Sport - Migration 15
    Giao an chuan gan voi mon the thao de API admin them lop tu chon giao an.

    1. training_plan.sport_id: NULL duoc, vi giao an AI goi y bai tap cua hoc vien (08_ai_workout_recommendation)
       khong thuoc mon nao.
    2. Backfill: giao an lop dang dung -> mon cua khoa hoc cua lop do.
    3. UX_training_plan_sport: moi mon toi da 1 giao an chuan (khong tinh sport_id NULL).

    Chay sau 14_class_membership_bonus.sql. Script chay lai nhieu lan khong loi.

    sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -I -f 65001 -d AnhDuySport -i database\15_training_plan_sport.sql
*/

USE AnhDuySport;
GO

SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH(N'dbo.training_plan', N'sport_id') IS NULL
BEGIN
    ALTER TABLE training_plan ADD sport_id INT NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_training_plan_sport')
BEGIN
    ALTER TABLE training_plan ADD CONSTRAINT FK_training_plan_sport
        FOREIGN KEY (sport_id) REFERENCES sport (sport_id);
END
GO

-- Giao an dang gan cho lop cua dung 1 mon thi gan mon do. Giao an dung o nhieu mon (neu co) bo qua.
UPDATE tp
SET tp.sport_id = single_sport.sport_id
FROM training_plan AS tp
INNER JOIN (
    SELECT cl.training_plan_id, MIN(co.sport_id) AS sport_id
    FROM class AS cl
    INNER JOIN course AS co ON co.course_id = cl.course_id
    GROUP BY cl.training_plan_id
    HAVING COUNT(DISTINCT co.sport_id) = 1
) AS single_sport ON single_sport.training_plan_id = tp.training_plan_id
WHERE tp.sport_id IS NULL
  -- moi mon chi giu 1 giao an dau tien de khong vi pham unique index
  AND NOT EXISTS (
        SELECT 1 FROM training_plan AS other
        WHERE other.sport_id = single_sport.sport_id AND other.training_plan_id <> tp.training_plan_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_training_plan_sport' AND object_id = OBJECT_ID(N'dbo.training_plan'))
BEGIN
    CREATE UNIQUE INDEX UX_training_plan_sport
        ON training_plan (sport_id)
        WHERE sport_id IS NOT NULL;
END
GO
