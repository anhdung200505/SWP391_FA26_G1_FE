using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AnhDuySport.Api.Models;

[Table("assignment")]
public class ClassAssignment
{
    [Key]
    [Column("assignment_id")]
    public int AssignmentId { get; set; }

    [Column("session_id")]
    public int SessionId { get; set; }

    [Column("title")]
    public string Title { get; set; } = "";

    [Column("description")]
    public string? Description { get; set; }

    [Column("due_at")]
    public DateTime? DueAt { get; set; }
}

[Table("attendance")]
public class ClassAttendance
{
    [Key]
    [Column("attendance_id")]
    public int AttendanceId { get; set; }

    [Column("session_id")]
    public int SessionId { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("check_in_at")]
    public DateTime? CheckInAt { get; set; }

    [Column("status")]
    public string Status { get; set; } = "";
}

[Table("evaluation")]
public class CoachEvaluation
{
    [Key]
    [Column("evaluation_id")]
    public int EvaluationId { get; set; }

    [Column("class_id")]
    public int ClassId { get; set; }

    [Column("assignment_id")]
    public int? AssignmentId { get; set; }

    [Column("evaluator_user_id")]
    public int EvaluatorUserId { get; set; }

    [Column("evaluated_user_id")]
    public int EvaluatedUserId { get; set; }

    [Column("reviewer_user_id")]
    public int? ReviewerUserId { get; set; }

    [Column("score")]
    public decimal? Score { get; set; }

    [Column("comment")]
    public string? Comment { get; set; }

    [Column("evaluated_at")]
    public DateTime EvaluatedAt { get; set; }
}

[Table("coach_training_history")]
public class CoachTrainingHistory
{
    [Key]
    [Column("training_history_id")]
    public int TrainingHistoryId { get; set; }

    [Column("member_user_id")]
    public int MemberUserId { get; set; }

    [Column("coach_user_id")]
    public int CoachUserId { get; set; }

    [Column("class_id")]
    public int ClassId { get; set; }

    [Column("content")]
    public string Content { get; set; } = "";

    [Column("recorded_at")]
    public DateTime RecordedAt { get; set; }
}
