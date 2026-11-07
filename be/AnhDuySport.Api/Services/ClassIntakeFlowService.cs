using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Nhận xét buổi đầu khóa. Không chấm điểm và không dùng bản đánh giá tổng môn.
public class ClassIntakeFlowService(AppDbContext db, CoachClassAccess access, CurrentActor actor)
{
    public async Task<IntakeSheetDto> SheetAsync(string classId)
    {
        var owned = await access.RequireAsync(classId);
        return await BuildAsync(owned.ClassId);
    }

    public async Task<IntakeSheetDto> SaveAsync(string classId, SaveIntakeNoteRequest request)
    {
        var owned = await access.RequireAsync(classId);
        var first = await FirstSessionAsync(owned.ClassId)
            ?? throw new RegistrationException("Lớp chưa có buổi đầu khóa.");
        if (!IsTaught(first, DateOnly.FromDateTime(DateTime.Today)))
        {
            throw new RegistrationException("Chỉ nhận xét đầu khóa sau khi buổi đầu tiên đã học.");
        }

        if (!int.TryParse(request.MemberUserId, out var memberId))
        {
            throw new KeyNotFoundException("Không tìm thấy học viên.");
        }

        var enrolled = await db.ClassEnrollments.AnyAsync(item =>
            item.ClassId == owned.ClassId && item.UserId == memberId && item.Status == "enrolled");
        if (!enrolled)
        {
            throw new RegistrationException("Học viên không còn trong lớp này.");
        }

        var comment = request.Comment?.Trim() ?? "";
        if (comment.Length == 0 || comment.Length > 2000)
        {
            throw new RegistrationException("Nhận xét đầu khóa từ 1 đến 2000 ký tự.");
        }

        var note = await db.ClassIntakeNotes.FirstOrDefaultAsync(item =>
            item.ClassId == owned.ClassId && item.MemberUserId == memberId);
        if (note is null)
        {
            note = new ClassIntakeNote { ClassId = owned.ClassId, MemberUserId = memberId };
            db.ClassIntakeNotes.Add(note);
        }

        note.SessionId = first.SessionId;
        note.CoachUserId = actor.UserId;
        note.Comment = comment;
        note.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return await BuildAsync(owned.ClassId);
    }

    private async Task<IntakeSheetDto> BuildAsync(int classId)
    {
        var first = await FirstSessionAsync(classId);
        var canEdit = first is not null && IsTaught(first, DateOnly.FromDateTime(DateTime.Today));
        var reason = first is null
            ? "Lớp chưa có buổi đầu khóa."
            : canEdit ? "" : "Buổi đầu khóa chưa diễn ra nên chưa nhận xét được.";
        var students = await db.ClassEnrollments.AsNoTracking()
            .Where(item => item.ClassId == classId && item.Status == "enrolled")
            .Join(db.UserAccounts.AsNoTracking(), item => item.UserId, user => user.UserId, (item, user) => new { user.UserId, user.FullName })
            .OrderBy(item => item.FullName)
            .ToListAsync();
        var notes = await db.ClassIntakeNotes.AsNoTracking()
            .Where(item => item.ClassId == classId)
            .ToListAsync();
        var rows = students.Select(student => new IntakeStudentDto(
            student.UserId.ToString(),
            student.FullName,
            notes.FirstOrDefault(item => item.MemberUserId == student.UserId)?.Comment ?? "")).ToList();
        return new IntakeSheetDto(
            classId.ToString(),
            first?.SessionId.ToString(),
            first is null ? null : CoachCourseFlowService.SessionLabel(first),
            canEdit,
            reason,
            rows);
    }

    private async Task<ClassSession?> FirstSessionAsync(int classId) =>
        await db.ClassSessions.AsNoTracking()
            .Where(item => item.ClassId == classId && item.Status != "cancelled")
            .OrderBy(item => item.SessionNo)
            .ThenBy(item => item.SessionDate)
            .ThenBy(item => item.StartTime)
            .FirstOrDefaultAsync();

    private static bool IsTaught(ClassSession session, DateOnly today) =>
        session.Status != "cancelled" && (session.Status == "completed" || session.SessionDate < today);
}
