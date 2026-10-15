using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

public class ClassRegistrationFlowService(AppDbContext db)
{
    public async Task<IReadOnlyList<CenterDto>> AccessCentersAsync()
    {
        var centers = await db.Centers
            .AsNoTracking()
            .OrderBy(center => center.CenterName)
            .ToListAsync();

        return centers
            .Select(center => new CenterDto(
                center.CenterId.ToString(),
                center.CenterName,
                center.Address ?? "",
                center.Phone ?? ""))
            .ToList();
    }

    public async Task<IReadOnlyList<SportDto>> AccessSportsAsync(string centerId)
    {
        if (!int.TryParse(centerId, out var id) || !await db.Centers.AnyAsync(center => center.CenterId == id))
        {
            throw new KeyNotFoundException("Không tìm thấy trung tâm.");
        }

        var today = DateOnly.FromDateTime(DateTime.Now);
        var sports = await db.Classes
            .AsNoTracking()
            .Where(item => item.Room != null && item.Room.CenterId == id)
            .Where(item => item.Status == "open" || item.Status == "ongoing")
            .Where(item => item.EndDate == null || item.EndDate >= today)
            .Where(item => item.Course!.Status == "active")
            .Select(item => new
            {
                item.Course!.Sport!.SportId,
                item.Course.Sport.SportCode,
                item.Course.Sport.SportName,
            })
            .GroupBy(item => new { item.SportId, item.SportCode, item.SportName })
            .Select(group => new
            {
                group.Key.SportId,
                group.Key.SportCode,
                group.Key.SportName,
                OpenClassCount = group.Count(),
            })
            .OrderBy(item => item.SportName)
            .ToListAsync();

        return sports
            .Select(item => new SportDto(item.SportId.ToString(), item.SportCode, item.SportName, item.OpenClassCount))
            .ToList();
    }

    public async Task<IReadOnlyList<ClassSummaryDto>> AccessUpcomingClassesAsync(string? centerId, string? sportId)
    {
        if (string.IsNullOrWhiteSpace(centerId))
        {
            throw new InvalidOperationException("Cần chọn trung tâm.");
        }

        if (!int.TryParse(centerId, out var centerKey) || !await db.Centers.AnyAsync(center => center.CenterId == centerKey))
        {
            throw new KeyNotFoundException("Không tìm thấy trung tâm.");
        }

        int? sportKey = null;
        if (!string.IsNullOrWhiteSpace(sportId))
        {
            if (!int.TryParse(sportId, out var parsedSport) || !await db.Sports.AnyAsync(sport => sport.SportId == parsedSport))
            {
                throw new KeyNotFoundException("Không tìm thấy môn thể thao.");
            }

            sportKey = parsedSport;
        }

        var today = DateOnly.FromDateTime(DateTime.Now);
        var classes = await db.Classes
            .AsNoTracking()
            .Where(item => item.Room != null && item.Room.CenterId == centerKey)
            .Where(item => item.Status == "open" || item.Status == "ongoing")
            .Where(item => item.EndDate == null || item.EndDate >= today)
            .Where(item => item.Course!.Status == "active")
            .Where(item => sportKey == null || item.Course!.SportId == sportKey)
            .OrderBy(item => item.StartDate)
            .ThenBy(item => item.ClassName)
            .Select(item => new
            {
                item.ClassId,
                item.ClassName,
                item.Course!.SportId,
                item.Course.Sport!.SportName,
                item.Course.CourseName,
                item.Course.LevelName,
                item.Course.Price,
                CoachName = item.Coach!.FullName,
                RoomName = item.Room!.RoomName,
                item.StartDate,
                item.EndDate,
                item.Capacity,
                EnrolledCount = item.Enrollments.Count(enrollment => enrollment.Status == "enrolled"),
                NextSlot = item.Slots
                    .Where(slot => slot.SlotDate >= today)
                    .OrderBy(slot => slot.SlotDate)
                    .ThenBy(slot => slot.StartTime)
                    .Select(slot => new { slot.SlotId, slot.SlotDate, slot.StartTime, slot.EndTime, slot.Title })
                    .FirstOrDefault(),
            })
            .ToListAsync();

        return classes
            .Select(item => new ClassSummaryDto(
                item.ClassId.ToString(),
                item.ClassName,
                item.SportId.ToString(),
                item.SportName,
                item.CourseName,
                item.LevelName ?? "",
                item.CoachName,
                item.RoomName,
                item.StartDate,
                item.EndDate,
                item.Capacity,
                item.EnrolledCount,
                item.Capacity is int capacity ? Math.Max(capacity - item.EnrolledCount, 0) : null,
                item.Price,
                item.NextSlot is null
                    ? null
                    : new ClassSlotDto(
                        item.NextSlot.SlotId.ToString(),
                        item.NextSlot.SlotDate,
                        item.NextSlot.StartTime,
                        item.NextSlot.EndTime,
                        item.NextSlot.Title ?? "")))
            .ToList();
    }
}
