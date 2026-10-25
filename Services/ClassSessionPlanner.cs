using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Models;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Lịch tuần (class_schedule) và buổi học (session) theo quy ước của database: weekday 2..7 = thứ 2..thứ 7, không học chủ nhật.
public static class ClassSessionPlanner
{
    public static byte? WeekdayOf(DateOnly date) =>
        date.DayOfWeek == DayOfWeek.Sunday ? null : (byte)((int)date.DayOfWeek + 1);

    public static string WeekdayName(int weekday) => weekday is >= 2 and <= 7 ? $"Thứ {weekday}" : "";

    public static string SessionTitle(int? sessionNo) => sessionNo is int no ? $"Buổi {no}" : "Buổi học";

    // Mỗi ngày trong [start, end] trùng thứ của lịch tuần thành một buổi, đánh số theo ngày rồi giờ.
    public static List<ClassSession> Plan(
        int classId,
        DateOnly start,
        DateOnly end,
        IReadOnlyCollection<(byte Weekday, TimeSlot Slot)> schedule,
        int coachUserId,
        int roomId,
        DateTime now)
    {
        var sessions = new List<ClassSession>();
        for (var date = start; date <= end; date = date.AddDays(1))
        {
            var weekday = WeekdayOf(date);
            foreach (var (_, slot) in schedule.Where(item => item.Weekday == weekday).OrderBy(item => item.Slot.StartTime))
            {
                sessions.Add(new ClassSession
                {
                    ClassId = classId,
                    SessionNo = sessions.Count + 1,
                    SessionDate = date,
                    TimeSlotId = slot.TimeSlotId,
                    StartTime = slot.StartTime,
                    EndTime = slot.EndTime,
                    CoachUserId = coachUserId,
                    RoomId = roomId,
                    Status = "scheduled",
                    CreatedAt = now,
                });
            }
        }

        return sessions;
    }

    // TR_session_rules báo lỗi bằng THROW 50010..50016 kèm thông báo tiếng Việt.
    public static bool IsRuleViolation(DbUpdateException exception, out string message)
    {
        if (exception.GetBaseException() is SqlException { Number: >= 50010 and <= 50019 } sql)
        {
            message = sql.Message;
            return true;
        }

        message = "";
        return false;
    }

    public static ClassSlotDto ToSlotDto(ClassSession session) =>
        new(
            session.SessionId.ToString(),
            session.SessionDate,
            session.StartTime,
            session.EndTime,
            SessionTitle(session.SessionNo),
            session.Status);

    public static ClassScheduleDto ToScheduleDto(ClassSchedule schedule) =>
        new(
            schedule.Weekday,
            WeekdayName(schedule.Weekday),
            schedule.TimeSlotId.ToString(),
            schedule.TimeSlot?.StartTime ?? default,
            schedule.TimeSlot?.EndTime ?? default);
}
