using AnhDuySport.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Chặn đăng ký trùng: học viên không được có hai lớp cùng khóa, hoặc hai lớp trùng lịch
// (cùng thứ, khung giờ chồng nhau, khoảng ngày học giao nhau).
// Tính cả lớp đang học lẫn lớp đang giữ chỗ chờ thanh toán còn hạn, để hai đơn trùng không cùng được tạo.
public static class MemberScheduleConflict
{
    public static async Task EnsureNoneAsync(AppDbContext db, int memberUserId, int targetClassId, DateTime holdSince, int? ignoreClassId = null)
    {
        var reason = await FindAsync(db, memberUserId, targetClassId, holdSince, ignoreClassId);
        if (reason is not null)
        {
            throw new RegistrationException(reason);
        }
    }

    // Null khi lớp này không trùng lớp đang học, đơn đang giữ chỗ, cùng khóa hoặc cùng lịch.
    public static async Task<string?> FindAsync(
        AppDbContext db,
        int memberUserId,
        int targetClassId,
        DateTime holdSince,
        int? ignoreClassId = null)
    {
        var reasons = await FindManyAsync(db, memberUserId, [targetClassId], holdSince, ignoreClassId);
        return reasons.GetValueOrDefault(targetClassId);
    }

    public static async Task<Dictionary<int, string>> FindManyAsync(
        AppDbContext db,
        int memberUserId,
        IReadOnlyCollection<int> targetClassIds,
        DateTime holdSince,
        int? ignoreClassId = null)
    {
        var result = new Dictionary<int, string>();
        if (targetClassIds.Count == 0)
        {
            return result;
        }

        var today = DateOnly.FromDateTime(DateTime.Now);
        var targets = await LoadAsync(db, targetClassIds);
        var busyClassIds = await db.ClassEnrollments.AsNoTracking()
            .Where(enrollment => enrollment.UserId == memberUserId && enrollment.Status == "enrolled")
            .Select(enrollment => enrollment.ClassId)
            .Union(db.Payments.AsNoTracking()
                .Where(payment => payment.UserId == memberUserId
                    && payment.ClassId != null
                    && payment.Status == "pending"
                    && payment.Invoice!.IssuedAt > holdSince)
                .Select(payment => payment.ClassId!.Value))
            .Where(classId => classId != ignoreClassId)
            .ToListAsync();
        if (busyClassIds.Count == 0)
        {
            return result;
        }

        var busy = (await LoadAsync(db, busyClassIds))
            .Where(item => item.EndDate is null || item.EndDate >= today)
            .Where(item => item.Status is not ("cancelled" or "completed"))
            .ToList();

        foreach (var wanted in targets)
        {
            var others = busy.Where(item => item.ClassId != wanted.ClassId).ToList();
            // Lớp 1-1 là gói riêng theo lịch, không bị giới hạn một lớp mỗi khóa.
            var sameCourse = wanted.ClassType == "private" ? null : others.FirstOrDefault(item => item.CourseId == wanted.CourseId);
            if (sameCourse is not null)
            {
                result[wanted.ClassId] =
                    $"Bạn đã có lớp {sameCourse.ClassName} của cùng khóa {wanted.CourseName}. Mỗi khóa chỉ học một lớp.";
                continue;
            }

            foreach (var other in others.Where(item => DatesOverlap(wanted, item)))
            {
                var clash = wanted.Slots.SelectMany(mine => other.Slots
                        .Where(theirs => theirs.Weekday == mine.Weekday && theirs.Start < mine.End && mine.Start < theirs.End)
                        .Select(_ => mine))
                    .FirstOrDefault();
                if (clash is not null)
                {
                    result[wanted.ClassId] =
                        $"Trùng lịch với lớp {other.ClassName}: {ClassSessionPlanner.WeekdayName(clash.Weekday)} {clash.Start:HH\\:mm}-{clash.End:HH\\:mm}.";
                    break;
                }
            }
        }

        return result;
    }

    private static bool DatesOverlap(ClassWindow a, ClassWindow b) =>
        (a.StartDate is null || b.EndDate is null || a.StartDate <= b.EndDate)
        && (b.StartDate is null || a.EndDate is null || b.StartDate <= a.EndDate);

    private static async Task<List<ClassWindow>> LoadAsync(AppDbContext db, IReadOnlyCollection<int> classIds)
    {
        var rows = await db.Classes.AsNoTracking()
            .Where(item => classIds.Contains(item.ClassId))
            .Select(item => new
            {
                item.ClassId,
                item.ClassName,
                item.CourseId,
                CourseName = item.Course!.CourseName,
                item.StartDate,
                item.EndDate,
                item.Status,
                item.ClassType,
                Slots = item.Schedules.Select(schedule => new
                {
                    schedule.Weekday,
                    schedule.TimeSlot!.StartTime,
                    schedule.TimeSlot.EndTime,
                }).ToList(),
            })
            .ToListAsync();

        return rows
            .Select(row => new ClassWindow(
                row.ClassId,
                row.ClassName,
                row.CourseId,
                row.CourseName,
                row.StartDate,
                row.EndDate,
                row.Status,
                row.ClassType,
                row.Slots.Select(slot => new WeeklySlot(slot.Weekday, slot.StartTime, slot.EndTime)).ToList()))
            .ToList();
    }

    private sealed record WeeklySlot(int Weekday, TimeOnly Start, TimeOnly End);

    private sealed record ClassWindow(
        int ClassId,
        string ClassName,
        int CourseId,
        string CourseName,
        DateOnly? StartDate,
        DateOnly? EndDate,
        string Status,
        string ClassType,
        List<WeeklySlot> Slots);
}
