namespace AnhDuySport.Api.Services;

// Job nền: mỗi phút hỏi payOS trạng thái các đơn gói hội viên đang chờ.
// Webhook payOS không gọi được về máy local, và học viên có thể trả tiền xong rồi tắt app,
// nên không thể chỉ chờ webhook hoặc chờ học viên bấm "kiểm tra".
public class MembershipPaymentSyncService(IServiceScopeFactory scopes, ILogger<MembershipPaymentSyncService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var memberships = scope.ServiceProvider.GetRequiredService<MemberMembershipFlowService>();
                var activated = await memberships.SyncPendingPaymentsAsync(null, stoppingToken);
                if (activated > 0)
                {
                    logger.LogInformation("Đã kích hoạt {Count} gói hội viên sau khi đối chiếu payOS.", activated);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Không đối chiếu được đơn gói hội viên với payOS.");
            }

            await Task.Delay(Interval, stoppingToken);
        }
    }
}
