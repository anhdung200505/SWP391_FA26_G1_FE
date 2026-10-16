using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AnhDuySport.Api.Models;

[Table("audit_log")]
public class ActivityLog
{
    [Key]
    [Column("audit_log_id")]
    public int AuditLogId { get; set; }

    [Column("user_id")]
    public int? ActorUserId { get; set; }

    [Column("action")]
    public string Action { get; set; } = "";

    [Column("entity_name")]
    public string EntityName { get; set; } = "";

    [Column("entity_id")]
    public int? EntityId { get; set; }

    [Column("detail")]
    public string? Detail { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}

[Table("notification")]
public class AccountNotification
{
    [Key]
    [Column("notification_id")]
    public int NotificationId { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("title")]
    public string Title { get; set; } = "";

    [Column("content")]
    public string Content { get; set; } = "";

    [Column("is_read")]
    public bool IsRead { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}
