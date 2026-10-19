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
                    .OrderByDescending(slot => slot.SlotDate)
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

    public async Task<ClassDetailDto> SelectClassAsync(string classId)
    {
        if (!int.TryParse(classId, out var id))
        {
            throw new KeyNotFoundException("Không tìm thấy lớp học.");
        }

        var item = await db.Classes
            .AsNoTracking()
            .Where(current => current.ClassId == id)
            .Select(current => new
            {
                current.ClassId,
                current.ClassName,
                current.Status,
                current.StartDate,
                current.EndDate,
                current.Course!.SportId,
                current.Course.Sport!.SportName,
                current.Course.CourseName,
                current.Course.LevelName,
                current.Course.AgeRange,
                current.Course.Description,
                CourseStatus = current.Course.Status,
                Tuition = current.Course.Price,
                CenterId = current.Room != null ? (int?)current.Room.CenterId : null,
                CenterName = current.Room != null ? current.Room.Center!.CenterName : "",
                RoomName = current.Room != null ? current.Room.RoomName : "",
                CoachName = current.Coach!.FullName,
                current.Capacity,
                EnrolledCount = current.Enrollments.Count(enrollment => enrollment.Status == "enrolled"),
                Slots = current.Slots
                    .OrderBy(slot => slot.SlotDate)
                    .ThenBy(slot => slot.StartTime)
                    .Select(slot => new { slot.SlotId, slot.SlotDate, slot.StartTime, slot.EndTime, slot.Title })
                    .ToList(),
            })
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Không tìm thấy lớp học.");

        var today = DateOnly.FromDateTime(DateTime.Now);
        int? availableSeats = item.Capacity is int capacity ? Math.Max(capacity - item.EnrolledCount, 0) : null;
        var isOpen = (item.Status is "open" or "ongoing")
            && (item.EndDate is null || item.EndDate >= today)
            && item.CourseStatus == "active"
            && (availableSeats is null || availableSeats > 0);

        return new ClassDetailDto(
            item.ClassId.ToString(),
            item.ClassName,
            item.Status,
            item.StartDate,
            item.EndDate,
            item.SportId.ToString(),
            item.SportName,
            item.CourseName,
            item.LevelName ?? "",
            item.AgeRange ?? "",
            item.Description ?? "",
            item.CenterId?.ToString() ?? "",
            item.CenterName,
            item.RoomName,
            item.CoachName,
            item.Capacity,
            item.EnrolledCount,
            availableSeats,
            item.Tuition,
            isOpen,
            item.Slots
                .Select(slot => new ClassSlotDto(
                    slot.SlotId.ToString(),
                    slot.SlotDate,
                    slot.StartTime,
                    slot.EndTime,
                    slot.Title ?? ""))
                .ToList());
    }

    public async Task<IReadOnlyList<CoachOptionDto>> AccessCoachesAsync(string sportId)
    {
        if (!int.TryParse(sportId, out var sportKey) || !await db.Sports.AnyAsync(sport => sport.SportId == sportKey))
        {
            throw new KeyNotFoundException("Không tìm thấy môn thể thao.");
        }

        var today = DateOnly.FromDateTime(DateTime.Now);
        var rows = await db.Classes
            .AsNoTracking()
            .Where(item => item.Course!.SportId == sportKey)
            .Where(item => item.Status == "open" || item.Status == "ongoing")
            .Where(item => item.EndDate == null || item.EndDate >= today)
            .Where(item => item.Course!.Status == "active")
            .Select(item => new
            {
                item.CoachUserId,
                item.Coach!.FullName,
                item.ClassId,
            })
            .ToListAsync();

        return rows
            .GroupBy(item => item.CoachUserId)
            .Select(group => new CoachOptionDto(
                group.Key.ToString(),
                group.First().FullName,
                group.First().ClassId.ToString()))
            .OrderBy(item => item.FullName)
            .ToList();
    }
}
