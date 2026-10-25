using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Main flow: Coach Course Management.
// View Assigned Classes → Select Class → Display Class Information
// → Evaluate Student Progress | Manage Course Assignment | Take Attendance → Record Log.
public class CoachCourseFlowService(AppDbContext db, CoachClassAccess access, CurrentActor actor)
{
    private static readonly HashSet<string> AttendanceStatuses = new(StringComparer.Ordinal) { "present", "late", "absent" };

    public async Task<IReadOnlyList<CoachClassListItemDto>> ListAsync()
    {
        if (actor.UserId == 0)
        {
            throw new RegistrationException("Phiên đăng nhập không hợp lệ.");
        }

        return await db.Classes.AsNoTracking()
            .Where(item => item.CoachUserId == actor.UserId)
            .OrderByDescending(item => item.StartDate)
            .ThenBy(item => item.ClassName)
            .Select(item => new CoachClassListItemDto(
                item.ClassId.ToString(),
                item.ClassName,
                item.Status,
                item.Course!.CourseName,
                item.Course.Sport!.SportName,
                item.StartDate,
                item.EndDate,
                item.Enrollments.Count(enrollment => enrollment.Status == "enrolled"),
                item.Sessions.Count(session => session.Status != "cancelled")))
            .ToListAsync();
    }

    public async Task<CoachClassDetailDto> DetailAsync(string classId)
    {
        var owned = await access.RequireAsync(classId);
        var item = await db.Classes.AsNoTracking()
            .Include(row => row.Course)!.ThenInclude(course => course!.Sport)
            .Include(row => row.Room)
            .Include(row => row.Schedules).ThenInclude(schedule => schedule.TimeSlot)
            .FirstAsync(row => row.ClassId == owned.ClassId);

        var roster = await db.ClassEnrollments.AsNoTracking()
            .Where(enrollment => enrollment.ClassId == owned.ClassId && enrollment.Status == "enrolled")
            .Join(db.UserAccounts.AsNoTracking(), enrollment => enrollment.UserId, user => user.UserId, (enrollment, user) => new { user.UserId, user.FullName })
            .OrderBy(row => row.FullName)
            .Select(row => new CoachRosterDto(row.UserId.ToString(), row.FullName))
            .ToListAsync();

        var sessions = await db.ClassSessions.AsNoTracking()
            .Where(session => session.ClassId == owned.ClassId)
            .OrderBy(session => session.SessionDate)
            .ThenBy(session => session.StartTime)
            .Select(session => new CoachSessionLineDto(
                session.SessionId.ToString(),
                session.SessionNo,
                session.SessionDate,
                session.StartTime,
                session.EndTime,
                session.Status,
                session.Note))
            .ToListAsync();

        var schedules = item.Schedules
            .OrderBy(schedule => schedule.Weekday)
            .ThenBy(schedule => schedule.TimeSlot!.StartTime)
            .Select(schedule => new CoachScheduleLineDto(
                schedule.Weekday,
                ClassSessionPlanner.WeekdayName(schedule.Weekday),
                schedule.TimeSlot!.Label ?? $"{schedule.TimeSlot.StartTime:HH:mm}–{schedule.TimeSlot.EndTime:HH:mm}"))
            .ToList();

        return new CoachClassDetailDto(
            item.ClassId.ToString(),
            item.ClassName,
            item.Status,
            item.Course!.CourseName,
            item.Course.Sport!.SportName,
            item.Room?.RoomName,
            item.StartDate,
            item.EndDate,
            item.Capacity,
            roster.Count,
            schedules,
            roster,
            sessions);
    }

    public async Task<AttendanceSheetDto> AttendanceAsync(string classId, string sessionId)
    {
        var owned = await access.RequireAsync(classId);
        var session = await RequireSessionAsync(owned.ClassId, sessionId);
        var rows = await RosterMarksAsync(owned.ClassId, session.SessionId);
        return ToSheet(session, rows);
    }

    public async Task<AttendanceSheetDto> SaveAttendanceAsync(string classId, string sessionId, SubmitAttendanceRequest request)
    {
        var owned = await access.RequireAsync(classId);
        var session = await RequireSessionAsync(owned.ClassId, sessionId);
        if (session.Status == "cancelled")
        {
            throw new RegistrationException("Buổi đã hủy nên không điểm danh.");
        }

        var roster = await db.ClassEnrollments
            .Where(enrollment => enrollment.ClassId == owned.ClassId && enrollment.Status == "enrolled")
            .Select(enrollment => enrollment.UserId)
            .ToListAsync();
        if (roster.Count == 0)
        {
            throw new RegistrationException("Lớp chưa có học viên để điểm danh.");
        }

        var marks = request.Marks ?? [];
        if (marks.Select(mark => mark.MemberUserId).Distinct(StringComparer.Ordinal).Count() != marks.Count)
        {
            throw new RegistrationException("Mỗi học viên chỉ điểm danh một lần.");
        }

        var parsed = new Dictionary<int, string>();
        foreach (var mark in marks)
        {
            if (!int.TryParse(mark.MemberUserId, out var memberId) || !roster.Contains(memberId))
            {
                throw new RegistrationException("Danh sách điểm danh có học viên không thuộc lớp.");
            }

            var status = mark.Status?.Trim().ToLowerInvariant() ?? "";
            if (!AttendanceStatuses.Contains(status))
            {
                throw new RegistrationException("Trạng thái điểm danh phải là present, late hoặc absent.");
            }

            parsed[memberId] = status;
        }

        if (parsed.Count != roster.Count)
        {
            throw new RegistrationException("Cần điểm danh đủ học viên trong lớp.");
        }

        var now = DateTime.Now;
        var existing = await db.ClassAttendances
            .Where(row => row.SessionId == session.SessionId && roster.Contains(row.UserId))
            .ToListAsync();
        foreach (var memberId in roster)
        {
            var status = parsed[memberId];
            var row = existing.FirstOrDefault(item => item.UserId == memberId);
            if (row is null)
            {
                db.ClassAttendances.Add(new ClassAttendance
                {
                    SessionId = session.SessionId,
                    UserId = memberId,
                    Status = status,
                    CheckInAt = status == "absent" ? null : now,
                });
            }
            else
            {
                row.Status = status;
                row.CheckInAt = status == "absent" ? null : row.CheckInAt ?? now;
            }
        }

        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = actor.UserId,
            Action = Shorten($"Điểm danh {owned.ClassName}", 100),
            EntityName = "session",
            EntityId = session.SessionId,
            Detail = $"Coach điểm danh buổi {session.SessionDate:dd/MM/yyyy} lớp {owned.ClassName}: {parsed.Count} học viên.",
            CreatedAt = now,
        });
        await db.SaveChangesAsync();
        var rows = await RosterMarksAsync(owned.ClassId, session.SessionId);
        return ToSheet(session, rows);
    }

    public async Task<EvaluationSheetDto> EvaluationsAsync(string classId)
    {
        var owned = await access.RequireAsync(classId);
        var students = await EnrolledMembersAsync(owned.ClassId);
        var evaluations = await db.CoachEvaluations.AsNoTracking()
            .Where(item => item.ClassId == owned.ClassId && item.EvaluatorUserId == actor.UserId && item.AssignmentId == null)
            .ToListAsync();
        var byMember = evaluations
            .GroupBy(item => item.EvaluatedUserId)
            .ToDictionary(group => group.Key, group => group.OrderByDescending(item => item.EvaluatedAt).First());
        var rows = students.Select(student =>
        {
            byMember.TryGetValue(student.UserId, out var evaluation);
            return new EvaluationRowDto(
                student.UserId.ToString(),
                student.FullName,
                evaluation?.Score,
                evaluation?.Comment,
                evaluation?.EvaluatedAt);
        }).ToList();
        var (rubric, source) = await RubricAsync(owned.ClassId);
        return new EvaluationSheetDto(rubric, source, rows);
    }

    public async Task<EvaluationSheetDto> SaveEvaluationAsync(string classId, SaveEvaluationRequest request)
    {
        var owned = await access.RequireAsync(classId);
        if (!int.TryParse(request.MemberUserId, out var memberId))
        {
            throw new RegistrationException("Chọn học viên để đánh giá.");
        }

        var enrolled = await db.ClassEnrollments.AnyAsync(item =>
            item.ClassId == owned.ClassId && item.UserId == memberId && item.Status == "enrolled");
        if (!enrolled)
        {
            throw new RegistrationException("Học viên không còn trong lớp.");
        }

        if (memberId == actor.UserId)
        {
            throw new RegistrationException("Không tự đánh giá tài khoản của mình.");
        }

        if (request.Score < 0 || request.Score > 10)
        {
            throw new RegistrationException("Điểm từ 0 đến 10.");
        }

        var comment = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment.Trim();
        if (comment is { Length: > 2000 })
        {
            throw new RegistrationException("Nhận xét tối đa 2000 ký tự.");
        }

        var score = Math.Round(request.Score, 1, MidpointRounding.AwayFromZero);
        var now = DateTime.Now;
        var current = await db.CoachEvaluations
            .Where(item => item.ClassId == owned.ClassId && item.EvaluatorUserId == actor.UserId && item.EvaluatedUserId == memberId && item.AssignmentId == null)
            .OrderByDescending(item => item.EvaluatedAt)
            .FirstOrDefaultAsync();
        if (current is null)
        {
            db.CoachEvaluations.Add(new CoachEvaluation
            {
                ClassId = owned.ClassId,
                EvaluatorUserId = actor.UserId,
                EvaluatedUserId = memberId,
                Score = score,
                Comment = comment,
                EvaluatedAt = now,
            });
        }
        else
        {
            current.Score = score;
            current.Comment = comment;
            current.EvaluatedAt = now;
        }

        await db.SaveChangesAsync();
        return await EvaluationsAsync(classId);
    }

    public async Task<IReadOnlyList<AssignmentItemDto>> AssignmentsAsync(string classId)
    {
        var owned = await access.RequireAsync(classId);
        var sessions = await SessionMapAsync(owned.ClassId);
        var sessionIds = sessions.Keys.ToList();
        var rows = await db.ClassAssignments.AsNoTracking()
            .Where(item => sessionIds.Contains(item.SessionId))
            .OrderBy(item => item.DueAt)
            .ThenBy(item => item.Title)
            .ToListAsync();
        return rows.Select(item => ToAssignment(item, sessions)).ToList();
    }

    public async Task<IReadOnlyList<AssignmentItemDto>> CreateAssignmentAsync(string classId, SaveAssignmentRequest request)
    {
        var owned = await access.RequireAsync(classId);
        var sessionId = await RequireOpenSessionIdAsync(owned.ClassId, request.SessionId);
        var (title, description) = ReadAssignment(request);
        db.ClassAssignments.Add(new ClassAssignment
        {
            SessionId = sessionId,
            Title = title,
            Description = description,
            DueAt = request.DueAt,
        });
        await db.SaveChangesAsync();
        return await AssignmentsAsync(classId);
    }

    public async Task<IReadOnlyList<AssignmentItemDto>> UpdateAssignmentAsync(string classId, string assignmentId, SaveAssignmentRequest request)
    {
        var owned = await access.RequireAsync(classId);
        if (!int.TryParse(assignmentId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy bài tập.");
        }

        var sessions = await SessionMapAsync(owned.ClassId);
        var sessionIds = sessions.Keys.ToList();
        var item = await db.ClassAssignments.FirstOrDefaultAsync(row => row.AssignmentId == id && sessionIds.Contains(row.SessionId))
            ?? throw new KeyNotFoundException("Không tìm thấy bài tập.");
        var sessionId = await RequireOpenSessionIdAsync(owned.ClassId, request.SessionId);
        var (title, description) = ReadAssignment(request);
        item.SessionId = sessionId;
        item.Title = title;
        item.Description = description;
        item.DueAt = request.DueAt;
        await db.SaveChangesAsync();
        return await AssignmentsAsync(classId);
    }

    public async Task<IReadOnlyList<AssignmentItemDto>> DeleteAssignmentAsync(string classId, string assignmentId)
    {
        var owned = await access.RequireAsync(classId);
        if (!int.TryParse(assignmentId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy bài tập.");
        }

        var sessionIds = await db.ClassSessions.AsNoTracking()
            .Where(session => session.ClassId == owned.ClassId)
            .Select(session => session.SessionId)
            .ToListAsync();
        var item = await db.ClassAssignments.FirstOrDefaultAsync(row => row.AssignmentId == id && sessionIds.Contains(row.SessionId))
            ?? throw new KeyNotFoundException("Không tìm thấy bài tập.");
        var used = await db.CoachEvaluations.AnyAsync(evaluation => evaluation.AssignmentId == item.AssignmentId);
        if (used)
        {
            throw new RegistrationException("Bài tập đã có đánh giá nên không xóa.");
        }

        db.ClassAssignments.Remove(item);
        await db.SaveChangesAsync();
        return await AssignmentsAsync(classId);
    }

    private async Task<ClassSession> RequireSessionAsync(int classId, string sessionId)
    {
        if (!int.TryParse(sessionId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy buổi học.");
        }

        return await db.ClassSessions.AsNoTracking().FirstOrDefaultAsync(session => session.SessionId == id && session.ClassId == classId)
            ?? throw new KeyNotFoundException("Không tìm thấy buổi học.");
    }

    private async Task<int> RequireOpenSessionIdAsync(int classId, string sessionId)
    {
        var session = await RequireSessionAsync(classId, sessionId);
        if (session.Status == "cancelled")
        {
            throw new RegistrationException("Không gắn bài tập vào buổi đã hủy.");
        }

        return session.SessionId;
    }

    private async Task<List<(int UserId, string FullName)>> EnrolledMembersAsync(int classId)
    {
        var rows = await db.ClassEnrollments.AsNoTracking()
            .Where(enrollment => enrollment.ClassId == classId && enrollment.Status == "enrolled")
            .Join(db.UserAccounts.AsNoTracking(), enrollment => enrollment.UserId, user => user.UserId, (enrollment, user) => new { user.UserId, user.FullName })
            .OrderBy(row => row.FullName)
            .ToListAsync();
        return rows.Select(row => (row.UserId, row.FullName)).ToList();
    }

    private async Task<List<AttendanceRowDto>> RosterMarksAsync(int classId, int sessionId)
    {
        var members = await EnrolledMembersAsync(classId);
        var marks = await db.ClassAttendances.AsNoTracking()
            .Where(row => row.SessionId == sessionId)
            .ToDictionaryAsync(row => row.UserId, row => row.Status);
        return members
            .Select(member => new AttendanceRowDto(member.UserId.ToString(), member.FullName, marks.GetValueOrDefault(member.UserId)))
            .ToList();
    }

    private async Task<Dictionary<int, ClassSession>> SessionMapAsync(int classId) =>
        await db.ClassSessions.AsNoTracking()
            .Where(session => session.ClassId == classId)
            .ToDictionaryAsync(session => session.SessionId);

    private async Task<(IReadOnlyList<RubricItemDto> Items, string? Source)> RubricAsync(int classId)
    {
        var plans = await db.CoachCoursePlans.AsNoTracking()
            .Include(plan => plan.Rubric)
            .Where(plan => plan.ClassId == classId && (plan.Slot == "draft" || plan.Slot == "published"))
            .ToListAsync();
        var plan = plans.FirstOrDefault(item => item.Slot == "draft") ?? plans.FirstOrDefault(item => item.Slot == "published");
        if (plan is null)
        {
            return ([], null);
        }

        var items = plan.Rubric
            .OrderBy(item => item.SortOrder)
            .Select(item => new RubricItemDto(item.Criterion, item.MaxScore, item.Guidance))
            .ToList();
        return (items, plan.Slot);
    }

    private static AttendanceSheetDto ToSheet(ClassSession session, IReadOnlyList<AttendanceRowDto> rows) =>
        new(session.SessionId.ToString(), session.SessionDate, session.StartTime, session.EndTime, session.Status, rows);

    private static AssignmentItemDto ToAssignment(ClassAssignment item, IReadOnlyDictionary<int, ClassSession> sessions)
    {
        var session = sessions[item.SessionId];
        return new AssignmentItemDto(
            item.AssignmentId.ToString(),
            item.SessionId.ToString(),
            SessionLabel(session),
            item.Title,
            item.Description,
            item.DueAt);
    }

    private static (string Title, string? Description) ReadAssignment(SaveAssignmentRequest request)
    {
        var title = request.Title?.Trim() ?? "";
        if (title.Length == 0 || title.Length > 200)
        {
            throw new RegistrationException("Tiêu đề bài tập từ 1 đến 200 ký tự.");
        }

        var description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        if (description is { Length: > 4000 })
        {
            throw new RegistrationException("Mô tả bài tập tối đa 4000 ký tự.");
        }

        return (title, description);
    }

    internal static string SessionLabel(ClassSession session)
    {
        var number = session.SessionNo is int no ? $"Buổi {no}" : "Buổi học";
        return $"{number} · {session.SessionDate:dd/MM/yyyy} · {session.StartTime:HH:mm}";
    }

    private static string Shorten(string value, int max) => value.Length <= max ? value : value[..max];
}
