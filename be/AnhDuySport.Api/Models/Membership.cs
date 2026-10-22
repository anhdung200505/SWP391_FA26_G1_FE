using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AnhDuySport.Api.Models;

// Bảng membership có sẵn trong 01_schema.sql (payment issues membership).
// 06_membership_renewal.sql thêm cột membership_package_id và trạng thái 'upgraded'.
// Mỗi lần mua / gia hạn / nâng cấp gói sinh ra 1 dòng, gắn với 1 payment.
[Table("membership")]
public class Membership
{
    [Key]
    [Column("membership_id")]
    public int MembershipId { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("payment_id")]
    public int? PaymentId { get; set; }

    [Column("plan_name")]
    public string PlanName { get; set; } = "";

    [Column("start_date")]
    public DateOnly StartDate { get; set; }

    [Column("end_date")]
    public DateOnly EndDate { get; set; }

    // pending | scheduled | active | expired | cancelled | upgraded | renewed
    // scheduled: gói nhận kèm lớp, chờ gói hiện tại hết hạn mới chuyển active
    [Column("status")]
    public string Status { get; set; } = "active";

    // NULL với dữ liệu cũ chưa gắn gói
    [Column("membership_package_id")]
    public int? MembershipPackageId { get; set; }

    // true: Hạng Đồng tặng kèm khi thanh toán lớp (payment_id NULL)
    [Column("is_free")]
    public bool IsFree { get; set; }

    public MembershipPackage? Package { get; set; }
    public Payment? Payment { get; set; }
}
