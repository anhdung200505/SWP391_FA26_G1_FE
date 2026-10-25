using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AnhDuySport.Api.Models;

// Yêu cầu đổi email đang chờ xác thực OTP (cùng cách làm với password_reset).
// Mỗi học viên giữ tối đa 1 yêu cầu; OTP gửi tới email mới, chỉ lưu hash.
[Table("email_change")]
public class EmailChange
{
    [Key]
    [Column("user_id")]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    public int UserId { get; set; }

    [Column("new_email")]
    public string NewEmail { get; set; } = "";

    [Column("otp_hash")]
    public string OtpHash { get; set; } = "";

    [Column("attempts")]
    public int Attempts { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("expires_at")]
    public DateTime ExpiresAt { get; set; }
}
