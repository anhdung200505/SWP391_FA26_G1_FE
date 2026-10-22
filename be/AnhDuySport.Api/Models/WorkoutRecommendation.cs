using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AnhDuySport.Api.Models;

[Table("training_plan")]
public class TrainingPlan
{
    [Key]
    [Column("training_plan_id")]
    public int TrainingPlanId { get; set; }

    [Column("created_by_user_id")]
    public int CreatedByUserId { get; set; }

    [Column("plan_name")]
    public string PlanName { get; set; } = "";

    [Column("description")]
    public string? Description { get; set; }

    [Column("duration_weeks")]
    public int? DurationWeeks { get; set; }

    // Giáo án chuẩn của một môn; giáo án AI gợi ý cho học viên thì để null.
    [Column("sport_id")]
    public int? SportId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}

[Table("member_body_metric")]
public class MemberBodyMetric
{
    [Key]
    [Column("body_metric_id")]
    public int BodyMetricId { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("height_cm")]
    public decimal HeightCm { get; set; }

    [Column("weight_kg")]
    public decimal WeightKg { get; set; }

    [Column("bmi")]
    public decimal Bmi { get; set; }

    [Column("bmi_category")]
    public string BmiCategory { get; set; } = "";

    [Column("recorded_at")]
    public DateTime RecordedAt { get; set; }
}

[Table("ai_workout_recommendation")]
public class AiWorkoutRecommendation
{
    [Key]
    [Column("recommendation_id")]
    public int RecommendationId { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("body_metric_id")]
    public int BodyMetricId { get; set; }

    [Column("goal")]
    public string Goal { get; set; } = "";

    [Column("sessions_per_week")]
    public int SessionsPerWeek { get; set; }

    [Column("session_minutes")]
    public int SessionMinutes { get; set; }

    [Column("change_note")]
    public string? ChangeNote { get; set; }

    [Column("revision")]
    public int Revision { get; set; } = 1;

    [Column("health_summary")]
    public string HealthSummary { get; set; } = "";

    [Column("training_history_summary")]
    public string TrainingHistorySummary { get; set; } = "";

    [Column("analysis_request")]
    public string AnalysisRequest { get; set; } = "";

    [Column("analysis_summary")]
    public string AnalysisSummary { get; set; } = "";

    [Column("plan_name")]
    public string PlanName { get; set; } = "";

    [Column("duration_weeks")]
    public int DurationWeeks { get; set; }

    [Column("preferred_start_time")]
    public TimeOnly PreferredStartTime { get; set; }

    // proposed | saved | archived
    [Column("status")]
    public string Status { get; set; } = "proposed";

    [Column("training_plan_id")]
    public int? TrainingPlanId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }

    public MemberBodyMetric? BodyMetric { get; set; }
    public TrainingPlan? TrainingPlan { get; set; }
    public List<AiWorkoutSession> Sessions { get; set; } = [];
}

[Table("ai_workout_session")]
public class AiWorkoutSession
{
    [Key]
    [Column("workout_session_id")]
    public int WorkoutSessionId { get; set; }

    [Column("recommendation_id")]
    public int RecommendationId { get; set; }

    [Column("day_index")]
    public int DayIndex { get; set; }

    [Column("weekday_name")]
    public string WeekdayName { get; set; } = "";

    [Column("weekday")]
    public int Weekday { get; set; }

    [Column("title")]
    public string Title { get; set; } = "";

    [Column("duration_minutes")]
    public int DurationMinutes { get; set; }

    [Column("intensity")]
    public string Intensity { get; set; } = "";

    [Column("exercises")]
    public string Exercises { get; set; } = "";
}

[Table("personal_exercise")]
public class PersonalExercise
{
    [Key]
    [Column("personal_exercise_id")]
    public int PersonalExerciseId { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("recommendation_id")]
    public int RecommendationId { get; set; }

    [Column("exercise_date")]
    public DateOnly ExerciseDate { get; set; }

    [Column("start_time")]
    public TimeOnly StartTime { get; set; }

    [Column("end_time")]
    public TimeOnly EndTime { get; set; }

    [Column("title")]
    public string Title { get; set; } = "";

    [Column("detail")]
    public string Detail { get; set; } = "";

    // scheduled | cancelled
    [Column("status")]
    public string Status { get; set; } = "scheduled";
}
