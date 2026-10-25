using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

// Coach tự nhập lịch sử tập. Phần này không lấy điểm danh, nhận xét hay điểm.
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
    [EndpointDescription("Coach ghi nội dung đã tập với học viên. Nội dung này được đưa vào Google Gemini khi tạo hoặc tạo lại giáo án. Không dùng điểm danh, nhận xét hay điểm. Ví dụ: { \"memberUserId\": \"11\", \"classId\": 1, \"content\": \"Bơi ếch 4x25m, nhịp thở còn gấp. Cần bài thở trên cạn 10 phút trước giờ xuống nước.\" }")]
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
