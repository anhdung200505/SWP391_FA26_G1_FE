namespace AnhDuySport.Api.Services;

public static class TextFormat
{
    // Ghép lý do hoặc ghi chú người dùng nhập vào câu thông báo: chỉ thêm dấu chấm khi câu chưa kết thúc bằng . ! ?
    public static string Sentence(string text)
    {
        var value = text.Trim();
        return value.Length == 0 || value[^1] is '.' or '!' or '?' ? value : value + ".";
    }
}
