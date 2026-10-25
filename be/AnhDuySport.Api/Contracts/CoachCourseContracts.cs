namespace AnhDuySport.Api.Contracts;

public sealed record CoachClassListItemDto(
    string ClassId,
    string ClassName,
    string Status,
    string CourseName,
    string SportName,
    DateOnly? StartDate,
    DateOnly? EndDate,
    int EnrolledCount,
    int SessionCount);

public sealed record CoachScheduleLineDto(int Weekday, string WeekdayName, string TimeLabel);

public sealed record CoachRosterDto(string MemberUserId, string MemberName);

public sealed record CoachSessionLineDto(
    string SessionId,
    int? SessionNo,
    DateOnly SessionDate,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string Status,
    string? Note);

public sealed record CoachClassDetailDto(
    string ClassId,
    string ClassName,
    string Status,
    string CourseName,
    string SportName,
    string? RoomName,
    DateOnly? StartDate,
    DateOnly? EndDate,
    int? Capacity,
    int EnrolledCount,
    IReadOnlyList<CoachScheduleLineDto> Schedules,
    IReadOnlyList<CoachRosterDto> Roster,
    IReadOnlyList<CoachSessionLineDto> Sessions);

public sealed record AttendanceRowDto(string MemberUserId, string MemberName, string? Status);

public sealed record AttendanceSheetDto(
    string SessionId,
    DateOnly SessionDate,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string Status,
    IReadOnlyList<AttendanceRowDto> Rows);

public sealed record AttendanceMarkRequest(string MemberUserId, string Status);

public sealed record SubmitAttendanceRequest(IReadOnlyList<AttendanceMarkRequest> Marks);

public sealed record RubricItemDto(string Criterion, decimal MaxScore, string Guidance);

public sealed record EvaluationRowDto(
    string MemberUserId,
    string MemberName,
    decimal? Score,
    string? Comment,
    DateTime? EvaluatedAt);

public sealed record EvaluationSheetDto(
    IReadOnlyList<RubricItemDto> Rubric,
    string? RubricSource,
    IReadOnlyList<EvaluationRowDto> Students);

public sealed record SaveEvaluationRequest(string MemberUserId, decimal Score, string? Comment);

public sealed record AssignmentItemDto(
    string AssignmentId,
    string SessionId,
    string SessionLabel,
    string Title,
    string? Description,
    DateTime? DueAt);

public sealed record SaveAssignmentRequest(string SessionId, string Title, string? Description, DateTime? DueAt);

public sealed record ExerciseItemDto(string Title, string Dosage, string Instructions);

public sealed record ExamQuestionDto(string Prompt, string SuggestedAnswer, decimal Points);

public sealed record CourseSessionPlanDto(
    string SessionId,
    string SessionLabel,
    IReadOnlyList<ExerciseItemDto> Exercises);

public sealed record CoursePlanDto(
    string Slot,
    string? Summary,
    string? ChangeNote,
    DateTime CreatedAt,
    IReadOnlyList<CourseSessionPlanDto> Sessions,
    IReadOnlyList<ExamQuestionDto> Exam,
    IReadOnlyList<RubricItemDto> Rubric);

public sealed record CourseAiWorkspaceDto(
    string ClassId,
    string Brief,
    int HistoryCount,
    CoursePlanDto? Preview,
    CoursePlanDto? Draft,
    CoursePlanDto? Published);

public sealed record GenerateCoursePlanRequest(string Brief);

public sealed record RegenerateCoursePlanRequest(string Brief, string Changes);

public sealed record SaveCourseSessionRequest(string SessionId, IReadOnlyList<ExerciseItemDto> Exercises);

public sealed record SaveCoursePlanRequest(
    string Brief,
    string? Summary,
    IReadOnlyList<SaveCourseSessionRequest> Sessions,
    IReadOnlyList<ExamQuestionDto> Exam,
    IReadOnlyList<RubricItemDto> Rubric);

public sealed record MemberExamQuestionDto(string Prompt, decimal Points);

public sealed record MemberCourseSessionDto(
    string SessionId,
    string SessionLabel,
    IReadOnlyList<ExerciseItemDto> Exercises);

public sealed record MemberCoursePlanDto(
    string ClassId,
    string ClassName,
    string CourseName,
    string SportName,
    string CoachName,
    DateTime PublishedAt,
    string? Summary,
    IReadOnlyList<MemberCourseSessionDto> Sessions,
    IReadOnlyList<MemberExamQuestionDto> Exam,
    IReadOnlyList<RubricItemDto> Rubric);
