namespace AnhDuySport.Api.Contracts;

// Buổi học kèm thông tin lớp, dùng cho lịch học. Weekday: 2..7 = thứ 2..thứ 7.
// Status: scheduled, held, cancelled, completed.
public sealed record SessionDto(
    string Id,
    string ClassId,
    string ClassName,
    string SportName,
    string CourseName,
    int? SessionNo,
    DateOnly Date,
    int Weekday,
    string WeekdayName,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string CoachUserId,
    string CoachName,
    string RoomId,
    string RoomName,
    string Status,
    string? Note,
    int EnrolledCount);

// Khung giờ cố định. Kind: group (3 giờ) hoặc private (90 phút).
public sealed record TimeSlotDto(
    string Id,
    string Kind,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string Label);
