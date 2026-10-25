namespace AnhDuySport.Api.Contracts;

public sealed record NotificationDto(string Id, string Title, string Content, bool IsRead, DateTime CreatedAt);

// UnreadCount đếm trên toàn bộ thông báo, Items chỉ là các thông báo mới nhất.
public sealed record NotificationFeedDto(int UnreadCount, IReadOnlyList<NotificationDto> Items);
