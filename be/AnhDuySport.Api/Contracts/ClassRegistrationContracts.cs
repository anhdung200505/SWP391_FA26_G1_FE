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

// Một buổi học (bảng session). Tên "slot" giữ nguyên trong JSON (nextSlot, slots, slotId) cho frontend.
// Status: scheduled, held, cancelled, completed.
public sealed record ClassSlotDto(
    string Id,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string Title,
    string Status);

// Lịch tuần của lớp. Weekday: 2..7 = thứ 2..thứ 7.
public sealed record ClassScheduleDto(
    int Weekday,
    string WeekdayName,
    string TimeSlotId,
    TimeOnly StartTime,
    TimeOnly EndTime);

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
    // Buổi học sắp tới gần nhất (từ hôm nay), null nếu lớp không còn buổi nào.
    ClassSlotDto? NextSlot,
    IReadOnlyList<ClassScheduleDto> Schedule);

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
    // Toàn bộ buổi học của lớp theo ngày.
    IReadOnlyList<ClassSlotDto> Slots,
    IReadOnlyList<ClassScheduleDto> Schedule);

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

// Bắt buộc chọn môn. Không chọn lớp thì hệ thống chọn lớp còn chỗ bắt đầu sớm nhất của môn đó;
// chỉ gửi slotId (id buổi học) thì lấy lớp của buổi đó. Ghi danh lớp là học mọi buổi của lớp.
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
    decimal Tuition,
    MembershipPackageQuoteDto? MembershipPackage,
    string PayosQrCode,
    string PayosQrImage,
    // Số giây còn lại trước khi đơn chờ thanh toán bị hủy (0 khi không còn chờ).
    int ExpiresInSeconds);

// Đơn đang chờ thanh toán còn trong thời gian giữ, để học viên quay lại màn hình QR.
// Kind: class (đăng ký lớp, có thể kèm gói) hoặc membership (chỉ mua gói).
public sealed record PendingCheckoutDto(
    string Kind,
    string PaymentId,
    string InvoiceCode,
    decimal Amount,
    string? ClassId,
    string? ClassName,
    string? PackageId,
    string? PackageName,
    string PaymentUrl,
    string PayosQrCode,
    string PayosQrImage,
    int ExpiresInSeconds);

// Gói nhận kèm lớp. IsFree = true: Hạng Đồng tặng kèm, Price = 0.
public sealed record MembershipPackageQuoteDto(
    string Id,
    string Name,
    decimal OriginalFee,
    decimal DiscountPercent,
    decimal Price,
    int ValidityMonths,
    bool IsFree);

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
    decimal Tuition,
    MembershipPackageQuoteDto? MembershipPackage);
