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

        var fromName = configuration["Email:FromName"];
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(string.IsNullOrWhiteSpace(fromName) ? DefaultFromName : fromName, from));
        message.To.Add(MailboxAddress.Parse(to));
        message.Subject = subject;
        message.Body = BuildBody(subject, body);

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

    private const string DefaultFromName = "AnhDuySport";

    // Thư HTML có logo nhúng (cid), kèm bản chữ thuần cho ứng dụng mail không hiện HTML.
    private MimeEntity BuildBody(string subject, string body)
    {
        var builder = new BodyBuilder { TextBody = body };
        var logoPath = Path.Combine(environment.ContentRootPath, "Assets", "email-logo.png");
        if (!File.Exists(logoPath))
        {
            logoPath = Path.Combine(AppContext.BaseDirectory, "Assets", "email-logo.png");
        }

        var logoTag = "";
        if (File.Exists(logoPath))
        {
            // Inline và không có tên file để Gmail không hiện logo như một tệp đính kèm trong danh sách thư.
            var logo = builder.LinkedResources.Add("logo", File.ReadAllBytes(logoPath), new ContentType("image", "png"));
            logo.ContentId = MimeKit.Utils.MimeUtils.GenerateMessageId();
            logo.ContentDisposition = new ContentDisposition(ContentDisposition.Inline);
            logo.ContentType.Name = null;
            logoTag = $"<img src=\"cid:{logo.ContentId}\" width=\"64\" height=\"64\" alt=\"AnhDuy Sport\" style=\"display:block;border:0;\">";
        }

        builder.HtmlBody = HtmlTemplate(logoTag, subject, body);
        return builder.ToMessageBody();
    }

    private static string HtmlTemplate(string logoTag, string subject, string body)
    {
        var encoded = System.Net.WebUtility.HtmlEncode(body.Replace("\r\n", "\n"));
        // Mã OTP 6 số tô nổi để học viên dễ đọc.
        encoded = System.Text.RegularExpressions.Regex.Replace(encoded, @"\b\d{6}\b",
            match => $"<span style=\"display:inline-block;padding:6px 14px;margin:4px 0;border-radius:10px;background:#fff1f1;border:1px solid #f5c2c4;color:#e31b23;font-size:24px;font-weight:800;letter-spacing:6px;\">{match.Value}</span>");
        var content = encoded.Replace("\n", "<br>");
        var title = System.Net.WebUtility.HtmlEncode(subject.Replace("[AnhDuy Sport]", "").Trim());

        return $"""
            <!DOCTYPE html>
            <html lang="vi">
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
            <body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 12px;">
                <tr><td align="center">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
                    <tr><td style="background:#12141d;padding:18px 24px;">
                      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                        <td style="padding-right:12px;">{logoTag}</td>
                        <td style="color:#ffffff;font-size:20px;font-weight:800;font-style:italic;">AnhDuy <span style="color:#e31b23;">Sport</span></td>
                      </tr></table>
                    </td></tr>
                    <tr><td style="padding:24px;">
                      <p style="margin:0 0 12px;font-size:17px;font-weight:800;color:#111827;">{title}</p>
                      <div style="font-size:14px;line-height:1.7;color:#374151;">{content}</div>
                    </td></tr>
                    <tr><td style="padding:14px 24px;background:#f9fafb;border-top:1px solid #f1f1f1;font-size:12px;color:#9ca3af;">
                      Thư được gửi tự động từ hệ thống AnhDuy Sport. Vui lòng không trả lời thư này.
                    </td></tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """;
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
