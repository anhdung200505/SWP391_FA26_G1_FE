using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AnhDuySport.Api.Models;

[Table("user")]
public class UserAccount
{
    [Key]
    [Column("user_id")]
    public int UserId { get; set; }

    [Column("role_id")]
    public int RoleId { get; set; }

    [Column("center_id")]
    public int? CenterId { get; set; }

    [Column("full_name")]
    public string FullName { get; set; } = "";

    [Column("email")]
    public string? Email { get; set; }

    [Column("phone")]
    public string? Phone { get; set; }

    [Column("password_hash")]
    public string? PasswordHash { get; set; }

    [Column("date_of_birth")]
    public DateOnly? DateOfBirth { get; set; }

    [Column("gender")]
    public string? Gender { get; set; }

    [Column("avatar_url")]
    public string? AvatarUrl { get; set; }

    [Column("status")]
    public string Status { get; set; } = "";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    public Role? Role { get; set; }
}
