using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace AnhDuySport.Api.Services;

public partial class GeminiWorkoutClient
{
    public async Task<GeneratedCoursePlan> GenerateCoursePlanAsync(CoursePlanGenerationRequest request)
    {
        var apiKey = configuration["Ai:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY");
        }

        apiKey = apiKey?.Trim() ?? "";
        if (apiKey.Length == 0)
        {
            throw new InvalidOperationException(
                "Chưa có khóa Google Gemini. Thêm Ai:ApiKey vào appsettings.Development.json hoặc đặt biến môi trường GEMINI_API_KEY.");
        }

        var prompt = BuildCoursePrompt(request);
        string? lastMessage = null;
        for (var attempt = 1; attempt <= 2; attempt++)
        {
            HttpResponseMessage response;
            try
            {
                using var message = new HttpRequestMessage(
                    HttpMethod.Post,
                    $"v1beta/models/{Uri.EscapeDataString(Model)}:generateContent");
                message.Version = HttpVersion.Version11;
                message.VersionPolicy = HttpVersionPolicy.RequestVersionOrLower;
                message.Headers.TryAddWithoutValidation("x-goog-api-key", apiKey);
                message.Content = JsonContent.Create(new
                {
                    contents = new[]
                    {
                        new { parts = new[] { new { text = prompt } } },
                    },
                    generationConfig = new
                    {
                        temperature = 0.4,
                        responseMimeType = "application/json",
                    },
                });
                using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(90));
                response = await http.SendAsync(message, timeout.Token);
            }
            catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException)
            {
                throw new InvalidOperationException($"Google Gemini ({Model}) không phản hồi kịp. Hãy thử lại sau ít giây.");
            }

            var raw = await response.Content.ReadAsStringAsync();
            if (response.IsSuccessStatusCode)
            {
                return ParseCoursePlan(raw, request.Sessions);
            }

            var geminiMessage = ReadError(raw);
            var status = (int)response.StatusCode;
            lastMessage = string.IsNullOrWhiteSpace(geminiMessage)
                ? $"Google Gemini từ chối yêu cầu ({status}). Model {Model}."
                : $"Google Gemini ({Model}): {geminiMessage}";
            if (status is 429 or 503 && attempt < 2)
            {
                await Task.Delay(TimeSpan.FromSeconds(2));
                continue;
            }

            break;
        }

        throw new InvalidOperationException(lastMessage ?? "Google Gemini không trả bài tập.");
    }

    private static string BuildCoursePrompt(CoursePlanGenerationRequest request)
    {
        var sessions = string.Join(
            "\n",
            request.Sessions.Select(item => $"- sessionId={item.SessionId} | {item.Label}"));
        var change = string.IsNullOrWhiteSpace(request.Changes)
            ? "Đây là lần sinh đầu."
            : $"Coach yêu cầu sửa bộ bài hiện tại: {request.Changes}";
        var current = string.IsNullOrWhiteSpace(request.CurrentPlan)
            ? "Chưa có bộ bài đã lưu."
            : request.CurrentPlan;
        return $"""
            Bạn là huấn luyện viên bộ môn {request.SportName}. Chỉ trả về JSON, không markdown.
            Soạn bài tập cho từng buổi và một bài thi cuối kỳ của lớp "{request.ClassName}", khóa "{request.CourseName}".
            Chỉ dùng mô tả coach nhập và lịch sử tập của đúng lớp này. Không bịa dữ liệu học viên khác.
            Mô tả coach nhập: {request.Brief}
            Lịch sử tập coach đã ghi cho lớp này: {request.TrainingHistory}
            Bộ bài đang có, nếu coach yêu cầu sửa: {current}
            {change}
            Các buổi, giữ đúng sessionId:
            {sessions}
            JSON gồm summary (2 đến 4 câu), sessions, exam và rubric.
            sessions có đúng một phần tử cho mỗi sessionId ở trên, cùng thứ tự.
            Mỗi phần tử sessions gồm sessionId (chuỗi đúng như trên) và exercises (2 đến 4 bài).
            Mỗi bài tập gồm title, dosage (số lần, hiệp hoặc thời lượng) và instructions.
            exam có 5 đến 8 câu. Mỗi câu gồm prompt, suggestedAnswer và points (số từ 0.5 đến 10).
            rubric có 3 đến 5 tiêu chí để coach chấm một điểm tổng. Mỗi tiêu chí gồm criterion, maxScore (0.5 đến 10) và guidance.
            Viết tiếng Việt, bài phù hợp môn {request.SportName}, không kê đơn thuốc.
            """;
    }

    private static GeneratedCoursePlan ParseCoursePlan(string raw, IReadOnlyList<CoursePlanSessionPrompt> expected)
    {
        using var document = JsonDocument.Parse(raw);
        if (!document.RootElement.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
        {
            throw new InvalidOperationException("Google Gemini không trả nội dung bài tập.");
        }

        var text = "";
        foreach (var part in candidates[0].GetProperty("content").GetProperty("parts").EnumerateArray())
        {
            if (!part.TryGetProperty("text", out var textElement))
            {
                continue;
            }

            var value = textElement.GetString()?.Trim() ?? "";
            if (value.Contains("\"sessions\"", StringComparison.Ordinal) || value.TrimStart().StartsWith('{'))
            {
                text = value;
            }
            else if (text.Length == 0)
            {
                text = value;
            }
        }

        text = text.Trim();
        if (text.StartsWith("```", StringComparison.Ordinal))
        {
            var firstNewLine = text.IndexOf('\n');
            var lastFence = text.LastIndexOf("```", StringComparison.Ordinal);
            if (firstNewLine >= 0 && lastFence > firstNewLine)
            {
                text = text[(firstNewLine + 1)..lastFence].Trim();
            }
        }

        using var payload = JsonDocument.Parse(text);
        var root = payload.RootElement;
        var summary = Required(root, "summary", 1000, "Tóm tắt");
        if (!root.TryGetProperty("sessions", out var sessionsElement) || sessionsElement.ValueKind != JsonValueKind.Array)
        {
            throw new InvalidOperationException("Google Gemini không trả danh sách buổi.");
        }

        var byId = new Dictionary<string, List<GeneratedCourseExercise>>(StringComparer.Ordinal);
        foreach (var session in sessionsElement.EnumerateArray())
        {
            var sessionId = ReadSessionId(session);
            if (sessionId.Length == 0 || byId.ContainsKey(sessionId))
            {
                continue;
            }

            if (!session.TryGetProperty("exercises", out var exercisesElement) || exercisesElement.ValueKind != JsonValueKind.Array)
            {
                throw new InvalidOperationException($"Buổi {sessionId} thiếu bài tập.");
            }

            var exercises = new List<GeneratedCourseExercise>();
            foreach (var exercise in exercisesElement.EnumerateArray())
            {
                if (exercises.Count == 5)
                {
                    break;
                }

                exercises.Add(new GeneratedCourseExercise(
                    Required(exercise, "title", 200, "Tên bài tập"),
                    Required(exercise, "dosage", 120, "Liều lượng"),
                    Required(exercise, "instructions", 2000, "Hướng dẫn")));
            }

            if (exercises.Count == 0)
            {
                throw new InvalidOperationException($"Buổi {sessionId} chưa có bài tập.");
            }

            byId[sessionId] = exercises;
        }

        var ordered = new List<GeneratedCourseSession>();
        foreach (var item in expected)
        {
            if (!byId.TryGetValue(item.SessionId, out var exercises))
            {
                throw new InvalidOperationException($"Google Gemini thiếu bài cho buổi {item.Label}.");
            }

            ordered.Add(new GeneratedCourseSession(item.SessionId, exercises));
        }

        var exam = ReadExam(root);
        var rubric = ReadRubric(root);
        return new GeneratedCoursePlan(summary, ordered, exam, rubric);
    }

    private static List<GeneratedExamQuestion> ReadExam(JsonElement root)
    {
        if (!root.TryGetProperty("exam", out var exam) || exam.ValueKind != JsonValueKind.Array)
        {
            throw new InvalidOperationException("Google Gemini không trả bài thi.");
        }

        var questions = new List<GeneratedExamQuestion>();
        foreach (var item in exam.EnumerateArray())
        {
            if (questions.Count == 10)
            {
                break;
            }

            questions.Add(new GeneratedExamQuestion(
                Required(item, "prompt", 1000, "Câu hỏi"),
                Required(item, "suggestedAnswer", 2000, "Đáp án gợi ý"),
                ReadScore(item, "points")));
        }

        if (questions.Count < 4)
        {
            throw new InvalidOperationException("Bài thi cần ít nhất 4 câu.");
        }

        return questions;
    }

    private static List<GeneratedRubricItem> ReadRubric(JsonElement root)
    {
        if (!root.TryGetProperty("rubric", out var rubric) || rubric.ValueKind != JsonValueKind.Array)
        {
            throw new InvalidOperationException("Google Gemini không trả tiêu chí chấm.");
        }

        var items = new List<GeneratedRubricItem>();
        foreach (var item in rubric.EnumerateArray())
        {
            if (items.Count == 6)
            {
                break;
            }

            items.Add(new GeneratedRubricItem(
                Required(item, "criterion", 200, "Tiêu chí"),
                ReadScore(item, "maxScore"),
                Required(item, "guidance", 1000, "Hướng dẫn chấm")));
        }

        if (items.Count < 3)
        {
            throw new InvalidOperationException("Cần ít nhất 3 tiêu chí chấm.");
        }

        return items;
    }

    private static string ReadSessionId(JsonElement session)
    {
        if (!session.TryGetProperty("sessionId", out var value))
        {
            return "";
        }

        var text = value.ValueKind == JsonValueKind.String ? value.GetString() : value.ToString();
        return text?.Trim() ?? "";
    }

    private static string Required(JsonElement item, string name, int max, string label)
    {
        var text = ReadJsonText(item, name)?.Trim() ?? "";
        if (text.Length == 0)
        {
            throw new InvalidOperationException($"Google Gemini thiếu {label}.");
        }

        return text.Length <= max ? text : text[..max];
    }

    private static decimal ReadScore(JsonElement item, string name)
    {
        if (!item.TryGetProperty(name, out var value))
        {
            throw new InvalidOperationException("Google Gemini thiếu điểm của câu hỏi hoặc tiêu chí.");
        }

        decimal score;
        if (value.ValueKind == JsonValueKind.Number)
        {
            score = value.GetDecimal();
        }
        else if (value.ValueKind != JsonValueKind.String
            || !decimal.TryParse(value.GetString(), NumberStyles.Number, CultureInfo.InvariantCulture, out score))
        {
            throw new InvalidOperationException("Điểm bài thi hoặc tiêu chí không đọc được.");
        }

        if (score <= 0 || score > 10)
        {
            throw new InvalidOperationException("Điểm mỗi câu và mỗi tiêu chí phải lớn hơn 0 và không quá 10.");
        }

        return Math.Round(score, 1, MidpointRounding.AwayFromZero);
    }
}

public sealed record CoursePlanGenerationRequest(
    string SportName,
    string CourseName,
    string ClassName,
    string Brief,
    string TrainingHistory,
    IReadOnlyList<CoursePlanSessionPrompt> Sessions,
    string? CurrentPlan,
    string? Changes);

public sealed record CoursePlanSessionPrompt(string SessionId, string Label);

public sealed record GeneratedCoursePlan(
    string Summary,
    IReadOnlyList<GeneratedCourseSession> Sessions,
    IReadOnlyList<GeneratedExamQuestion> Exam,
    IReadOnlyList<GeneratedRubricItem> Rubric);

public sealed record GeneratedCourseSession(string SessionId, IReadOnlyList<GeneratedCourseExercise> Exercises);

public sealed record GeneratedCourseExercise(string Title, string Dosage, string Instructions);

public sealed record GeneratedExamQuestion(string Prompt, string SuggestedAnswer, decimal Points);

public sealed record GeneratedRubricItem(string Criterion, decimal MaxScore, string Guidance);
