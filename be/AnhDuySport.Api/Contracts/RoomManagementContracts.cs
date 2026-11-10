namespace AnhDuySport.Api.Contracts;

// Môn dùng được phòng, cho lớp nhóm và/hoặc học 1-1.
public sealed record RoomSportDto(string SportId, string SportName, bool AllowGroup, bool AllowPrivate);

// Một phòng trong trang quản lý. UpcomingSessionCount/UpcomingClassCount: buổi chưa diễn ra (từ hôm nay) đang xếp trong phòng.
public sealed record RoomAdminDto(
    string Id,
    string Code,
    string Name,
    string Type,
    int Capacity,
    int PrivateConcurrency,
    string CenterId,
    string CenterName,
    bool IsActive,
    IReadOnlyList<RoomSportDto> Sports,
    int UpcomingSessionCount,
    int UpcomingClassCount);

public sealed record SetRoomStatusRequest(bool IsActive);

public sealed record RoomSportRequest(string SportId, bool AllowGroup, bool AllowPrivate);

// Thêm hoặc sửa phòng: tên, loại, sức chứa, số buổi 1-1 cùng lúc và các môn dùng được.
public sealed class SaveRoomRequest
{
    public string Name { get; set; } = "";
    public string? Type { get; set; }
    public int Capacity { get; set; }
    public int PrivateConcurrency { get; set; } = 1;
    public List<RoomSportRequest> Sports { get; set; } = [];
}

// Lớp còn buổi sắp tới trong phòng, dùng để báo lý do chặn ngưng dùng.
public sealed record RoomUsageClassDto(
    string ClassId,
    string ClassName,
    int SessionCount,
    DateOnly FirstDate,
    DateOnly LastDate);

public sealed record RoomUsageDto(
    int SessionCount,
    int ClassCount,
    DateOnly? FirstDate,
    IReadOnlyList<RoomUsageClassDto> Classes);
