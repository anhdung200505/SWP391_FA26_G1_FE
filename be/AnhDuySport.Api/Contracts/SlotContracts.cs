namespace AnhDuySport.Api.Contracts;

public sealed record SlotMemberRequest(string MemberUserId);

public sealed record SlotAvailabilityDto(
    string Id,
    string ClassId,
    string ClassName,
    string SportName,
    string CourseName,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string Title,
    int RegistrationLimit,
    int RegisteredCount,
    int Remaining,
    bool IsOpen);

public sealed record SlotRegistrationDto(
    string Id,
    string SlotId,
    string MemberUserId,
    string MemberName,
    string Status,
    DateTime RegisteredAt,
    SlotAvailabilityDto Slot);
