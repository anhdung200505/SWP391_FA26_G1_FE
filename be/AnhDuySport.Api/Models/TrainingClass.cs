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

    // HLV và phòng mặc định khi sinh buổi học; mỗi buổi lưu bản sao riêng.
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

    // group hoặc private (lớp 1-1 có capacity = 1).
    [Column("class_type")]
    public string ClassType { get; set; } = "group";

    public Course? Course { get; set; }
    public UserAccount? Coach { get; set; }
    public Room? Room { get; set; }
    public List<ClassSchedule> Schedules { get; set; } = [];
    public List<ClassSession> Sessions { get; set; } = [];
    public List<ClassEnrollment> Enrollments { get; set; } = [];
}

// Danh mục khung giờ cố định: group 3 giờ, private 90 phút.
[Table("time_slot")]
public class TimeSlot
{
    [Key]
    [Column("time_slot_id")]
    public int TimeSlotId { get; set; }

    [Column("kind")]
    public string Kind { get; set; } = "group";

    [Column("start_time")]
    public TimeOnly StartTime { get; set; }

    [Column("end_time")]
    public TimeOnly EndTime { get; set; }

    [Column("label")]
    public string? Label { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;
}

// Lịch tuần của lớp. Weekday: 2..7 = thứ 2..thứ 7.
[Table("class_schedule")]
public class ClassSchedule
{
    [Key]
    [Column("class_schedule_id")]
    public int ClassScheduleId { get; set; }

    [Column("class_id")]
    public int ClassId { get; set; }

    [Column("weekday")]
    public byte Weekday { get; set; }

    [Column("time_slot_id")]
    public int TimeSlotId { get; set; }

    public TimeSlot? TimeSlot { get; set; }
}

// Buổi học cụ thể. Trigger TR_session_rules kiểm tra khung giờ, HLV, phòng, sức chứa và trùng lịch.
// Status: scheduled, held, cancelled, completed.
[Table("session")]
public class ClassSession
{
    [Key]
    [Column("session_id")]
    public int SessionId { get; set; }

    [Column("class_id")]
    public int ClassId { get; set; }

    [Column("session_no")]
    public int? SessionNo { get; set; }

    [Column("session_date")]
    public DateOnly SessionDate { get; set; }

    [Column("time_slot_id")]
    public int TimeSlotId { get; set; }

    [Column("start_time")]
    public TimeOnly StartTime { get; set; }

    [Column("end_time")]
    public TimeOnly EndTime { get; set; }

    [Column("coach_user_id")]
    public int CoachUserId { get; set; }

    [Column("room_id")]
    public int RoomId { get; set; }

    [Column("status")]
    public string Status { get; set; } = "scheduled";

    [Column("note")]
    public string? Note { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    public TrainingClass? Class { get; set; }
    public UserAccount? Coach { get; set; }
    public Room? Room { get; set; }
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
