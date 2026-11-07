namespace AnhDuySport.Api.Services;

// RAFT lúc sinh bài: mỗi buổi hoặc mục đã truy xuất là một khối, model chỉ được dùng khối liên quan.
public static class CourseMaterialRaft
{
    private const int MaxContext = 48000;

    public static string Build(IReadOnlyList<(string SportName, string SourceName, IReadOnlyList<(string Label, string Work, string Review)> Units)> documents)
    {
        var blocks = new List<string>();
        var index = 1;
        foreach (var (sportName, sourceName, units) in documents)
        {
            foreach (var unit in units)
            {
                var work = unit.Work.Trim();
                var review = unit.Review.Trim();
                if (unit.Label.Trim().Length == 0 && work.Length == 0 && review.Length == 0)
                {
                    continue;
                }

                var source = string.IsNullOrWhiteSpace(sourceName) ? "" : $" | {sourceName}";
                var text = review.Length == 0 ? work : $"{work}\nÔn tập: {review}";
                blocks.Add($"[D{index} | {sportName}{source} | {unit.Label.Trim()}]\n{text}");
                index++;
            }
        }

        if (blocks.Count == 0)
        {
            return """
                RAFT: không truy xuất được giáo trình theo buổi của môn này.
                Không tự đặt kỹ thuật hoặc thứ tự buổi khi nguồn chưa công bố.
                """;
        }

        var kept = new List<string>();
        var length = 0;
        foreach (var block in blocks)
        {
            var extra = block.Length + (kept.Count == 0 ? 0 : 2);
            if (kept.Count > 0 && length + extra > MaxContext)
            {
                break;
            }

            kept.Add(block);
            length += extra;
        }

        var body = string.Join("\n\n", kept);
        if (kept.Count < blocks.Count)
        {
            body += $"\n\n[Dừng tại {kept.Count}/{blocks.Count} khối. Các khối sau không được đưa vào lần này.]";
        }

        return $"""
            RAFT: các khối dưới đây là giáo trình theo thứ tự đã truy xuất. Chỉ dùng khối liên quan tới buổi hoặc yêu cầu đang soạn.
            Không thêm buổi, kỹ thuật hoặc bài thi không có trong các khối này.
            {body}
            """;
    }
}
