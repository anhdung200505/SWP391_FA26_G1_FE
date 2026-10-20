using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AnhDuySport.Api.Models;

[Table("password_reset")]
public class PasswordReset
{
    [Key]
    [Column("email")]
    public string Email { get; set; } = "";

    [Column("otp_hash")]
    public string OtpHash { get; set; } = "";

    [Column("attempts")]
    public int Attempts { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("expires_at")]
    public DateTime ExpiresAt { get; set; }
}
