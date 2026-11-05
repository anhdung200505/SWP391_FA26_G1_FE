using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Mỗi giờ: học viên có gói còn hiệu lực sắp hết (trong 7 ngày) nhận một Gmail kèm link gia hạn.
// Đã gửi cho đúng ngày kết thúc thì không gửi lại. Gia hạn đổi end_date thì lần sau được nhắc tiếp.
public class MembershipExpiryNoticeService(IServiceScopeFactory scopes, ILogger<MembershipExpiryNoticeService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);
    private const int NoticeDays = 7;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var sent = await SendDueNoticesAsync(stoppingToken);
                if (sent > 0)
                {
                    logger.LogInformation("Đã gửi {Count} thư nhắc gói hội viên sắp hết hạn.", sent);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Không gửi được thư nhắc gói hội viên sắp hết hạn.");
            }

            await Task.Delay(Interval, stoppingToken);
        }
    }

    private async Task<int> SendDueNoticesAsync(CancellationToken stoppingToken)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var email = scope.ServiceProvider.GetRequiredService<EmailNotificationService>();
        var today = DateOnly.FromDateTime(DateTime.Now);
        var until = today.AddDays(NoticeDays);

        var rows = await db.Memberships.AsNoTracking()
            .Where(item => (item.Status == "active" || item.Status == "scheduled") && item.EndDate >= today)
            .Select(item => new NoticeRow(
                item.MembershipId,
                item.UserId,
                item.PlanName,
                item.EndDate,
                item.ExpiryNoticeEndDate))
            .ToListAsync(stoppingToken);

        var sent = 0;
        foreach (var group in rows.GroupBy(item => item.UserId))
        {
            var coverage = group.OrderByDescending(item => item.EndDate).First();
            if (coverage.EndDate > until || coverage.ExpiryNoticeEndDate == coverage.EndDate)
            {
                continue;
            }

            var user = await db.UserAccounts.AsNoTracking()
                .FirstOrDefaultAsync(item => item.UserId == coverage.UserId && item.Status == "active", stoppingToken);
            if (user is null || string.IsNullOrWhiteSpace(user.Email) || !user.Email.Contains('@'))
            {
                continue;
            }

            var daysLeft = coverage.EndDate.DayNumber - today.DayNumber;
            try
            {
                await email.SendMembershipExpiringAsync(user, coverage.PlanName, coverage.EndDate, daysLeft);
            }
            catch (Exception exception)
            {
                logger.LogWarning(exception, "Không gửi được thư sắp hết hạn gói cho học viên {UserId}", user.UserId);
                continue;
            }

            var membership = await db.Memberships.FirstOrDefaultAsync(item => item.MembershipId == coverage.MembershipId, stoppingToken);
            if (membership is null)
            {
                continue;
            }

            membership.ExpiryNoticeEndDate = coverage.EndDate;
            db.Notifications.Add(new AccountNotification
            {
                UserId = user.UserId,
                Title = "Gói hội viên sắp hết hạn",
                Content = daysLeft <= 0
                    ? $"Gói {coverage.PlanName} hết hạn trong hôm nay ({coverage.EndDate:dd/MM/yyyy})."
                    : $"Gói {coverage.PlanName} còn {daysLeft} ngày, đến hết {coverage.EndDate:dd/MM/yyyy}.",
                IsRead = false,
                CreatedAt = DateTime.Now,
            });
            await db.SaveChangesAsync(stoppingToken);
            sent++;
        }

        return sent;
    }

    private sealed record NoticeRow(int MembershipId, int UserId, string PlanName, DateOnly EndDate, DateOnly? ExpiryNoticeEndDate);
}
