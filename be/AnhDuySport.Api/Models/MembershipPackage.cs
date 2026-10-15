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

    [Column("benefits")]
    public string? Benefits { get; set; }

    [Column("status")]
    public string Status { get; set; } = "active";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }
}
