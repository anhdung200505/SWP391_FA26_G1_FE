using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AnhDuySport.Api.Models;

[Table("role")]
public class Role
{
    [Key]
    [Column("role_id")]
    public int RoleId { get; set; }

    [Column("role_code")]
    public string RoleCode { get; set; } = "";

    [Column("role_name")]
    public string RoleName { get; set; } = "";

    [Column("description")]
    public string? Description { get; set; }

    public List<RolePermission> Permissions { get; set; } = [];
}

[Table("role_permission")]
public class RolePermission
{
    [Key]
    [Column("role_permission_id")]
    public int RolePermissionId { get; set; }

    [Column("role_id")]
    public int RoleId { get; set; }

    [Column("permission_code")]
    public string PermissionCode { get; set; } = "";

    [Column("permission_name")]
    public string PermissionName { get; set; } = "";
}
