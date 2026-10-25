using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace AnhDuySport.Api.Contracts;

public sealed record CreateSupportRequest(
    [property: Description("Id học viên gửi đơn.")] string MemberUserId,
    [property: Description("Loại yêu cầu do học viên tự nhập, tối đa 80 ký tự. Hiện nguyên văn trên đơn của lễ tân và quản lý. Không nhận giảm giá, khuyến mãi hoặc ưu đãi.")]
    [property: MaxLength(80)]
    string RequestType,
    [property: Description("Tiêu đề đơn.")] string Subject,
    [property: Description("Nội dung học viên cần hỗ trợ.")] string Content);

public sealed record CreateEnrollmentConsultationRequest(
    string FullName,
    string Phone,
    string? Email,
    string? Sports,
    int? Age,
    string Title,
    string? Note);

public sealed record UpdateEnrollmentConsultationRequest(
    string? Title,
    string? FullName,
    string? Phone,
    string? Email,
    string? Sports,
    int? Age,
    string? Note,
    string? ResolutionNote);

public sealed record HandleMemberSupportRequest(string Action, string? Note, string? Category);

public sealed record ClassifySupportRequest(string Category);

public sealed record EscalateSupportRequest(string Reason);

public sealed record FinancialDecisionRequest(string Decision, string Note);

public sealed record SupportResultRequest(string Note);

public sealed record SupportRequestDto(
    string Id,
    string MemberUserId,
    string MemberName,
    string MemberEmail,
    string Title,
    string Description,
    string SystemCategory,
    [property: Description("Đơn học viên tự tạo có dòng 'Loại: ...' là loại yêu cầu học viên nhập. Khi lễ tân chuyển lên quản lý, dòng đó được giữ và thêm lý do chuyển.")]
    string? ClassificationReason,
    string? ReceptionistCategory,
    string Status,
    string? AssignedToUserId,
    string? AssigneeName,
    string? Decision,
    string? ResolutionNote,
    DateTime CreatedAt,
    DateTime? ResolvedAt);

public sealed record SupportRequestCreatedDto(string Classification, SupportRequestDto Request);

public sealed record SupportRequestResultDto(SupportRequestDto Request, EmailDto Email);
