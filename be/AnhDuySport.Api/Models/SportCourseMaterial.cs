using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AnhDuySport.Api.Models;

[Table("sport_course_material")]
public class SportCourseMaterial
{
    [Key]
    [Column("sport_id")]
    public int SportId { get; set; }

    [Column("source_name")]
    public string SourceName { get; set; } = "";

    [Column("source_url")]
    public string SourceUrl { get; set; } = "";

    [Column("note")]
    public string Note { get; set; } = "";

    [Column("updated_by_user_id")]
    public int? UpdatedByUserId { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }
}

[Table("sport_course_unit")]
public class SportCourseUnit
{
    [Key]
    [Column("unit_id")]
    public int UnitId { get; set; }

    [Column("sport_id")]
    public int SportId { get; set; }

    [Column("sort_order")]
    public int SortOrder { get; set; }

    [Column("label")]
    public string Label { get; set; } = "";

    [Column("work")]
    public string Work { get; set; } = "";

    [Column("review")]
    public string Review { get; set; } = "";
}

[Table("class_intake_note")]
public class ClassIntakeNote
{
    [Key]
    [Column("intake_note_id")]
    public int IntakeNoteId { get; set; }

    [Column("class_id")]
    public int ClassId { get; set; }

    [Column("member_user_id")]
    public int MemberUserId { get; set; }

    [Column("session_id")]
    public int SessionId { get; set; }

    [Column("coach_user_id")]
    public int CoachUserId { get; set; }

    [Column("comment")]
    public string Comment { get; set; } = "";

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }
}
