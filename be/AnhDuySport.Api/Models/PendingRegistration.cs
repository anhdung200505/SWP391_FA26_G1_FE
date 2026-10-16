using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AnhDuySport.Api.Models;

[Table("pending_registration")]
public class PendingRegistration
{
    [Key]
    [Column("email")]
    public string Email { get; set; } = "";

    [Column("full_name")]
    public string FullName { get; set; } = "";

    [Column("phone")]
    public string? Phone { get; set; }

    [Column("password_hash")]
    public string PasswordHash { get; set; } = "";

    [Column("otp_hash")]
    public string OtpHash { get; set; } = "";

    [Column("attempts")]
    public int Attempts { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("expires_at")]
    public DateTime ExpiresAt { get; set; }
}
