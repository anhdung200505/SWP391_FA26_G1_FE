using AnhDuySport.Api.Models;

namespace AnhDuySport.Api.Services;

// Quy ước thời hạn gói hội viên dùng chung cả hệ thống: 1 tháng = 30 ngày.
// Không dùng AddMonths vì ngày cuối tháng bị cắt (31/01 + 1 tháng = 28/02) làm học viên mất ngày.
public static class MembershipDuration
{
    public const int DaysPerMonth = 30;

    // Giới hạn kỹ thuật để không tràn ngày, không phải giới hạn nghiệp vụ.
    public const int MaxMonths = 1200;

    public static int Days(int months) => DaysPerMonth * months;

    // Ngày hết hạn (tính cả ngày cuối) khi gói bắt đầu từ start.
    public static DateOnly EndFrom(DateOnly start, int months) => start.AddDays(Days(months) - 1);

    // Số ngày của một dòng membership (tính cả ngày đầu và ngày cuối).
    public static int Length(DateOnly start, DateOnly end) => end.DayNumber - start.DayNumber + 1;

    // Hạng của gói: phí trung bình mỗi tháng. Gói cao cấp hơn là gói có phí/tháng cao hơn.
    public static decimal MonthlyRate(MembershipPackage package) =>
        package.ValidityMonths > 0 ? package.Fee / package.ValidityMonths : package.Fee;
}
