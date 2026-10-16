using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Models;

namespace AnhDuySport.Api.Services;

public static class MemberFlowMapper
{
    public static MemberProfileDto ToProfileDto(UserAccount user) =>
        new(
            user.UserId.ToString(),
            $"ND-{user.UserId:D4}",
            user.FullName,
            user.Email ?? "",
            user.Phone ?? "",
            user.DateOfBirth,
            user.Gender ?? "",
            user.Status);

    // Cần Include(Payment) và Include(Payment.Invoice) trước khi gọi.
    public static MembershipDto ToDto(Membership membership, DateOnly today) =>
        new(
            membership.MembershipId.ToString(),
            membership.MembershipPackageId?.ToString(),
            membership.PlanName,
            membership.StartDate,
            membership.EndDate,
            StatusOf(membership, today),
            membership.Payment?.Amount ?? 0,
            membership.Payment?.Invoice?.InvoiceCode ?? "",
            membership.Payment?.PaymentMethod ?? "");

    // Trong DB vẫn là active nhưng đã qua ngày hết hạn thì hiển thị expired.
    public static string StatusOf(Membership membership, DateOnly today) =>
        membership.Status == "active" && membership.EndDate < today ? "expired" : membership.Status;

    public static string RenewalTypeLabel(string renewalType) => renewalType switch
    {
        "renew" => "Gia hạn",
        "upgrade" => "Nâng cấp",
        _ => "Đăng ký mới",
    };

    // Mã phương thức theo dữ liệu có sẵn trong 02_seed.sql (chuyen_khoan)
    public static string PaymentMethodLabel(string method) => method switch
    {
        "tien_mat" => "Tiền mặt",
        "the" => "Thẻ",
        "chuyen_khoan" => "Chuyển khoản",
        _ => method,
    };
}
