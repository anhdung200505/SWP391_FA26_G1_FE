namespace AnhDuySport.Api.Contracts;

public sealed record BodyMetricRequest(decimal HeightCm, decimal WeightKg);

public sealed record BodyMetricDto(
    string Id,
    decimal HeightCm,
    decimal WeightKg,
    decimal Bmi,
    string BmiCategory,
    DateTime RecordedAt);

public sealed record BodyMetricResponse(BodyMetricDto Body, string Message, ActivityLogDto Log);

public sealed record PersonalGoalsRequest(string Goal, int SessionsPerWeek, int SessionMinutes);

public sealed record WorkoutDecisionRequest(bool EditRequired, string? Changes);

public sealed record RegenerateWorkoutRequest(string Changes);

public sealed record CoachTrainingHistoryRequest(string MemberUserId, int ClassId, string Content);

public sealed record CoachMemberOptionDto(string MemberUserId, string MemberName);

public sealed record CoachClassOptionDto(
    int ClassId,
    string CourseName,
    string ClassName,
    IReadOnlyList<CoachMemberOptionDto> Members);

public sealed record CoachTrainingHistoryDto(
    string Id,
    string MemberUserId,
    string MemberName,
    int ClassId,
    string CourseName,
    string Content,
    DateTime RecordedAt);

public sealed record CoachTrainingHistoryListDto(
    string CoachUserId,
    string CoachName,
    IReadOnlyList<CoachClassOptionDto> Classes,
    IReadOnlyList<CoachTrainingHistoryDto> Histories);

public sealed record SaveCoachTrainingHistoryResponse(
    CoachTrainingHistoryDto History,
    string Message,
    ActivityLogDto Log);

public sealed record AnalysisPipelineDto(
    string CollectHealthData,
    string TrainingHistory,
    string SendAnalysisRequest,
    string AnalyzeHealthMetricAndBmi,
    string GeneratePersonalizedWorkoutPlan);

public sealed record WorkoutSessionDto(
    int DayIndex,
    string Weekday,
    string Title,
    int DurationMinutes,
    string Intensity,
    string Exercises);

public sealed record WorkoutPlanDto(
    string Id,
    string AiProvider,
    int Revision,
    string Status,
    string Title,
    int DurationWeeks,
    decimal Bmi,
    string BmiCategory,
    string Goal,
    int SessionsPerWeek,
    int SessionMinutes,
    string StartTime,
    string? ChangeNote,
    IReadOnlyList<WorkoutSessionDto> Sessions,
    AnalysisPipelineDto Pipeline);

public sealed record WorkoutPlanResponse(string RecommendationId, WorkoutPlanDto Plan, string Message, ActivityLogDto Log);

public sealed record CalendarSyncDto(
    int ScheduledSessions,
    DateOnly From,
    DateOnly To,
    int MovedBecauseOfClass,
    int SkippedBecauseOfClass,
    string Message);

public sealed record WorkoutDecisionResponse(
    string RecommendationId,
    bool Saved,
    string Message,
    WorkoutPlanDto Plan,
    CalendarSyncDto? Calendar,
    ActivityLogDto Log);

public sealed record AiQuotaDto(
    string PackageCode,
    string PackageName,
    int RegenerationsUsed,
    int RegenerationLimit,
    int TokensUsed,
    int TokenLimit);

public sealed record AiRecommendationAccessDto(
    string MemberUserId,
    string MemberName,
    string NextStep,
    string Message,
    BodyMetricDto? LatestBody,
    WorkoutPlanDto? ProposedPlan,
    WorkoutPlanDto? SavedPlan,
    AiQuotaDto Quota);

public sealed record DailyExerciseDto(
    string Id,
    DateOnly Date,
    string StartTime,
    string EndTime,
    string Title,
    string Detail,
    string Status);

public sealed record DailyRoutineDto(
    string RecommendationId,
    string PlanName,
    DateOnly Date,
    string Message,
    IReadOnlyList<DailyExerciseDto> Today,
    IReadOnlyList<DailyExerciseDto> Upcoming);
