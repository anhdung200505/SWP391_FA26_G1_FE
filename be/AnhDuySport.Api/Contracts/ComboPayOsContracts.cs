namespace AnhDuySport.Api.Contracts;

// Gói Bạc/Vàng có ưu đãi khi lên cấp cùng lúc đăng ký lớp. ComboPrice là giá sau giảm, cộng vào hóa đơn lớp.
public sealed record ComboUpgradeOptionDto(
    string PackageId,
    string PackageCode,
    string PackageName,
    decimal Fee,
    decimal DiscountPercent,
    decimal ComboPrice,
    int ValidityMonths);

// Đơn đăng ký lớp (có thể kèm gói lên cấp) thanh toán bằng mã QR payOS.
// Amount = Tuition + UpgradeAmount. QrCode là chuỗi VietQR, FE tự vẽ thành ảnh; CheckoutUrl là trang thanh toán của payOS.
public sealed record ComboPayOsPaymentDto(
    string PaymentId,
    string InvoiceCode,
    string ClassId,
    string ClassName,
    decimal Tuition,
    string? UpgradePackageId,
    string? UpgradePackageName,
    decimal UpgradeAmount,
    decimal Amount,
    string Status,
    string? EnrollmentStatus,
    string? CheckoutUrl,
    string? QrCode,
    DateTime? ExpiresAt,
    bool IsExisting,
    string Message);
