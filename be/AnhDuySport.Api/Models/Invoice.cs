using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AnhDuySport.Api.Models;

[Table("invoice")]
public class Invoice
{
    [Key]
    [Column("invoice_id")]
    public int InvoiceId { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("invoice_code")]
    public string InvoiceCode { get; set; } = "";

    [Column("issued_at")]
    public DateTime IssuedAt { get; set; }

    [Column("total_amount")]
    public decimal TotalAmount { get; set; }

    [Column("status")]
    public string Status { get; set; } = "issued";
}

[Table("payment")]
public class Payment
{
    [Key]
    [Column("payment_id")]
    public int PaymentId { get; set; }

    [Column("invoice_id")]
    public int InvoiceId { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("class_id")]
    public int? ClassId { get; set; }

    [Column("amount")]
    public decimal Amount { get; set; }

    [Column("payment_method")]
    public string PaymentMethod { get; set; } = "";

    [Column("paid_at")]
    public DateTime? PaidAt { get; set; }

    [Column("status")]
    public string Status { get; set; } = "pending";

    [Column("payos_order_code")]
    public long? PayosOrderCode { get; set; }

    [Column("checkout_url")]
    public string? CheckoutUrl { get; set; }

    [Column("payment_link_id")]
    public string? PaymentLinkId { get; set; }

    public Invoice? Invoice { get; set; }
    public TrainingClass? Class { get; set; }
}
