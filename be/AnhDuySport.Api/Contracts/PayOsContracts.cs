namespace AnhDuySport.Api.Contracts;

public sealed record CreatePayOsPaymentRequest(string MemberUserId, string ClassId);

public sealed record PayOsPaymentDto(
    string PaymentId,
    string InvoiceCode,
    string MemberUserId,
    string ClassId,
    string Status,
    int Amount,
    string? CheckoutUrl);
