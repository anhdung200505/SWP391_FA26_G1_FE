using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

// Main flow: AI Workout Recommendation.
// Học viên chưa có trang đăng nhập, nên gọi bằng memberUserId có sẵn (role MEMBER), giống các flow học viên khác.
[AllowAnonymous]
[ApiController]
[Route("api/members/{memberUserId}/workout-recommendations")]
[Tags("AI Workout Recommendation")]
public class WorkoutRecommendationController(WorkoutRecommendationFlowService flow) : ControllerBase
{
    [HttpGet("access")]
    [EndpointSummary("Access AI Recommendation")]
    [EndpointDescription("Mở luồng gợi ý giáo án. Chỉ học viên có hội viên đang hiệu lực từ Hạng Đồng trở lên. Response có quota: Đồng 5 lượt tạo lại và 50000 token, Bạc 10 lượt và 100000 token, Vàng 25 lượt và 250000 token.")]
    public async Task<ActionResult<AiRecommendationAccessDto>> Access(string memberUserId)
    {
        try
        {
            return Ok(await flow.AccessAsync(memberUserId));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [HttpPut("body")]
    [EndpointSummary("Input Body BMI Data")]
    [EndpointDescription("Nhập chiều cao (cm) và cân nặng (kg). Ví dụ: { \"heightCm\": 170, \"weightKg\": 80 }.")]
    public async Task<ActionResult<BodyMetricResponse>> InputBody(string memberUserId, BodyMetricRequest request)
    {
        try
        {
            return Ok(await flow.InputBodyAsync(memberUserId, request));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [HttpPost("goals")]
    [EndpointSummary("Input Personal Goals")]
    [EndpointDescription("Nhập mục tiêu, số buổi/tuần (2-6) và số phút/buổi (20-90). Hệ thống lấy lịch sử tập coach đã nhập và lịch buổi học của môn, rồi gọi Google Gemini. Coach phải nhập lịch sử tập trước. Ví dụ: { \"goal\": \"Giảm cân\", \"sessionsPerWeek\": 3, \"sessionMinutes\": 45 }.")]
    public async Task<ActionResult<WorkoutPlanResponse>> InputGoals(string memberUserId, PersonalGoalsRequest request)
    {
        try
        {
            return Ok(await flow.InputGoalsAsync(memberUserId, request));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [HttpPost("{recommendationId:int}/decision")]
    [EndpointSummary("Edit Required?")]
    [EndpointDescription("recommendationId lấy từ response của Input Personal Goals. Yes: { \"editRequired\": true, \"changes\": \"Tập nhẹ hơn vào buổi sáng và bớt 1 buổi\" } gọi lại Google Gemini và tính 1 lượt tạo lại. No: { \"editRequired\": false } lưu giáo án và đồng bộ lịch, không tính lượt tạo lại.")]
    public async Task<ActionResult<WorkoutDecisionResponse>> Decide(string memberUserId, int recommendationId, WorkoutDecisionRequest request)
    {
        try
        {
            return Ok(await flow.DecideAsync(memberUserId, recommendationId, request));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [HttpPost("regenerate")]
    [EndpointSummary("Member yêu cầu tạo lại giáo án")]
    [EndpointDescription("Tạo lại giáo án đã có, kể cả giáo án đã lưu. Mỗi lần tính 1 lượt tạo lại và cộng token Gemini. Hết lượt hoặc hết token thì từ chối. Ví dụ: { \"changes\": \"Bổ trợ môn bơi theo lịch sử tập coach đã nhập, tránh ngày có buổi học\" }.")]
    public async Task<ActionResult<WorkoutPlanResponse>> Regenerate(string memberUserId, RegenerateWorkoutRequest request)
    {
        try
        {
            return Ok(await flow.RegenerateAsync(memberUserId, request));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [HttpGet("routine")]
    [EndpointSummary("View Daily Exercise Routine")]
    [EndpointDescription("Xem bài tập đã đồng bộ trên lịch cá nhân sau khi Edit Required = No.")]
    public async Task<ActionResult<DailyRoutineDto>> ViewRoutine(string memberUserId)
    {
        try
        {
            return Ok(await flow.ViewRoutineAsync(memberUserId));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    private bool MapFlowError(Exception exception, out ActionResult? result)
    {
        result = exception switch
        {
            KeyNotFoundException keyNotFound => NotFound(new { message = keyNotFound.Message }),
            InvalidOperationException invalid => BadRequest(new { message = invalid.Message }),
            _ => null,
        };
        return result is not null;
    }
}
