namespace AnhDuySport.Api.Services;

public static class TextFormat
{
    // Ghép lý do hoặc ghi chú người dùng nhập vào câu thông báo: chỉ thêm dấu chấm khi câu chưa kết thúc bằng . ! ?
    public static string Sentence(string text)
    {
        var value = text.Trim();
        return value.Length == 0 || value[^1] is '.' or '!' or '?' ? value : value + ".";
    }

    // Ghi chú đứng một dòng riêng, nội dung ghi chú bắt đầu ở dòng kế tiếp.
    public static string WithNote(string body, string? note)
    {
        if (string.IsNullOrWhiteSpace(note))
        {
            return body;
        }

        var value = note.Replace("\r\n", "\n").Replace('\r', '\n').Trim();
        return body.TrimEnd() + "\nGhi chú:\n" + value;
    }

    // Dòng đầu luôn nói đây là HLV thay thế. Lý do người nhập nằm ở dòng Ghi chú phía dưới.
    public static string SubstituteNote(string changeLine, string? reason, int maxLength = 500)
    {
        var head = changeLine.Trim().TrimEnd('.', ' ');
        var text = string.IsNullOrWhiteSpace(reason) ? head + "." : WithNote(head + ".", reason);
        return text.Length <= maxLength ? text : text[..maxLength];
    }
}
