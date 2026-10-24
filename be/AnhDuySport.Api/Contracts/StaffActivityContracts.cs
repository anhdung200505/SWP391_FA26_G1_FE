namespace AnhDuySport.Api.Contracts;

// Một thao tác của lễ tân hoặc quản trị (bảng audit_log). ActorRole: RECEPTIONIST hoặc ADMIN (vai trò hiện tại của người làm).
public sealed record StaffActivityDto(
    string Id,
    string ActorUserId,
    string ActorName,
    string ActorRole,
    string ActorRoleLabel,
    string Action,
    string EntityName,
    string? EntityId,
    string? Detail,
    DateTime CreatedAt);
