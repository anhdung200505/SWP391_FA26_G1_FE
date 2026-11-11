namespace AnhDuySport.Api.Contracts;

// CoachOptionDto đã có trong ClassRegistrationContracts (kèm ClassId), nên bản của trang quản lý môn đặt tên riêng.
public sealed record SportCoachOptionDto(string Id, string FullName);

public sealed record SportRoomLinkDto(string RoomId, string RoomName, bool AllowGroup, bool AllowPrivate);

// Một môn trong trang quản lý môn: các phòng và HLV đã gắn, số khóa học.
public sealed record SportAdminDto(
    string Id,
    string Code,
    string Name,
    string? Category,
    IReadOnlyList<SportRoomLinkDto> Rooms,
    IReadOnlyList<SportCoachOptionDto> Coaches,
    int CourseCount);

// Gắn phòng cho môn. RoomId là id phòng (khác RoomSportRequest mang id môn).
public sealed record SportRoomRequest(string RoomId, bool AllowGroup, bool AllowPrivate);

public sealed class CreateSportRequest
{
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Category { get; set; }
    public List<SportRoomRequest> Rooms { get; set; } = [];
    public List<string> CoachUserIds { get; set; } = [];
}

public sealed class AddSportCoachesRequest
{
    public List<string> CoachUserIds { get; set; } = [];
}
