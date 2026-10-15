namespace AnhDuySport.Api.Contracts;

public sealed record CenterDto(
    string Id,
    string Name,
    string Address,
    string Phone);

public sealed record SportDto(
    string Id,
    string Code,
    string Name,
    int OpenClassCount);

public sealed record ClassSlotDto(
    string Id,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string Title);

public sealed record ClassSummaryDto(
    string Id,
    string Name,
    string SportId,
    string SportName,
    string CourseName,
    string Level,
    string CoachName,
    string RoomName,
    DateOnly? StartDate,
    DateOnly? EndDate,
    int? Capacity,
    int EnrolledCount,
    int? AvailableSeats,
    decimal Tuition,
    ClassSlotDto? NextSlot);
