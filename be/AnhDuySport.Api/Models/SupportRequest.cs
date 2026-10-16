using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AnhDuySport.Api.Models;

[Table("support_request")]
public class SupportRequest
{
    [Key]
    [Column("support_request_id")]
    public int SupportRequestId { get; set; }

    [Column("member_user_id")]
    public int MemberUserId { get; set; }

    [Column("title")]
    public string Title { get; set; } = "";

    [Column("description")]
    public string Description { get; set; } = "";

    [Column("system_category")]
    public string SystemCategory { get; set; } = "";

    [Column("classification_reason")]
    public string? ClassificationReason { get; set; }

    [Column("receptionist_category")]
    public string? ReceptionistCategory { get; set; }

    [Column("status")]
    public string Status { get; set; } = "";

    [Column("assigned_to_user_id")]
    public int? AssignedToUserId { get; set; }

    [Column("decision")]
    public string? Decision { get; set; }

    [Column("resolution_note")]
    public string? ResolutionNote { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("resolved_at")]
    public DateTime? ResolvedAt { get; set; }

    public UserAccount? Member { get; set; }
    public UserAccount? Assignee { get; set; }
}
