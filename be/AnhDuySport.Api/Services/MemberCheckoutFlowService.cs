using System.Globalization;
using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Học viên tự đăng ký qua 1 endpoint, chọn 1 trong 3:
//   Chỉ lớp          → ClassRegistrationFlowService.SubmitRegistrationAsync (được tặng Hạng Đồng).
//   Lớp kèm gói      → cũng hàm trên, gửi membershipPackageId: giá gói giảm theo upgrade_discount_percent,
//                      cộng chung 1 hóa đơn, không cho chọn gói thấp hơn gói đang có.
//   Chỉ gói hội viên → MemberMembershipFlowService.SelectMembershipPackageAsync (giá gốc, cần payOS).
// Chỉ chia đơn sang các luồng có sẵn, không thêm luật mới. Học viên lấy từ token đăng nhập.
public class MemberCheckoutFlowService(
    AppDbContext db,
    CurrentActor actor,
    ClassRegistrationFlowService registrations,
    MemberMembershipFlowService memberships)
{
    public async Task<MemberCheckoutDto> CreateAsync(MemberCheckoutRequest request)
    {
        var memberId = actor.UserId;
        var wantsClass = !string.IsNullOrWhiteSpace(request.SportId)
            || !string.IsNullOrWhiteSpace(request.ClassId)
            || !string.IsNullOrWhiteSpace(request.SlotId);
        var wantsPackage = !string.IsNullOrWhiteSpace(request.MembershipPackageId);
        if (!wantsClass && !wantsPackage)
        {
            throw new RegistrationException("Chọn lớp học, gói hội viên hoặc cả hai.");
        }

        if (!wantsClass)
        {
            var order = await memberships.SelectMembershipPackageAsync(
                memberId.ToString(), new RenewMembershipRequest(request.MembershipPackageId!));
            return new MemberCheckoutDto(
                ReceptionCheckoutFlowService.KindMembership,
                order.PaymentId,
                order.InvoiceCode,
                order.Amount,
                order.PaymentStatus,
                order.CheckoutUrl ?? "",
                order.QrCode ?? "",
                order.QrImage,
                order.ExpiresInSeconds,
                order.Message,
                null,
                order);
        }

        var registration = await registrations.SubmitRegistrationAsync(memberId, new CreateClassRegistrationRequest(
            request.SportId ?? "",
            request.ClassId,
            request.SlotId,
            request.FullName,
            request.Phone,
            request.DateOfBirth,
            request.Gender,
            request.MembershipPackageId));
        var package = registration.MembershipPackage is { IsFree: false } paid ? paid : null;
        var packageText = package is null ? "" : $" kèm {package.Name} ({Money(package.Price)})";
        var message = registration.IsExisting
            ? $"Bạn đang có đơn {registration.InvoiceCode} chờ thanh toán cho lớp {registration.ClassName}{packageText}."
            : $"Đã tạo đơn {registration.InvoiceCode}: lớp {registration.ClassName}{packageText}, tổng {Money(registration.Amount)}.";
        return new MemberCheckoutDto(
            package is null ? ReceptionCheckoutFlowService.KindClass : ReceptionCheckoutFlowService.KindClassMembership,
            registration.PaymentId,
            registration.InvoiceCode,
            registration.Amount,
            registration.Status,
            registration.PaymentUrl,
            registration.PayosQrCode,
            registration.PayosQrImage,
            registration.ExpiresInSeconds,
            message + " Quét mã QR để thanh toán.",
            registration,
            null);
    }

    // Kiểm tra trạng thái đơn sau khi quét QR. Chỉ đơn của chính học viên, ngược lại 404.
    public async Task<MemberCheckoutStatusDto> SelectStatusAsync(string paymentId)
    {
        var memberId = actor.UserId;
        if (!int.TryParse(paymentId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy đơn thanh toán.");
        }

        var payment = await db.Payments
            .AsNoTracking()
            .Where(item => item.PaymentId == id && item.UserId == memberId)
            .Select(item => new { item.ClassId })
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Không tìm thấy đơn thanh toán.");

        if (payment.ClassId is not null)
        {
            var status = await registrations.SelectRegistrationStatusAsync(paymentId, memberId);
            return new MemberCheckoutStatusDto(
                status.MembershipPackage is { IsFree: false }
                    ? ReceptionCheckoutFlowService.KindClassMembership
                    : ReceptionCheckoutFlowService.KindClass,
                status.PaymentId,
                status.PaymentStatus,
                string.IsNullOrWhiteSpace(status.Message) && status.PaymentStatus == "pending"
                    ? "Chưa nhận được thanh toán. Quét mã QR rồi kiểm tra lại."
                    : status.Message,
                status,
                null);
        }

        var result = await memberships.ConfirmMembershipPaymentAsync(memberId.ToString(), paymentId);
        return new MemberCheckoutStatusDto(
            ReceptionCheckoutFlowService.KindMembership,
            result.PaymentId,
            result.PaymentStatus,
            result.Message,
            null,
            result);
    }

    private static string Money(decimal value) =>
        string.Create(CultureInfo.GetCultureInfo("vi-VN"), $"{decimal.Round(value, 0):N0}đ");
}
