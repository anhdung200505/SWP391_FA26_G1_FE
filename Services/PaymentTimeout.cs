namespace AnhDuySport.Api.Services;

// Đơn chờ thanh toán (đăng ký lớp, mua gói) chỉ giữ trong thời gian này kể từ lúc phát hành hóa đơn.
// Link payOS hết hạn cùng lúc, quá hạn thì đơn bị hủy và học viên phải đăng ký lại.
public static class PaymentTimeout
{
    public const int Minutes = 3;

    public static DateTime ExpiresAt(DateTime issuedAt) => issuedAt.AddMinutes(Minutes);

    public static int SecondsLeft(DateTime issuedAt) =>
        Math.Max(0, (int)Math.Ceiling((ExpiresAt(issuedAt) - DateTime.Now).TotalSeconds));
}
