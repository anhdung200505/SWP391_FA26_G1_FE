using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnhDuySport.Api.Controllers;

[Authorize(Roles = "COACH")]
[ApiController]
[FlowErrors]
[Route("api/coach/classes")]
public class CoachCourseController(CoachCourseFlowService courses, CoachCourseAiFlowService ai) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("Coach xem lớp được giao")]
    [EndpointDescription("Lớp có coach_user_id đúng người đang đăng nhập. Kèm khóa, môn, sĩ số đang học và số buổi chưa hủy.")]
    public async Task<ActionResult<IReadOnlyList<CoachClassListItemDto>>> List() =>
        Ok(await courses.ListAsync());

    [HttpGet("{classId}")]
    [EndpointSummary("Coach xem thông tin một lớp")]
    [EndpointDescription("Lịch tuần, sĩ số đang học và toàn bộ buổi. Lớp của coach khác trả 404.")]
    public async Task<ActionResult<CoachClassDetailDto>> Detail(string classId) =>
        Ok(await courses.DetailAsync(classId));

    [HttpGet("{classId}/sessions/{sessionId}/attendance")]
    [EndpointSummary("Xem điểm danh một buổi")]
    public async Task<ActionResult<AttendanceSheetDto>> Attendance(string classId, string sessionId) =>
        Ok(await courses.AttendanceAsync(classId, sessionId));

    [HttpPut("{classId}/sessions/{sessionId}/attendance")]
    [EndpointSummary("Lưu điểm danh và ghi audit log")]
    [EndpointDescription("Gửi đủ học viên đang học. status: present, late hoặc absent. Buổi đã hủy trả 400.")]
    public async Task<ActionResult<AttendanceSheetDto>> SaveAttendance(string classId, string sessionId, SubmitAttendanceRequest request) =>
        Ok(await courses.SaveAttendanceAsync(classId, sessionId, request));

    [HttpGet("{classId}/evaluations")]
    [EndpointSummary("Xem điểm, nhận xét và tiêu chí chấm")]
    [EndpointDescription("Tiêu chí lấy từ bản nháp AI nếu có, không thì từ bản đã phát hành. Điểm là một số từ 0 đến 10.")]
    public async Task<ActionResult<EvaluationSheetDto>> Evaluations(string classId) =>
        Ok(await courses.EvaluationsAsync(classId));

    [HttpPut("{classId}/evaluations")]
    [EndpointSummary("Lưu điểm và nhận xét một học viên")]
    public async Task<ActionResult<EvaluationSheetDto>> SaveEvaluation(string classId, SaveEvaluationRequest request) =>
        Ok(await courses.SaveEvaluationAsync(classId, request));

    [HttpGet("{classId}/assignments")]
    [EndpointSummary("Xem bài tập theo buổi")]
    public async Task<ActionResult<IReadOnlyList<AssignmentItemDto>>> Assignments(string classId) =>
        Ok(await courses.AssignmentsAsync(classId));

    [HttpPost("{classId}/assignments")]
    [EndpointSummary("Thêm bài tập cho một buổi")]
    public async Task<ActionResult<IReadOnlyList<AssignmentItemDto>>> CreateAssignment(string classId, SaveAssignmentRequest request) =>
        Ok(await courses.CreateAssignmentAsync(classId, request));

    [HttpPut("{classId}/assignments/{assignmentId}")]
    [EndpointSummary("Sửa bài tập")]
    public async Task<ActionResult<IReadOnlyList<AssignmentItemDto>>> UpdateAssignment(string classId, string assignmentId, SaveAssignmentRequest request) =>
        Ok(await courses.UpdateAssignmentAsync(classId, assignmentId, request));

    [HttpDelete("{classId}/assignments/{assignmentId}")]
    [EndpointSummary("Xóa bài tập chưa có đánh giá")]
    public async Task<ActionResult<IReadOnlyList<AssignmentItemDto>>> DeleteAssignment(string classId, string assignmentId) =>
        Ok(await courses.DeleteAssignmentAsync(classId, assignmentId));

    [HttpGet("{classId}/ai")]
    [EndpointSummary("Xem mô tả, bản vừa sinh, nháp và bản đã phát hành")]
    public async Task<ActionResult<CourseAiWorkspaceDto>> Ai(string classId) =>
        Ok(await ai.WorkspaceAsync(classId));

    [HttpPost("{classId}/ai/generate")]
    [EndpointSummary("Sinh bài tập theo buổi, bài thi và tiêu chí")]
    [EndpointDescription("Dùng mô tả coach gửi lên và lịch sử tập coach đã ghi cho đúng lớp. Kết quả là bản preview, chưa thay nháp đã lưu. Tối đa 16 buổi.")]
    public async Task<ActionResult<CourseAiWorkspaceDto>> Generate(string classId, GenerateCoursePlanRequest request) =>
        Ok(await ai.GenerateAsync(classId, request));

    [HttpPost("{classId}/ai/regenerate")]
    [EndpointSummary("Sinh lại theo yêu cầu sửa")]
    [EndpointDescription("Gọi lại Gemini. Bản nháp đã lưu giữ nguyên đến khi coach bấm lưu.")]
    public async Task<ActionResult<CourseAiWorkspaceDto>> Regenerate(string classId, RegenerateCoursePlanRequest request) =>
        Ok(await ai.RegenerateAsync(classId, request));

    [HttpPut("{classId}/ai/draft")]
    [EndpointSummary("Lưu bản đang sửa thành nháp")]
    [EndpointDescription("Ghi đè nháp và xóa preview. Học viên chưa thấy bản này.")]
    public async Task<ActionResult<CourseAiWorkspaceDto>> SaveDraft(string classId, SaveCoursePlanRequest request) =>
        Ok(await ai.SaveDraftAsync(classId, request));

    [HttpPost("{classId}/ai/publish")]
    [EndpointSummary("Phát hành nháp cho học viên trong lớp")]
    [EndpointDescription("Học viên chỉ đọc đề và tiêu chí, không thấy đáp án. Học viên nhận thông báo.")]
    public async Task<ActionResult<CourseAiWorkspaceDto>> Publish(string classId) =>
        Ok(await ai.PublishAsync(classId));

    [HttpDelete("{classId}/ai/preview")]
    [EndpointSummary("Bỏ bản vừa sinh, giữ nháp")]
    public async Task<ActionResult<CourseAiWorkspaceDto>> DiscardPreview(string classId) =>
        Ok(await ai.DiscardPreviewAsync(classId));
}
