using System.Globalization;
using System.Text;
using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Main flow: AI Workout Recommendation
//
// Access AI Recommendation → Input Body BMI Data → Input Personal Goals
// → Collect Health Data & Training History → Send Analysis Request
// → Analyze Health Metric & BMI → Generate Personalized Workout Plan
// → Receive AI Workout Plan → Edit Required?
//      ├─ Yes → Enter Required Changes → Send New Analysis Request → Generate lại
//      └─ No  → Save Plan to Member Account → Sync Schedule to Personal Calendar
//             → View Daily Exercise Routine
public class WorkoutRecommendationFlowService(AppDbContext db, GeminiWorkoutClient gemini)
{
    private static readonly TimeOnly DefaultStart = new(18, 0);

    // ===== Access AI Recommendation =====
    public async Task<AiRecommendationAccessDto> AccessAsync(string memberUserId)
    {
        var member = await FindActiveMemberAsync(memberUserId);
        var allowance = await AiMembershipQuota.LoadAsync(db, member.UserId);
        var body = await LatestBodyAsync(member.UserId);
        var plans = await db.WorkoutRecommendations
            .AsNoTracking()
            .Include(item => item.BodyMetric)
            .Include(item => item.Sessions)
            .Where(item => item.UserId == member.UserId && item.Status != "archived")
            .OrderByDescending(item => item.RecommendationId)
            .ToListAsync();
        var proposed = plans.FirstOrDefault(item => item.Status == "proposed");
        var saved = plans.FirstOrDefault(item => item.Status == "saved");

        string nextStep;
        string message;
        if (proposed is not null)
        {
            nextStep = "decide";
            message = $"Đã có giáo án #{proposed.RecommendationId} chờ xác nhận. Gọi decision với editRequired=true để sửa, hoặc false để lưu.";
        }
        else if (body is null)
        {
            nextStep = "input_body";
            message = "Nhập chiều cao và cân nặng ở bước Input Body BMI Data.";
        }
        else if (saved is null || body.RecordedAt > (saved.UpdatedAt ?? saved.CreatedAt))
        {
            nextStep = "input_goals";
            message = "Đã có chỉ số BMI. Nhập mục tiêu cá nhân để hệ thống gửi yêu cầu phân tích.";
        }
        else
        {
            nextStep = "view_routine";
            message = "Giáo án đã lưu. Xem routine, hoặc POST regenerate với changes để tạo yêu cầu tạo lại giáo án.";
        }

        return new AiRecommendationAccessDto(
            member.UserId.ToString(),
            member.FullName,
            nextStep,
            message,
            body is null ? null : ToBodyDto(body),
            proposed is null ? null : ToPlan(proposed),
            saved is null ? null : ToPlan(saved),
            allowance.ToDto());
    }

    // ===== Input Body BMI Data =====
    public async Task<BodyMetricResponse> InputBodyAsync(string memberUserId, BodyMetricRequest request)
    {
        var member = await FindActiveMemberAsync(memberUserId);
        await AiMembershipQuota.LoadAsync(db, member.UserId);
        var height = decimal.Round(request.HeightCm, 1, MidpointRounding.AwayFromZero);
        var weight = decimal.Round(request.WeightKg, 1, MidpointRounding.AwayFromZero);
        if (height is < 100 or > 250)
        {
            throw new InvalidOperationException("Chiều cao phải từ 100 đến 250 cm.");
        }

        if (weight is < 20 or > 300)
        {
            throw new InvalidOperationException("Cân nặng phải từ 20 đến 300 kg.");
        }

        var heightM = height / 100m;
        var bmi = decimal.Round(weight / (heightM * heightM), 1, MidpointRounding.AwayFromZero);
        var now = DateTime.Now;
        var metric = new MemberBodyMetric
        {
            UserId = member.UserId,
            HeightCm = height,
            WeightKg = weight,
            Bmi = bmi,
            BmiCategory = CategoryOf(bmi),
            RecordedAt = now,
        };
        db.BodyMetrics.Add(metric);

        var drafts = await db.WorkoutRecommendations
            .Include(item => item.Sessions)
            .Where(item => item.UserId == member.UserId && item.Status == "proposed")
            .ToListAsync();
        db.WorkoutSessions.RemoveRange(drafts.SelectMany(item => item.Sessions));
        db.WorkoutRecommendations.RemoveRange(drafts);

        var log = new ActivityLog
        {
            ActorUserId = member.UserId,
            Action = "Nhập chỉ số BMI",
            EntityName = "member_body_metric",
            Detail = $"Cao {height.ToString("0.0", CultureInfo.InvariantCulture)} cm, nặng {weight.ToString("0.0", CultureInfo.InvariantCulture)} kg, BMI {bmi.ToString("0.0", CultureInfo.InvariantCulture)} ({metric.BmiCategory}).",
            CreatedAt = now,
        };
        db.ActivityLogs.Add(log);
        await db.SaveChangesAsync();
        log.EntityId = metric.BodyMetricId;
        await db.SaveChangesAsync();

        return new BodyMetricResponse(
            ToBodyDto(metric),
            "Đã ghi chỉ số BMI. Bước tiếp theo: Input Personal Goals.",
            ToLogDto(log, member.FullName));
    }

    // ===== Input Personal Goals → Collect → Send → Analyze → Generate → Receive =====
    public async Task<WorkoutPlanResponse> InputGoalsAsync(string memberUserId, PersonalGoalsRequest request)
    {
        var member = await FindActiveMemberAsync(memberUserId);
        var allowance = await AiMembershipQuota.LoadAsync(db, member.UserId);
        var metric = await LatestBodyAsync(member.UserId)
            ?? throw new InvalidOperationException("Hãy nhập chỉ số BMI trước khi nhập mục tiêu.");
        var goal = RequireText(request.Goal, "Nhập mục tiêu cá nhân.", 500);
        if (request.SessionsPerWeek is < 2 or > 6)
        {
            throw new InvalidOperationException("Số buổi mỗi tuần phải từ 2 đến 6.");
        }

        if (request.SessionMinutes is < 20 or > 90)
        {
            throw new InvalidOperationException("Mỗi buổi phải từ 20 đến 90 phút.");
        }

        var history = await CollectHistoryAsync(member.UserId);
        RequireCoachHistory(history);
        AiMembershipQuota.EnsureCanCall(allowance, regenerating: false);
        var health = DescribeHealth(member, metric);
        var spec = BuildSpec(goal, request.SessionsPerWeek, request.SessionMinutes, metric.Bmi, history, null, DefaultStart);
        var now = DateTime.Now;
        var recommendation = await db.WorkoutRecommendations
            .Include(item => item.Sessions)
            .FirstOrDefaultAsync(item => item.UserId == member.UserId && item.Status == "proposed");
        if (recommendation is null)
        {
            recommendation = new AiWorkoutRecommendation
            {
                UserId = member.UserId,
                CreatedAt = now,
                Revision = 1,
            };
            db.WorkoutRecommendations.Add(recommendation);
        }
        else
        {
            db.WorkoutSessions.RemoveRange(recommendation.Sessions);
            recommendation.Sessions.Clear();
            recommendation.Revision = 1;
        }

        var tokens = await ApplySpecAsync(recommendation, metric, goal, spec, health, history, member.FullName, null, now);
        AiMembershipQuota.Record(db, allowance, AiMembershipQuota.Generate, tokens, now);
        var log = AddLog(member, "Tạo giáo án AI", recommendation.PlanName, now);
        await db.SaveChangesAsync();
        log.EntityId = recommendation.RecommendationId;
        await db.SaveChangesAsync();
        recommendation.BodyMetric = metric;

        return new WorkoutPlanResponse(
            recommendation.RecommendationId.ToString(),
            ToPlan(recommendation),
            $"recommendationId = {recommendation.RecommendationId}. Dùng số này ở POST .../{recommendation.RecommendationId}/decision. Giáo án do {gemini.ProviderLabel} tạo. {AiMembershipQuota.RemainingText(allowance, tokens, countedRegeneration: false)}",
            ToLogDto(log, member.FullName));
    }

    // ===== Edit Required? =====
    public async Task<WorkoutDecisionResponse> DecideAsync(string memberUserId, int recommendationId, WorkoutDecisionRequest request)
    {
        var member = await FindActiveMemberAsync(memberUserId);
        var recommendation = await db.WorkoutRecommendations
            .Include(item => item.Sessions)
            .Include(item => item.BodyMetric)
            .FirstOrDefaultAsync(item => item.RecommendationId == recommendationId && item.UserId == member.UserId)
            ?? throw new KeyNotFoundException("Không tìm thấy giáo án.");
        if (recommendation.Status != "proposed")
        {
            throw new InvalidOperationException("Giáo án này đã được lưu hoặc đã thay bằng giáo án mới.");
        }

        if (recommendation.BodyMetric is null)
        {
            throw new InvalidOperationException("Giáo án chưa gắn chỉ số BMI.");
        }

        var allowance = await AiMembershipQuota.LoadAsync(db, member.UserId);
        var now = DateTime.Now;
        if (request.EditRequired)
        {
            var changes = RequireText(request.Changes, "Nhập nội dung cần chỉnh.", 1000);
            var history = await CollectHistoryAsync(member.UserId);
            RequireCoachHistory(history);
            AiMembershipQuota.EnsureCanCall(allowance, regenerating: true);
            var spec = BuildSpec(
                recommendation.Goal,
                recommendation.SessionsPerWeek,
                recommendation.SessionMinutes,
                recommendation.BodyMetric.Bmi,
                history,
                changes,
                recommendation.PreferredStartTime);
            spec = spec with { DurationWeeks = AdjustWeeks(recommendation.DurationWeeks, changes) };
            db.WorkoutSessions.RemoveRange(recommendation.Sessions);
            recommendation.Sessions.Clear();
            recommendation.Revision += 1;
            var tokens = await ApplySpecAsync(
                recommendation,
                recommendation.BodyMetric,
                recommendation.Goal,
                spec,
                recommendation.HealthSummary,
                history,
                member.FullName,
                changes,
                now);
            AiMembershipQuota.Record(db, allowance, AiMembershipQuota.Regenerate, tokens, now);
            var log = AddLog(member, "Tạo lại giáo án AI", changes, now);
            await db.SaveChangesAsync();
            log.EntityId = recommendation.RecommendationId;
            await db.SaveChangesAsync();
            return new WorkoutDecisionResponse(
                recommendation.RecommendationId.ToString(),
                false,
                $"Đã gọi {gemini.ProviderLabel} tạo lại giáo án lần {recommendation.Revision}. recommendationId vẫn là {recommendation.RecommendationId}. {AiMembershipQuota.RemainingText(allowance, tokens, countedRegeneration: true)}",
                ToPlan(recommendation),
                null,
                ToLogDto(log, member.FullName));
        }

        return await SaveAndSyncAsync(member, recommendation, now);
    }

    // Member tạo yêu cầu regenerate sau khi đã có giáo án, kể cả giáo án đã lưu.
    public async Task<WorkoutPlanResponse> RegenerateAsync(string memberUserId, RegenerateWorkoutRequest request)
    {
        var member = await FindActiveMemberAsync(memberUserId);
        var changes = RequireText(request.Changes, "Nhập lý do muốn tạo lại giáo án.", 1000);
        var metric = await LatestBodyAsync(member.UserId)
            ?? throw new InvalidOperationException("Hãy nhập chỉ số BMI trước khi tạo lại giáo án.");
        var proposed = await db.WorkoutRecommendations
            .Include(item => item.Sessions)
            .FirstOrDefaultAsync(item => item.UserId == member.UserId && item.Status == "proposed");
        var source = proposed ?? await db.WorkoutRecommendations
            .Where(item => item.UserId == member.UserId && item.Status == "saved")
            .OrderByDescending(item => item.RecommendationId)
            .FirstOrDefaultAsync()
            ?? throw new InvalidOperationException("Chưa có giáo án để tạo lại. Hãy nhập mục tiêu trước.");

        var history = await CollectHistoryAsync(member.UserId);
        RequireCoachHistory(history);
        var allowance = await AiMembershipQuota.LoadAsync(db, member.UserId);
        AiMembershipQuota.EnsureCanCall(allowance, regenerating: true);
        var health = DescribeHealth(member, metric);
        var spec = BuildSpec(
            source.Goal,
            source.SessionsPerWeek,
            source.SessionMinutes,
            metric.Bmi,
            history,
            changes,
            source.PreferredStartTime);
        spec = spec with { DurationWeeks = AdjustWeeks(source.DurationWeeks, changes) };
        var now = DateTime.Now;
        var recommendation = proposed;
        if (recommendation is null)
        {
            recommendation = new AiWorkoutRecommendation
            {
                UserId = member.UserId,
                CreatedAt = now,
                Revision = source.Revision,
            };
            db.WorkoutRecommendations.Add(recommendation);
        }
        else
        {
            db.WorkoutSessions.RemoveRange(recommendation.Sessions);
            recommendation.Sessions.Clear();
        }

        recommendation.Revision += 1;
        var tokens = await ApplySpecAsync(recommendation, metric, source.Goal, spec, health, history, member.FullName, changes, now);
        AiMembershipQuota.Record(db, allowance, AiMembershipQuota.Regenerate, tokens, now);
        var log = AddLog(member, "Yêu cầu tạo lại giáo án AI", changes, now);
        await db.SaveChangesAsync();
        log.EntityId = recommendation.RecommendationId;
        await db.SaveChangesAsync();
        recommendation.BodyMetric = metric;

        return new WorkoutPlanResponse(
            recommendation.RecommendationId.ToString(),
            ToPlan(recommendation),
            $"Đã nhận yêu cầu tạo lại giáo án. recommendationId = {recommendation.RecommendationId}. Gọi decision với editRequired=false để lưu lịch mới. {AiMembershipQuota.RemainingText(allowance, tokens, countedRegeneration: true)}",
            ToLogDto(log, member.FullName));
    }

    // ===== View Daily Exercise Routine =====
    public async Task<DailyRoutineDto> ViewRoutineAsync(string memberUserId)
    {
        var member = await FindActiveMemberAsync(memberUserId);
        await AiMembershipQuota.LoadAsync(db, member.UserId);
        var plan = await db.WorkoutRecommendations
            .AsNoTracking()
            .Where(item => item.UserId == member.UserId && item.Status == "saved")
            .OrderByDescending(item => item.RecommendationId)
            .FirstOrDefaultAsync()
            ?? throw new InvalidOperationException("Chưa có giáo án được lưu. Hãy chọn Edit Required = No.");

        var today = DateOnly.FromDateTime(DateTime.Today);
        var items = await db.PersonalExercises
            .AsNoTracking()
            .Where(item => item.RecommendationId == plan.RecommendationId
                && item.UserId == member.UserId
                && item.Status == "scheduled"
                && item.ExerciseDate >= today)
            .OrderBy(item => item.ExerciseDate)
            .ThenBy(item => item.StartTime)
            .ToListAsync();
        var todayItems = items.Where(item => item.ExerciseDate == today).Select(ToExercise).ToList();
        var upcoming = items.Where(item => item.ExerciseDate > today).Select(ToExercise).ToList();
        var message = todayItems.Count > 0
            ? $"Hôm nay có {todayItems.Count} bài. Còn {upcoming.Count} buổi trên lịch cá nhân."
            : upcoming.Count == 0
                ? "Lịch cá nhân chưa có buổi tập nào từ hôm nay trở đi."
                : $"Hôm nay không có buổi tập. Buổi gần nhất là {upcoming[0].Date:dd/MM/yyyy}.";

        return new DailyRoutineDto(
            plan.RecommendationId.ToString(),
            plan.PlanName,
            today,
            message,
            todayItems,
            upcoming);
    }

    private async Task<WorkoutDecisionResponse> SaveAndSyncAsync(UserAccount member, AiWorkoutRecommendation recommendation, DateTime now)
    {
        var today = DateOnly.FromDateTime(now);
        var previous = await db.WorkoutRecommendations
            .Where(item => item.UserId == member.UserId && item.Status == "saved")
            .ToListAsync();
        var previousIds = previous.Select(item => item.RecommendationId).ToList();
        if (previousIds.Count > 0)
        {
            var future = await db.PersonalExercises
                .Where(item => previousIds.Contains(item.RecommendationId)
                    && item.ExerciseDate >= today
                    && item.Status == "scheduled")
                .ToListAsync();
            db.PersonalExercises.RemoveRange(future);
            foreach (var item in previous)
            {
                item.Status = "archived";
                item.UpdatedAt = now;
            }
        }

        var description = recommendation.AnalysisSummary + "\n\n" + string.Join(
            "\n",
            recommendation.Sessions.OrderBy(item => item.DayIndex)
                .Select(item => $"{item.WeekdayName}: {item.Title} ({item.DurationMinutes} phút, {item.Intensity}). {item.Exercises}"));
        var trainingPlan = new TrainingPlan
        {
            CreatedByUserId = member.UserId,
            PlanName = recommendation.PlanName,
            Description = description,
            DurationWeeks = recommendation.DurationWeeks,
            CreatedAt = now,
        };
        recommendation.TrainingPlan = trainingPlan;
        recommendation.Status = "saved";
        recommendation.UpdatedAt = now;
        db.TrainingPlans.Add(trainingPlan);

        var busy = await (
            from enrollment in db.ClassEnrollments.AsNoTracking()
            join session in db.ClassSessions.AsNoTracking() on enrollment.ClassId equals session.ClassId
            where enrollment.UserId == member.UserId
                && enrollment.Status == "enrolled"
                && session.Status != "cancelled"
                && session.SessionDate >= today
            select session.SessionDate).Distinct().ToListAsync();
        var calendar = BuildCalendar(member.UserId, recommendation, today.AddDays(1), busy.ToHashSet(), out var moved, out var skipped);
        db.PersonalExercises.AddRange(calendar);
        var log = AddLog(member, "Lưu giáo án AI", $"Đồng bộ {calendar.Count} buổi vào lịch cá nhân.", now);
        await db.SaveChangesAsync();
        log.EntityId = recommendation.RecommendationId;
        await db.SaveChangesAsync();

        var sync = new CalendarSyncDto(
            calendar.Count,
            calendar.Count == 0 ? today : calendar.Min(item => item.ExerciseDate),
            calendar.Count == 0 ? today : calendar.Max(item => item.ExerciseDate),
            moved,
            skipped,
            calendar.Count == 0
                ? "Không xếp được buổi nào lên lịch cá nhân."
                : $"Đã đồng bộ {calendar.Count} buổi vào lịch cá nhân.");

        return new WorkoutDecisionResponse(
            recommendation.RecommendationId.ToString(),
            true,
            "Đã lưu giáo án vào tài khoản học viên và đồng bộ lịch. Bước tiếp theo: View Daily Exercise Routine.",
            ToPlan(recommendation),
            sync,
            ToLogDto(log, member.FullName));
    }

    private async Task<TrainingHistory> CollectHistoryAsync(int userId)
    {
        var sessions = await (
            from enrollment in db.ClassEnrollments.AsNoTracking()
            join trainingClass in db.Classes.AsNoTracking() on enrollment.ClassId equals trainingClass.ClassId
            join course in db.Courses.AsNoTracking() on trainingClass.CourseId equals course.CourseId
            join session in db.ClassSessions.AsNoTracking() on trainingClass.ClassId equals session.ClassId
            where enrollment.UserId == userId && enrollment.Status == "enrolled" && session.Status != "cancelled"
            orderby session.SessionDate, session.StartTime
            select new
            {
                course.CourseName,
                session.SessionDate,
                session.StartTime,
                session.EndTime,
                session.SessionNo,
            }).ToListAsync();

        var scheduleLines = sessions
            .GroupBy(item => item.CourseName)
            .Select(group =>
            {
                var times = string.Join("; ", group.Take(6).Select(item =>
                    $"{item.SessionDate:dd/MM/yyyy} {WeekdayName(item.SessionDate.DayOfWeek)} {item.StartTime:HH:mm}-{item.EndTime:HH:mm} {ClassSessionPlanner.SessionTitle(item.SessionNo)}"));
                return $"{group.Key}: {group.Count()} buổi vào {times}";
            })
            .ToList();
        var classSchedule = scheduleLines.Count == 0
            ? "Học viên chưa có buổi học môn nào."
            : string.Join(" | ", scheduleLines);

        var histories = await (
            from history in db.CoachTrainingHistories.AsNoTracking()
            join trainingClass in db.Classes.AsNoTracking() on history.ClassId equals trainingClass.ClassId
            join course in db.Courses.AsNoTracking() on trainingClass.CourseId equals course.CourseId
            join coach in db.UserAccounts.AsNoTracking() on history.CoachUserId equals coach.UserId
            where history.MemberUserId == userId
            orderby history.RecordedAt descending
            select new { course.CourseName, coach.FullName, history.RecordedAt, history.Content })
            .Take(8)
            .ToListAsync();
        var summary = histories.Count == 0
            ? "Coach chưa nhập lịch sử tập."
            : string.Join(" | ", histories.Select(item =>
                $"{item.CourseName}, {item.FullName}, {item.RecordedAt:dd/MM/yyyy}: {item.Content}"));
        var weekdays = sessions.Select(item => item.SessionDate.DayOfWeek).Distinct().ToList();
        return new TrainingHistory(
            summary,
            classSchedule,
            sessions.Select(item => item.CourseName).Distinct().Count(),
            sessions.Count,
            weekdays,
            histories.Count);
    }

    public async Task<CoachTrainingHistoryListDto> ListCoachHistoryAsync(string coachUserId)
    {
        var coach = await FindActiveCoachAsync(coachUserId);
        var classes = await CoachClassesAsync(coach.UserId);
        var histories = await HistoriesOfCoachAsync(coach.UserId);
        return new CoachTrainingHistoryListDto(coach.UserId.ToString(), coach.FullName, classes, histories);
    }

    public async Task<SaveCoachTrainingHistoryResponse> SaveCoachHistoryAsync(string coachUserId, CoachTrainingHistoryRequest request)
    {
        var coach = await FindActiveCoachAsync(coachUserId);
        if (!int.TryParse(request.MemberUserId, out var memberId))
        {
            throw new KeyNotFoundException("Không tìm thấy học viên.");
        }

        var content = RequireText(request.Content, "Nhập lịch sử tập của học viên.", 2000);
        var trainingClass = await db.Classes
            .Include(item => item.Course)
            .FirstOrDefaultAsync(item => item.ClassId == request.ClassId && item.CoachUserId == coach.UserId)
            ?? throw new InvalidOperationException("Coach chỉ nhập lịch sử tập cho lớp mình phụ trách.");
        var enrolled = await db.ClassEnrollments.AnyAsync(item =>
            item.ClassId == trainingClass.ClassId && item.UserId == memberId && item.Status == "enrolled");
        if (!enrolled)
        {
            throw new InvalidOperationException("Học viên chưa ghi danh lớp này.");
        }

        var member = await db.UserAccounts
            .Include(user => user.Role)
            .FirstOrDefaultAsync(user => user.UserId == memberId);
        if (member is null || member.Role?.RoleCode != "MEMBER")
        {
            throw new KeyNotFoundException("Không tìm thấy học viên.");
        }

        var now = DateTime.Now;
        var row = new CoachTrainingHistory
        {
            MemberUserId = member.UserId,
            CoachUserId = coach.UserId,
            ClassId = trainingClass.ClassId,
            Content = content,
            RecordedAt = now,
        };
        db.CoachTrainingHistories.Add(row);
        var log = AddLog(coach, "Nhập lịch sử tập", $"{coach.FullName} nhập lịch sử tập của {member.FullName} cho {trainingClass.Course?.CourseName}.", now);
        await db.SaveChangesAsync();
        var history = new CoachTrainingHistoryDto(
            row.TrainingHistoryId.ToString(),
            member.UserId.ToString(),
            member.FullName,
            trainingClass.ClassId,
            trainingClass.Course?.CourseName ?? "",
            row.Content,
            row.RecordedAt);
        return new SaveCoachTrainingHistoryResponse(history, "Đã lưu lịch sử tập. Học viên có thể tạo hoặc tạo lại giáo án AI.", ToLogDto(log, coach.FullName));
    }

    private async Task<IReadOnlyList<CoachClassOptionDto>> CoachClassesAsync(int coachUserId)
    {
        var rows = await (
            from trainingClass in db.Classes.AsNoTracking()
            join course in db.Courses.AsNoTracking() on trainingClass.CourseId equals course.CourseId
            join enrollment in db.ClassEnrollments.AsNoTracking() on trainingClass.ClassId equals enrollment.ClassId
            join member in db.UserAccounts.AsNoTracking() on enrollment.UserId equals member.UserId
            where trainingClass.CoachUserId == coachUserId && enrollment.Status == "enrolled"
            orderby course.CourseName, member.FullName
            select new
            {
                trainingClass.ClassId,
                course.CourseName,
                trainingClass.ClassName,
                member.UserId,
                member.FullName,
            }).ToListAsync();
        return rows
            .GroupBy(item => new { item.ClassId, item.CourseName, item.ClassName })
            .Select(group => new CoachClassOptionDto(
                group.Key.ClassId,
                group.Key.CourseName,
                group.Key.ClassName,
                group.Select(item => new CoachMemberOptionDto(item.UserId.ToString(), item.FullName)).ToList()))
            .ToList();
    }

    private async Task<IReadOnlyList<CoachTrainingHistoryDto>> HistoriesOfCoachAsync(int coachUserId)
    {
        return await (
            from history in db.CoachTrainingHistories.AsNoTracking()
            join member in db.UserAccounts.AsNoTracking() on history.MemberUserId equals member.UserId
            join trainingClass in db.Classes.AsNoTracking() on history.ClassId equals trainingClass.ClassId
            join course in db.Courses.AsNoTracking() on trainingClass.CourseId equals course.CourseId
            where history.CoachUserId == coachUserId
            orderby history.RecordedAt descending
            select new CoachTrainingHistoryDto(
                history.TrainingHistoryId.ToString(),
                member.UserId.ToString(),
                member.FullName,
                trainingClass.ClassId,
                course.CourseName,
                history.Content,
                history.RecordedAt))
            .Take(30)
            .ToListAsync();
    }

    private static void RequireCoachHistory(TrainingHistory history)
    {
        if (history.EntryCount == 0)
        {
            throw new InvalidOperationException("Coach chưa nhập lịch sử tập cho học viên này. Coach phụ trách lớp hãy ghi lịch sử tập trước khi tạo giáo án.");
        }
    }

    private static string DescribeHealth(UserAccount member, MemberBodyMetric metric)
    {
        var gender = string.IsNullOrWhiteSpace(member.Gender) ? "chưa cập nhật" : member.Gender;
        var age = AgeOf(member.DateOfBirth);
        var ageText = age is null ? "chưa có ngày sinh" : $"{age} tuổi";
        return $"Chiều cao {metric.HeightCm.ToString("0.0", CultureInfo.InvariantCulture)} cm, cân nặng {metric.WeightKg.ToString("0.0", CultureInfo.InvariantCulture)} kg, BMI {metric.Bmi.ToString("0.0", CultureInfo.InvariantCulture)} ({metric.BmiCategory}). Giới tính {gender}, {ageText}.";
    }

    private static PlanSpec BuildSpec(
        string goal,
        int sessions,
        int minutes,
        decimal bmi,
        TrainingHistory history,
        string? changes,
        TimeOnly startTime)
    {
        var focus = DetectFocus(Fold(goal));
        string? safety = null;
        if (bmi >= 30 && focus == "suc_ben")
        {
            focus = "giam_can";
            safety = "BMI béo phì nên chuyển bài sức bền sang bài tác động thấp.";
        }
        else if (bmi < 18.5m && focus == "giam_can")
        {
            focus = "tang_co";
            safety = "BMI thiếu cân, không lập giáo án giảm cân. Ưu tiên tăng cơ và ăn đủ năng lượng.";
        }

        var intensity = bmi switch
        {
            >= 30 => "Thấp",
            >= 25 or < 18.5m => "Trung bình",
            _ when focus is "suc_ben" or "tang_co" => "Cao",
            _ => "Trung bình",
        };
        var weeks = history.EnrollmentCount > 0 ? 6 : 4;
        if (history.SessionCount >= 4)
        {
            weeks = Math.Max(weeks, 8);
        }

        if (bmi >= 30)
        {
            weeks = Math.Min(weeks, 6);
        }

        var spec = new PlanSpec(focus, intensity, sessions, minutes, Math.Clamp(weeks, 2, 12), startTime, safety);
        return string.IsNullOrWhiteSpace(changes) ? spec : Adjust(spec, changes);
    }

    private static int AdjustWeeks(int currentWeeks, string changes)
    {
        var text = Fold(changes);
        var weeks = currentWeeks;
        if (Has(text, "ngan"))
        {
            weeks -= 2;
        }

        if (Has(text, "dai hon", "keo dai"))
        {
            weeks += 2;
        }

        return Math.Clamp(weeks, 2, 12);
    }

    private static PlanSpec Adjust(PlanSpec spec, string changes)
    {
        var text = Fold(changes);
        var sessions = spec.SessionsPerWeek;
        var minutes = spec.SessionMinutes;
        var weeks = spec.DurationWeeks;
        var intensity = spec.Intensity;
        var start = spec.StartTime;
        if (Has(text, "them buoi", "them ngay", "tap them"))
        {
            sessions++;
        }

        if (Has(text, "bot ", "bot buoi", "it buoi", "it ngay", "giam buoi", "giam ngay"))
        {
            sessions--;
        }

        if (Has(text, "nhe", "de hon", "chan thuong", "tac dong thap"))
        {
            intensity = "Thấp";
            minutes -= 10;
        }

        if (Has(text, "ngan"))
        {
            weeks -= 2;
            minutes -= 10;
        }

        if (Has(text, "dai hon", "keo dai"))
        {
            weeks += 2;
        }

        if (Has(text, "buoi sang", "tap sang", "sang som"))
        {
            start = new TimeOnly(6, 30);
        }
        else if (Has(text, "buoi trua", "tap trua"))
        {
            start = new TimeOnly(12, 0);
        }
        else if (Has(text, "buoi toi", "tap toi"))
        {
            start = new TimeOnly(19, 0);
        }

        return spec with
        {
            SessionsPerWeek = Math.Clamp(sessions, 2, 6),
            SessionMinutes = Math.Clamp(minutes, 20, 90),
            DurationWeeks = Math.Clamp(weeks, 2, 12),
            Intensity = intensity,
            StartTime = start,
        };
    }

    private async Task<int> ApplySpecAsync(
        AiWorkoutRecommendation recommendation,
        MemberBodyMetric metric,
        string goal,
        PlanSpec spec,
        string health,
        TrainingHistory history,
        string memberName,
        string? changes,
        DateTime now)
    {
        var days = PickDays(spec.SessionsPerWeek, history.ClassWeekdays);
        var generated = await gemini.GenerateAsync(new WorkoutGenerationRequest(
            memberName,
            health,
            history.Summary,
            history.ClassSchedule,
            goal,
            spec.SessionsPerWeek,
            spec.SessionMinutes,
            spec.DurationWeeks,
            spec.Intensity,
            spec.StartTime.ToString("HH:mm"),
            days.Select(WeekdayName).ToArray(),
            spec.SafetyNote,
            changes));
        recommendation.BodyMetricId = metric.BodyMetricId;
        recommendation.BodyMetric = metric;
        recommendation.Goal = goal;
        recommendation.SessionsPerWeek = spec.SessionsPerWeek;
        recommendation.SessionMinutes = spec.SessionMinutes;
        recommendation.ChangeNote = changes;
        recommendation.HealthSummary = health;
        recommendation.TrainingHistorySummary = history.Summary;
        recommendation.AnalysisSummary = generated.Analysis;
        var scheduleNote = $" Lịch môn: {history.ClassSchedule}";
        recommendation.AnalysisRequest = changes is null
            ? $"{gemini.ProviderLabel}: Phân tích chỉ số sức khỏe và BMI cho {memberName}: {health} Mục tiêu \"{goal}\", {spec.SessionsPerWeek} buổi/tuần, {spec.SessionMinutes} phút/buổi.{scheduleNote}"
            : $"{gemini.ProviderLabel}: Yêu cầu phân tích mới sau khi học viên sửa giáo án: {changes}.{scheduleNote}";
        recommendation.PlanName = generated.PlanName;
        recommendation.DurationWeeks = spec.DurationWeeks;
        recommendation.PreferredStartTime = spec.StartTime;
        recommendation.Status = "proposed";
        recommendation.UpdatedAt = now;
        for (var index = 0; index < days.Length; index++)
        {
            var session = generated.Sessions[index];
            recommendation.Sessions.Add(new AiWorkoutSession
            {
                DayIndex = index + 1,
                Weekday = (int)days[index],
                WeekdayName = WeekdayName(days[index]),
                Title = session.Title,
                DurationMinutes = spec.SessionMinutes,
                Intensity = session.Intensity,
                Exercises = session.Exercises,
            });
        }

        return generated.TotalTokens;
    }

    private static List<PersonalExercise> BuildCalendar(
        int userId,
        AiWorkoutRecommendation recommendation,
        DateOnly start,
        HashSet<DateOnly> busy,
        out int moved,
        out int skipped)
    {
        moved = 0;
        skipped = 0;
        var end = start.AddDays(recommendation.DurationWeeks * 7 - 1);
        var occupied = new HashSet<DateOnly>(busy);
        var result = new List<PersonalExercise>();
        for (var date = start; date <= end; date = date.AddDays(1))
        {
            var session = recommendation.Sessions.FirstOrDefault(item => item.Weekday == (int)date.DayOfWeek);
            if (session is null)
            {
                continue;
            }

            var placed = date;
            var didMove = false;
            while (occupied.Contains(placed) && placed <= end.AddDays(2))
            {
                placed = placed.AddDays(1);
                didMove = true;
            }

            if (occupied.Contains(placed))
            {
                skipped++;
                continue;
            }

            if (didMove)
            {
                moved++;
            }

            occupied.Add(placed);
            result.Add(new PersonalExercise
            {
                UserId = userId,
                RecommendationId = recommendation.RecommendationId,
                ExerciseDate = placed,
                StartTime = recommendation.PreferredStartTime,
                EndTime = recommendation.PreferredStartTime.Add(TimeSpan.FromMinutes(session.DurationMinutes)),
                Title = session.Title,
                Detail = $"{session.Intensity}. {session.Exercises}",
                Status = "scheduled",
            });
        }

        return result;
    }

    private static DayOfWeek[] PickDays(int count, IReadOnlyList<DayOfWeek> classWeekdays)
    {
        DayOfWeek[] order = [DayOfWeek.Monday, DayOfWeek.Wednesday, DayOfWeek.Friday, DayOfWeek.Tuesday, DayOfWeek.Thursday, DayOfWeek.Saturday, DayOfWeek.Sunday];
        var blocked = classWeekdays.ToHashSet();
        var free = order.Where(day => !blocked.Contains(day)).ToList();
        var chosen = new List<DayOfWeek>();
        foreach (var day in free.Concat(order))
        {
            if (chosen.Count == count)
            {
                break;
            }

            if (!chosen.Contains(day))
            {
                chosen.Add(day);
            }
        }

        return chosen
            .OrderBy(day => day == DayOfWeek.Sunday ? 7 : (int)day)
            .ToArray();
    }

    private async Task<MemberBodyMetric?> LatestBodyAsync(int userId) =>
        await db.BodyMetrics
            .Where(item => item.UserId == userId)
            .OrderByDescending(item => item.BodyMetricId)
            .FirstOrDefaultAsync();

    private async Task<UserAccount> FindActiveMemberAsync(string memberUserId)
    {
        if (!int.TryParse(memberUserId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy học viên.");
        }

        var member = await db.UserAccounts
            .Include(user => user.Role)
            .FirstOrDefaultAsync(user => user.UserId == id);
        if (member is null || member.Role?.RoleCode != "MEMBER")
        {
            throw new KeyNotFoundException("Không tìm thấy học viên.");
        }

        if (member.Status != "active")
        {
            throw new InvalidOperationException("Tài khoản học viên không hoạt động.");
        }

        return member;
    }

    private async Task<UserAccount> FindActiveCoachAsync(string coachUserId)
    {
        if (!int.TryParse(coachUserId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy huấn luyện viên.");
        }

        var coach = await db.UserAccounts
            .Include(user => user.Role)
            .FirstOrDefaultAsync(user => user.UserId == id);
        if (coach is null || coach.Role?.RoleCode != "COACH")
        {
            throw new KeyNotFoundException("Không tìm thấy huấn luyện viên.");
        }

        if (coach.Status != "active")
        {
            throw new InvalidOperationException("Tài khoản huấn luyện viên không hoạt động.");
        }

        return coach;
    }

    private ActivityLog AddLog(UserAccount member, string action, string detail, DateTime at)
    {
        var log = new ActivityLog
        {
            ActorUserId = member.UserId,
            Action = action,
            EntityName = "ai_workout_recommendation",
            Detail = detail,
            CreatedAt = at,
        };
        db.ActivityLogs.Add(log);
        return log;
    }

    private static WorkoutPlanDto ToPlan(AiWorkoutRecommendation row)
    {
        var sessions = row.Sessions.OrderBy(item => item.DayIndex).ToList();
        var generated = $"{row.PlanName}. {row.DurationWeeks} tuần, {row.SessionsPerWeek} buổi/tuần, {row.SessionMinutes} phút/buổi, bắt đầu lúc {row.PreferredStartTime:HH:mm}. "
            + string.Join(" ", sessions.Select(item => $"{item.WeekdayName}: {item.Title} ({item.Intensity})."));
        return new WorkoutPlanDto(
            row.RecommendationId.ToString(),
            ProviderOf(row.AnalysisRequest),
            row.Revision,
            row.Status,
            row.PlanName,
            row.DurationWeeks,
            row.BodyMetric?.Bmi ?? 0,
            row.BodyMetric?.BmiCategory ?? "",
            row.Goal,
            row.SessionsPerWeek,
            row.SessionMinutes,
            row.PreferredStartTime.ToString("HH:mm"),
            row.ChangeNote,
            sessions.Select(item => new WorkoutSessionDto(
                item.DayIndex,
                item.WeekdayName,
                item.Title,
                item.DurationMinutes,
                item.Intensity,
                item.Exercises)).ToList(),
            new AnalysisPipelineDto(
                row.HealthSummary,
                row.TrainingHistorySummary,
                row.AnalysisRequest,
                row.AnalysisSummary,
                generated));
    }

    private static BodyMetricDto ToBodyDto(MemberBodyMetric metric) =>
        new(
            metric.BodyMetricId.ToString(),
            metric.HeightCm,
            metric.WeightKg,
            metric.Bmi,
            metric.BmiCategory,
            metric.RecordedAt);

    private static DailyExerciseDto ToExercise(PersonalExercise item) =>
        new(
            item.PersonalExerciseId.ToString(),
            item.ExerciseDate,
            item.StartTime.ToString("HH:mm"),
            item.EndTime.ToString("HH:mm"),
            item.Title,
            item.Detail,
            item.Status);

    private static ActivityLogDto ToLogDto(ActivityLog log, string memberName) =>
        new(
            log.AuditLogId == 0 ? Guid.NewGuid().ToString() : log.AuditLogId.ToString(),
            log.CreatedAt,
            log.EntityName,
            memberName,
            log.EntityId?.ToString() ?? "",
            memberName,
            log.Action,
            log.Detail ?? "",
            null);

    private static string RequireText(string? value, string message, int max)
    {
        var text = value?.Trim() ?? "";
        if (text.Length == 0)
        {
            throw new InvalidOperationException(message);
        }

        if (text.Length > max)
        {
            throw new InvalidOperationException($"Nội dung tối đa {max} ký tự.");
        }

        return text;
    }

    private static int? AgeOf(DateOnly? dateOfBirth)
    {
        if (dateOfBirth is null)
        {
            return null;
        }

        var today = DateOnly.FromDateTime(DateTime.Today);
        var age = today.Year - dateOfBirth.Value.Year;
        if (dateOfBirth > today.AddYears(-age))
        {
            age--;
        }

        return age < 0 ? null : age;
    }

    private static string CategoryOf(decimal bmi) => bmi switch
    {
        < 18.5m => "Thiếu cân",
        < 25m => "Bình thường",
        < 30m => "Thừa cân",
        _ => "Béo phì",
    };

    private static string DetectFocus(string foldedGoal)
    {
        if (Has(foldedGoal, "giam can", "giam mo", "weight", "beo", "calo"))
        {
            return "giam_can";
        }

        if (Has(foldedGoal, "tang co", "co bap", "muscle", "gym", "suc manh"))
        {
            return "tang_co";
        }

        if (Has(foldedGoal, "suc ben", "chay bo", "cardio", "marathon"))
        {
            return "suc_ben";
        }

        if (Has(foldedGoal, "deo dai", "linh hoat", "yoga", "gian co"))
        {
            return "linh_hoat";
        }

        return "suc_khoe";
    }

    private static string ProviderOf(string analysisRequest)
    {
        const string marker = "Google Gemini (";
        var start = analysisRequest.IndexOf(marker, StringComparison.Ordinal);
        if (start < 0)
        {
            return "Chưa dùng API AI";
        }

        var end = analysisRequest.IndexOf(')', start);
        return end < 0 ? "Google Gemini" : analysisRequest[start..(end + 1)];
    }

    private static string WeekdayName(DayOfWeek day) => day switch
    {
        DayOfWeek.Monday => "Thứ 2",
        DayOfWeek.Tuesday => "Thứ 3",
        DayOfWeek.Wednesday => "Thứ 4",
        DayOfWeek.Thursday => "Thứ 5",
        DayOfWeek.Friday => "Thứ 6",
        DayOfWeek.Saturday => "Thứ 7",
        _ => "Chủ nhật",
    };

    private static string Fold(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "";
        }

        var text = value.Trim().ToLowerInvariant().Replace('đ', 'd');
        var decomposed = text.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposed.Length);
        foreach (var character in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
            {
                builder.Append(character);
            }
        }

        return builder.ToString().Normalize(NormalizationForm.FormC);
    }

    private static bool Has(string folded, params string[] keys) => keys.Any(folded.Contains);

    private sealed record TrainingHistory(
        string Summary,
        string ClassSchedule,
        int EnrollmentCount,
        int SessionCount,
        IReadOnlyList<DayOfWeek> ClassWeekdays,
        int EntryCount);

    private sealed record PlanSpec(
        string Focus,
        string Intensity,
        int SessionsPerWeek,
        int SessionMinutes,
        int DurationWeeks,
        TimeOnly StartTime,
        string? SafetyNote);
}
