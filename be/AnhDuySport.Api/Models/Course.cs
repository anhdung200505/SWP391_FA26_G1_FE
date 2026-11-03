using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AnhDuySport.Api.Models;

[Table("sport")]
public class Sport
{
    [Key]
    [Column("sport_id")]
    public int SportId { get; set; }

    [Column("sport_code")]
    public string SportCode { get; set; } = "";

    [Column("sport_name")]
    public string SportName { get; set; } = "";

    [Column("category")]
    public string? Category { get; set; }
}

[Table("course")]
public class Course
{
    [Key]
    [Column("course_id")]
    public int CourseId { get; set; }

    [Column("sport_id")]
    public int SportId { get; set; }

    [Column("course_code")]
    public string CourseCode { get; set; } = "";

    [Column("course_name")]
    public string CourseName { get; set; } = "";

    [Column("level_name")]
    public string? LevelName { get; set; }

    [Column("age_range")]
    public string? AgeRange { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Column("price")]
    public decimal Price { get; set; }

    [Column("image_path")]
    public string? ImagePath { get; set; }

    [Column("status")]
    public string Status { get; set; } = "active";

    // format: group hoặc private (gói học 1-1: SessionCount buổi, mỗi buổi SessionMinutes phút).
    [Column("format")]
    public string Format { get; set; } = "group";

    [Column("session_minutes")]
    public int? SessionMinutes { get; set; }

    [Column("session_count")]
    public int? SessionCount { get; set; }

    public Sport? Sport { get; set; }
}
