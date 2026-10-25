using System.Globalization;
using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Lễ tân đăng ký giùm học viên, chọn 1 trong 3:
//   Chỉ lớp            → ReceptionFlowService.RegisterForMemberAsync (luồng có sẵn, được tặng Hạng Đồng).
//   Lớp kèm gói        → cũng luồng có sẵn, gửi membershipPackageId: giá gói giảm theo upgrade_discount_percent,
//                        cộng chung 1 hóa đơn với học phí, không cho chọn gói thấp hơn gói đang có.
//   Chỉ gói hội viên   → MemberMembershipFlowService (giá gốc, luật Đăng ký mới / Gia hạn / Nâng cấp / Nối tiếp).
// Cả 3 đều tạo đơn pending + QR payOS, thu tiền tại quầy qua cùng 1 endpoint confirm-payment.
public class ReceptionCheckoutFlowService(
    AppDbContext db,
    CurrentActor actor,
    ReceptionFlowService reception,
    MemberMembershipFlowService memberships)
{
    public const string KindClass = "class";
    public const string KindMembership = "membership";
    public const string KindClassMembership = "class_membership";

    public async Task<ReceptionCheckoutDto> CreateAsync(string memberUserId, ReceptionCheckoutRequest request)
    {
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
            var order = await memberships.CreateMembershipOrderForMemberAsync(memberUserId, request.MembershipPackageId!, actor.UserId);
            return new ReceptionCheckoutDto(
                KindMembership,
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

        var registration = await reception.RegisterForMemberAsync(memberUserId, new CreateClassRegistrationRequest(
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
            ? $"Học viên đang có đơn {registration.InvoiceCode} chờ thanh toán cho lớp {registration.ClassName}{packageText}."
            : $"Đã tạo đơn {registration.InvoiceCode}: lớp {registration.ClassName}{packageText}, tổng {Money(registration.Amount)}.";
        return new ReceptionCheckoutDto(
            package is null ? KindClass : KindClassMembership,
            registration.PaymentId,
            registration.InvoiceCode,
            registration.Amount,
            registration.Status,
            registration.PaymentUrl,
            registration.PayosQrCode,
            registration.PayosQrImage,
            registration.ExpiresInSeconds,
            message + " Cho học viên quét QR hoặc thu tiền tại quầy rồi xác nhận.",
            registration,
            null);
    }

    public async Task<ReceptionCheckoutResultDto> ConfirmPaymentAsync(string paymentId, ConfirmCounterPaymentRequest request)
    {
        if (!int.TryParse(paymentId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy đơn thanh toán.");
        }

        var payment = await db.Payments
            .AsNoTracking()
            .Where(item => item.PaymentId == id)
            .Select(item => new { item.ClassId })
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Không tìm thấy đơn thanh toán.");

        // Đơn lớp (có thể kèm gói): dùng luồng thu tại quầy có sẵn.
        if (payment.ClassId is not null)
        {
            var status = await reception.ConfirmCounterPaymentAsync(paymentId, request);
            return new ReceptionCheckoutResultDto(
                status.MembershipPackage is { IsFree: false } ? KindClassMembership : KindClass,
                status.PaymentId,
                status.PaymentStatus,
                status.Message,
                status,
                null);
        }

        if (!ClassRegistrationFlowService.PaymentMethods.TryGetValue(request.PaymentMethod?.Trim() ?? "", out var methodLabel))
        {
            throw new RegistrationException("Hình thức thanh toán chỉ nhận cash, transfer hoặc card.");
        }

        var result = await memberships.ConfirmCounterMembershipPaymentAsync(id, methodLabel, actor.UserId);
        return new ReceptionCheckoutResultDto(
            KindMembership,
            result.PaymentId,
            result.PaymentStatus,
            result.Message,
            null,
            result);
    }

    private static string Money(decimal value) =>
        string.Create(CultureInfo.GetCultureInfo("vi-VN"), $"{decimal.Round(value, 0):N0}đ");
}
