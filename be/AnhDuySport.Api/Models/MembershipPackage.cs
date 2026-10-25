using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AnhDuySport.Api.Models;

[Table("membership_package")]
public class MembershipPackage
{
    [Key]
    [Column("membership_package_id")]
    public int MembershipPackageId { get; set; }

    [Column("package_code")]
    public string PackageCode { get; set; } = "";

    [Column("package_name")]
    public string PackageName { get; set; } = "";

    [Column("fee")]
    public decimal Fee { get; set; }

    [Column("validity_months")]
    public int ValidityMonths { get; set; }

    // % giảm khi chọn lên hạng này cùng lúc đăng ký lớp (0 - 100). Đồng = 0.
    [Column("upgrade_discount_percent")]
    public decimal UpgradeDiscountPercent { get; set; }

    [Column("benefits")]
    public string? Benefits { get; set; }

    [Column("status")]
    public string Status { get; set; } = "active";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }

    // Hạn mức AI của cả gói. Học viên đang dùng gói này dùng chung hai số này.
    [Column("ai_regeneration_limit")]
    public int AiRegenerationLimit { get; set; }

    [Column("ai_token_limit")]
    public int AiTokenLimit { get; set; }
}
