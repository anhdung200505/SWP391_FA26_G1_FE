using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AnhDuySport.Api.Models;

[Table("class")]
public class TrainingClass
{
    [Key]
    [Column("class_id")]
    public int ClassId { get; set; }

    [Column("course_id")]
    public int CourseId { get; set; }

    [Column("training_plan_id")]
    public int TrainingPlanId { get; set; }

    [Column("coach_user_id")]
    public int CoachUserId { get; set; }

    [Column("room_id")]
    public int? RoomId { get; set; }

    [Column("class_name")]
    public string ClassName { get; set; } = "";

    [Column("start_date")]
    public DateOnly? StartDate { get; set; }

    [Column("end_date")]
    public DateOnly? EndDate { get; set; }

    [Column("capacity")]
    public int? Capacity { get; set; }

    [Column("status")]
    public string Status { get; set; } = "open";

    public Course? Course { get; set; }
    public UserAccount? Coach { get; set; }
    public Room? Room { get; set; }
    public List<ClassSlot> Slots { get; set; } = [];
    public List<ClassEnrollment> Enrollments { get; set; } = [];
}

[Table("slot")]
public class ClassSlot
{
    [Key]
    [Column("slot_id")]
    public int SlotId { get; set; }

    [Column("class_id")]
    public int ClassId { get; set; }

    [Column("room_id")]
    public int? RoomId { get; set; }

    [Column("slot_date")]
    public DateOnly SlotDate { get; set; }

    [Column("start_time")]
    public TimeOnly StartTime { get; set; }

    [Column("end_time")]
    public TimeOnly EndTime { get; set; }

    [Column("title")]
    public string? Title { get; set; }
}

[Table("class_enrollment")]
public class ClassEnrollment
{
    [Key]
    [Column("class_enrollment_id")]
    public int ClassEnrollmentId { get; set; }

    [Column("class_id")]
    public int ClassId { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("enrolled_at")]
    public DateTime EnrolledAt { get; set; }

    [Column("status")]
    public string Status { get; set; } = "enrolled";
}
