using AnhDuySport.Api.Models;

namespace AnhDuySport.Api.Services;

public class EmailNotificationService
{
    public (string Subject, string Body) BuildAccountStatusEmail(UserAccount user, string nextStatus)
    {
        var opened = nextStatus == "active";
        var subject = opened
            ? "[AnhDuy Sport] Tài khoản của bạn đã được kích hoạt"
            : "[AnhDuy Sport] Tài khoản của bạn đã bị vô hiệu hóa";
        var body = opened
            ? $"Xin chào {user.FullName}, quản lý trung tâm đã kích hoạt lại tài khoản {user.Email}. Bạn có thể đăng nhập và đặt lịch tập."
            : $"Xin chào {user.FullName}, quản lý trung tâm đã vô hiệu hóa tài khoản {user.Email}. Bạn sẽ không đăng nhập được cho đến khi tài khoản được mở lại. Nếu cần hỗ trợ, hãy liên hệ lễ tân AnhDuy Sport.";
        return (subject, body);
    }

    public (string Subject, string Body) BuildSupportResultEmail(UserAccount member, string requestSubject, string result)
    {
        var subject = "[AnhDuy Sport] Yêu cầu hỗ trợ đã được xử lý";
        var body = $"Xin chào {member.FullName}, yêu cầu \"{requestSubject}\" đã có kết quả. {result}";
        return (subject, body);
    }
}
