using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Người thực hiện thao tác đăng ký lớp và vai trò của họ lúc đó.
public sealed record RegistrationActor(int UserId, string RoleCode);

public static class ClassRegistrationLogs
{
    public const string Register = "register";
    public const string MoveOut = "move_out";
    public const string ReEnroll = "re_enroll";

    public static void Add(
        AppDbContext db,
        int memberUserId,
        int classId,
        string action,
        RegistrationActor performedBy,
        DateTime at,
        Payment? payment = null,
        string? reason = null)
    {
        db.ClassRegistrationLogs.Add(new ClassRegistrationLog
        {
            MemberUserId = memberUserId,
            ClassId = classId,
            Payment = payment,
            Action = action,
            Reason = reason is { Length: > 500 } ? reason[..500] : reason,
            PerformedByUserId = performedBy.UserId,
            PerformedByRole = performedBy.RoleCode,
            CreatedAt = at,
        });
    }

    // Người tạo đơn đăng ký này.
    public static async Task<RegisteredByDto?> RegisteredByPaymentAsync(AppDbContext db, int paymentId)
    {
        var rows = await PerformersAsync(db, db.ClassRegistrationLogs
            .Where(log => log.PaymentId == paymentId && log.Action == Register));
        return rows.FirstOrDefault().By;
    }

    // Người gần nhất đưa học viên vào từng lớp (đăng ký hoặc đăng ký học lại), theo class_id.
    public static async Task<Dictionary<int, RegisteredByDto>> LatestRegisteredByClassAsync(
        AppDbContext db,
        int memberUserId,
        IReadOnlyCollection<int> classIds)
    {
        var rows = await PerformersAsync(db, db.ClassRegistrationLogs
            .Where(log => log.MemberUserId == memberUserId
                && classIds.Contains(log.ClassId)
                && (log.Action == Register || log.Action == ReEnroll)));
        return rows
            .GroupBy(row => row.ClassId)
            .ToDictionary(group => group.Key, group => group.First().By!);
    }

    private static async Task<List<(int ClassId, RegisteredByDto? By)>> PerformersAsync(
        AppDbContext db,
        IQueryable<ClassRegistrationLog> logs)
    {
        var rows = await (
            from log in logs.AsNoTracking()
            join user in db.UserAccounts on log.PerformedByUserId equals (int?)user.UserId into users
            from user in users.DefaultIfEmpty()
            orderby log.CreatedAt descending, log.ClassRegistrationLogId descending
            select new
            {
                log.ClassId,
                log.PerformedByUserId,
                FullName = user != null ? user.FullName : null,
                log.PerformedByRole,
            })
            .ToListAsync();
        return rows
            .Select(row => (row.ClassId, (RegisteredByDto?)new RegisteredByDto(
                row.PerformedByUserId?.ToString(),
                row.FullName,
                row.PerformedByRole)))
            .ToList();
    }
}
