using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AnhDuySport.Api.Models;

// Yêu cầu học 1-1 của học viên. Status: pending, approved (chờ thanh toán đến ApprovalExpiresAt), rejected, cancelled, expired.
// Trạng thái "đã thanh toán" không lưu: suy ra khi lớp đã có ghi danh của học viên.
[Table("private_class_request")]
public class PrivateClassRequest
{
    [Key]
    [Column("request_id")]
    public int RequestId { get; set; }

    [Column("member_user_id")]
    public int MemberUserId { get; set; }

    [Column("course_id")]
    public int CourseId { get; set; }

    [Column("coach_user_id")]
    public int CoachUserId { get; set; }

    [Column("start_date")]
    public DateOnly StartDate { get; set; }

    [Column("note")]
    public string? Note { get; set; }

    [Column("status")]
    public string Status { get; set; } = "pending";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("decided_by_user_id")]
    public int? DecidedByUserId { get; set; }

    [Column("decided_at")]
    public DateTime? DecidedAt { get; set; }

    [Column("reject_reason")]
    public string? RejectReason { get; set; }

    [Column("class_id")]
    public int? ClassId { get; set; }

    [Column("approval_expires_at")]
    public DateTime? ApprovalExpiresAt { get; set; }

    // Gói hội viên chọn kèm yêu cầu và thông tin học viên: lưu lúc gửi, áp vào đơn thanh toán và hồ sơ khi thanh toán (như đăng ký lớp nhóm).
    [Column("membership_package_id")]
    public int? MembershipPackageId { get; set; }

    [Column("renew_membership")]
    public bool RenewMembership { get; set; }

    [Column("full_name")]
    public string? FullName { get; set; }

    [Column("phone")]
    public string? Phone { get; set; }

    [Column("date_of_birth")]
    public DateOnly? DateOfBirth { get; set; }

    [Column("gender")]
    public string? Gender { get; set; }

    public List<PrivateClassRequestSlot> Slots { get; set; } = [];
}

[Table("private_class_request_slot")]
public class PrivateClassRequestSlot
{
    [Key]
    [Column("request_slot_id")]
    public int RequestSlotId { get; set; }

    [Column("request_id")]
    public int RequestId { get; set; }

    [Column("weekday")]
    public byte Weekday { get; set; }

    [Column("time_slot_id")]
    public int TimeSlotId { get; set; }

    public PrivateClassRequest? Request { get; set; }
}
