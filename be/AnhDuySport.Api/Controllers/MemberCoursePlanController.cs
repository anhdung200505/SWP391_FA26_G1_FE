using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

[Authorize(Roles = "MEMBER")]
[ApiController]
[FlowErrors]
[Route("api/members/course-plans")]
public class MemberCoursePlanController(CoachCourseAiFlowService ai) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("Học viên xem bài tập và bài thi đã phát hành")]
    [EndpointDescription("Chỉ lớp đang ghi danh và chỉ bản published. Không có đáp án gợi ý.")]
    public async Task<ActionResult<IReadOnlyList<MemberCoursePlanDto>>> List() =>
        Ok(await ai.ListForMemberAsync());
}
