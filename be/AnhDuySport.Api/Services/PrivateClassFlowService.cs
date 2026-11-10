using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Học 1-1: member gửi yêu cầu (chưa giữ lịch), quản lý duyệt thì sinh lớp private sĩ số 1 cùng toàn bộ buổi học và giữ 24 giờ chờ thanh toán.
// Thanh toán đi qua luồng đăng ký lớp. Quá hạn chưa trả thì yêu cầu expired, lớp và buổi bị hủy (dọn khi có truy cập, không có job nền).
public class PrivateClassFlowService(
    AppDbContext db,
    CurrentActor actor,
    ClassRegistrationFlowService registration,
    EmailNotificationService email,
    ILogger<PrivateClassFlowService> logger)
{
    private const int MaxPendingPerMember = 3;
    private const int ApprovalHours = 24;
    private const string ScheduleLock = "private-class-schedule";
    private static readonly string[] StatusFilters = ["pending", "approved", "paid", "rejected", "cancelled", "expired"];

    // ---------- Member ----------

    public async Task<IReadOnlyList<PrivateCourseDto>> AccessCoursesAsync(string? sportId)
    {
        var query = db.Courses.AsNoTracking().Where(course => course.Format == "private" && course.Status == "active");
        if (!string.IsNullOrWhiteSpace(sportId))
        {
            if (!int.TryParse(sportId, out var sportKey))
            {
                throw new KeyNotFoundException("Không tìm thấy môn thể thao.");
            }

            query = query.Where(course => course.SportId == sportKey);
        }

        var rows = await query
            .OrderBy(course => course.Sport!.SportName)
            .ThenBy(course => course.CourseName)
            .Select(course => new
            {
                course.CourseId,
                course.SportId,
                course.Sport!.SportName,
                course.CourseName,
                course.SessionCount,
                course.SessionMinutes,
                course.Price,
            })
            .ToListAsync();

        return rows
            .Select(row => new PrivateCourseDto(
                row.CourseId.ToString(),
                row.SportId.ToString(),
                row.SportName,
                row.CourseName,
                row.SessionCount ?? 0,
                row.SessionMinutes ?? 0,
                row.Price))
            .ToList();
    }

    // HLV dạy môn của gói, để học viên chọn HLV trước rồi mới xem lịch.
    public async Task<IReadOnlyList<PrivateCoachDto>> AccessCoachesAsync(string courseId)
    {
        var course = await LoadPrivateCourseAsync(courseId);
        return (await SportCoachesAsync(course.SportId))
            .Select(coach => new PrivateCoachDto(coach.UserId.ToString(), coach.FullName))
            .ToList();
    }

    // Ô (thứ x khung giờ) nào HLV hoặc chính học viên đã bận. Mỗi ô xét như học một buổi mỗi tuần cho tới đủ số buổi của gói
    // (trường hợp dài nhất), nên HLV bận ở bất kỳ tuần nào trong khoảng đó thì ô bị xám.
    public async Task<PrivateCoachScheduleDto> CoachScheduleAsync(int memberUserId, PrivateCoachScheduleRequest request)
    {
        await SweepAsync();
        var course = await LoadPrivateCourseAsync(request.CourseId);
        var start = RequireFutureStart(request.StartDate);
        var coach = await FindSportCoachAsync(request.CoachUserId, course.SportId);
        var count = course.SessionCount ?? 0;
        if (count <= 0)
        {
            throw new RegistrationException("Gói học chưa cấu hình số buổi.");
        }

        var slots = await db.TimeSlots.AsNoTracking()
            .Where(slot => slot.Kind == "private" && slot.IsActive)
            .OrderBy(slot => slot.StartTime)
            .ToListAsync();
        var now = DateTime.Now;
        var cells = new List<(byte Weekday, TimeSlot Slot, List<ClassSession> Planned)>();
        for (byte weekday = 2; weekday <= 7; weekday++)
        {
            foreach (var slot in slots)
            {
                cells.Add((weekday, slot, ClassSessionPlanner.PlanCount(0, start, count, [(weekday, slot)], 0, 0, now)));
            }
        }

        var from = cells.Min(cell => cell.Planned.Min(session => session.SessionDate));
        var to = cells.Max(cell => cell.Planned.Max(session => session.SessionDate));
        var coachBooked = await CoachBookedAsync([coach.UserId], from, to);
        var memberBooked = await MemberBookedAsync(memberUserId, from, to);

        var busy = new List<PrivateBusyCellDto>();
        foreach (var (weekday, slot, planned) in cells)
        {
            var reason = FirstOverlap(coachBooked, planned, "Huấn luyện viên đã có lớp")
                ?? FirstOverlap(memberBooked, planned, "Trùng lịch học của bạn với lớp");
            if (reason is not null)
            {
                busy.Add(new PrivateBusyCellDto(weekday, slot.TimeSlotId.ToString(), reason));
            }
        }

        return new PrivateCoachScheduleDto(count, busy);
    }

    public async Task<PrivateAvailabilityDto> CheckAvailabilityAsync(int memberUserId, PrivateAvailabilityRequest request)
    {
        await SweepAsync();
        var course = await LoadPrivateCourseAsync(request.CourseId);
        var start = RequireFutureStart(request.StartDate);
        var schedule = await ResolveScheduleAsync(request.Slots ?? [], course.SessionCount ?? 0);
        var plan = await BuildPlanAsync(course, memberUserId, start, schedule);
        if (plan.MemberReason is not null)
        {
            throw new RegistrationException(plan.MemberReason);
        }

        var coaches = await SportCoachesAsync(course.SportId);
        var busy = await CoachConflictsAsync(coaches.Select(coach => coach.UserId).ToList(), plan.Planned);
        return new PrivateAvailabilityDto(
            plan.Planned.Count,
            plan.Planned.Count == 0 ? null : plan.Planned.Min(session => session.SessionDate),
            plan.Planned.Count == 0 ? null : plan.Planned.Max(session => session.SessionDate),
            plan.Room is not null,
            coaches
                .Select(coach => new PrivateCoachOptionDto(
                    coach.UserId.ToString(), coach.FullName, busy.ContainsKey(coach.UserId), busy.GetValueOrDefault(coach.UserId)))
                .ToList());
    }

    public async Task<PrivateRequestDto> CreateRequestAsync(int memberUserId, CreatePrivateRequest request)
    {
        await SweepAsync();
        var member = await FindActiveMemberAsync(memberUserId);
        var course = await LoadPrivateCourseAsync(request.CourseId);
        var start = RequireFutureStart(request.StartDate);
        var schedule = await ResolveScheduleAsync(request.Slots ?? [], course.SessionCount ?? 0);
        var note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        if (note is { Length: > 500 })
        {
            throw new RegistrationException("Ghi chú tối đa 500 ký tự.");
        }

        var coach = await FindSportCoachAsync(request.CoachUserId, course.SportId);

        if (request.FullName is not null && string.IsNullOrWhiteSpace(request.FullName))
        {
            throw new RegistrationException("Họ tên không được để trống.");
        }

        if (request.DateOfBirth > DateOnly.FromDateTime(DateTime.Now))
        {
            throw new RegistrationException("Ngày sinh không hợp lệ.");
        }

        var phone = string.IsNullOrWhiteSpace(request.Phone) ? null : AccountPhone.Require(request.Phone);

        // Gói hội viên kiểm tra ngay lúc gửi để học viên biết sớm; giá chốt lúc thanh toán.
        var today = DateOnly.FromDateTime(DateTime.Now);
        var choice = await ClassMembershipBonus.ResolveForClassAsync(db, member.UserId, request.MembershipPackageId, request.RenewMembership, today);
        if (choice.Package is not null)
        {
            await ClassMembershipBonus.EnsureNotDowngradeAsync(db, member.UserId, choice.Package, today);
        }

        var packageId = int.TryParse(request.MembershipPackageId, out var parsedPackage) ? parsedPackage : (int?)null;

        var created = await AppLock.RunAsync(db, $"private-member-{member.UserId}", async () =>
        {
            var plan = await BuildPlanAsync(course, member.UserId, start, schedule, coach.UserId);
            if (plan.MemberReason is not null)
            {
                throw new RegistrationException(plan.MemberReason);
            }

            if (plan.CoachReason is not null)
            {
                throw new RegistrationException(plan.CoachReason);
            }

            if (plan.Room is null)
            {
                throw new RegistrationException("Hiện không còn phòng 1-1 trống cho toàn bộ các buổi của gói. Hãy chọn lịch khác.");
            }

            var pending = await db.PrivateClassRequests.CountAsync(item => item.MemberUserId == member.UserId && item.Status == "pending");
            if (pending >= MaxPendingPerMember)
            {
                throw new RegistrationException($"Bạn đang có {MaxPendingPerMember} yêu cầu học 1-1 chờ duyệt. Hãy đợi duyệt hoặc hủy bớt trước khi gửi thêm.");
            }

            var item = new PrivateClassRequest
            {
                MemberUserId = member.UserId,
                CourseId = course.CourseId,
                CoachUserId = coach.UserId,
                StartDate = start,
                Note = note,
                MembershipPackageId = packageId,
                RenewMembership = request.RenewMembership,
                FullName = request.FullName?.Trim(),
                Phone = phone,
                DateOfBirth = request.DateOfBirth,
                Gender = request.Gender,
                Status = "pending",
                CreatedAt = DateTime.Now,
                Slots = schedule
                    .Select(entry => new PrivateClassRequestSlot { Weekday = entry.Weekday, TimeSlotId = entry.Slot.TimeSlotId })
                    .ToList(),
            };
            db.PrivateClassRequests.Add(item);
            await db.SaveChangesAsync();
            return item.RequestId;
        });

        // Không còn bước chờ quản lý duyệt: lịch hợp lệ được giữ chỗ ngay, học viên thanh toán trong thời hạn giữ chỗ.
        try
        {
            return await ApproveCoreAsync(created.ToString(), automatic: true);
        }
        catch
        {
            var stuck = await db.PrivateClassRequests.Include(item => item.Slots).FirstOrDefaultAsync(item => item.RequestId == created && item.Status == "pending");
            if (stuck is not null)
            {
                db.PrivateClassRequestSlots.RemoveRange(stuck.Slots);
                db.PrivateClassRequests.Remove(stuck);
                await db.SaveChangesAsync();
            }

            throw;
        }
    }

    public async Task<IReadOnlyList<PrivateRequestDto>> AccessMineAsync(int memberUserId)
    {
        await SweepAsync();
        var items = await db.PrivateClassRequests.AsNoTracking()
            .Include(item => item.Slots)
            .Where(item => item.MemberUserId == memberUserId)
            .OrderByDescending(item => item.CreatedAt)
            .ThenByDescending(item => item.RequestId)
            .ToListAsync();
        return await ToDtosAsync(items);
    }

    public async Task<PrivateRequestDto> CancelAsync(int memberUserId, string requestId)
    {
        var id = ParseRequestId(requestId);
        await SweepAsync();
        await AppLock.RunAsync(db, ScheduleLock, async () =>
        {
            var request = await db.PrivateClassRequests.FirstOrDefaultAsync(item => item.RequestId == id && item.MemberUserId == memberUserId)
                ?? throw new KeyNotFoundException("Không tìm thấy yêu cầu học 1-1.");
            if (request.Status == "pending")
            {
                request.Status = "cancelled";
                await db.SaveChangesAsync();
                return 0;
            }

            if (request.Status != "approved" || request.ClassId is not int classId)
            {
                throw new RegistrationException("Yêu cầu này không còn hủy được.");
            }

            if (await IsPaidAsync(request))
            {
                throw new RegistrationException("Yêu cầu đã thanh toán nên không hủy được. Hãy liên hệ trung tâm.");
            }

            if (await registration.LiveHolds().AnyAsync(hold => hold.ClassId == classId))
            {
                throw new RegistrationException("Đơn thanh toán đang mở (giữ 3 phút). Hãy thanh toán hoặc đợi hết hạn rồi hủy.");
            }

            await ReleaseAsync(request, "cancelled");
            return 0;
        });

        return (await LoadDtosAsync([id])).Single();
    }

    // Đơn thanh toán đi qua luồng đăng ký lớp: giữ chỗ 3 phút, tặng hạng hội viên thấp nhất như lớp nhóm.
    public async Task<ClassRegistrationDto> PayAsync(int memberUserId, string requestId)
    {
        var id = ParseRequestId(requestId);
        await SweepAsync();
        var request = await db.PrivateClassRequests.AsNoTracking()
            .FirstOrDefaultAsync(item => item.RequestId == id && item.MemberUserId == memberUserId)
            ?? throw new KeyNotFoundException("Không tìm thấy yêu cầu học 1-1.");

        if (request.Status == "approved" && await IsPaidAsync(request))
        {
            throw new RegistrationException("Yêu cầu này đã được thanh toán.");
        }

        if (request.Status != "approved" || request.ClassId is not int classId)
        {
            throw new RegistrationException(request.Status switch
            {
                "pending" => "Yêu cầu chưa được duyệt, chưa thanh toán được.",
                "expired" => "Yêu cầu đã quá hạn thanh toán, lớp đã được nhả. Hãy gửi yêu cầu mới.",
                _ => "Yêu cầu này không thanh toán được.",
            });
        }

        var sportId = await db.Courses.Where(course => course.CourseId == request.CourseId).Select(course => course.SportId).FirstAsync();
        return await registration.SubmitRegistrationAsync(
            memberUserId,
            new CreateClassRegistrationRequest(
                sportId.ToString(),
                classId.ToString(),
                null,
                request.FullName,
                request.Phone,
                request.DateOfBirth,
                request.Gender,
                request.MembershipPackageId?.ToString(),
                request.RenewMembership),
            allowPrivate: true);
    }

    // ---------- Quản lý ----------

    public async Task<IReadOnlyList<PrivateRequestDto>> AccessAllAsync(string? status)
    {
        string? statusKey = null;
        if (!string.IsNullOrWhiteSpace(status))
        {
            statusKey = status.Trim().ToLowerInvariant();
            if (!StatusFilters.Contains(statusKey))
            {
                throw new RegistrationException("Trạng thái phải là pending, approved, paid, rejected, cancelled hoặc expired.");
            }
        }

        await SweepAsync();
        var dbStatus = statusKey == "paid" ? "approved" : statusKey;
        var query = db.PrivateClassRequests.AsNoTracking().Include(item => item.Slots).AsQueryable();
        if (dbStatus is not null)
        {
            query = query.Where(item => item.Status == dbStatus);
        }

        var items = statusKey == "pending"
            ? await query.OrderBy(item => item.CreatedAt).ThenBy(item => item.RequestId).ToListAsync()
            : await query.OrderByDescending(item => item.CreatedAt).ThenByDescending(item => item.RequestId).ToListAsync();
        var dtos = await ToDtosAsync(items);
        return statusKey is "paid" or "approved" ? dtos.Where(dto => dto.Status == statusKey).ToList() : dtos;
    }

    public async Task<PrivateRequestDto> AccessDetailAsync(string requestId)
    {
        var id = ParseRequestId(requestId);
        await SweepAsync();
        var request = await db.PrivateClassRequests.AsNoTracking().Include(item => item.Slots)
            .FirstOrDefaultAsync(item => item.RequestId == id)
            ?? throw new KeyNotFoundException("Không tìm thấy yêu cầu học 1-1.");
        var dto = (await ToDtosAsync([request])).Single();

        var course = await db.Courses.AsNoTracking().Include(item => item.Sport).FirstAsync(item => item.CourseId == request.CourseId);
        var schedule = await ScheduleOfAsync(request);
        var planned = ClassSessionPlanner.PlanCount(0, request.StartDate, course.SessionCount ?? 0, schedule, 0, 0, DateTime.Now);
        var preview = planned
            .Select((session, index) => new PrivateSessionPreviewDto(index + 1, session.SessionDate, session.StartTime, session.EndTime))
            .ToList();
        if (request.Status != "pending")
        {
            return dto with { CanApprove = false, PlannedSessions = preview };
        }

        Plan plan;
        try
        {
            plan = await BuildPlanAsync(course, request.MemberUserId, request.StartDate, schedule, request.CoachUserId);
        }
        catch (RegistrationException exception)
        {
            return dto with { CanApprove = false, BlockReason = exception.Message, PlannedSessions = preview };
        }

        var block = BlockReasonOf(plan, request.StartDate);
        return dto with
        {
            CanApprove = block is null,
            BlockReason = block,
            PlannedSessions = preview,
            RoomId = plan.Room?.RoomId.ToString(),
            RoomName = plan.Room?.RoomName,
        };
    }

    public Task<PrivateRequestDto> ApproveAsync(string requestId) => ApproveCoreAsync(requestId, automatic: false);

    private async Task<PrivateRequestDto> ApproveCoreAsync(string requestId, bool automatic)
    {
        var id = ParseRequestId(requestId);
        await SweepAsync();
        var done = await AppLock.RunAsync(db, ScheduleLock, async () =>
        {
            var request = await db.PrivateClassRequests.Include(item => item.Slots).FirstOrDefaultAsync(item => item.RequestId == id)
                ?? throw new KeyNotFoundException("Không tìm thấy yêu cầu học 1-1.");
            if (request.Status != "pending")
            {
                throw new RegistrationException("Yêu cầu không còn ở trạng thái chờ duyệt.");
            }

            var course = await db.Courses.Include(item => item.Sport).FirstAsync(item => item.CourseId == request.CourseId);
            var member = await db.UserAccounts.FirstAsync(user => user.UserId == request.MemberUserId);
            var coach = await db.UserAccounts.FirstAsync(user => user.UserId == request.CoachUserId);
            var schedule = await ScheduleOfAsync(request);
            var plan = await BuildPlanAsync(course, request.MemberUserId, request.StartDate, schedule, request.CoachUserId);
            var block = BlockReasonOf(plan, request.StartDate) ?? (coach.Status == "active" ? null : "Huấn luyện viên không còn hoạt động.");
            if (block is not null)
            {
                throw new RegistrationException(block);
            }

            var trainingPlanId = await db.TrainingPlans
                .Where(item => item.SportId == course.SportId)
                .Select(item => (int?)item.TrainingPlanId)
                .FirstOrDefaultAsync()
                ?? throw new RegistrationException("Môn này chưa có giáo án chuẩn.");

            var now = DateTime.Now;
            var room = plan.Room!;
            var made = new TrainingClass
            {
                CourseId = course.CourseId,
                TrainingPlanId = trainingPlanId,
                CoachUserId = coach.UserId,
                RoomId = room.RoomId,
                ClassName = Shorten($"{course.CourseName} - {member.FullName}", 200),
                StartDate = plan.Planned.Min(session => session.SessionDate),
                EndDate = plan.Planned.Max(session => session.SessionDate),
                Capacity = 1,
                Status = "open",
                ClassType = "private",
            };
            db.Classes.Add(made);
            await db.SaveChangesAsync();

            foreach (var (weekday, slot) in schedule)
            {
                db.ClassSchedules.Add(new ClassSchedule { ClassId = made.ClassId, Weekday = weekday, TimeSlotId = slot.TimeSlotId });
            }

            db.ClassSessions.AddRange(ClassSessionPlanner.PlanCount(
                made.ClassId, request.StartDate, course.SessionCount ?? 0, schedule, coach.UserId, room.RoomId, now));

            var summary = ScheduleSummary(schedule, made.StartDate!.Value, plan.Planned.Count);
            request.Status = "approved";
            request.ClassId = made.ClassId;
            request.DecidedByUserId = automatic || actor.UserId == 0 ? null : actor.UserId;
            request.DecidedAt = now;
            request.ApprovalExpiresAt = now.AddHours(ApprovalHours);

            db.Notifications.Add(new AccountNotification
            {
                UserId = member.UserId,
                Title = automatic ? "Đã giữ lịch học 1-1" : "Yêu cầu học 1-1 đã được duyệt",
                Content = $"Lịch học 1-1 \"{course.CourseName}\" với HLV {coach.FullName} {(automatic ? "đã được giữ cho bạn" : "đã được duyệt")}. {summary} Hãy thanh toán trước {request.ApprovalExpiresAt:HH:mm dd/MM/yyyy}.",
                CreatedAt = now,
            });
            db.Notifications.Add(new AccountNotification
            {
                UserId = coach.UserId,
                Title = "Lớp 1-1 mới được giao",
                Content = $"Bạn được giao lớp 1-1 \"{course.CourseName}\" của học viên {member.FullName}. {summary}",
                CreatedAt = now,
            });
            db.ActivityLogs.Add(new ActivityLog
            {
                ActorUserId = actor.UserId == 0 ? null : actor.UserId,
                Action = Shorten(automatic ? $"Giữ lịch học 1-1 của {member.FullName}" : $"Duyệt yêu cầu học 1-1 của {member.FullName}", 100),
                EntityName = "class",
                EntityId = made.ClassId,
                Detail = $"Duyệt yêu cầu học 1-1 của {member.FullName}: lớp {made.ClassName}, HLV {coach.FullName}, phòng {room.RoomName}, {plan.Planned.Count} buổi.",
                CreatedAt = now,
            });

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateException exception) when (ClassSessionPlanner.IsRuleViolation(exception, out var message))
            {
                throw new RegistrationException(message);
            }

            return new Approved(member, coach, course.CourseName, summary, request.ApprovalExpiresAt!.Value);
        });

        await TrySendAsync(
            () => email.SendPrivateApprovedToMemberAsync(done.Member, done.CourseName, done.Coach.FullName, done.Summary, done.PayBefore),
            "member");
        await TrySendAsync(
            () => email.SendPrivateApprovedToCoachAsync(done.Coach, done.Member.FullName, done.CourseName, done.Summary),
            "coach");
        return (await LoadDtosAsync([id])).Single();
    }

    public async Task<PrivateRequestDto> RejectAsync(string requestId, string? reason)
    {
        var id = ParseRequestId(requestId);
        var text = reason?.Trim() ?? "";
        if (text.Length == 0)
        {
            throw new RegistrationException("Cần nhập lý do từ chối.");
        }

        if (text.Length > 500)
        {
            throw new RegistrationException("Lý do tối đa 500 ký tự.");
        }

        await SweepAsync();
        var done = await AppLock.RunAsync(db, ScheduleLock, async () =>
        {
            var request = await db.PrivateClassRequests.FirstOrDefaultAsync(item => item.RequestId == id)
                ?? throw new KeyNotFoundException("Không tìm thấy yêu cầu học 1-1.");
            if (request.Status != "pending")
            {
                throw new RegistrationException("Yêu cầu không còn ở trạng thái chờ duyệt.");
            }

            var member = await db.UserAccounts.FirstAsync(user => user.UserId == request.MemberUserId);
            var courseName = await db.Courses.Where(course => course.CourseId == request.CourseId).Select(course => course.CourseName).FirstAsync();
            var now = DateTime.Now;
            request.Status = "rejected";
            request.RejectReason = text;
            request.DecidedByUserId = actor.UserId == 0 ? null : actor.UserId;
            request.DecidedAt = now;
            db.Notifications.Add(new AccountNotification
            {
                UserId = member.UserId,
                Title = "Yêu cầu học 1-1 chưa được duyệt",
                Content = $"Yêu cầu học 1-1 \"{courseName}\" chưa được duyệt. Lý do: {text}. Bạn có thể gửi lại với lịch hoặc huấn luyện viên khác.",
                CreatedAt = now,
            });
            db.ActivityLogs.Add(new ActivityLog
            {
                ActorUserId = actor.UserId == 0 ? null : actor.UserId,
                Action = Shorten($"Từ chối yêu cầu học 1-1 của {member.FullName}", 100),
                EntityName = "private_class_request",
                EntityId = request.RequestId,
                Detail = $"Từ chối yêu cầu học 1-1 \"{courseName}\" của {member.FullName}. Lý do: {text}",
                CreatedAt = now,
            });
            await db.SaveChangesAsync();
            return (member, courseName);
        });

        await TrySendAsync(() => email.SendPrivateRejectedAsync(done.member, done.courseName, text), "member");
        return (await LoadDtosAsync([id])).Single();
    }

    private sealed record Approved(UserAccount Member, UserAccount Coach, string CourseName, string Summary, DateTime PayBefore);

    // ---------- Hết hạn thanh toán ----------

    // Yêu cầu đã duyệt, quá hạn, chưa có ghi danh và không còn đơn đang giữ chỗ: hủy lớp và các buổi để nhả HLV, phòng.
    private async Task SweepAsync()
    {
        var now = DateTime.Now;
        var due = await db.PrivateClassRequests.AsNoTracking()
            .Where(item => item.Status == "approved" && item.ApprovalExpiresAt < now && item.ClassId != null)
            .Select(item => item.RequestId)
            .ToListAsync();
        foreach (var id in due)
        {
            try
            {
                await AppLock.RunAsync(db, ScheduleLock, async () =>
                {
                var request = await db.PrivateClassRequests.FirstOrDefaultAsync(item => item.RequestId == id);
                if (request is { Status: "approved", ClassId: int classId }
                    && request.ApprovalExpiresAt < DateTime.Now
                    && !await IsPaidAsync(request)
                    && !await registration.LiveHolds().AnyAsync(hold => hold.ClassId == classId))
                {
                    await ReleaseAsync(request, "expired");
                }

                return 0;
                });
            }
            catch (Exception exception)
            {
                // Dọn quá hạn là việc phụ: lỗi (vd. khóa bận) không được làm hỏng API đang gọi, lần truy cập sau sẽ dọn tiếp.
                db.ChangeTracker.Clear();
                logger.LogWarning(exception, "Không dọn được yêu cầu 1-1 quá hạn {RequestId}", id);
            }
        }
    }

    // Hủy lớp và buổi của yêu cầu đã duyệt, đóng đơn thanh toán còn treo. Gọi trong transaction của AppLock.
    private async Task ReleaseAsync(PrivateClassRequest request, string status)
    {
        var classId = request.ClassId!.Value;
        request.Status = status;
        var item = await db.Classes.FirstAsync(current => current.ClassId == classId);
        item.Status = "cancelled";
        await db.ClassSessions
            .Where(session => session.ClassId == classId && session.Status == "scheduled")
            .ExecuteUpdateAsync(set => set.SetProperty(session => session.Status, "cancelled"));
        var stale = await db.Payments.Include(payment => payment.Invoice)
            .Where(payment => payment.ClassId == classId && payment.Status == "pending")
            .ToListAsync();
        foreach (var payment in stale)
        {
            payment.Status = "failed";
            payment.Invoice!.Status = "cancelled";
        }

        await db.SaveChangesAsync();
    }

    // ---------- Kiểm tra lịch ----------

    private sealed record Plan(
        List<ClassSession> Planned,
        Room? Room,
        string? MemberReason,
        string? CoachReason);

    private async Task<Plan> BuildPlanAsync(
        Course course,
        int memberUserId,
        DateOnly start,
        IReadOnlyCollection<(byte Weekday, TimeSlot Slot)> schedule,
        int? coachUserId = null)
    {
        var planned = ClassSessionPlanner.PlanCount(0, start, course.SessionCount ?? 0, schedule, 0, 0, DateTime.Now);
        if (planned.Count == 0)
        {
            throw new RegistrationException("Gói học chưa cấu hình số buổi.");
        }

        var memberReason = await MemberConflictAsync(memberUserId, planned);
        string? coachReason = null;
        if (coachUserId is int coachId)
        {
            coachReason = (await CoachConflictsAsync([coachId], planned)).GetValueOrDefault(coachId);
        }

        return new Plan(planned, await PickRoomAsync(course.SportId, planned), memberReason, coachReason);
    }

    private static string? BlockReasonOf(Plan plan, DateOnly start) =>
        start <= DateOnly.FromDateTime(DateTime.Now) ? "Ngày bắt đầu đã qua, hãy từ chối yêu cầu để học viên gửi lại."
        : plan.CoachReason ?? plan.MemberReason
        ?? (plan.Room is null ? "Không còn phòng 1-1 trống cho toàn bộ các buổi của gói." : null);

    private sealed record Booked(int OwnerId, DateOnly Date, TimeOnly Start, TimeOnly End, string ClassName);

    private static string? FirstOverlap(IEnumerable<Booked> booked, List<ClassSession> planned, string prefix)
    {
        foreach (var session in planned)
        {
            var hit = booked.FirstOrDefault(other => other.Date == session.SessionDate && other.Start < session.EndTime && session.StartTime < other.End);
            if (hit is not null)
            {
                return $"{prefix} {hit.ClassName} ngày {hit.Date:dd/MM/yyyy}.";
            }
        }

        return null;
    }

    // Mỗi HLV bận ở buổi nào của gói (có buổi chưa hủy trùng giờ): trả lý do kèm ngày trùng.
    private async Task<Dictionary<int, string>> CoachConflictsAsync(IReadOnlyCollection<int> coachIds, List<ClassSession> planned)
    {
        var result = new Dictionary<int, string>();
        if (coachIds.Count == 0)
        {
            return result;
        }

        var rows = await CoachBookedAsync(coachIds, planned.Min(session => session.SessionDate), planned.Max(session => session.SessionDate));
        foreach (var coachId in coachIds)
        {
            var reason = FirstOverlap(rows.Where(row => row.OwnerId == coachId), planned, "Huấn luyện viên đã có lớp");
            if (reason is not null)
            {
                result[coachId] = reason;
            }
        }

        return result;
    }

    // Học viên không được có buổi (lớp đang học, lớp 1-1 đã duyệt chờ trả tiền, đơn đang giữ chỗ) trùng giờ với gói.
    private async Task<string?> MemberConflictAsync(int memberUserId, List<ClassSession> planned)
    {
        var rows = await MemberBookedAsync(memberUserId, planned.Min(session => session.SessionDate), planned.Max(session => session.SessionDate));
        return FirstOverlap(rows, planned, "Trùng lịch học của bạn với lớp");
    }

    // Các buổi chưa hủy của HLV trong khoảng ngày.
    private async Task<List<Booked>> CoachBookedAsync(IReadOnlyCollection<int> coachIds, DateOnly from, DateOnly to) =>
        await db.ClassSessions.AsNoTracking()
            .Where(session => session.Status != "cancelled"
                && coachIds.Contains(session.CoachUserId)
                && session.SessionDate >= from
                && session.SessionDate <= to)
            .Select(session => new Booked(session.CoachUserId, session.SessionDate, session.StartTime, session.EndTime, session.Class!.ClassName))
            .ToListAsync();

    // Các buổi chưa hủy của học viên (lớp đang học, lớp 1-1 đã duyệt chờ trả tiền, đơn đang giữ chỗ) trong khoảng ngày.
    private async Task<List<Booked>> MemberBookedAsync(int memberUserId, DateOnly from, DateOnly to)
    {
        var classIds = await db.ClassEnrollments.AsNoTracking()
            .Where(enrollment => enrollment.UserId == memberUserId && enrollment.Status == "enrolled")
            .Select(enrollment => enrollment.ClassId)
            .Union(db.PrivateClassRequests.AsNoTracking()
                .Where(item => item.MemberUserId == memberUserId && item.Status == "approved" && item.ClassId != null)
                .Select(item => item.ClassId!.Value))
            .Union(registration.LiveHolds().Where(hold => hold.UserId == memberUserId).Select(hold => hold.ClassId!.Value))
            .ToListAsync();
        if (classIds.Count == 0)
        {
            return [];
        }

        return await db.ClassSessions.AsNoTracking()
            .Where(session => session.Status != "cancelled"
                && classIds.Contains(session.ClassId)
                && session.SessionDate >= from
                && session.SessionDate <= to)
            .Select(session => new Booked(memberUserId, session.SessionDate, session.StartTime, session.EndTime, session.Class!.ClassName))
            .ToListAsync();
    }

    // Một phòng cho cả gói: phòng dùng được cho 1-1 của môn, không có buổi nhóm nào trùng giờ, và số buổi 1-1 cùng lúc chưa chạm private_concurrency.
    private async Task<Room?> PickRoomAsync(int sportId, List<ClassSession> planned)
    {
        var rooms = await db.SportRooms.AsNoTracking()
            .Where(link => link.SportId == sportId && link.AllowPrivate)
            .Join(db.Rooms, link => link.RoomId, room => room.RoomId, (link, room) => room)
            .Where(room => room.IsActive)
            .OrderBy(room => room.RoomId)
            .ToListAsync();
        if (rooms.Count == 0)
        {
            return null;
        }

        var roomIds = rooms.Select(room => room.RoomId).ToList();
        var from = planned.Min(session => session.SessionDate);
        var to = planned.Max(session => session.SessionDate);
        var used = await db.ClassSessions.AsNoTracking()
            .Where(session => session.Status != "cancelled"
                && roomIds.Contains(session.RoomId)
                && session.SessionDate >= from
                && session.SessionDate <= to)
            .Select(session => new { RoomId = session.RoomId, session.SessionDate, session.StartTime, session.EndTime, session.Class!.ClassType })
            .ToListAsync();

        foreach (var room in rooms)
        {
            var inRoom = used.Where(row => row.RoomId == room.RoomId).ToList();
            var fits = planned.All(session =>
            {
                var overlapping = inRoom.Where(row => row.SessionDate == session.SessionDate
                    && row.StartTime < session.EndTime
                    && session.StartTime < row.EndTime).ToList();
                return overlapping.All(row => row.ClassType == "private") && overlapping.Count < room.PrivateConcurrency;
            });
            if (fits)
            {
                return room;
            }
        }

        return null;
    }

    // ---------- Dữ liệu dùng chung ----------

    private async Task<List<(byte Weekday, TimeSlot Slot)>> ResolveScheduleAsync(IReadOnlyCollection<ClassScheduleRequest> requests, int sessionCount)
    {
        if (requests.Count == 0)
        {
            throw new RegistrationException("Chọn ít nhất một khung giờ học trong tuần.");
        }

        // Mỗi ngày chọn là một buổi mỗi tuần: nhiều hơn số buổi của gói thì có ngày không bao giờ được xếp.
        if (sessionCount > 0 && requests.Count > sessionCount)
        {
            throw new RegistrationException($"Gói này chỉ có {sessionCount} buổi, chọn tối đa {sessionCount} ngày học mỗi tuần.");
        }

        var ids = requests.Select(request => int.TryParse(request.TimeSlotId, out var id) ? id : 0).Distinct().ToList();
        var slots = await db.TimeSlots.AsNoTracking()
            .Where(slot => ids.Contains(slot.TimeSlotId) && slot.IsActive)
            .ToDictionaryAsync(slot => slot.TimeSlotId);

        var schedule = new List<(byte Weekday, TimeSlot Slot)>();
        foreach (var request in requests)
        {
            if (request.Weekday is < 2 or > 7)
            {
                throw new RegistrationException("Thứ trong tuần chỉ nhận 2 đến 7 (thứ 2 đến thứ 7).");
            }

            if (!int.TryParse(request.TimeSlotId, out var slotId) || !slots.TryGetValue(slotId, out var slot))
            {
                throw new RegistrationException("Khung giờ không hợp lệ.");
            }

            if (slot.Kind != "private")
            {
                throw new RegistrationException("Học 1-1 chỉ dùng khung giờ 1-1 (private).");
            }

            var weekday = (byte)request.Weekday;
            if (schedule.Any(entry => entry.Weekday == weekday))
            {
                throw new RegistrationException($"{ClassSessionPlanner.WeekdayName(weekday)} chỉ chọn được một khung giờ học 1-1 (mỗi ngày một buổi).");
            }

            schedule.Add((weekday, slot));
        }

        return schedule;
    }

    private async Task<List<(byte Weekday, TimeSlot Slot)>> ScheduleOfAsync(PrivateClassRequest request)
    {
        var ids = request.Slots.Select(slot => slot.TimeSlotId).Distinct().ToList();
        var slots = await db.TimeSlots.AsNoTracking().Where(slot => ids.Contains(slot.TimeSlotId)).ToDictionaryAsync(slot => slot.TimeSlotId);
        return request.Slots
            .OrderBy(slot => slot.Weekday)
            .Select(slot => (slot.Weekday, slots[slot.TimeSlotId]))
            .ToList();
    }

    private async Task<Course> LoadPrivateCourseAsync(string courseId)
    {
        var course = int.TryParse(courseId, out var id)
            ? await db.Courses.AsNoTracking().Include(item => item.Sport)
                .FirstOrDefaultAsync(item => item.CourseId == id && item.Format == "private" && item.Status == "active")
            : null;
        return course ?? throw new RegistrationException("Gói học 1-1 không hợp lệ.");
    }

    // Cần vài ngày để quản lý duyệt và học viên thanh toán trước buổi đầu.
    private const int MinLeadDays = 3;

    private static DateOnly RequireFutureStart(DateOnly? startDate)
    {
        var earliest = DateOnly.FromDateTime(DateTime.Now).AddDays(MinLeadDays);
        if (startDate is not { } start || start < earliest)
        {
            throw new RegistrationException($"Ngày bắt đầu phải từ {earliest:dd/MM/yyyy} trở đi (cách hôm nay ít nhất {MinLeadDays} ngày để trung tâm kịp xử lý).");
        }

        return start;
    }

    private async Task<UserAccount> FindActiveMemberAsync(int userId)
    {
        var member = await db.UserAccounts.Include(user => user.Role).FirstOrDefaultAsync(user => user.UserId == userId);
        if (member is null || member.Role?.RoleCode != "MEMBER")
        {
            throw new KeyNotFoundException("Không tìm thấy học viên.");
        }

        if (member.Status != "active")
        {
            throw new RegistrationException("Tài khoản học viên không hoạt động.");
        }

        return member;
    }

    private Task<List<UserAccount>> SportCoachesAsync(int sportId) =>
        db.UserAccounts.AsNoTracking()
            .Where(user => user.Status == "active"
                && user.Role!.RoleCode == "COACH"
                && db.CoachSports.Any(link => link.CoachUserId == user.UserId && link.SportId == sportId))
            .OrderBy(user => user.FullName)
            .ToListAsync();

    private async Task<UserAccount> FindSportCoachAsync(string coachUserId, int sportId)
    {
        var coach = int.TryParse(coachUserId, out var id)
            ? (await SportCoachesAsync(sportId)).FirstOrDefault(user => user.UserId == id)
            : null;
        return coach ?? throw new RegistrationException("Huấn luyện viên không hợp lệ hoặc không dạy môn này.");
    }

    private Task<bool> IsPaidAsync(PrivateClassRequest request) =>
        db.ClassEnrollments.AnyAsync(enrollment =>
            enrollment.ClassId == request.ClassId && enrollment.UserId == request.MemberUserId);

    private static int ParseRequestId(string requestId) =>
        int.TryParse(requestId, out var id) ? id : throw new KeyNotFoundException("Không tìm thấy yêu cầu học 1-1.");

    private static string Shorten(string value, int max) => value.Length <= max ? value : value[..max];

    private static string ScheduleSummary(IReadOnlyCollection<(byte Weekday, TimeSlot Slot)> schedule, DateOnly first, int count) =>
        "Lịch học: "
        + string.Join(", ", schedule.OrderBy(entry => entry.Weekday).ThenBy(entry => entry.Slot.StartTime)
            .Select(entry => $"{ClassSessionPlanner.WeekdayName(entry.Weekday)} {entry.Slot.StartTime:HH\\:mm}-{entry.Slot.EndTime:HH\\:mm}"))
        + $", {count} buổi từ {first:dd/MM/yyyy}.";

    private async Task TrySendAsync(Func<Task> send, string target)
    {
        try
        {
            await send();
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Không gửi được email 1-1 cho {Target}", target);
        }
    }

    // ---------- DTO ----------

    private async Task<List<PrivateRequestDto>> LoadDtosAsync(IReadOnlyCollection<int> ids)
    {
        var items = await db.PrivateClassRequests.AsNoTracking().Include(item => item.Slots)
            .Where(item => ids.Contains(item.RequestId))
            .ToListAsync();
        return await ToDtosAsync(items);
    }

    private async Task<List<PrivateRequestDto>> ToDtosAsync(List<PrivateClassRequest> items)
    {
        if (items.Count == 0)
        {
            return [];
        }

        var userIds = items.Select(item => item.MemberUserId).Concat(items.Select(item => item.CoachUserId)).Distinct().ToList();
        var users = await db.UserAccounts.AsNoTracking().Where(user => userIds.Contains(user.UserId)).ToDictionaryAsync(user => user.UserId);
        var courseIds = items.Select(item => item.CourseId).Distinct().ToList();
        var courses = await db.Courses.AsNoTracking().Include(course => course.Sport)
            .Where(course => courseIds.Contains(course.CourseId))
            .ToDictionaryAsync(course => course.CourseId);
        var packageIds = items.Where(item => item.MembershipPackageId != null).Select(item => item.MembershipPackageId!.Value).Distinct().ToList();
        var packageNames = await db.MembershipPackages.AsNoTracking()
            .Where(package => packageIds.Contains(package.MembershipPackageId))
            .ToDictionaryAsync(package => package.MembershipPackageId, package => package.PackageName);
        var slotIds = items.SelectMany(item => item.Slots).Select(slot => slot.TimeSlotId).Distinct().ToList();
        var timeSlots = await db.TimeSlots.AsNoTracking().Where(slot => slotIds.Contains(slot.TimeSlotId)).ToDictionaryAsync(slot => slot.TimeSlotId);

        var classIds = items.Where(item => item.ClassId != null).Select(item => item.ClassId!.Value).Distinct().ToList();
        var rooms = await db.Classes.AsNoTracking()
            .Where(current => classIds.Contains(current.ClassId) && current.RoomId != null)
            .Select(current => new { current.ClassId, RoomId = current.RoomId!.Value, current.Room!.RoomName })
            .ToDictionaryAsync(row => row.ClassId);
        var enrolled = (await db.ClassEnrollments.AsNoTracking()
                .Where(enrollment => classIds.Contains(enrollment.ClassId))
                .Select(enrollment => new { enrollment.ClassId, enrollment.UserId })
                .ToListAsync())
            .Select(row => (row.ClassId, row.UserId))
            .ToHashSet();

        var now = DateTime.Now;
        return items.Select(item =>
        {
            var member = users[item.MemberUserId];
            var course = courses[item.CourseId];
            var slots = item.Slots
                .OrderBy(slot => slot.Weekday)
                .ThenBy(slot => timeSlots[slot.TimeSlotId].StartTime)
                .Select(slot => new PrivateSlotDto(
                    slot.Weekday,
                    ClassSessionPlanner.WeekdayName(slot.Weekday),
                    slot.TimeSlotId.ToString(),
                    timeSlots[slot.TimeSlotId].StartTime,
                    timeSlots[slot.TimeSlotId].EndTime))
                .ToList();
            var planned = ClassSessionPlanner.PlanCount(
                0, item.StartDate, course.SessionCount ?? 0,
                item.Slots.Select(slot => (slot.Weekday, timeSlots[slot.TimeSlotId])).ToList(), 0, 0, now);
            var paid = item is { Status: "approved", ClassId: int classId } && enrolled.Contains((classId, item.MemberUserId));
            var room = item.ClassId is int linked ? rooms.GetValueOrDefault(linked) : null;

            return new PrivateRequestDto(
                item.RequestId.ToString(),
                paid ? "paid" : item.Status,
                item.MemberUserId.ToString(),
                member.FullName,
                member.Phone ?? "",
                item.CourseId.ToString(),
                course.CourseName,
                course.SportId.ToString(),
                course.Sport!.SportName,
                course.SessionCount ?? 0,
                course.SessionMinutes ?? 0,
                course.Price,
                item.CoachUserId.ToString(),
                users[item.CoachUserId].FullName,
                item.StartDate,
                planned.Count == 0 ? null : planned.Min(session => session.SessionDate),
                planned.Count == 0 ? null : planned.Max(session => session.SessionDate),
                slots,
                item.Note,
                item.CreatedAt,
                item.DecidedAt,
                item.RejectReason,
                item.ClassId?.ToString(),
                item.ApprovalExpiresAt,
                room?.RoomId.ToString(),
                room?.RoomName,
                item.MembershipPackageId?.ToString(),
                item.MembershipPackageId is int pkg ? packageNames.GetValueOrDefault(pkg) : null,
                item.RenewMembership);
        }).ToList();
    }
}
