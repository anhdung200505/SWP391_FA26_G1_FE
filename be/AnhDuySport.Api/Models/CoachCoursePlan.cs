using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AnhDuySport.Api.Models;

[Table("coach_course_brief")]
public class CoachCourseBrief
{
    [Key]
    [Column("class_id")]
    public int ClassId { get; set; }

    [Column("coach_user_id")]
    public int CoachUserId { get; set; }

    [Column("brief")]
    public string Brief { get; set; } = "";

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }
}

// slot: preview (bản Gemini vừa sinh), draft (đã lưu), published (học viên đọc).
[Table("coach_course_plan")]
public class CoachCoursePlan
{
    [Key]
    [Column("plan_id")]
    public int PlanId { get; set; }

    [Column("class_id")]
    public int ClassId { get; set; }

    [Column("coach_user_id")]
    public int CoachUserId { get; set; }

    [Column("slot")]
    public string Slot { get; set; } = "";

    [Column("summary")]
    public string? Summary { get; set; }

    [Column("change_note")]
    public string? ChangeNote { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    public List<CoachCourseExercise> Exercises { get; set; } = [];
    public List<CoachCourseExamQuestion> Questions { get; set; } = [];
    public List<CoachCourseRubricItem> Rubric { get; set; } = [];
}

[Table("coach_course_exercise")]
public class CoachCourseExercise
{
    [Key]
    [Column("exercise_id")]
    public int ExerciseId { get; set; }

    [Column("plan_id")]
    public int PlanId { get; set; }

    [Column("session_id")]
    public int SessionId { get; set; }

    [Column("sort_order")]
    public int SortOrder { get; set; }

    [Column("title")]
    public string Title { get; set; } = "";

    [Column("dosage")]
    public string Dosage { get; set; } = "";

    [Column("instructions")]
    public string Instructions { get; set; } = "";
}

[Table("coach_course_exam_question")]
public class CoachCourseExamQuestion
{
    [Key]
    [Column("question_id")]
    public int QuestionId { get; set; }

    [Column("plan_id")]
    public int PlanId { get; set; }

    [Column("sort_order")]
    public int SortOrder { get; set; }

    [Column("prompt")]
    public string Prompt { get; set; } = "";

    [Column("suggested_answer")]
    public string SuggestedAnswer { get; set; } = "";

    [Column("points")]
    public decimal Points { get; set; }
}

[Table("coach_course_rubric")]
public class CoachCourseRubricItem
{
    [Key]
    [Column("rubric_id")]
    public int RubricId { get; set; }

    [Column("plan_id")]
    public int PlanId { get; set; }

    [Column("sort_order")]
    public int SortOrder { get; set; }

    [Column("criterion")]
    public string Criterion { get; set; } = "";

    [Column("max_score")]
    public decimal MaxScore { get; set; }

    [Column("guidance")]
    public string Guidance { get; set; } = "";
}
