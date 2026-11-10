using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AnhDuySport.Api.Models;

// Một lần gọi Gemini của huấn luyện viên khi soạn bài tập cho một buổi (generate: sinh lần đầu, regenerate: sinh lại).
[Table("coach_ai_token_usage")]
public class CoachAiTokenUsage
{
    [Key]
    [Column("coach_ai_token_usage_id")]
    public int CoachAiTokenUsageId { get; set; }

    [Column("coach_user_id")]
    public int CoachUserId { get; set; }

    [Column("class_id")]
    public int ClassId { get; set; }

    [Column("session_id")]
    public int? SessionId { get; set; }

    [Column("action")]
    public string Action { get; set; } = "generate";

    [Column("total_tokens")]
    public int TotalTokens { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}
