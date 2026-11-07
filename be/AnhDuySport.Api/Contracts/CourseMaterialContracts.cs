namespace AnhDuySport.Api.Contracts;

public sealed record CourseUnitDto(int SortOrder, string Label, string Work, string Review);

public sealed record CourseMaterialDto(
    int SportId,
    string SportName,
    string SourceName,
    string SourceUrl,
    string Note,
    IReadOnlyList<CourseUnitDto> Units,
    DateTime? UpdatedAt);

public sealed record SaveCourseUnitRequest(int SortOrder, string? Label, string? Work, string? Review);

public sealed record SaveCourseMaterialRequest(
    string? SourceName,
    string? SourceUrl,
    string? Note,
    IReadOnlyList<SaveCourseUnitRequest>? Units);

public sealed record IntakeStudentDto(string MemberUserId, string MemberName, string Comment);

public sealed record IntakeSheetDto(
    string ClassId,
    string? SessionId,
    string? SessionLabel,
    bool CanEdit,
    string LockReason,
    IReadOnlyList<IntakeStudentDto> Students);

public sealed record SaveIntakeNoteRequest(string MemberUserId, string? Comment);
