using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

// Coach ghi lịch sử theo từng buổi đã học. Đánh giá tổng nằm ở evaluation.assignment_id IS NULL.
[AllowAnonymous]
[ApiController]
[Route("api/coaches/{coachUserId}/training-history")]
[Tags("AI Workout Recommendation")]
public class CoachTrainingHistoryController(WorkoutRecommendationFlowService flow) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("Coach xem lớp và lịch sử tập đã nhập")]
    [EndpointDescription("Trả về các lớp coach phụ trách, kể cả lớp chưa có học viên ghi danh, học viên đang học trong lớp, và lịch sử tập coach đã ghi. Dùng classId và memberUserId ở đây cho bước nhập.")]
    public async Task<ActionResult<CoachTrainingHistoryListDto>> List(string coachUserId)
    {
        try
        {
            return Ok(await flow.ListCoachHistoryAsync(coachUserId));
        }
        catch (Exception exception) when (MapFlowError(exception, out var result))
        {
            return result!;
        }
    }

    [HttpPost]
    [EndpointSummary("Coach nhập lịch sử tập")]
    [EndpointDescription("Coach ghi nội dung đã tập của một buổi đã học. Buổi chưa tới hoặc đã hủy bị từ chối. Ví dụ: { \"memberUserId\": \"11\", \"classId\": 1, \"sessionId\": 3, \"content\": \"Bơi ếch 4x25m, nhịp thở còn gấp.\" }")]
    public async Task<ActionResult<SaveCoachTrainingHistoryResponse>> Save(string coachUserId, CoachTrainingHistoryRequest request)
    {
        try
        {
            return Ok(await flow.SaveCoachHistoryAsync(coachUserId, request));
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
