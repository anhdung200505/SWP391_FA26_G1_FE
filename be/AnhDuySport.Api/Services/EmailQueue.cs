using System.Threading.Channels;

namespace AnhDuySport.Api.Services;

public sealed record QueuedEmail(string To, string Subject, string Body, string? LinkUrl, string? LinkLabel);

// Hàng đợi thư thông báo. Request đổi lịch chỉ xếp hàng rồi trả về, không chờ Gmail.
public class EmailQueue
{
    private readonly Channel<QueuedEmail> channel = Channel.CreateUnbounded<QueuedEmail>(new UnboundedChannelOptions
    {
        SingleReader = true,
    });

    public void Enqueue(QueuedEmail email) => channel.Writer.TryWrite(email);

    public ChannelReader<QueuedEmail> Reader => channel.Reader;
}

public class EmailDeliveryService(EmailQueue queue, IServiceScopeFactory scopes, ILogger<EmailDeliveryService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (await queue.Reader.WaitToReadAsync(stoppingToken))
        {
            var batch = new List<QueuedEmail>();
            while (batch.Count < 40 && queue.Reader.TryRead(out var email))
            {
                batch.Add(email);
            }

            if (batch.Count == 0)
            {
                continue;
            }

            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var sender = scope.ServiceProvider.GetRequiredService<SmtpEmailSender>();
                await sender.SendManyAsync(batch, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Không gửi được {Count} email thông báo.", batch.Count);
            }
        }
    }
}
