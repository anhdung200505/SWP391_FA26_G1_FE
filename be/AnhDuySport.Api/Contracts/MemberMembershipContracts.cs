namespace AnhDuySport.Api.Contracts;

// ===== Edit personal information =====

public sealed record UpdateMemberProfileRequest(
    string FullName,
    string Email,
    string Phone,
    DateOnly? DateOfBirth,
    string? Gender);

public sealed record MemberProfileDto(
    string Id,
    string Code,
    string FullName,
    string Email,
    string Phone,
    DateOnly? DateOfBirth,
    string Gender,
    string Status);

public sealed record MemberProfileMutationResponse(MemberProfileDto Profile, string Message, ActivityLogDto Log);

// ===== Renew / Upgrade Package =====

// Need Consultation? = Yes → hiển thị số chăm sóc khách hàng của trung tâm
public sealed record ConsultationContactDto(
    string CenterName,
    string Phone,
    string Email,
    string Message);

// Thanh toán qua payOS nên không cần chọn phương thức thanh toán.
public sealed record RenewMembershipRequest(string PackageId);

// Select Membership Package → Process Payment: link / mã QR payOS cho gói vừa chọn
public sealed record MembershipCheckoutDto(
    string PaymentId,
    string MembershipId,
    string InvoiceCode,
    string PackageId,
    string PlanName,
    string RenewalType,
    int Amount,
    string PaymentStatus,
    string? CheckoutUrl,
    string? QrCode,
    string Message,
    // Ảnh PNG của QrCode (data URL), dùng thẳng làm src của <img>.
    string QrImage,
    // Số giây còn lại trước khi đơn chờ thanh toán bị hủy (0 khi không còn chờ).
    int ExpiresInSeconds);

// Display Success Message + Receive Updated Membership Info
// Kết quả kiểm tra thanh toán. Membership chỉ chuyển active khi payment đã paid.
public sealed record MembershipPaymentResultDto(
    string PaymentId,
    string PaymentStatus,
    MembershipDto Membership,
    DateOnly? MembershipEndDate,
    string Message,
    ActivityLogDto? Log);

public sealed record MembershipDto(
    string Id,
    string? PackageId,
    string PlanName,
    DateOnly StartDate,
    DateOnly EndDate,
    string Status,
    decimal AmountPaid,
    string InvoiceCode,
    string PaymentMethod,
    // Lúc tạo thanh toán (phát hành hóa đơn). Null với gói tặng kèm không có thanh toán.
    DateTime? CreatedAt,
    // Số giây còn lại của đơn đang chờ thanh toán; 0 khi không còn chờ.
    int PaymentExpiresInSeconds);

// View membership management
public sealed record MembershipManagementDto(
    MemberProfileDto Profile,
    MembershipDto? CurrentMembership,
    DateOnly? MembershipEndDate,
    IReadOnlyList<MembershipDto> History,
    IReadOnlyList<PackageDto> Packages);
