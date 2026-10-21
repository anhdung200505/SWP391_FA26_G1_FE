using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AnhDuySport.Api.Models;

[Table("class_registration_log")]
public class ClassRegistrationLog
{
    [Key]
    [Column("class_registration_log_id")]
    public int ClassRegistrationLogId { get; set; }

    [Column("member_user_id")]
    public int MemberUserId { get; set; }

    [Column("class_id")]
    public int ClassId { get; set; }

    [Column("payment_id")]
    public int? PaymentId { get; set; }

    // register, move_out, re_enroll
    [Column("action")]
    public string Action { get; set; } = "";

    [Column("reason")]
    public string? Reason { get; set; }

    [Column("performed_by_user_id")]
    public int? PerformedByUserId { get; set; }

    // Vai trò lúc thao tác, giữ nguyên dù sau này tài khoản đổi vai trò.
    [Column("performed_by_role")]
    public string PerformedByRole { get; set; } = "";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    public Payment? Payment { get; set; }
}
