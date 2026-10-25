using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace AnhDuySport.Api.Services;

public class SmtpEmailSender(IConfiguration configuration, IHostEnvironment environment, ILogger<SmtpEmailSender> logger)
{
    public async Task SendAsync(string to, string subject, string body)
    {
        var host = configuration["Email:Host"];
        var userName = configuration["Email:User"];
        var password = configuration["Email:Password"];
        var from = configuration["Email:From"];
        if (string.IsNullOrWhiteSpace(from))
        {
            from = userName;
        }

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(userName) || string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(from))
        {
            if (!environment.IsDevelopment())
            {
                throw new InvalidOperationException("Chưa cấu hình máy chủ email.");
            }

            var path = await SaveToMailboxAsync(to, subject, body);
            logger.LogWarning("SMTP chưa có tài khoản gửi. Thư được lưu tại {Path}", path);
            return;
        }

        var message = new MimeMessage();
        message.From.Add(MailboxAddress.Parse(from));
        message.To.Add(MailboxAddress.Parse(to));
        message.Subject = subject;
        message.Body = new TextPart("plain") { Text = body };

        using var client = new SmtpClient();
        var port = int.TryParse(configuration["Email:Port"], out var parsedPort) ? parsedPort : 587;
        try
        {
            await client.ConnectAsync(host, port, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(userName, password.Replace(" ", ""));
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
        }
        catch (Exception exception)
        {
            if (!environment.IsDevelopment())
            {
                logger.LogError(exception, "SMTP từ chối gửi thư tới {Recipient}", to);
                throw new InvalidOperationException(SmtpFailureMessage(exception), exception);
            }

            var path = await SaveToMailboxAsync(to, subject, body);
            logger.LogWarning(exception, "SMTP không gửi được. Thư được lưu tại {Path}", path);
        }
    }

    private static string SmtpFailureMessage(Exception exception)
    {
        var text = exception.Message;
        if (text.Contains("Daily user sending limit", StringComparison.OrdinalIgnoreCase)
            || text.Contains("5.4.5", StringComparison.Ordinal))
        {
            return "Hộp thư gửi của trung tâm đã hết hạn mức gửi trong ngày. Hãy thử lại sau.";
        }

        return "Không gửi được email. Hãy thử lại sau.";
    }

    private async Task<string> SaveToMailboxAsync(string to, string subject, string body)
    {
        var folder = Path.Combine(environment.ContentRootPath, "mailbox");
        Directory.CreateDirectory(folder);
        var safeName = string.Concat(to.Select(character => Path.GetInvalidFileNameChars().Contains(character) ? '_' : character));
        var path = Path.Combine(folder, $"{DateTime.Now:yyyyMMddHHmmssfff}-{safeName}.eml");
        await File.WriteAllTextAsync(path, $"To: {to}{Environment.NewLine}Subject: {subject}{Environment.NewLine}{Environment.NewLine}{body}");
        return path;
    }
}
