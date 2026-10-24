using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Tab AI của coach: mô tả khóa + lịch sử tập của đúng lớp → Gemini → nháp → phát hành.
public class CoachCourseAiFlowService(AppDbContext db, CoachClassAccess access, CurrentActor actor, GeminiWorkoutClient gemini)
{
    private const int SessionCap = 16;

    public Task<CourseAiWorkspaceDto> WorkspaceAsync(string classId) => LoadWorkspaceAsync(classId);

    public async Task<CourseAiWorkspaceDto> GenerateAsync(string classId, GenerateCoursePlanRequest request)
    {
        var owned = await access.RequireAsync(classId);
        var brief = ReadBrief(request.Brief);
        var context = await LoadContextAsync(owned);
        await SaveBriefAsync(owned, brief);
        var generated = await CallGeminiAsync(context, brief, currentPlan: null, changes: null);
        await StoreSlotAsync(owned, "preview", generated.Summary, changeNote: null, generated.Sessions, generated.Exam, generated.Rubric);
        return await LoadWorkspaceAsync(classId);
    }

    public async Task<CourseAiWorkspaceDto> RegenerateAsync(string classId, RegenerateCoursePlanRequest request)
    {
        var owned = await access.RequireAsync(classId);
        var brief = ReadBrief(request.Brief);
        var changes = request.Changes?.Trim() ?? "";
        if (changes.Length < 10 || changes.Length > 1000)
        {
            throw new RegistrationException("Yêu cầu sửa từ 10 đến 1000 ký tự.");
        }

        var context = await LoadContextAsync(owned);
        var current = await DescribeCurrentAsync(owned.ClassId);
        await SaveBriefAsync(owned, brief);
        var generated = await CallGeminiAsync(context, brief, current, changes);
        await StoreSlotAsync(owned, "preview", generated.Summary, changes, generated.Sessions, generated.Exam, generated.Rubric);
        return await LoadWorkspaceAsync(classId);
    }

    public async Task<CourseAiWorkspaceDto> SaveDraftAsync(string classId, SaveCoursePlanRequest request)
    {
        var owned = await access.RequireAsync(classId);
        var brief = ReadBrief(request.Brief);
        var content = await ReadManualAsync(owned.ClassId, request);
        await SaveBriefAsync(owned, brief);
        await StoreSlotAsync(owned, "draft", content.Summary, changeNote: null, content.Sessions, content.Exam, content.Rubric);
        var preview = await db.CoachCoursePlans.FirstOrDefaultAsync(plan => plan.ClassId == owned.ClassId && plan.Slot == "preview");
        if (preview is not null)
        {
            db.CoachCoursePlans.Remove(preview);
            await db.SaveChangesAsync();
        }

        return await LoadWorkspaceAsync(classId);
    }

    public async Task<CourseAiWorkspaceDto> PublishAsync(string classId)
    {
        var owned = await access.RequireAsync(classId);
        var draft = await db.CoachCoursePlans
            .Include(plan => plan.Exercises)
            .Include(plan => plan.Questions)
            .Include(plan => plan.Rubric)
            .FirstOrDefaultAsync(plan => plan.ClassId == owned.ClassId && plan.Slot == "draft")
            ?? throw new RegistrationException("Hãy lưu bản nháp trước khi phát hành.");
        if (draft.Exercises.Count == 0 || draft.Questions.Count == 0 || draft.Rubric.Count == 0)
        {
            throw new RegistrationException("Bản nháp cần có bài tập, câu hỏi và tiêu chí chấm.");
        }

        var sessions = draft.Exercises
            .GroupBy(item => item.SessionId)
            .OrderBy(group => group.Min(item => item.SortOrder))
            .Select(group => new GeneratedCourseSession(
                group.Key.ToString(),
                group.OrderBy(item => item.SortOrder)
                    .Select(item => new GeneratedCourseExercise(item.Title, item.Dosage, item.Instructions))
                    .ToList()))
            .ToList();
        var exam = draft.Questions
            .OrderBy(item => item.SortOrder)
            .Select(item => new GeneratedExamQuestion(item.Prompt, item.SuggestedAnswer, item.Points))
            .ToList();
        var rubric = draft.Rubric
            .OrderBy(item => item.SortOrder)
            .Select(item => new GeneratedRubricItem(item.Criterion, item.MaxScore, item.Guidance))
            .ToList();
        await StoreSlotAsync(owned, "published", draft.Summary, draft.ChangeNote, sessions, exam, rubric);

        var now = DateTime.Now;
        var memberIds = await db.ClassEnrollments
            .Where(enrollment => enrollment.ClassId == owned.ClassId && enrollment.Status == "enrolled")
            .Select(enrollment => enrollment.UserId)
            .ToListAsync();
        foreach (var memberId in memberIds)
        {
            db.Notifications.Add(new AccountNotification
            {
                UserId = memberId,
                Title = Shorten($"Bài tập lớp {owned.ClassName}", 200),
                Content = $"Huấn luyện viên đã phát hành bài tập theo buổi và bài thi cuối kỳ của lớp {owned.ClassName}.",
                IsRead = false,
                CreatedAt = now,
            });
        }

        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = actor.UserId,
            Action = Shorten($"Phát hành bài AI {owned.ClassName}", 100),
            EntityName = "class",
            EntityId = owned.ClassId,
            Detail = $"Coach phát hành bài tập và bài thi lớp {owned.ClassName} cho {memberIds.Count} học viên.",
            CreatedAt = now,
        });
        await db.SaveChangesAsync();
        return await LoadWorkspaceAsync(classId);
    }

    public async Task<CourseAiWorkspaceDto> DiscardPreviewAsync(string classId)
    {
        var owned = await access.RequireAsync(classId);
        var preview = await db.CoachCoursePlans.FirstOrDefaultAsync(plan => plan.ClassId == owned.ClassId && plan.Slot == "preview");
        if (preview is not null)
        {
            db.CoachCoursePlans.Remove(preview);
            await db.SaveChangesAsync();
        }

        return await LoadWorkspaceAsync(classId);
    }

    public async Task<IReadOnlyList<MemberCoursePlanDto>> ListForMemberAsync()
    {
        if (actor.UserId == 0)
        {
            throw new RegistrationException("Phiên đăng nhập không hợp lệ.");
        }

        var classIds = await db.ClassEnrollments.AsNoTracking()
            .Where(enrollment => enrollment.UserId == actor.UserId && enrollment.Status == "enrolled")
            .Select(enrollment => enrollment.ClassId)
            .ToListAsync();
        if (classIds.Count == 0)
        {
            return [];
        }

        var plans = await db.CoachCoursePlans.AsNoTracking()
            .Include(plan => plan.Exercises)
            .Include(plan => plan.Questions)
            .Include(plan => plan.Rubric)
            .Where(plan => plan.Slot == "published" && classIds.Contains(plan.ClassId))
            .ToListAsync();
        if (plans.Count == 0)
        {
            return [];
        }

        var planClassIds = plans.Select(plan => plan.ClassId).ToList();
        var classes = await db.Classes.AsNoTracking()
            .Include(item => item.Course)!.ThenInclude(course => course!.Sport)
            .Include(item => item.Coach)
            .Where(item => planClassIds.Contains(item.ClassId))
            .ToListAsync();
        var sessionIds = plans.SelectMany(plan => plan.Exercises.Select(exercise => exercise.SessionId)).Distinct().ToList();
        var sessions = await db.ClassSessions.AsNoTracking()
            .Where(session => sessionIds.Contains(session.SessionId))
            .ToDictionaryAsync(session => session.SessionId);
        return plans
            .Select(plan =>
            {
                var item = classes.First(row => row.ClassId == plan.ClassId);
                var mapped = MapPlan(plan, sessions);
                return new MemberCoursePlanDto(
                    item.ClassId.ToString(),
                    item.ClassName,
                    item.Course!.CourseName,
                    item.Course.Sport!.SportName,
                    item.Coach!.FullName,
                    plan.CreatedAt,
                    plan.Summary,
                    mapped.Sessions.Select(session => new MemberCourseSessionDto(session.SessionId, session.SessionLabel, session.Exercises)).ToList(),
                    mapped.Exam.Select(question => new MemberExamQuestionDto(question.Prompt, question.Points)).ToList(),
                    mapped.Rubric);
            })
            .OrderBy(item => item.CourseName)
            .ThenBy(item => item.ClassName)
            .ToList();
    }

    private async Task<CourseAiWorkspaceDto> LoadWorkspaceAsync(string classId)
    {
        var owned = await access.RequireAsync(classId);
        var brief = await db.CoachCourseBriefs.AsNoTracking()
            .Where(item => item.ClassId == owned.ClassId)
            .Select(item => item.Brief)
            .FirstOrDefaultAsync() ?? "";
        var historyCount = await db.CoachTrainingHistories.CountAsync(item =>
            item.ClassId == owned.ClassId && item.CoachUserId == actor.UserId);
        var plans = await db.CoachCoursePlans.AsNoTracking()
            .Include(plan => plan.Exercises)
            .Include(plan => plan.Questions)
            .Include(plan => plan.Rubric)
            .Where(plan => plan.ClassId == owned.ClassId)
            .ToListAsync();
        var sessionIds = plans.SelectMany(plan => plan.Exercises.Select(exercise => exercise.SessionId)).Distinct().ToList();
        var sessions = sessionIds.Count == 0
            ? new Dictionary<int, ClassSession>()
            : await db.ClassSessions.AsNoTracking()
                .Where(session => sessionIds.Contains(session.SessionId))
                .ToDictionaryAsync(session => session.SessionId);
        CoursePlanDto? Map(string slot)
        {
            var plan = plans.FirstOrDefault(item => item.Slot == slot);
            return plan is null ? null : MapPlan(plan, sessions);
        }

        return new CourseAiWorkspaceDto(owned.ClassId.ToString(), brief, historyCount, Map("preview"), Map("draft"), Map("published"));
    }

    private async Task<ClassAiContext> LoadContextAsync(OwnedClass owned)
    {
        var item = await db.Classes.AsNoTracking()
            .Include(row => row.Course)!.ThenInclude(course => course!.Sport)
            .FirstAsync(row => row.ClassId == owned.ClassId);
        var sessions = await db.ClassSessions.AsNoTracking()
            .Where(session => session.ClassId == owned.ClassId && session.Status != "cancelled")
            .OrderBy(session => session.SessionDate)
            .ThenBy(session => session.StartTime)
            .ToListAsync();
        if (sessions.Count == 0)
        {
            throw new RegistrationException("Lớp chưa có buổi học để sinh bài.");
        }

        var picked = PickSessions(sessions);
        var histories = await (
            from history in db.CoachTrainingHistories.AsNoTracking()
            join user in db.UserAccounts.AsNoTracking() on history.MemberUserId equals user.UserId
            where history.ClassId == owned.ClassId && history.CoachUserId == actor.UserId
            orderby history.RecordedAt descending
            select new { user.FullName, history.RecordedAt, history.Content })
            .Take(40)
            .ToListAsync();
        if (histories.Count == 0)
        {
            throw new RegistrationException("Hãy ghi lịch sử tập của lớp này trước khi sinh bài.");
        }

        var historyText = string.Join(
            "\n",
            histories.Select(row => $"- {row.FullName} ({row.RecordedAt:dd/MM/yyyy}): {row.Content}"));
        if (historyText.Length > 7000)
        {
            historyText = historyText[..7000];
        }

        var prompts = picked
            .Select(session => new CoursePlanSessionPrompt(session.SessionId.ToString(), CoachCourseFlowService.SessionLabel(session)))
            .ToList();
        var note = picked.Count < sessions.Count
            ? $" Bộ bài phủ {picked.Count}/{sessions.Count} buổi chưa hủy."
            : "";
        return new ClassAiContext(
            item.Course!.Sport!.SportName,
            item.Course.CourseName,
            item.ClassName,
            historyText,
            prompts,
            note);
    }

    private async Task<string?> DescribeCurrentAsync(int classId)
    {
        var plan = await db.CoachCoursePlans.AsNoTracking()
            .Include(item => item.Exercises)
            .Include(item => item.Questions)
            .Include(item => item.Rubric)
            .Where(item => item.ClassId == classId && (item.Slot == "draft" || item.Slot == "preview"))
            .OrderByDescending(item => item.Slot == "draft")
            .FirstOrDefaultAsync();
        if (plan is null)
        {
            return null;
        }

        var lines = new List<string>();
        foreach (var group in plan.Exercises.GroupBy(item => item.SessionId))
        {
            lines.Add($"Buổi {group.Key}:");
            lines.AddRange(group.OrderBy(item => item.SortOrder).Select(item => $"- {item.Title} | {item.Dosage} | {item.Instructions}"));
        }

        lines.Add("Đề thi:");
        lines.AddRange(plan.Questions.OrderBy(item => item.SortOrder).Select(item => $"- {item.Prompt} ({item.Points} điểm). Đáp án: {item.SuggestedAnswer}"));
        lines.Add("Tiêu chí:");
        lines.AddRange(plan.Rubric.OrderBy(item => item.SortOrder).Select(item => $"- {item.Criterion} ({item.MaxScore}): {item.Guidance}"));
        var text = string.Join("\n", lines);
        return text.Length <= 7000 ? text : text[..7000];
    }

    private async Task<GeneratedCoursePlan> CallGeminiAsync(ClassAiContext context, string brief, string? currentPlan, string? changes)
    {
        try
        {
            var generated = await gemini.GenerateCoursePlanAsync(new CoursePlanGenerationRequest(
                context.SportName,
                context.CourseName,
                context.ClassName,
                brief,
                context.History,
                context.Sessions,
                currentPlan,
                changes));
            var summary = generated.Summary + context.CoverageNote;
            if (summary.Length > 1000)
            {
                summary = summary[..1000];
            }

            return generated with { Summary = summary };
        }
        catch (InvalidOperationException exception) when (exception is not RegistrationException)
        {
            throw new RegistrationException(exception.Message);
        }
    }

    private async Task StoreSlotAsync(
        OwnedClass owned,
        string slot,
        string? summary,
        string? changeNote,
        IReadOnlyList<GeneratedCourseSession> sessions,
        IReadOnlyList<GeneratedExamQuestion> exam,
        IReadOnlyList<GeneratedRubricItem> rubric)
    {
        var now = DateTime.Now;
        var plan = await db.CoachCoursePlans
            .Include(item => item.Exercises)
            .Include(item => item.Questions)
            .Include(item => item.Rubric)
            .FirstOrDefaultAsync(item => item.ClassId == owned.ClassId && item.Slot == slot);
        if (plan is null)
        {
            plan = new CoachCoursePlan
            {
                ClassId = owned.ClassId,
                CoachUserId = owned.CoachUserId,
                Slot = slot,
                CreatedAt = now,
            };
            db.CoachCoursePlans.Add(plan);
        }
        else
        {
            db.CoachCourseExercises.RemoveRange(plan.Exercises);
            db.CoachCourseExamQuestions.RemoveRange(plan.Questions);
            db.CoachCourseRubricItems.RemoveRange(plan.Rubric);
            plan.Exercises.Clear();
            plan.Questions.Clear();
            plan.Rubric.Clear();
            plan.CoachUserId = owned.CoachUserId;
            plan.CreatedAt = now;
        }

        plan.Summary = summary;
        plan.ChangeNote = changeNote;
        var order = 0;
        foreach (var session in sessions)
        {
            var sessionId = int.Parse(session.SessionId);
            foreach (var exercise in session.Exercises)
            {
                plan.Exercises.Add(new CoachCourseExercise
                {
                    SessionId = sessionId,
                    SortOrder = order++,
                    Title = exercise.Title,
                    Dosage = exercise.Dosage,
                    Instructions = exercise.Instructions,
                });
            }
        }

        order = 0;
        foreach (var question in exam)
        {
            plan.Questions.Add(new CoachCourseExamQuestion
            {
                SortOrder = order++,
                Prompt = question.Prompt,
                SuggestedAnswer = question.SuggestedAnswer,
                Points = question.Points,
            });
        }

        order = 0;
        foreach (var item in rubric)
        {
            plan.Rubric.Add(new CoachCourseRubricItem
            {
                SortOrder = order++,
                Criterion = item.Criterion,
                MaxScore = item.MaxScore,
                Guidance = item.Guidance,
            });
        }

        await db.SaveChangesAsync();
    }

    private async Task SaveBriefAsync(OwnedClass owned, string brief)
    {
        var row = await db.CoachCourseBriefs.FirstOrDefaultAsync(item => item.ClassId == owned.ClassId);
        var now = DateTime.Now;
        if (row is null)
        {
            db.CoachCourseBriefs.Add(new CoachCourseBrief
            {
                ClassId = owned.ClassId,
                CoachUserId = owned.CoachUserId,
                Brief = brief,
                UpdatedAt = now,
            });
        }
        else
        {
            row.Brief = brief;
            row.CoachUserId = owned.CoachUserId;
            row.UpdatedAt = now;
        }

        await db.SaveChangesAsync();
    }

    private async Task<GeneratedCoursePlan> ReadManualAsync(int classId, SaveCoursePlanRequest request)
    {
        var openIds = await db.ClassSessions.AsNoTracking()
            .Where(session => session.ClassId == classId && session.Status != "cancelled")
            .Select(session => session.SessionId)
            .ToListAsync();
        var sessions = request.Sessions ?? [];
        if (sessions.Count == 0 || sessions.Count > SessionCap)
        {
            throw new RegistrationException($"Bộ bài cần từ 1 đến {SessionCap} buổi.");
        }

        var seen = new HashSet<int>();
        var parsedSessions = new List<GeneratedCourseSession>();
        foreach (var session in sessions)
        {
            if (!int.TryParse(session.SessionId, out var sessionId) || !openIds.Contains(sessionId) || !seen.Add(sessionId))
            {
                throw new RegistrationException("Mỗi buổi trong bộ bài phải là buổi chưa hủy của lớp.");
            }

            var exercises = session.Exercises ?? [];
            if (exercises.Count is < 1 or > 5)
            {
                throw new RegistrationException("Mỗi buổi có từ 1 đến 5 bài tập.");
            }

            parsedSessions.Add(new GeneratedCourseSession(
                sessionId.ToString(),
                exercises.Select(item => new GeneratedCourseExercise(
                    Required(item.Title, 200, "Tên bài tập"),
                    Required(item.Dosage, 120, "Liều lượng"),
                    Required(item.Instructions, 2000, "Hướng dẫn"))).ToList()));
        }

        var exam = request.Exam ?? [];
        if (exam.Count is < 1 or > 10)
        {
            throw new RegistrationException("Bài thi có từ 1 đến 10 câu.");
        }

        var questions = exam.Select(item => new GeneratedExamQuestion(
            Required(item.Prompt, 1000, "Câu hỏi"),
            Required(item.SuggestedAnswer, 2000, "Đáp án gợi ý"),
            ReadScore(item.Points))).ToList();
        var rubricItems = request.Rubric ?? [];
        if (rubricItems.Count is < 1 or > 6)
        {
            throw new RegistrationException("Cần từ 1 đến 6 tiêu chí chấm.");
        }

        var rubric = rubricItems.Select(item => new GeneratedRubricItem(
            Required(item.Criterion, 200, "Tiêu chí"),
            ReadScore(item.MaxScore),
            Required(item.Guidance, 1000, "Hướng dẫn chấm"))).ToList();
        var summary = string.IsNullOrWhiteSpace(request.Summary) ? null : request.Summary.Trim();
        if (summary is { Length: > 1000 })
        {
            throw new RegistrationException("Tóm tắt tối đa 1000 ký tự.");
        }

        return new GeneratedCoursePlan(summary ?? "", parsedSessions, questions, rubric);
    }

    private static CoursePlanDto MapPlan(CoachCoursePlan plan, IReadOnlyDictionary<int, ClassSession> sessions)
    {
        var groups = plan.Exercises
            .GroupBy(item => item.SessionId)
            .Select(group =>
            {
                sessions.TryGetValue(group.Key, out var session);
                return new
                {
                    Date = session?.SessionDate ?? DateOnly.MaxValue,
                    Time = session?.StartTime ?? TimeOnly.MaxValue,
                    Plan = new CourseSessionPlanDto(
                        group.Key.ToString(),
                        session is null ? "Buổi không còn trong lịch" : CoachCourseFlowService.SessionLabel(session),
                        group.OrderBy(item => item.SortOrder)
                            .Select(item => new ExerciseItemDto(item.Title, item.Dosage, item.Instructions))
                            .ToList()),
                };
            })
            .OrderBy(item => item.Date)
            .ThenBy(item => item.Time)
            .Select(item => item.Plan)
            .ToList();
        return new CoursePlanDto(
            plan.Slot,
            plan.Summary,
            plan.ChangeNote,
            plan.CreatedAt,
            groups,
            plan.Questions
                .OrderBy(item => item.SortOrder)
                .Select(item => new ExamQuestionDto(item.Prompt, item.SuggestedAnswer, item.Points))
                .ToList(),
            plan.Rubric
                .OrderBy(item => item.SortOrder)
                .Select(item => new RubricItemDto(item.Criterion, item.MaxScore, item.Guidance))
                .ToList());
    }

    private static List<ClassSession> PickSessions(List<ClassSession> sessions)
    {
        if (sessions.Count <= SessionCap)
        {
            return sessions;
        }

        var today = DateOnly.FromDateTime(DateTime.Now);
        var upcoming = sessions.Where(session => session.SessionDate >= today).ToList();
        if (upcoming.Count >= SessionCap)
        {
            return upcoming.Take(SessionCap).ToList();
        }

        return sessions.Skip(sessions.Count - SessionCap).ToList();
    }

    private static string ReadBrief(string? value)
    {
        var brief = value?.Trim() ?? "";
        if (brief.Length < 20 || brief.Length > 2000)
        {
            throw new RegistrationException("Mô tả khóa từ 20 đến 2000 ký tự.");
        }

        return brief;
    }

    private static string Required(string? value, int max, string label)
    {
        var text = value?.Trim() ?? "";
        if (text.Length == 0 || text.Length > max)
        {
            throw new RegistrationException($"{label} từ 1 đến {max} ký tự.");
        }

        return text;
    }

    private static decimal ReadScore(decimal score)
    {
        if (score <= 0 || score > 10)
        {
            throw new RegistrationException("Điểm mỗi câu và mỗi tiêu chí phải lớn hơn 0 và không quá 10.");
        }

        return Math.Round(score, 1, MidpointRounding.AwayFromZero);
    }

    private static string Shorten(string value, int max) => value.Length <= max ? value : value[..max];

    private sealed record ClassAiContext(
        string SportName,
        string CourseName,
        string ClassName,
        string History,
        IReadOnlyList<CoursePlanSessionPrompt> Sessions,
        string CoverageNote);
}
