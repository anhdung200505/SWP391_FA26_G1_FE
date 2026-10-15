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
    public int? Capacity { get; set; }

    public Center? Center { get; set; }
}
