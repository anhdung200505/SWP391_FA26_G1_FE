using System.ComponentModel.DataAnnotations;

namespace AnhDuySport.Api.Contracts;

public sealed record CenterDto(
    string Id,
    string Name,
    string Address,
    string Phone);

public sealed record SportDto(
    string Id,
    string Code,
    string Name,
    int OpenClassCount);

public sealed record CoachOptionDto(
    string Id,
    string FullName,
    string ClassId);

public sealed record ClassSlotDto(
    string Id,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string Title);

public sealed record ClassSummaryDto(
    string Id,
    string Name,
    string SportId,
    string SportName,
    string CourseName,
    string Level,
    string CoachName,
    string RoomName,
    DateOnly? StartDate,
    DateOnly? EndDate,
    int? Capacity,
    int EnrolledCount,
    int? AvailableSeats,
    decimal Tuition,
    ClassSlotDto? NextSlot);

public sealed record ClassDetailDto(
    string Id,
    string Name,
    string Status,
    DateOnly? StartDate,
    DateOnly? EndDate,
    string SportId,
    string SportName,
    string CourseName,
    string Level,
    string AgeRange,
    string Description,
    string CenterId,
    string CenterName,
    string RoomName,
    string CoachName,
    int? Capacity,
    int EnrolledCount,
    int? AvailableSeats,
    decimal Tuition,
    bool IsOpenForRegistration,
    IReadOnlyList<ClassSlotDto> Slots);

public sealed record EnrolledClassDto(
    string ClassId,
    string ClassName,
    string ClassStatus,
    DateTime EnrolledAt,
    DateOnly? StartDate,
    DateOnly? EndDate,
    string SportId,
    string SportName,
    string CourseName,
    string Level,
    string CenterId,
    string CenterName,
    string RoomName,
    string CoachName,
    decimal Tuition,
    RegisteredByDto? RegisteredBy);

// Người đã đăng ký (hoặc đăng ký học lại) cho học viên. Role là vai trò lúc thao tác; UserId null nếu tài khoản đó đã xóa.
public sealed record RegisteredByDto(
    string? UserId,
    string? FullName,
    string Role);

public sealed class PayRegistrationRequest
{
    public string ClassId { get; set; } = "";
    public string? SlotId { get; set; }
    public bool GroupStudy { get; set; }
    public string FullName { get; set; } = "";
    public string Phone { get; set; } = "";
    public string PaymentMethod { get; set; } = "";
    // Gói hội viên mua kèm lớp (id gói Bạc/Vàng), giá đã giảm được cộng vào hóa đơn. Bỏ trống hoặc Hạng Đồng → tặng Hạng Đồng.
    public string? MembershipPackageId { get; set; }
}

public sealed record RegistrationPaymentResponse(
    bool Success,
    string Message,
    string? ThankYou,
    string? Commitment,
    string? InvoiceCode,
    string? Token,
    AuthUserDto? User,
    RegisteredByDto? RegisteredBy,
    decimal Amount,
    decimal Tuition,
    MembershipPackageQuoteDto? MembershipPackage);

// Bắt buộc chọn môn. Không chọn lớp thì hệ thống chọn lớp còn chỗ bắt đầu sớm nhất của môn đó;
// chỉ chọn slot thì lấy lớp của slot. Slot chỉ là nguyện vọng, lễ tân đăng ký slot hoặc dời slot sau khi thanh toán.
// Các trường hồ sơ đều tùy chọn: có gửi thì ghi đè hồ sơ học viên khi tạo đơn mới.
public sealed record CreateClassRegistrationRequest(
    string SportId,
    string? ClassId = null,
    string? SlotId = null,
    [StringLength(200, MinimumLength = 1)] string? FullName = null,
    [RegularExpression(@"^\+?[0-9 ]{8,20}$")] string? Phone = null,
    DateOnly? DateOfBirth = null,
    [RegularExpression("^(Nam|Nữ|Khác)$")] string? Gender = null,
    // Gói hội viên mua kèm lớp (id gói Bạc/Vàng), giá đã giảm được cộng vào hóa đơn. Bỏ trống hoặc Hạng Đồng → tặng Hạng Đồng.
    string? MembershipPackageId = null);

// Amount = Tuition + MembershipPackage.Price.
// PaymentUrl: trang thanh toán payOS. PayosQrCode: chuỗi VietQR do payOS trả. PayosQrImage: ảnh PNG của mã đó (data URL), dùng thẳng làm src của <img>.
// Cả ba rỗng khi máy chưa cấu hình payOS.
public sealed record ClassRegistrationDto(
    string PaymentId,
    string InvoiceCode,
    string ClassId,
    string ClassName,
    decimal Amount,
    string Status,
    string PaymentUrl,
    bool IsExisting,
    RegisteredByDto? RegisteredBy,
    RequestedSlotDto? RequestedSlot,
    decimal Tuition,
    MembershipPackageQuoteDto? MembershipPackage,
    string PayosQrCode,
    string PayosQrImage);

// Gói nhận kèm lớp. IsFree = true: Hạng Đồng tặng kèm, Price = 0.
public sealed record MembershipPackageQuoteDto(
    string Id,
    string Name,
    decimal OriginalFee,
    decimal DiscountPercent,
    decimal Price,
    int ValidityMonths,
    bool IsFree);

// Slot học viên mong muốn. Remaining = 0 nghĩa là slot đã đầy, lễ tân sẽ dời sang slot khác.
public sealed record RequestedSlotDto(
    string Id,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string Title,
    int Remaining);

public sealed record RegistrationStatusDto(
    string PaymentId,
    string InvoiceCode,
    string ClassId,
    string ClassName,
    decimal Amount,
    string PaymentStatus,
    string InvoiceStatus,
    string? EnrollmentStatus,
    string Message,
    RegisteredByDto? RegisteredBy,
    RequestedSlotDto? RequestedSlot,
    decimal Tuition,
    MembershipPackageQuoteDto? MembershipPackage);
