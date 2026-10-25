using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Thông báo của chính người đăng nhập (đổi phòng/HLV, hủy buổi, thanh toán, kết quả hỗ trợ...).
public class NotificationFlowService(AppDbContext db)
{
    private const int DefaultLimit = 30;
    private const int MaxLimit = 100;

    public async Task<NotificationFeedDto> AccessMineAsync(int userId, int? limit)
    {
        var take = Math.Clamp(limit ?? DefaultLimit, 1, MaxLimit);
        var mine = db.Notifications.AsNoTracking().Where(item => item.UserId == userId);

        var unread = await mine.CountAsync(item => !item.IsRead);
        var items = await mine
            .OrderByDescending(item => item.CreatedAt)
            .ThenByDescending(item => item.NotificationId)
            .Take(take)
            .Select(item => new NotificationDto(item.NotificationId.ToString(), item.Title, item.Content, item.IsRead, item.CreatedAt))
            .ToListAsync();
        return new NotificationFeedDto(unread, items);
    }

    public async Task MarkReadAsync(int userId, string notificationId)
    {
        var id = int.TryParse(notificationId, out var parsed) ? parsed : 0;
        var notification = await db.Notifications.FirstOrDefaultAsync(item => item.NotificationId == id && item.UserId == userId)
            ?? throw new KeyNotFoundException("Không tìm thấy thông báo.");
        if (!notification.IsRead)
        {
            notification.IsRead = true;
            await db.SaveChangesAsync();
        }
    }

    public Task MarkAllReadAsync(int userId) =>
        db.Notifications
            .Where(item => item.UserId == userId && !item.IsRead)
            .ExecuteUpdateAsync(setters => setters.SetProperty(item => item.IsRead, true));
}
