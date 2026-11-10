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
