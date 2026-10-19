namespace AnhDuySport.Api.Contracts;

public sealed record CreatePayOsPaymentRequest(
    string ClassId,
    string FullName,
    string Phone,
    string Email);

public sealed record PayOsPaymentDto(
    string PaymentId,
    string InvoiceCode,
    string MemberUserId,
    string ClassId,
    string Status,
    int Amount,
    string? CheckoutUrl,
    string? QrCode);
