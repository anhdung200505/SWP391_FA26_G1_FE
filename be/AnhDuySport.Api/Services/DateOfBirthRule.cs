namespace AnhDuySport.Api.Services;

// Quy tắc ngày sinh dùng chung cho đăng ký lớp nhóm, đăng ký 1-1 và sửa hồ sơ:
// phải trước hôm nay và không trước 1900-01-01. Không nhập (null) thì hợp lệ.
// Trả về thông báo lỗi, null nếu hợp lệ; mỗi luồng tự ném loại lỗi của mình.
public static class DateOfBirthRule
{
    public static readonly DateOnly Earliest = new(1900, 1, 1);

    public static string? Check(DateOnly? dateOfBirth)
    {
        if (dateOfBirth is not { } value)
        {
            return null;
        }

        if (value >= DateOnly.FromDateTime(DateTime.Now))
        {
            return "Ngày sinh phải trước hôm nay.";
        }

        return value < Earliest ? "Ngày sinh không hợp lệ." : null;
    }
}
