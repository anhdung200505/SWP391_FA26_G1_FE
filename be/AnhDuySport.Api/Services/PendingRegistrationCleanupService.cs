namespace AnhDuySport.Api.Services;

public class PendingRegistrationCleanupService(IServiceScopeFactory scopes, ILogger<PendingRegistrationCleanupService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var auth = scope.ServiceProvider.GetRequiredService<AuthService>();
                var removed = await auth.DeleteUnconfirmedRegistrationsAsync(stoppingToken);
                if (removed > 0)
                {
                    logger.LogInformation("Đã xóa {Count} đăng ký chưa xác nhận OTP sau 3 phút.", removed);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Không xóa được đăng ký chưa xác nhận OTP.");
            }

            await Task.Delay(TimeSpan.FromSeconds(20), stoppingToken);
        }
    }
}
