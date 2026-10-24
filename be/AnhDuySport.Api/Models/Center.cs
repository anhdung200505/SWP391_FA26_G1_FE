using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AnhDuySport.Api.Models;

[Table("center")]
public class Center
{
    [Key]
    [Column("center_id")]
    public int CenterId { get; set; }

    [Column("center_name")]
    public string CenterName { get; set; } = "";

    [Column("address")]
    public string? Address { get; set; }

    [Column("phone")]
    public string? Phone { get; set; }

    [Column("email")]
    public string? Email { get; set; }

    [Column("description")]
    public string? Description { get; set; }
}

[Table("room")]
public class Room
{
    [Key]
    [Column("room_id")]
    public int RoomId { get; set; }

    [Column("center_id")]
    public int CenterId { get; set; }

    [Column("room_code")]
    public string RoomCode { get; set; } = "";

    [Column("room_name")]
    public string RoomName { get; set; } = "";

    [Column("room_type")]
    public string? RoomType { get; set; }

    [Column("capacity")]
    public int Capacity { get; set; }

    // Số buổi 1-1 tối đa diễn ra cùng lúc trong phòng.
    [Column("private_concurrency")]
    public int PrivateConcurrency { get; set; } = 1;

    public Center? Center { get; set; }
}

// Phòng nào dùng được cho môn nào, cho lớp nhóm và/hoặc học 1-1.
[Table("sport_room")]
public class SportRoom
{
    [Key]
    [Column("sport_room_id")]
    public int SportRoomId { get; set; }

    [Column("sport_id")]
    public int SportId { get; set; }

    [Column("room_id")]
    public int RoomId { get; set; }

    [Column("allow_group")]
    public bool AllowGroup { get; set; } = true;

    [Column("allow_private")]
    public bool AllowPrivate { get; set; } = true;
}

// HLV dạy được môn nào.
[Table("coach_sport")]
public class CoachSport
{
    [Key]
    [Column("coach_sport_id")]
    public int CoachSportId { get; set; }

    [Column("coach_user_id")]
    public int CoachUserId { get; set; }

    [Column("sport_id")]
    public int SportId { get; set; }
}
