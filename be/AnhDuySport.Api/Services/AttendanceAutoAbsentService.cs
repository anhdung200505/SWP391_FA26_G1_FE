using AnhDuySport.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Sau 23:59 của ngày học, học viên đang học trong lớp mà buổi đó chưa có điểm danh thì tự ghi "absent" (vắng).
// Chạy lúc khởi động (bù cả buổi cũ) rồi mỗi 10 phút; chỉ thêm dòng còn thiếu nên chạy lại không đổi gì thêm.
// Bỏ qua buổi đã hủy và buổi đã bắt đầu trước giờ học viên ghi danh (so enrolled_at với ngày + giờ bắt đầu buổi, không chỉ so ngày).
public class AttendanceAutoAbsentService(IServiceScopeFactory scopes, ILogger<AttendanceAutoAbsentService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(10);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var added = await db.Database.ExecuteSqlInterpolatedAsync($"""
                    INSERT INTO attendance (session_id, user_id, check_in_at, status)
                    SELECT s.session_id, e.user_id, NULL, N'absent'
                    FROM [session] s
                    JOIN class_enrollment e ON e.class_id = s.class_id AND e.status = N'enrolled'
                    WHERE s.session_date < {DateOnly.FromDateTime(DateTime.Now)}
                      AND s.status <> N'cancelled'
                      AND e.enrolled_at <= CAST(s.session_date AS DATETIME) + CAST(s.start_time AS DATETIME)
                      AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.session_id = s.session_id AND a.user_id = e.user_id)
                    """, stoppingToken);
                if (added > 0)
                {
                    logger.LogInformation("Đã tự đánh vắng {Count} lượt học viên chưa điểm danh.", added);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Không tự đánh vắng được các buổi chưa điểm danh.");
            }

            await Task.Delay(Interval, stoppingToken);
        }
    }
}
