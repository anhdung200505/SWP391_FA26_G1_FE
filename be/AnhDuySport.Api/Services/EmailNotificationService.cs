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

    public Task<EmailDto> SendPrivateApprovedToMemberAsync(
        UserAccount member, string courseName, string coachName, string schedule, DateTime payBefore)
    {
        var subject = "[AnhDuy Sport] Yêu cầu học 1-1 của bạn đã được duyệt";
        var body = $"Xin chào {member.FullName}, yêu cầu học 1-1 \"{courseName}\" với HLV {coachName} đã được duyệt. {schedule} "
            + $"Hãy vào mục Học 1-1 để thanh toán trước {payBefore:HH:mm dd/MM/yyyy}, quá hạn lớp sẽ được nhả lịch.";
        return SendAsync(member, subject, body);
    }

    public Task<EmailDto> SendPrivateApprovedToCoachAsync(UserAccount coach, string memberName, string courseName, string schedule)
    {
        var subject = "[AnhDuy Sport] Bạn được giao lớp 1-1 mới";
        var body = $"Xin chào {coach.FullName}, bạn được giao lớp 1-1 \"{courseName}\" của học viên {memberName}. {schedule} "
            + "Lớp sẽ có hiệu lực khi học viên thanh toán.";
        return SendAsync(coach, subject, body);
    }

    public Task<EmailDto> SendSessionCancelledAsync(UserAccount member, string className, string when, string makeupWhen, string reason)
    {
        var subject = $"[AnhDuy Sport] Buổi học lớp {className} bị hủy";
        var body = $"Xin chào {member.FullName}, {when} bị hủy. Lý do: {TextFormat.Sentence(reason)} "
            + $"Buổi bù: {makeupWhen}.";
        return SendAsync(member, subject, body);
    }

    public Task<EmailDto> SendSessionCancelledToCoachAsync(UserAccount coach, string className, string when, string makeupWhen, string reason)
    {
        var subject = $"[AnhDuy Sport] Buổi học lớp {className} bị hủy";
        var body = $"Xin chào {coach.FullName}, {when} bị hủy. Lý do: {TextFormat.Sentence(reason)} Buổi bù: {makeupWhen}.";
        return SendAsync(coach, subject, body);
    }

    // HLV được giao một buổi: dạy thay HLV khác, hoặc (back = true) HLV phụ trách dạy lại buổi đã giao người khác.
    public Task<EmailDto> SendCoachSessionAssignedAsync(UserAccount coach, string className, string when, string otherCoachName, bool back, string? reason)
    {
        var subject = $"[AnhDuy Sport] {(back ? "Bạn dạy lại" : "Bạn dạy thay")} buổi học lớp {className}";
        var body = back
            ? $"Xin chào {coach.FullName}, {when} (đang do HLV {otherCoachName} dạy thay) được giao lại cho bạn."
            : $"Xin chào {coach.FullName}, bạn dạy thay HLV {otherCoachName} {when}.";
        return SendAsync(coach, subject, WithReason(body, reason));
    }

    // HLV có một buổi chuyển cho HLV khác dạy.
    public Task<EmailDto> SendCoachSessionReleasedAsync(UserAccount coach, string className, string when, string newCoachName, string? reason)
    {
        var subject = $"[AnhDuy Sport] Buổi học lớp {className} chuyển cho HLV khác";
        var body = $"Xin chào {coach.FullName}, {when} đã chuyển cho HLV {newCoachName} dạy, bạn không cần dạy buổi này.";
        return SendAsync(coach, subject, WithReason(body, reason));
    }

    // Đổi HLV vĩnh viễn cả lớp: HLV mới nhận lớp từ ngày first, remaining buổi còn lại.
    public Task<EmailDto> SendCoachClassAssignedAsync(UserAccount coach, string className, string oldCoachName, DateOnly first, int remaining, string? reason)
    {
        var subject = $"[AnhDuy Sport] Bạn được giao lớp {className}";
        var body = $"Xin chào {coach.FullName}, bạn được giao dạy lớp {className} thay HLV {oldCoachName} từ ngày {first:dd/MM/yyyy}, còn {remaining} buổi.";
        return SendAsync(coach, subject, WithReason(body, reason));
    }

    public Task<EmailDto> SendCoachClassReleasedAsync(UserAccount coach, string className, string newCoachName, DateOnly first, int remaining, string? reason)
    {
        var subject = $"[AnhDuy Sport] Lớp {className} chuyển cho HLV khác";
        var body = $"Xin chào {coach.FullName}, lớp {className} đã chuyển cho HLV {newCoachName} từ ngày {first:dd/MM/yyyy}, {remaining} buổi còn lại bạn không cần dạy.";
        return SendAsync(coach, subject, WithReason(body, reason));
    }

    // Đổi phòng của một buổi: chỉ báo cho HLV của buổi (học viên đã có thông báo trong hệ thống).
    public Task<EmailDto> SendCoachRoomChangedAsync(UserAccount coach, string className, string when, string oldRoom, string newRoom, string? reason)
    {
        var subject = $"[AnhDuy Sport] Đổi phòng buổi học lớp {className}";
        var body = $"Xin chào {coach.FullName}, {when} đổi phòng từ {oldRoom} sang {newRoom}.";
        return SendAsync(coach, subject, WithReason(body, reason));
    }

    private static string WithReason(string body, string? reason) =>
        string.IsNullOrWhiteSpace(reason) ? body : $"{body} Lý do: {TextFormat.Sentence(reason)}";

    public Task<EmailDto> SendPrivateRejectedAsync(UserAccount member, string courseName, string reason)
    {
        var subject = "[AnhDuy Sport] Yêu cầu học 1-1 chưa được duyệt";
        var body = $"Xin chào {member.FullName}, rất tiếc yêu cầu học 1-1 \"{courseName}\" chưa được duyệt. Lý do: {reason}. "
            + "Bạn có thể gửi lại yêu cầu với lịch hoặc huấn luyện viên khác.";
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
