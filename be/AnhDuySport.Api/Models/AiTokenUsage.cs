using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AnhDuySport.Api.Models;

// Một lần gọi Google Gemini thành công của học viên, gắn với hội viên đang hiệu lực.
// Hạn mức tính theo membership_id nên gia hạn hoặc lên hạng sẽ bắt đầu kỳ hạn mức mới.
[Table("ai_token_usage")]
public class AiTokenUsage
{
    [Key]
    [Column("ai_token_usage_id")]
    public int AiTokenUsageId { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("membership_id")]
    public int MembershipId { get; set; }

    // generate: tạo giáo án lần đầu. regenerate: tạo lại giáo án.
    [Column("action")]
    public string Action { get; set; } = "generate";

    [Column("total_tokens")]
    public int TotalTokens { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}
