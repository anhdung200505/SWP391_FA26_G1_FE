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
        var target = await LoadAsync(db, [targetClassId]);
        if (target.Count == 0)
        {
            return;
        }

        var today = DateOnly.FromDateTime(DateTime.Now);
        var busyClassIds = await db.ClassEnrollments.AsNoTracking()
            .Where(enrollment => enrollment.UserId == memberUserId && enrollment.Status == "enrolled")
            .Select(enrollment => enrollment.ClassId)
            .Union(db.Payments.AsNoTracking()
                .Where(payment => payment.UserId == memberUserId
                    && payment.ClassId != null
                    && payment.Status == "pending"
                    && payment.Invoice!.IssuedAt > holdSince)
                .Select(payment => payment.ClassId!.Value))
            .Where(classId => classId != targetClassId && classId != ignoreClassId)
            .ToListAsync();
        if (busyClassIds.Count == 0)
        {
            return;
        }

        var wanted = target[0];
        var busy = (await LoadAsync(db, busyClassIds))
            .Where(item => item.EndDate is null || item.EndDate >= today)
            .Where(item => item.Status is not ("cancelled" or "completed"))
            .ToList();

        var sameCourse = busy.FirstOrDefault(item => item.CourseId == wanted.CourseId);
        if (sameCourse is not null)
        {
            throw new RegistrationException(
                $"Bạn đã có lớp {sameCourse.ClassName} của cùng khóa {wanted.CourseName}. Mỗi khóa chỉ học một lớp.");
        }

        foreach (var other in busy.Where(item => DatesOverlap(wanted, item)))
        {
            var clash = wanted.Slots.SelectMany(mine => other.Slots
                    .Where(theirs => theirs.Weekday == mine.Weekday && theirs.Start < mine.End && mine.Start < theirs.End)
                    .Select(_ => mine))
                .FirstOrDefault();
            if (clash is not null)
            {
                throw new RegistrationException(
                    $"Trùng lịch với lớp {other.ClassName}: {ClassSessionPlanner.WeekdayName(clash.Weekday)} {clash.Start:HH\\:mm}-{clash.End:HH\\:mm}.");
            }
        }
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
                row.ClassName,
                row.CourseId,
                row.CourseName,
                row.StartDate,
                row.EndDate,
                row.Status,
                row.Slots.Select(slot => new WeeklySlot(slot.Weekday, slot.StartTime, slot.EndTime)).ToList()))
            .ToList();
    }

    private sealed record WeeklySlot(int Weekday, TimeOnly Start, TimeOnly End);

    private sealed record ClassWindow(
        string ClassName,
        int CourseId,
        string CourseName,
        DateOnly? StartDate,
        DateOnly? EndDate,
        string Status,
        List<WeeklySlot> Slots);
}
