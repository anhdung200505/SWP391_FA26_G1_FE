using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Giáo án chuẩn của môn chỉ là một dòng training_plan (mỗi môn tối đa một, UX_training_plan_sport) để lớp tham chiếu;
// nội dung giáo trình thật nằm ở sport_course_unit. Mọi chỗ cần giáo án của môn đều đi qua đây để không lệch nhau.
internal static class StandardTrainingPlan
{
    public static TrainingPlan Create(int sportId, string sportName, int createdByUserId) => new()
    {
        CreatedByUserId = createdByUserId,
        PlanName = $"Giáo án chuẩn {sportName}",
        SportId = sportId,
        CreatedAt = DateTime.Now,
    };

    // Trả mã giáo án chuẩn của môn, tạo dòng rỗng nếu chưa có. Không tự mở/đóng transaction: chạy trong transaction của nơi gọi.
    // Hai người cùng tạo lúc môn chưa có giáo án: bên thua vi phạm chỉ mục duy nhất thì đọc lại dòng của bên thắng.
    public static async Task<int> EnsureAsync(AppDbContext db, int sportId, string sportName, int createdByUserId)
    {
        var existing = await FindAsync(db, sportId);
        if (existing is int found)
        {
            return found;
        }

        var plan = Create(sportId, sportName, createdByUserId);
        db.TrainingPlans.Add(plan);
        try
        {
            await db.SaveChangesAsync();
            return plan.TrainingPlanId;
        }
        catch (DbUpdateException exception) when (exception.InnerException?.Message.Contains("UX_training_plan_sport") == true)
        {
            db.Entry(plan).State = EntityState.Detached;
            return await FindAsync(db, sportId) ?? throw exception;
        }
    }

    private static Task<int?> FindAsync(AppDbContext db, int sportId) =>
        db.TrainingPlans.AsNoTracking()
            .Where(plan => plan.SportId == sportId)
            .Select(plan => (int?)plan.TrainingPlanId)
            .FirstOrDefaultAsync();
}
