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

            var folder = Path.Combine(environment.ContentRootPath, "mailbox");
            Directory.CreateDirectory(folder);
            var safeName = string.Concat(to.Select(character => Path.GetInvalidFileNameChars().Contains(character) ? '_' : character));
            var path = Path.Combine(folder, $"{DateTime.Now:yyyyMMddHHmmssfff}-{safeName}.eml");
            await File.WriteAllTextAsync(path, $"To: {to}{Environment.NewLine}Subject: {subject}{Environment.NewLine}{Environment.NewLine}{body}");
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
        await client.ConnectAsync(host, port, SecureSocketOptions.StartTls);
        await client.AuthenticateAsync(userName, password);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }
}
