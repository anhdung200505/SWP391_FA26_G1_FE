namespace AnhDuySport.Api.Contracts;

// Kind: class (đăng ký lớp, có thể kèm nâng hạng) hoặc membership (mua, gia hạn, nâng hạng gói).
// Status: pending (còn trong 3 phút giữ chỗ), expired (pending quá hạn), paid, failed, refunded, cancel. CreatedAt là ngày lập hóa đơn, PaidAt null khi chưa thanh toán.
public sealed record PaymentHistoryDto(
    string Id,
    string InvoiceCode,
    string Kind,
    string Title,
    decimal Amount,
    string PaymentMethod,
    string Status,
    DateTime CreatedAt,
    DateTime? PaidAt,
    // Chỉ khác 0 khi status = pending: số giây còn lại để thanh toán, giao diện dùng để tự đổi trạng thái khi hết giờ.
    int SecondsLeft);
