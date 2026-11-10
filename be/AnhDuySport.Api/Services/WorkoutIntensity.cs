namespace AnhDuySport.Api.Services;

// Năm mức cường độ của gợi ý tập cá nhân. Mỗi mức có kiểu bài tập riêng để AI chọn bài đúng mức.
public static class WorkoutIntensity
{
    public static readonly string[] Levels = ["Rất nhẹ", "Nhẹ", "Trung bình", "Cao", "Tối đa"];

    public static string? Normalize(string? value)
    {
        var text = (value ?? "").Trim().ToLowerInvariant();
        return text switch
        {
            "rất nhẹ" or "rat nhe" or "rat_nhe" or "very_light" or "very light" => "Rất nhẹ",
            "nhẹ" or "nhe" or "thấp" or "thap" or "light" or "low" or "easy" => "Nhẹ",
            "trung bình" or "trung binh" or "trung_binh" or "medium" or "moderate" => "Trung bình",
            "cao" or "high" => "Cao",
            "tối đa" or "toi da" or "toi_da" or "max" or "maximum" => "Tối đa",
            _ => null,
        };
    }

    public static int Rank(string level) => Math.Max(0, Array.IndexOf(Levels, Normalize(level) ?? "Trung bình"));

    public static string Guide(string? level) => Normalize(level) switch
    {
        "Rất nhẹ" => "bài hồi phục và vận động nhẹ: đi bộ chậm, giãn cơ, yoga nhẹ, bài thở, vận động khớp; không bài gắng sức, nghỉ giữa hiệp dài, nhịp tim thấp.",
        "Nhẹ" => "bài tác động thấp: đi bộ nhanh, đạp xe nhẹ, bài thân người bằng trọng lượng cơ thể ít hiệp, tạ rất nhẹ; nghỉ thoải mái giữa hiệp.",
        "Cao" => "bài gắng sức nhiều: HIIT vừa, tạ nặng vừa, siêu hiệp, chạy biến tốc, plyometric cơ bản; nghỉ ngắn giữa hiệp, cần khởi động kỹ.",
        "Tối đa" => "bài tối đa sức của người tập khỏe: HIIT cường độ cao, tạ nặng gần giới hạn, plyometric nâng cao, bài kết hợp liên tục; nghỉ rất ngắn, nhắc rõ phải dừng khi đau hoặc chóng mặt.",
        _ => "bài cân bằng sức bền và sức mạnh: tạ vừa, cardio ổn định, bài thân người nhiều hiệp; nghỉ vừa phải giữa hiệp.",
    };
}
