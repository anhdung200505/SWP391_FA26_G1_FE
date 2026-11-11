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

// Một khóa học trong trang quản lý khóa học (gồm cả khóa đã ngưng).
public sealed record CourseAdminDto(
    string Id,
    string SportId,
    string SportName,
    string Code,
    string Name,
    string? LevelName,
    string? AgeRange,
    string? Description,
    decimal Price,
    string? ImagePath,
    string Format,
    int? SessionMinutes,
    int? SessionCount,
    bool IsActive);

public sealed class CreateCourseRequest
{
    public string SportId { get; set; } = "";
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string? LevelName { get; set; }
    public string? AgeRange { get; set; }
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public string? ImagePath { get; set; }
    public string Format { get; set; } = "";
    public int? SessionMinutes { get; set; }
    public int? SessionCount { get; set; }
}

// Không cho sửa mã, môn và hình thức.
public sealed class UpdateCourseRequest
{
    public string Name { get; set; } = "";
    public string? LevelName { get; set; }
    public string? AgeRange { get; set; }
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public string? ImagePath { get; set; }
    public int? SessionMinutes { get; set; }
    public int? SessionCount { get; set; }
}

public sealed record SetCourseStatusRequest(bool IsActive);
