using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

public class SlotFlowService(AppDbContext db)
{
    public async Task<IReadOnlyList<SlotAvailabilityDto>> AccessSlotsAsync(string? classId)
    {
        var today = DateOnly.FromDateTime(DateTime.Now);
        var query = db.ClassSlots.AsNoTracking().Where(slot => slot.SlotDate >= today);
        if (!string.IsNullOrWhiteSpace(classId))
        {
            var classKey = await FindClassIdAsync(classId);
            query = query.Where(slot => slot.ClassId == classKey);
        }

        var slots = await Project(query.OrderBy(slot => slot.SlotDate).ThenBy(slot => slot.StartTime))
            .ToListAsync();
        return slots.Select(ToAvailability).ToList();
    }

    public async Task<SlotAvailabilityDto> SelectSlotAsync(string slotId)
    {
        var id = ParseSlotId(slotId);
        return await LoadAvailabilityAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy slot.");
    }

    public async Task<IReadOnlyList<SlotRegistrationDto>> AccessMemberRegistrationsAsync(string memberUserId)
    {
        var member = await FindActiveMemberAsync(memberUserId);
        var rows = await db.SlotRegistrations
            .AsNoTracking()
            .Where(item => item.UserId == member.UserId)
            .OrderByDescending(item => item.Slot!.SlotDate)
            .ThenBy(item => item.Slot!.StartTime)
            .Select(item => new RegistrationRow(
                item.SlotRegistrationId,
                item.SlotId,
                item.UserId,
                item.Member!.FullName,
                item.Status,
                item.RegisteredAt))
            .ToListAsync();

        var result = new List<SlotRegistrationDto>();
        foreach (var row in rows)
        {
            var slot = await LoadAvailabilityAsync(row.SlotId)
                ?? throw new KeyNotFoundException("Không tìm thấy slot.");
            result.Add(ToRegistration(row, slot));
        }

        return result;
    }

    // actorUserId có giá trị khi lễ tân đăng ký giùm.
    public async Task<SlotRegistrationDto> RegisterAsync(string slotId, SlotMemberRequest request, int? actorUserId = null)
    {
        var slot = await FindSlotAsync(slotId);
        var member = await FindActiveMemberAsync(request.MemberUserId);
        EnsureUpcoming(slot);

        var enrolled = await db.ClassEnrollments.AnyAsync(item =>
            item.ClassId == slot.ClassId && item.UserId == member.UserId && item.Status == "enrolled");
        if (!enrolled)
        {
            throw new RegistrationException("Chỉ đăng ký slot khi đã ghi danh lớp của môn đó.");
        }

        var existing = await db.SlotRegistrations
            .FirstOrDefaultAsync(item => item.SlotId == slot.SlotId && item.UserId == member.UserId);
        if (existing?.Status == "registered")
        {
            throw new RegistrationException("Học viên đã đăng ký slot này.");
        }

        var registeredCount = await db.SlotRegistrations.CountAsync(item =>
            item.SlotId == slot.SlotId && item.Status == "registered");
        if (registeredCount >= slot.RegistrationLimit)
        {
            throw new RegistrationException("Slot đã đạt giới hạn đăng ký.");
        }

        if (existing is null)
        {
            existing = new SlotRegistration
            {
                SlotId = slot.SlotId,
                UserId = member.UserId,
                RegisteredAt = DateTime.Now,
                Status = "registered",
            };
            db.SlotRegistrations.Add(existing);
        }
        else
        {
            existing.Status = "registered";
            existing.RegisteredAt = DateTime.Now;
        }

        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = actorUserId ?? member.UserId,
            Action = actorUserId is null ? "Đăng ký slot" : "Đăng ký slot giùm học viên",
            EntityName = "slot_registration",
            EntityId = slot.SlotId,
            Detail = actorUserId is null ? slot.Title : $"{member.FullName}: {slot.Title}",
            CreatedAt = DateTime.Now,
        });
        await SaveRegistrationAsync();
        return await ToRegistrationDtoAsync(existing.SlotRegistrationId);
    }

    public async Task<SlotRegistrationDto> CancelAsync(string slotId, SlotMemberRequest request, int? actorUserId = null)
    {
        var slot = await FindSlotAsync(slotId);
        var member = await FindActiveMemberAsync(request.MemberUserId);
        var existing = await db.SlotRegistrations.FirstOrDefaultAsync(item =>
            item.SlotId == slot.SlotId && item.UserId == member.UserId && item.Status == "registered");
        if (existing is null)
        {
            throw new RegistrationException("Học viên chưa đăng ký slot này.");
        }

        existing.Status = "cancelled";
        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = actorUserId ?? member.UserId,
            Action = actorUserId is null ? "Hủy đăng ký slot" : "Hủy slot giùm học viên",
            EntityName = "slot_registration",
            EntityId = slot.SlotId,
            Detail = actorUserId is null ? slot.Title : $"{member.FullName}: {slot.Title}",
            CreatedAt = DateTime.Now,
        });
        await SaveRegistrationAsync();
        return await ToRegistrationDtoAsync(existing.SlotRegistrationId);
    }

    private async Task SaveRegistrationAsync()
    {
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException exception)
        {
            var message = exception.GetBaseException().Message;
            if (message.Contains("giới hạn đăng ký", StringComparison.Ordinal))
            {
                throw new RegistrationException("Slot đã đạt giới hạn đăng ký.");
            }

            if (message.Contains("ghi danh", StringComparison.Ordinal))
            {
                throw new RegistrationException("Chỉ đăng ký slot khi đã ghi danh lớp của môn đó.");
            }

            if (message.Contains("UQ_slot_registration", StringComparison.OrdinalIgnoreCase))
            {
                throw new RegistrationException("Học viên đã đăng ký slot này.");
            }

            throw;
        }
    }

    private async Task<SlotRegistrationDto> ToRegistrationDtoAsync(int registrationId)
    {
        var row = await db.SlotRegistrations
            .AsNoTracking()
            .Where(item => item.SlotRegistrationId == registrationId)
            .Select(item => new RegistrationRow(
                item.SlotRegistrationId,
                item.SlotId,
                item.UserId,
                item.Member!.FullName,
                item.Status,
                item.RegisteredAt))
            .FirstAsync();
        var slot = await LoadAvailabilityAsync(row.SlotId)
            ?? throw new KeyNotFoundException("Không tìm thấy slot.");
        return ToRegistration(row, slot);
    }

    private async Task<SlotAvailabilityDto?> LoadAvailabilityAsync(int slotId)
    {
        var slot = await Project(db.ClassSlots.AsNoTracking().Where(item => item.SlotId == slotId))
            .FirstOrDefaultAsync();
        return slot is null ? null : ToAvailability(slot);
    }

    private static IQueryable<SlotRow> Project(IQueryable<ClassSlot> slots) =>
        slots.Select(slot => new SlotRow(
            slot.SlotId,
            slot.ClassId,
            slot.Class!.ClassName,
            slot.Class.Course!.Sport!.SportName,
            slot.Class.Course.CourseName,
            slot.SlotDate,
            slot.StartTime,
            slot.EndTime,
            slot.Title ?? "",
            slot.RegistrationLimit,
            slot.Registrations.Count(item => item.Status == "registered")));

    private async Task<ClassSlot> FindSlotAsync(string slotId)
    {
        var id = ParseSlotId(slotId);
        return await db.ClassSlots.FirstOrDefaultAsync(item => item.SlotId == id)
            ?? throw new KeyNotFoundException("Không tìm thấy slot.");
    }

    private async Task<int> FindClassIdAsync(string classId)
    {
        if (!int.TryParse(classId, out var id) || !await db.Classes.AnyAsync(item => item.ClassId == id))
        {
            throw new KeyNotFoundException("Không tìm thấy lớp học.");
        }

        return id;
    }

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
            throw new RegistrationException("Tài khoản học viên không hoạt động.");
        }

        return member;
    }

    private static int ParseSlotId(string slotId) =>
        int.TryParse(slotId, out var id) ? id : throw new KeyNotFoundException("Không tìm thấy slot.");

    private static void EnsureUpcoming(ClassSlot slot)
    {
        if (slot.SlotDate < DateOnly.FromDateTime(DateTime.Now))
        {
            throw new RegistrationException("Slot đã qua ngày học.");
        }
    }

    private static SlotAvailabilityDto ToAvailability(SlotRow slot)
    {
        var remaining = Math.Max(slot.RegistrationLimit - slot.RegisteredCount, 0);
        return new SlotAvailabilityDto(
            slot.SlotId.ToString(),
            slot.ClassId.ToString(),
            slot.ClassName,
            slot.SportName,
            slot.CourseName,
            slot.Date,
            slot.StartTime,
            slot.EndTime,
            slot.Title,
            slot.RegistrationLimit,
            slot.RegisteredCount,
            remaining,
            remaining > 0 && slot.Date >= DateOnly.FromDateTime(DateTime.Now));
    }

    private static SlotRegistrationDto ToRegistration(RegistrationRow row, SlotAvailabilityDto slot) =>
        new(
            row.SlotRegistrationId.ToString(),
            row.SlotId.ToString(),
            row.UserId.ToString(),
            row.MemberName,
            row.Status,
            row.RegisteredAt,
            slot);

    private sealed record SlotRow(
        int SlotId,
        int ClassId,
        string ClassName,
        string SportName,
        string CourseName,
        DateOnly Date,
        TimeOnly StartTime,
        TimeOnly EndTime,
        string Title,
        int RegistrationLimit,
        int RegisteredCount);

    private sealed record RegistrationRow(
        int SlotRegistrationId,
        int SlotId,
        int UserId,
        string MemberName,
        string Status,
        DateTime RegisteredAt);
}
