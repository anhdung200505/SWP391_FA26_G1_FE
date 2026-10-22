using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Models;

namespace AnhDuySport.Api.Services;

public class EmailNotificationService(SmtpEmailSender emailSender)
{
    public Task<EmailDto> SendAccountStatusEmailAsync(UserAccount user, string nextStatus)
    {
        var opened = nextStatus == "active";
        var subject = opened
            ? "[AnhDuy Sport] Tài khoản của bạn đã được kích hoạt"
            : "[AnhDuy Sport] Tài khoản của bạn đã bị vô hiệu hóa";
        var body = opened
            ? $"Xin chào {user.FullName}, quản lý trung tâm đã kích hoạt lại tài khoản {user.Email}. Bạn có thể đăng nhập và đặt lịch tập."
            : $"Xin chào {user.FullName}, quản lý trung tâm đã vô hiệu hóa tài khoản {user.Email}. Bạn sẽ không đăng nhập được cho đến khi tài khoản được mở lại. Nếu cần hỗ trợ, hãy liên hệ lễ tân AnhDuy Sport.";
        return SendAsync(user, subject, body);
    }

    public async Task SendGuestResultEmailAsync(string to, string fullName, string requestSubject, string result)
    {
        var subject = "[AnhDuy Sport] Yêu cầu hỗ trợ đã được xử lý";
        var body = $"Xin chào {fullName}, yêu cầu \"{requestSubject}\" đã có kết quả. {result}";
        await emailSender.SendAsync(to, subject, body);
    }

    public Task<EmailDto> SendSupportResultEmailAsync(UserAccount member, string requestSubject, string result)
    {
        var subject = "[AnhDuy Sport] Yêu cầu hỗ trợ đã được xử lý";
        var body = $"Xin chào {member.FullName}, yêu cầu \"{requestSubject}\" đã có kết quả. {result}";
        return SendAsync(member, subject, body);
    }

    private async Task<EmailDto> SendAsync(UserAccount user, string subject, string body)
    {
        var to = user.Email?.Trim() ?? "";
        if (to.Length == 0 || !to.Contains('@'))
        {
            throw new InvalidOperationException("Tài khoản chưa có email để nhận thông báo.");
        }

        try
        {
            await emailSender.SendAsync(to, subject, body);
        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception exception)
        {
            throw new InvalidOperationException("Không gửi được email thông báo. Hãy thử lại.", exception);
        }

        return new EmailDto(to, subject, body);
    }
}
