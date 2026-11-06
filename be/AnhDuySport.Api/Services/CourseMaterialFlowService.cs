using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

public class CourseMaterialFlowService(AppDbContext db, CurrentActor actor)
{
    public async Task<IReadOnlyList<CourseMaterialDto>> ListAsync()
    {
        var sports = await VisibleSportsAsync();
        var ids = sports.Select(item => item.SportId).ToList();
        var materials = await db.SportCourseMaterials.AsNoTracking()
            .Where(item => ids.Contains(item.SportId))
            .ToListAsync();
        var units = await db.SportCourseUnits.AsNoTracking()
            .Where(item => ids.Contains(item.SportId))
            .OrderBy(item => item.SortOrder)
            .ToListAsync();
        return sports
            .Select(sport => Map(
                sport,
                materials.FirstOrDefault(item => item.SportId == sport.SportId),
                units.Where(item => item.SportId == sport.SportId).ToList()))
            .ToList();
    }

    public async Task<CourseMaterialDto> SaveAsync(int sportId, SaveCourseMaterialRequest request)
    {
        if (actor.Role != "ADMIN")
        {
            throw new InvalidOperationException("Chỉ quản lý trung tâm được sửa giáo trình môn học.");
        }

        var sport = await db.Sports.AsNoTracking().FirstOrDefaultAsync(item => item.SportId == sportId)
            ?? throw new KeyNotFoundException("Không tìm thấy môn học.");
        var units = ReadUnits(request.Units);
        var material = await db.SportCourseMaterials.FirstOrDefaultAsync(item => item.SportId == sportId);
        if (material is null)
        {
            material = new SportCourseMaterial { SportId = sportId };
            db.SportCourseMaterials.Add(material);
        }

        material.SourceName = Read(request.SourceName, 300, "Nguồn");
        material.SourceUrl = Read(request.SourceUrl, 500, "Đường dẫn nguồn");
        material.Note = Read(request.Note, 2000, "Ghi chú nguồn");
        material.UpdatedByUserId = actor.UserId == 0 ? null : actor.UserId;
        material.UpdatedAt = DateTime.UtcNow;
        var existing = await db.SportCourseUnits.Where(item => item.SportId == sportId).ToListAsync();
        db.SportCourseUnits.RemoveRange(existing);
        var order = 1;
        foreach (var unit in units)
        {
            db.SportCourseUnits.Add(new SportCourseUnit
            {
                SportId = sportId,
                SortOrder = order,
                Label = unit.Label,
                Work = unit.Work,
                Review = unit.Review,
            });
            order++;
        }

        await db.SaveChangesAsync();
        return Map(sport, material, units.Select((unit, index) => new SportCourseUnit
        {
            SortOrder = index + 1,
            Label = unit.Label,
            Work = unit.Work,
            Review = unit.Review,
        }).ToList());
    }

    public async Task<(string FileName, byte[] Content)> PdfAsync(int sportId)
    {
        var sport = (await VisibleSportsAsync()).FirstOrDefault(item => item.SportId == sportId)
            ?? throw new KeyNotFoundException("Không tìm thấy giáo trình.");
        var units = await db.SportCourseUnits.AsNoTracking()
            .Where(item => item.SportId == sportId)
            .OrderBy(item => item.SortOrder)
            .ToListAsync();
        return ($"giao-trinh-{sport.SportId}.pdf", CourseMaterialPdf.Render(sport.SportName, units));
    }

    public async Task<string> RaftContextAsync(IReadOnlyCollection<int> sportIds)
    {
        var ids = sportIds.Distinct().ToList();
        var sports = await db.Sports.AsNoTracking()
            .Where(item => ids.Contains(item.SportId))
            .OrderBy(item => item.SportName)
            .ToListAsync();
        var materials = await db.SportCourseMaterials.AsNoTracking()
            .Where(item => ids.Contains(item.SportId))
            .ToListAsync();
        var units = await db.SportCourseUnits.AsNoTracking()
            .Where(item => ids.Contains(item.SportId))
            .OrderBy(item => item.SortOrder)
            .ToListAsync();
        var documents = sports
            .Select(sport => (
                sport.SportName,
                materials.FirstOrDefault(item => item.SportId == sport.SportId)?.SourceName ?? "",
                (IReadOnlyList<(string Label, string Work, string Review)>)units
                    .Where(item => item.SportId == sport.SportId)
                    .Select(item => (item.Label, item.Work, item.Review))
                    .ToList()))
            .ToList();
        return CourseMaterialRaft.Build(documents);
    }

    public async Task<string> RaftForClassSessionAsync(int sportId, int unitNumber)
    {
        var sport = await db.Sports.AsNoTracking().FirstOrDefaultAsync(item => item.SportId == sportId);
        if (sport is null)
        {
            return CourseMaterialRaft.Build([]);
        }

        var sourceName = await db.SportCourseMaterials.AsNoTracking()
            .Where(item => item.SportId == sportId)
            .Select(item => item.SourceName)
            .FirstOrDefaultAsync() ?? "";
        var units = await db.SportCourseUnits.AsNoTracking()
            .Where(item => item.SportId == sportId)
            .OrderBy(item => item.SortOrder)
            .ToListAsync();
        if (units.Count == 0)
        {
            return CourseMaterialRaft.Build([(sport.SportName, sourceName, [])]);
        }

        var index = Math.Clamp(unitNumber, 1, units.Count) - 1;
        var chosen = new List<Models.SportCourseUnit>();
        if (index > 0 && !string.IsNullOrWhiteSpace(units[index].Review))
        {
            chosen.Add(units[index - 1]);
        }

        chosen.Add(units[index]);
        return CourseMaterialRaft.Build([(
            sport.SportName,
            sourceName,
            (IReadOnlyList<(string Label, string Work, string Review)>)chosen
                .Select(item => (item.Label, item.Work, item.Review))
                .ToList())]);
    }

    private async Task<List<Sport>> VisibleSportsAsync()
    {
        var role = actor.Role;
        if (role == "ADMIN")
        {
            return await db.Sports.AsNoTracking().OrderBy(item => item.SportName).ToListAsync();
        }

        if (actor.UserId == 0)
        {
            throw new InvalidOperationException("Phiên đăng nhập không hợp lệ.");
        }

        if (role == "COACH")
        {
            var fromAssignment = db.CoachSports.AsNoTracking()
                .Where(link => link.CoachUserId == actor.UserId)
                .Select(link => link.SportId);
            var fromClasses = db.Classes.AsNoTracking()
                .Where(item => item.CoachUserId == actor.UserId)
                .Select(item => item.Course!.SportId);
            var ids = await fromAssignment.Union(fromClasses).ToListAsync();
            return await db.Sports.AsNoTracking()
                .Where(item => ids.Contains(item.SportId))
                .OrderBy(item => item.SportName)
                .ToListAsync();
        }

        if (role == "MEMBER")
        {
            var ids = await (
                from enrollment in db.ClassEnrollments.AsNoTracking()
                join trainingClass in db.Classes.AsNoTracking() on enrollment.ClassId equals trainingClass.ClassId
                join course in db.Courses.AsNoTracking() on trainingClass.CourseId equals course.CourseId
                where enrollment.UserId == actor.UserId && enrollment.Status == "enrolled"
                select course.SportId).Distinct().ToListAsync();
            return await db.Sports.AsNoTracking()
                .Where(item => ids.Contains(item.SportId))
                .OrderBy(item => item.SportName)
                .ToListAsync();
        }

        throw new InvalidOperationException("Bạn không có quyền xem giáo trình.");
    }

    private static CourseMaterialDto Map(Sport sport, SportCourseMaterial? material, IReadOnlyList<SportCourseUnit> units) =>
        new(
            sport.SportId,
            sport.SportName,
            material?.SourceName ?? "",
            material?.SourceUrl ?? "",
            material?.Note ?? "",
            units.OrderBy(item => item.SortOrder).Select(item => new CourseUnitDto(item.SortOrder, item.Label, item.Work, item.Review)).ToList(),
            material?.UpdatedAt);

    private static List<(string Label, string Work, string Review)> ReadUnits(IReadOnlyList<SaveCourseUnitRequest>? units)
    {
        var rows = units ?? [];
        if (rows.Count > 40)
        {
            throw new InvalidOperationException("Một môn tối đa 40 buổi hoặc mục.");
        }

        var result = new List<(string Label, string Work, string Review)>();
        foreach (var row in rows)
        {
            var label = Read(row.Label, 200, "Tên buổi");
            var work = Read(row.Work, 12000, "Việc cần làm");
            var review = Read(row.Review, 2000, "Ôn tập");
            if (label.Length == 0 && work.Length == 0 && review.Length == 0)
            {
                continue;
            }

            if (label.Length == 0)
            {
                throw new InvalidOperationException("Mỗi buổi cần có tên.");
            }

            result.Add((label, work, review));
        }

        return result;
    }

    private static string Read(string? value, int max, string label)
    {
        var text = value?.Trim() ?? "";
        if (text.Length > max)
        {
            throw new InvalidOperationException($"{label} tối đa {max} ký tự.");
        }

        return text;
    }
}
