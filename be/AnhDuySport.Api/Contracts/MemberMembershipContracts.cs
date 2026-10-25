using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace AnhDuySport.Api.Contracts;

// ===== Edit personal information =====

// Email không bắt buộc. Để trống hoặc giữ nguyên email hiện tại thì vẫn sửa được các trường khác.
// Đổi email phải đi qua luồng OTP (RequestEmailChangeRequest → ConfirmEmailChangeRequest).
// Ngày sinh không bắt buộc: gửi "yyyy-MM-dd" để lưu ngày mới; gửi null, "" hoặc bỏ trường thì giữ nguyên ngày sinh đang có
// (hồ sơ chưa có ngày sinh thì vẫn để trống).
public sealed record UpdateMemberProfileRequest(
    string FullName,
    string? Email,
    string Phone,
    [property: JsonConverter(typeof(OptionalDateOnlyConverter))] DateOnly? DateOfBirth,
    string? Gender);

// Ô <input type="date"> để trống gửi lên chuỗi rỗng "", System.Text.Json mặc định báo lỗi 400 khi đọc "" thành DateOnly?.
// Converter này coi "" (hoặc chỉ có khoảng trắng) là không nhập ngày sinh. Ngày sai định dạng vẫn báo lỗi như cũ.
public sealed class OptionalDateOnlyConverter : JsonConverter<DateOnly?>
{
    public override DateOnly? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null)
        {
            return null;
        }

        var text = reader.GetString();
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        // Nhận cả "yyyy-MM-dd" lẫn dạng có giờ "yyyy-MM-ddTHH:mm:ss" (FE cũ có thể gửi kèm giờ).
        var datePart = text.Trim().Split('T')[0];
        if (DateOnly.TryParseExact(datePart, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
        {
            return date;
        }

        throw new JsonException("Ngày sinh phải có dạng yyyy-MM-dd.");
    }

    public override void Write(Utf8JsonWriter writer, DateOnly? value, JsonSerializerOptions options)
    {
        if (value is DateOnly date)
        {
            writer.WriteStringValue(date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
        }
        else
        {
            writer.WriteNullValue();
        }
    }
}

// Đổi email bước 1: nhập email mới và mật khẩu hiện tại, hệ thống gửi OTP tới email mới.
public sealed record RequestEmailChangeRequest(string NewEmail, string CurrentPassword);

// Đổi email bước 2: nhập mã OTP 6 số nhận được ở email mới.
public sealed record ConfirmEmailChangeRequest(string Code);

public sealed record EmailChangeOtpDto(
    string NewEmail,
    // Số giây mã OTP còn hiệu lực.
    int ExpiresInSeconds,
    string Message);

public sealed record MemberProfileDto(
    string Id,
    string Code,
    string FullName,
    string Email,
    string Phone,
    DateOnly? DateOfBirth,
    string Gender,
    string Status,
    // Đường dẫn ảnh đại diện (vd. /api/uploads/avatars/12-....png), null khi chưa có ảnh.
    string? AvatarUrl);

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
    IReadOnlyList<PackageDto> Packages,
    // Gói cao nhất đang có (đang dùng hoặc chờ kích hoạt); null khi chưa có gói.
    // Mua gói thấp hơn gói đang dùng vẫn được: gói mới xếp nối tiếp sau các gói hiện có.
    string? HighestPackageId);
