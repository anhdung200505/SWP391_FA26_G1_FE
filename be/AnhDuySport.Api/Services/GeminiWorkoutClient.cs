using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace AnhDuySport.Api.Services;

// Giáo án không được soạn sẵn trong code. Bước Generate gọi Google Gemini.
public partial class GeminiWorkoutClient(HttpClient http, IConfiguration configuration)
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public string Model => string.IsNullOrWhiteSpace(configuration["Ai:Model"])
        ? "gemini-3.5-flash-lite"
        : configuration["Ai:Model"]!.Trim();

    public string ProviderLabel => $"Google Gemini ({Model})";

    public async Task<GeneratedWorkout> GenerateAsync(WorkoutGenerationRequest request)
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

        var models = new List<string> { Model };
        string? lastMessage = null;
        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (var candidate in models)
        {
            if (!seen.Add(candidate))
            {
                continue;
            }

            var outcome = await CallModelAsync(candidate, apiKey, request);
            if (outcome.Workout is not null)
            {
                return outcome.Workout;
            }

            lastMessage = outcome.Error;
            if (outcome.TryNext)
            {
                continue;
            }

            break;
        }

        throw new InvalidOperationException(lastMessage ?? "Google Gemini không trả giáo án.");
    }

    private async Task<(GeneratedWorkout? Workout, string? Error, bool TryNext)> CallModelAsync(
        string model,
        string apiKey,
        WorkoutGenerationRequest request)
    {
        for (var attempt = 1; attempt <= 2; attempt++)
        {
            HttpResponseMessage response;
            try
            {
                using var message = new HttpRequestMessage(
                    HttpMethod.Post,
                    $"v1beta/models/{Uri.EscapeDataString(model)}:generateContent");
                message.Version = HttpVersion.Version11;
                message.VersionPolicy = HttpVersionPolicy.RequestVersionOrLower;
                message.Headers.TryAddWithoutValidation("x-goog-api-key", apiKey);
                message.Content = JsonContent.Create(new
                {
                    contents = new[]
                    {
                        new { parts = new[] { new { text = BuildPrompt(request) } } },
                    },
                    generationConfig = new
                    {
                        temperature = 0.4,
                        responseMimeType = "application/json",
                    },
                });
                using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(50));
                response = await http.SendAsync(message, timeout.Token);
            }
            catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException)
            {
                return (null, $"Google Gemini ({model}) không phản hồi kịp. Hãy Execute lại sau ít giây.", false);
            }

            var raw = await response.Content.ReadAsStringAsync();
            if (response.IsSuccessStatusCode)
            {
                return (Parse(raw, request.Weekdays.Count), null, false);
            }

            var geminiMessage = ReadError(raw);
            var status = (int)response.StatusCode;
            var detail = string.IsNullOrWhiteSpace(geminiMessage)
                ? $"Google Gemini từ chối yêu cầu ({status}). Model {model}."
                : $"Google Gemini ({model}): {geminiMessage}";
            if (status is 404 or 429 or 503)
            {
                if (status is 429 or 503 && attempt < 2)
                {
                    await Task.Delay(TimeSpan.FromSeconds(2));
                    continue;
                }

                return (null, detail, true);
            }

            return (null, detail, false);
        }

        return (null, $"Google Gemini ({model}) không trả giáo án.", true);
    }

    private static string ReadError(string raw)
    {
        try
        {
            using var document = JsonDocument.Parse(raw);
            if (document.RootElement.TryGetProperty("error", out var error)
                && error.TryGetProperty("message", out var message))
            {
                var text = message.GetString()?.Trim() ?? "";
                return text.Length <= 300 ? text : text[..300];
            }
        }
        catch (JsonException)
        {
            return "";
        }

        return "";
    }

    private static string BuildPrompt(WorkoutGenerationRequest request)
    {
        var days = string.Join(", ", request.Weekdays);
        var change = string.IsNullOrWhiteSpace(request.Changes)
            ? "Đây là lần tạo giáo án đầu."
            : $"Học viên yêu cầu sửa giáo án: {request.Changes}";
        var safety = string.IsNullOrWhiteSpace(request.SafetyNote)
            ? "Không có cảnh báo thêm."
            : request.SafetyNote;
        return $"""
            Bạn là huấn luyện viên. Chỉ trả về JSON, không markdown.
            Tạo giáo án tập tại nhà bằng tiếng Việt cho {request.MemberName}.
            Sức khỏe: {request.HealthSummary}
            Lịch sử tập do coach tự nhập, không phải điểm danh hay điểm số: {request.TrainingHistory}
            Lịch môn học, gồm môn và số buổi học, không xếp bài cá nhân trùng ngày có buổi học: {request.ClassSchedule}
            Mục tiêu: {request.Goal}
            Ràng buộc: {request.SessionsPerWeek} buổi/tuần, mỗi buổi {request.SessionMinutes} phút, kéo dài {request.DurationWeeks} tuần, cường độ gợi ý {request.Intensity}, giờ tập {request.StartTime}.
            Các buổi theo đúng thứ tự ngày: {days}.
            {change}
            {safety}
            JSON gồm analysis (2 đến 4 câu nhận xét BMI và mục tiêu), planName (tên giáo án ngắn) và sessions.
            Mỗi phần tử sessions gồm title, intensity (Thấp hoặc Trung bình hoặc Cao) và exercises (khởi động, bài chính gồm số hiệp và số lần, giãn cơ).
            title chỉ là tên bài tập, không nhắc lại thứ hoặc ngày vì thứ đã có ở danh sách buổi.
            sessions phải có đúng {request.Weekdays.Count} phần tử, cùng thứ tự các ngày ở trên.
            Bài tập phải bổ trợ đúng môn học viên đang học và nội dung lịch sử tập coach đã nhập.
            Không kê đơn thuốc, không bài tập nguy hiểm với mức BMI đã nêu.
            """;
    }

    private static GeneratedWorkout Parse(string raw, int expectedSessions)
    {
        using var document = JsonDocument.Parse(raw);
        var tokens = ReadTotalTokens(document.RootElement);
        if (tokens <= 0)
        {
            tokens = Math.Max(1, raw.Length / 4);
        }

        if (!document.RootElement.TryGetProperty("candidates", out var candidates)
            || candidates.GetArrayLength() == 0)
        {
            throw new InvalidOperationException("Google Gemini không trả nội dung giáo án.");
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

        var payload = JsonSerializer.Deserialize<GeminiPlanPayload>(text, JsonOptions)
            ?? throw new InvalidOperationException("Google Gemini trả JSON không đọc được.");
        if (string.IsNullOrWhiteSpace(payload.Analysis) || payload.Sessions is null || payload.Sessions.Count < expectedSessions)
        {
            throw new InvalidOperationException(
                $"Google Gemini trả về {payload.Sessions?.Count ?? 0} buổi, cần đúng {expectedSessions} buổi.");
        }

        var sessions = payload.Sessions.Take(expectedSessions).Select(item =>
        {
            var title = item.Title?.Trim() ?? "";
            var exercises = ReadExercises(item.Exercises);
            if (title.Length == 0 || exercises.Length == 0)
            {
                throw new InvalidOperationException("Google Gemini trả buổi tập thiếu tên hoặc bài tập.");
            }

            return new GeneratedSession(
                title.Length <= 200 ? title : title[..200],
                NormalizeIntensity(item.Intensity),
                exercises);
        }).ToList();

        var planName = payload.PlanName?.Trim() ?? "";
        if (planName.Length == 0)
        {
            planName = "Giáo án cá nhân";
        }

        return new GeneratedWorkout(
            planName.Length <= 200 ? planName : planName[..200],
            payload.Analysis.Trim(),
            sessions,
            tokens);
    }

    private static int ReadTotalTokens(JsonElement root)
    {
        if (!root.TryGetProperty("usageMetadata", out var usage))
        {
            return 0;
        }

        if (usage.TryGetProperty("totalTokenCount", out var total) && total.TryGetInt64(out var count) && count > 0)
        {
            return count >= int.MaxValue ? int.MaxValue : (int)count;
        }

        long prompt = 0;
        long output = 0;
        if (usage.TryGetProperty("promptTokenCount", out var promptElement))
        {
            promptElement.TryGetInt64(out prompt);
        }

        if (usage.TryGetProperty("candidatesTokenCount", out var outputElement))
        {
            outputElement.TryGetInt64(out output);
        }

        var sum = prompt + output;
        if (sum <= 0)
        {
            return 0;
        }

        return sum >= int.MaxValue ? int.MaxValue : (int)sum;
    }

    private static string ReadExercises(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.String)
        {
            return element.GetString()?.Trim() ?? "";
        }

        if (element.ValueKind == JsonValueKind.Array)
        {
            return string.Join(". ", element.EnumerateArray()
                .Select(ReadExerciseItem)
                .Where(item => !string.IsNullOrWhiteSpace(item)));
        }

        return element.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null ? "" : element.ToString();
    }

    private static string ReadExerciseItem(JsonElement item)
    {
        if (item.ValueKind == JsonValueKind.String)
        {
            return item.GetString()?.Trim() ?? "";
        }

        if (item.ValueKind != JsonValueKind.Object)
        {
            return item.ToString();
        }

        var name = ReadJsonText(item, "name") ?? ReadJsonText(item, "title") ?? "";
        var sets = ReadJsonText(item, "sets");
        var reps = ReadJsonText(item, "reps");
        if (name.Length == 0)
        {
            return item.ToString();
        }

        var detail = new List<string>();
        if (!string.IsNullOrWhiteSpace(sets))
        {
            detail.Add($"{sets} hiệp");
        }

        if (!string.IsNullOrWhiteSpace(reps))
        {
            detail.Add(reps);
        }

        return detail.Count == 0 ? name : $"{name} ({string.Join(", ", detail)})";
    }

    private static string? ReadJsonText(JsonElement item, string name)
    {
        if (!item.TryGetProperty(name, out var value))
        {
            return null;
        }

        return value.ValueKind == JsonValueKind.String ? value.GetString() : value.ToString();
    }

    private static string NormalizeIntensity(string? value)
    {
        var text = value?.Trim().ToLowerInvariant() ?? "";
        if (text is "thấp" or "thap" or "low" or "easy")
        {
            return "Thấp";
        }

        if (text is "cao" or "high")
        {
            return "Cao";
        }

        return "Trung bình";
    }

    private sealed class GeminiPlanPayload
    {
        public string? Analysis { get; set; }
        public string? PlanName { get; set; }
        public List<GeminiSessionPayload>? Sessions { get; set; }
    }

    private sealed class GeminiSessionPayload
    {
        public string? Title { get; set; }
        public string? Intensity { get; set; }
        public JsonElement Exercises { get; set; }
    }
}

public sealed record WorkoutGenerationRequest(
    string MemberName,
    string HealthSummary,
    string TrainingHistory,
    string ClassSchedule,
    string Goal,
    int SessionsPerWeek,
    int SessionMinutes,
    int DurationWeeks,
    string Intensity,
    string StartTime,
    IReadOnlyList<string> Weekdays,
    string? SafetyNote,
    string? Changes);

public sealed record GeneratedWorkout(
    string PlanName,
    string Analysis,
    IReadOnlyList<GeneratedSession> Sessions,
    int TotalTokens);

public sealed record GeneratedSession(string Title, string Intensity, string Exercises);
