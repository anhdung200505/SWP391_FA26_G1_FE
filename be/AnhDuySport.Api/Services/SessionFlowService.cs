using AnhDuySport.Api.Contracts;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Services;

// Lịch buổi học (session), danh mục khung giờ (time_slot) và điều chỉnh từng buổi (đổi HLV, phòng, hủy buổi).
public class SessionFlowService(AppDbContext db, CurrentActor actor, EmailNotificationService email, ILogger<SessionFlowService> logger)
{
    private static readonly string[] SlotKinds = ["group", "private"];

    // Mặc định từ hôm nay trở đi; from/to lọc theo ngày học.
    public async Task<IReadOnlyList<SessionDto>> AccessSessionsAsync(string? classId, string? sportId, DateOnly? from, DateOnly? to)
    {
        var query = db.ClassSessions.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(classId))
        {
            if (!int.TryParse(classId, out var classKey) || !await db.Classes.AnyAsync(item => item.ClassId == classKey))
            {
                throw new KeyNotFoundException("Không tìm thấy lớp học.");
            }

            query = query.Where(session => session.ClassId == classKey);
        }

        if (!string.IsNullOrWhiteSpace(sportId))
        {
            if (!int.TryParse(sportId, out var sportKey) || !await db.Sports.AnyAsync(sport => sport.SportId == sportKey))
            {
                throw new KeyNotFoundException("Không tìm thấy môn thể thao.");
            }

            query = query.Where(session => session.Class!.Course!.SportId == sportKey);
        }

        return await ProjectAsync(FilterDates(query, from, to));
    }

    public async Task<SessionDto> SelectSessionAsync(string sessionId)
    {
        var id = ParseId(sessionId);
        var rows = await ProjectAsync(db.ClassSessions.AsNoTracking().Where(session => session.SessionId == id));
        return rows.FirstOrDefault() ?? throw new KeyNotFoundException("Không tìm thấy buổi học.");
    }

    // Lịch học của học viên: mọi buổi (kể cả đã hủy) của những lớp đang ghi danh, kèm điểm danh của học viên.
    public async Task<IReadOnlyList<SessionDto>> AccessMemberSessionsAsync(int memberUserId, DateOnly? from, DateOnly? to)
    {
        // Chỉ lịch của lớp đã đóng học phí. Ghi danh khi chưa thanh toán không được hiện buổi học.
        var classIds = db.ClassEnrollments
            .Where(enrollment => enrollment.UserId == memberUserId && enrollment.Status == "enrolled"
                && db.Payments.Any(payment => payment.UserId == memberUserId
                    && payment.ClassId == enrollment.ClassId
                    && payment.Status == "paid"))
            .Select(enrollment => enrollment.ClassId);
        var query = db.ClassSessions.AsNoTracking()
            .Where(session => classIds.Contains(session.ClassId));
        var rows = await ProjectAsync(FilterDates(query, from, to));

        // Buổi đã hủy vẫn hiện (kèm lý do ở note) để học viên biết mà không đến; kèm trạng thái điểm danh của riêng học viên.
        var sessionIds = rows.Select(row => int.Parse(row.Id)).ToList();
        var attendance = await db.ClassAttendances.AsNoTracking()
            .Where(item => item.UserId == memberUserId && sessionIds.Contains(item.SessionId))
            .ToDictionaryAsync(item => item.SessionId, item => item.Status);
        // Buổi bắt đầu trước giờ ghi danh (enrolled_at) của lớp đó thì đánh dấu BeforeEnrollment để lịch không hiện "Vắng".
        var enrolledAt = await db.ClassEnrollments.AsNoTracking()
            .Where(item => item.UserId == memberUserId && item.Status == "enrolled")
            .ToDictionaryAsync(item => item.ClassId, item => item.EnrolledAt);
        return rows
            .Select(row => row with
            {
                AttendanceStatus = attendance.GetValueOrDefault(int.Parse(row.Id)),
                BeforeEnrollment = enrolledAt.TryGetValue(int.Parse(row.ClassId), out var joined)
                    && row.Date.ToDateTime(row.StartTime) < joined,
            })
            .ToList();
    }

    // Lịch dạy của HLV theo HLV của từng buổi (session.coach_user_id), không theo HLV của lớp, vì HLV có thể được đổi cho riêng một buổi.
    public async Task<IReadOnlyList<SessionDto>> AccessCoachSessionsAsync(int coachUserId, DateOnly? from, DateOnly? to)
    {
        var query = db.ClassSessions.AsNoTracking()
            .Where(session => session.CoachUserId == coachUserId && session.Status != "cancelled");
        return await ProjectAsync(FilterDates(query, from, to));
    }

    public async Task<IReadOnlyList<TimeSlotDto>> AccessTimeSlotsAsync(string? kind)
    {
        var query = db.TimeSlots.AsNoTracking().Where(slot => slot.IsActive);
        if (!string.IsNullOrWhiteSpace(kind))
        {
            var kindKey = kind.Trim().ToLowerInvariant();
            if (!SlotKinds.Contains(kindKey))
            {
                throw new RegistrationException("kind chỉ nhận group hoặc private.");
            }

            query = query.Where(slot => slot.Kind == kindKey);
        }

        var slots = await query.OrderBy(slot => slot.Kind).ThenBy(slot => slot.StartTime).ToListAsync();
        return slots
            .Select(slot => new TimeSlotDto(
                slot.TimeSlotId.ToString(),
                slot.Kind,
                slot.StartTime,
                slot.EndTime,
                slot.Label ?? $"{slot.StartTime:HH\\:mm}-{slot.EndTime:HH\\:mm}"))
            .ToList();
    }

    // HLV dạy môn của lớp và phòng thuộc môn đó; đánh dấu bận nếu trùng giờ với buổi khác hoặc phòng không đủ sức chứa.
    public async Task<SessionOptionsDto> AccessOptionsAsync(string sessionId)
    {
        var session = await LoadSessionAsync(ParseId(sessionId), tracking: false);
        var sportId = session.Class!.Course!.SportId;
        var overlapping = db.ClassSessions.AsNoTracking().Where(other =>
            other.SessionId != session.SessionId
            && other.Status != "cancelled"
            && other.SessionDate == session.SessionDate
            && other.StartTime < session.EndTime
            && session.StartTime < other.EndTime);

        var coaches = await db.UserAccounts.AsNoTracking()
            .Where(user => user.Status == "active"
                && user.Role!.RoleCode == "COACH"
                && db.CoachSports.Any(link => link.CoachUserId == user.UserId && link.SportId == sportId))
            .OrderBy(user => user.FullName)
            .Select(user => new
            {
                user.UserId,
                user.FullName,
                BusyWith = overlapping.Where(other => other.CoachUserId == user.UserId).Select(other => other.Class!.ClassName).FirstOrDefault(),
            })
            .ToListAsync();

        var rooms = await db.Rooms.AsNoTracking()
            .Where(room => room.IsActive && db.SportRooms.Any(link => link.RoomId == room.RoomId
                && link.SportId == sportId
                && (session.Class.ClassType == "private" ? link.AllowPrivate : link.AllowGroup)))
            .OrderBy(room => room.RoomName)
            .Select(room => new
            {
                room.RoomId,
                room.RoomName,
                room.Capacity,
                BusyWith = overlapping.Where(other => other.RoomId == room.RoomId).Select(other => other.Class!.ClassName).FirstOrDefault(),
            })
            .ToListAsync();

        var classCapacity = session.Class.Capacity;
        return new SessionOptionsDto(
            coaches
                .Select(coach => new SessionOptionDto(
                    coach.UserId.ToString(),
                    coach.FullName,
                    null,
                    coach.UserId == session.CoachUserId,
                    coach.BusyWith is not null,
                    coach.BusyWith is null ? null : $"Đang dạy {coach.BusyWith}"))
                .ToList(),
            rooms
                .Select(room =>
                {
                    var tooSmall = classCapacity is int needed && room.Capacity < needed;
                    var reason = room.BusyWith is not null
                        ? $"Đang có lớp {room.BusyWith}"
                        : tooSmall ? $"Chỉ chứa {room.Capacity} người" : null;
                    return new SessionOptionDto(
                        room.RoomId.ToString(),
                        room.RoomName,
                        room.Capacity,
                        room.RoomId == session.RoomId,
                        reason is not null,
                        reason);
                })
                .ToList());
    }

    // Quản trị đổi HLV và/hoặc phòng của một buổi chưa diễn ra.
    public async Task<SessionDto> UpdateSessionAsync(string sessionId, UpdateSessionRequest request)
    {
        var session = await LoadSessionAsync(ParseId(sessionId), tracking: true);
        EnsureEditable(session);

        var changes = new List<string>();
        var noteLines = new List<string>();
        var oldCoachId = session.CoachUserId;
        var previousCoach = session.Coach!;
        var previousRoomName = session.Room!.RoomName;
        UserAccount? newCoach = null;
        var coachChanged = false;
        var roomChanged = false;
        string? newRoomName = null;
        if (!string.IsNullOrWhiteSpace(request.CoachUserId))
        {
            var coach = await ResolveCoachAsync(request.CoachUserId, session.Class!.Course!.SportId);
            if (coach.UserId != session.CoachUserId)
            {
                var change = CoachChange(session, coach);
                changes.Add(change);
                session.CoachUserId = coach.UserId;
                session.CoachChange = coach.UserId == session.Class.CoachUserId ? null : "substitute";
                noteLines.Add(change);
                newCoach = coach;
                coachChanged = true;
            }
        }

        if (!string.IsNullOrWhiteSpace(request.RoomId))
        {
            var room = await ResolveRoomAsync(request.RoomId, session.Class!);
            if (room.RoomId != session.RoomId)
            {
                var roomLine = $"Đổi phòng: {session.Room!.RoomName} → {room.RoomName}";
                changes.Add(roomLine);
                noteLines.Add(roomLine);
                session.RoomId = room.RoomId;
                session.RoomChanged = session.Class.RoomId.HasValue && room.RoomId != session.Class.RoomId;
                roomChanged = true;
                newRoomName = room.RoomName;
            }
        }

        // Đổi HLV hoặc phòng thì dựng lại ghi chú của buổi từ các thay đổi còn hiệu lực (HLV dạy thay, phòng khác mặc định);
        // thay đổi đã trở về mặc định thì bỏ dòng cũ. Lý do người nhập nằm dưới mục Ghi chú.
        if (coachChanged || roomChanged)
        {
            var oldLines = (session.Note ?? "").Replace("\r\n", "\n").Split('\n');
            var coachLine = coachChanged ? noteLines.FirstOrDefault(line => !line.StartsWith("Đổi phòng", StringComparison.Ordinal)) : oldLines.FirstOrDefault(line => line.StartsWith("HLV thay thế", StringComparison.Ordinal));
            var roomLine = roomChanged ? noteLines.FirstOrDefault(line => line.StartsWith("Đổi phòng", StringComparison.Ordinal)) : oldLines.FirstOrDefault(line => line.StartsWith("Đổi phòng", StringComparison.Ordinal));
            var shown = new List<string>();
            if (session.CoachChange is not null && coachLine is not null) shown.Add(coachLine.TrimEnd('.', ' '));
            if (session.RoomChanged && roomLine is not null) shown.Add(roomLine.TrimEnd('.', ' '));
            session.Note = shown.Count > 0
                ? TextFormat.SubstituteNote(string.Join(".\n", shown), NormalizeNote(request.Note))
                : NormalizeNote(request.Note);
        }
        else if (request.Note is not null)
        {
            session.Note = NormalizeNote(request.Note);
        }

        if (changes.Count > 0)
        {
            var body = $"{When(session)}:\n{TextFormat.SubstituteNote(string.Join(".\n", noteLines), NormalizeNote(request.Note))}";
            await NotifyMembersAsync(session, $"Thay đổi buổi học lớp {session.Class!.ClassName}", body);
            NotifyCoaches(session, $"Thay đổi buổi học lớp {session.Class.ClassName}", body, coachChanged ? oldCoachId : null);
        }

        AddLog("Điều chỉnh buổi học", session, changes.Count > 0 ? string.Join("; ", changes) : "Cập nhật ghi chú");
        var whenText = When(session);
        var memberSummary = changes.Count > 0
            ? $"{whenText}:\n{TextFormat.SubstituteNote(string.Join(".\n", noteLines), NormalizeNote(request.Note))}"
            : null;
        await SaveAsync();
        if (memberSummary is not null)
        {
            await EmailMembersScheduleAsync(session, memberSummary);
        }
        if (newCoach is not null)
        {
            await EmailCoachChangeAsync(session, whenText, previousCoach, newCoach, NormalizeNote(request.Note));
        }

        if (roomChanged && newRoomName is not null)
        {
            // HLV hiện tại của buổi (đã là HLV mới nếu vừa đổi HLV cùng lúc).
            var coachNow = newCoach ?? previousCoach;
            if (!string.IsNullOrWhiteSpace(coachNow.Email))
            {
                await TrySendAsync(
                    () => email.SendCoachRoomChangedAsync(coachNow, session.Class!.ClassName, whenText, previousRoomName, newRoomName, NormalizeNote(request.Note)),
                    coachNow.UserId);
            }
        }

        return await SelectSessionAsync(sessionId);
    }

    // Lễ tân (hoặc quản trị) đổi HLV khi HLV phụ trách bận; không đổi phòng.
    public async Task<SessionDto> ChangeCoachAsync(string sessionId, ChangeSessionCoachRequest request)
    {
        var session = await LoadSessionAsync(ParseId(sessionId), tracking: true);
        EnsureEditable(session);

        var coach = await ResolveCoachAsync(request.CoachUserId, session.Class!.Course!.SportId);
        if (coach.UserId == session.CoachUserId)
        {
            throw new RegistrationException("Huấn luyện viên mới trùng huấn luyện viên hiện tại.");
        }

        var change = CoachChange(session, coach);
        var oldCoachId = session.CoachUserId;
        var previousCoach = session.Coach!;
        session.CoachUserId = coach.UserId;
        session.CoachChange = coach.UserId == session.Class.CoachUserId ? null : "substitute";
        session.Note = TextFormat.SubstituteNote(change, NormalizeNote(request.Note));
        await NotifyMembersAsync(session, $"Đổi huấn luyện viên lớp {session.Class.ClassName}",
            $"{When(session)}:\n{session.Note}");
        NotifyCoaches(session, $"Đổi huấn luyện viên lớp {session.Class.ClassName}", $"{When(session)}:\n{session.Note}", oldCoachId);
        AddLog("Đổi HLV buổi học", session, change);
        var whenText = When(session);
        var memberSummary = $"{whenText}:\n{session.Note}";
        await SaveAsync();
        await EmailMembersScheduleAsync(session, memberSummary);
        await EmailCoachChangeAsync(session, whenText, previousCoach, coach, NormalizeNote(request.Note));
        return await SelectSessionAsync(sessionId);
    }

    public async Task<CancelSessionResult> CancelSessionAsync(string sessionId, CancelSessionRequest request)
    {
        var session = await LoadSessionAsync(ParseId(sessionId), tracking: true);
        EnsureEditable(session);

        var reason = NormalizeNote(request.Reason) ?? throw new RegistrationException("Nhập lý do hủy buổi học.");
        if (await db.ClassAttendances.AnyAsync(row => row.SessionId == session.SessionId))
        {
            throw new RegistrationException("Buổi học đã có điểm danh, không thể hủy.");
        }

        // Hủy buổi là phải bù luôn để tháng đó đủ số buổi.
        if (request.MakeupDate is not DateOnly makeupDate || request.MakeupTimeSlotId is not int slotId)
        {
            throw new RegistrationException("Hủy buổi phải chọn luôn ngày và khung giờ buổi bù (thứ 7 hoặc chủ nhật cùng tháng).");
        }

        var slot = await ResolveSlotAsync(slotId);
        if (makeupDate == session.SessionDate && slot.TimeSlotId == session.TimeSlotId)
        {
            throw new RegistrationException("Buổi bù phải khác thời điểm của buổi bị hủy.");
        }

        var coach = await ResolveMakeupCoachAsync(session, request.MakeupCoachUserId);
        await EnsureSlotFreeAsync(session, makeupDate, slot, session.SessionId, isMakeup: true, coach.UserId);

        var cancelledWhen = When(session);
        session.Status = "cancelled";
        session.Note = reason;
        var makeup = await BuildMakeupAsync(session, makeupDate, slot, coach);
        db.ClassSessions.Add(makeup);
        var makeupWhen = MakeupWhen(makeup, slot, coach);

        await NotifyMembersAsync(
            session,
            $"Hủy buổi học lớp {session.Class!.ClassName}",
            TextFormat.WithNote($"{cancelledWhen} bị hủy.\nBuổi bù: {makeupWhen}.", reason));
        NotifyCoaches(session, $"Hủy buổi học lớp {session.Class.ClassName}", $"{cancelledWhen} bị hủy.\nBuổi bù: {makeupWhen}.\nLý do: {TextFormat.Sentence(reason)}");
        NotifyMakeupCoach(session, coach, $"Dạy thay buổi bù lớp {session.Class.ClassName}", $"Bạn dạy thay buổi bù: {makeupWhen}.\nBuổi gốc: {cancelledWhen} bị hủy.");
        AddLog("Hủy buổi học", session, $"{reason}. Buổi bù: {makeupWhen}");
        await SaveAsync();
        await EmailCancelledAsync(session, cancelledWhen, makeupWhen, reason);
        return new CancelSessionResult(
            await SelectSessionAsync(session.SessionId.ToString()),
            await SelectSessionAsync(makeup.SessionId.ToString()));
    }

    // Xếp buổi bù cho buổi đã hủy mà chưa có buổi bù.
    public async Task<SessionDto> ScheduleMakeupAsync(string sessionId, SessionSlotRequest request)
    {
        var session = await LoadSessionAsync(ParseId(sessionId), tracking: true);
        if (session.Status != "cancelled")
        {
            throw new RegistrationException("Chỉ xếp buổi bù cho buổi đã hủy.");
        }

        var marker = $"Buổi bù cho buổi ngày {session.SessionDate:dd/MM/yyyy}";
        if (await db.ClassSessions.AnyAsync(item => item.ClassId == session.ClassId
                && item.Status != "cancelled"
                && item.Note != null
                && item.Note.StartsWith(marker)))
        {
            throw new RegistrationException("Buổi này đã có buổi bù.");
        }

        var slot = await ResolveSlotAsync(request.TimeSlotId);
        var coach = await ResolveMakeupCoachAsync(session, request.CoachUserId);
        await EnsureSlotFreeAsync(session, request.Date, slot, session.SessionId, isMakeup: true, coach.UserId);
        var makeup = await BuildMakeupAsync(session, request.Date, slot, coach);
        db.ClassSessions.Add(makeup);
        var makeupWhen = MakeupWhen(makeup, slot, coach);
        await NotifyMembersAsync(session, $"Buổi bù lớp {session.Class!.ClassName}", $"{When(session)} đã được bù: {makeupWhen}.");
        NotifyCoaches(session, $"Buổi bù lớp {session.Class.ClassName}", $"{When(session)} đã được bù: {makeupWhen}.");
        NotifyMakeupCoach(session, coach, $"Dạy thay buổi bù lớp {session.Class.ClassName}", $"Bạn dạy thay buổi bù: {makeupWhen}.\nBuổi gốc: {When(session)} đã hủy.");
        AddLog("Xếp buổi bù", session, makeupWhen);
        await SaveAsync();
        await EmailMembersScheduleAsync(session, $"{When(session)} đã được bù: {makeupWhen}.");
        return await SelectSessionAsync(makeup.SessionId.ToString());
    }

    // Đổi lịch: dời chính buổi này sang ngày/khung giờ khác, giữ nguyên số buổi.
    public async Task<SessionDto> RescheduleSessionAsync(string sessionId, SessionSlotRequest request)
    {
        var session = await LoadSessionAsync(ParseId(sessionId), tracking: true);
        EnsureEditable(session);
        if (await db.ClassAttendances.AnyAsync(row => row.SessionId == session.SessionId))
        {
            throw new RegistrationException("Buổi học đã có điểm danh, không thể đổi lịch.");
        }

        var slot = await ResolveSlotAsync(request.TimeSlotId);
        if (session.SessionDate == request.Date && session.TimeSlotId == slot.TimeSlotId)
        {
            throw new RegistrationException("Thời điểm mới trùng thời điểm hiện tại.");
        }

        await EnsureSlotFreeAsync(session, request.Date, slot, session.SessionId, isMakeup: false);
        var oldWhen = When(session);
        var reason = NormalizeNote(request.Reason);
        session.SessionDate = request.Date;
        session.TimeSlotId = slot.TimeSlotId;
        session.StartTime = slot.StartTime;
        session.EndTime = slot.EndTime;
        if (session.Class!.EndDate is DateOnly end && end < request.Date)
        {
            session.Class.EndDate = request.Date;
        }

        var newWhen = When(session);
        var summary = TextFormat.WithNote($"{oldWhen} được đổi sang {newWhen}.", reason);
        session.Note = Shorten(summary, 500);
        await NotifyMembersAsync(session, $"Đổi lịch học lớp {session.Class.ClassName}", summary);
        NotifyCoaches(session, $"Đổi lịch học lớp {session.Class.ClassName}", summary);
        AddLog("Đổi lịch buổi học", session, $"{oldWhen} → {newWhen}");
        await SaveAsync();
        await EmailMembersScheduleAsync(session, summary);
        return await SelectSessionAsync(sessionId);
    }

    // Các khung giờ đúng loại lớp trong một ngày, kèm lý do bận để quản trị chọn.
    // makeup = true khi đang chọn buổi bù trong lúc hủy (buổi chưa ở trạng thái cancelled) để áp luật cuối tuần cùng tháng.
    // Buổi bù chọn HLV trước (coachUserId, mặc định HLV chính): khung bị khóa khi HLV đó, lớp, phòng hoặc học viên bận.
    // Buổi bù không dùng khung tối (sau 18:00) nên không trả các khung đó.
    public async Task<IReadOnlyList<SessionOptionDto>> AccessSlotOptionsAsync(string sessionId, DateOnly date, bool? makeup = null, string? coachUserId = null)
    {
        var session = await LoadSessionAsync(ParseId(sessionId), tracking: false);
        var isMakeup = makeup ?? session.Status == "cancelled";
        var slots = (await ClassSlotsAsync(session)).Where(slot => !isMakeup || IsMakeupSlot(slot)).ToList();
        var context = await LoadSlotContextAsync(session, date, date, session.SessionId);
        var coachId = !isMakeup ? session.CoachUserId : int.TryParse(coachUserId, out var chosen) ? chosen : context.Class.CoachUserId;
        var roomId = isMakeup ? MakeupRoomId(context) : session.RoomId;
        var now = DateTime.Now;
        return slots
            .Select(slot =>
            {
                var busy = EvaluateSlot(context, date, slot, coachId, roomId, isMakeup, now);
                return new SessionOptionDto(
                    slot.TimeSlotId.ToString(),
                    $"{slot.StartTime:HH\\:mm}–{slot.EndTime:HH\\:mm}",
                    null,
                    session.TimeSlotId == slot.TimeSlotId && session.SessionDate == date,
                    busy is not null,
                    busy);
            })
            .ToList();
    }

    // Kế hoạch buổi bù cho HLV đang chọn (coachUserId, mặc định HLV chính): số khung trống từng ngày cuối tuần, số khung
    // trống của từng HLV, và buổi gợi ý (ngày sớm nhất, ưu tiên đúng khung giờ buổi bị hủy). Chưa chọn HLV mà HLV chính
    // bận hết thì gợi ý HLV dạy thay rảnh sớm nhất.
    public async Task<MakeupPlanDto> AccessMakeupPlanAsync(string sessionId, string? coachUserId = null)
    {
        var session = await LoadSessionAsync(ParseId(sessionId), tracking: false);
        var now = DateTime.Now;
        var (from, to) = MakeupWindow(session.SessionDate, DateOnly.FromDateTime(now));
        var context = await LoadSlotContextAsync(session, from, to, session.SessionId);
        var slots = (await ClassSlotsAsync(session))
            .Where(IsMakeupSlot)
            .OrderBy(slot => slot.TimeSlotId == session.TimeSlotId ? 0 : 1)
            .ThenBy(slot => slot.StartTime)
            .ToList();
        var mainId = context.Class.CoachUserId;
        var coaches = (await EligibleCoachesAsync(session.Class!.Course!.SportId))
            .OrderBy(coach => coach.Id == mainId ? 0 : 1)
            .ThenBy(coach => coach.Name)
            .ToList();
        var mainName = session.Class.Coach?.FullName ?? coaches.FirstOrDefault(coach => coach.Id == mainId).Name ?? "";
        var roomId = MakeupRoomId(context);
        var dates = Enumerable.Range(0, to.DayNumber - from.DayNumber + 1)
            .Select(offset => from.AddDays(offset))
            .Where(IsWeekend)
            .ToList();

        // Khung trống của một HLV, theo thứ tự ngày rồi ưu tiên khung giờ.
        List<(DateOnly Date, TimeSlot Slot)> FreeFor(int coachId) =>
            dates.SelectMany(date => slots
                    .Where(slot => EvaluateSlot(context, date, slot, coachId, roomId, isMakeup: true, now) is null)
                    .Select(slot => (date, slot)))
                .ToList();

        var freeByCoach = coaches.ToDictionary(coach => coach.Id, coach => FreeFor(coach.Id));
        var selectedId = int.TryParse(coachUserId, out var chosen) && freeByCoach.ContainsKey(chosen) ? chosen : mainId;
        var selectedFree = freeByCoach.TryGetValue(selectedId, out var list) ? list : FreeFor(selectedId);
        var selectedName = coaches.FirstOrDefault(coach => coach.Id == selectedId).Name ?? mainName;

        MakeupSuggestionDto? suggestion = null;
        if (selectedFree.Count > 0)
        {
            var (date, slot) = selectedFree[0];
            suggestion = new MakeupSuggestionDto(date, slot.TimeSlotId.ToString(), selectedId.ToString(), selectedName, selectedId == mainId);
        }
        else if (string.IsNullOrWhiteSpace(coachUserId))
        {
            var substitute = coaches
                .Where(coach => coach.Id != mainId && freeByCoach[coach.Id].Count > 0)
                .OrderBy(coach => freeByCoach[coach.Id][0].Date)
                .FirstOrDefault();
            if (substitute.Id != 0)
            {
                var (date, slot) = freeByCoach[substitute.Id][0];
                suggestion = new MakeupSuggestionDto(date, slot.TimeSlotId.ToString(), substitute.Id.ToString(), substitute.Name, false);
            }
        }

        var days = dates
            .Select(date => new MakeupDayDto(date, ClassSessionPlanner.DayName(date), selectedFree.Count(item => item.Date == date), slots.Count))
            .ToList();
        var coachList = coaches
            .Select(coach => new MakeupCoachDto(coach.Id.ToString(), coach.Name, coach.Id == mainId, freeByCoach[coach.Id].Count))
            .ToList();
        return new MakeupPlanDto(mainId.ToString(), mainName, selectedId.ToString(), coachList, days, suggestion);
    }

    // Buổi bù không xếp vào khung tối: chỉ khung kết thúc trước hoặc đúng 18:00.
    private static readonly TimeOnly MakeupLatestEnd = new(18, 0);

    private static bool IsMakeupSlot(TimeSlot slot) => slot.EndTime <= MakeupLatestEnd;

    private async Task<TimeSlot> ResolveSlotAsync(int timeSlotId)
    {
        return await db.TimeSlots.AsNoTracking().FirstOrDefaultAsync(item => item.TimeSlotId == timeSlotId && item.IsActive)
            ?? throw new RegistrationException("Khung giờ không hợp lệ.");
    }

    private async Task EnsureSlotFreeAsync(ClassSession session, DateOnly date, TimeSlot slot, int ignoreSessionId, bool isMakeup, int? coachId = null)
    {
        var conflict = await FindSlotConflictAsync(session, date, slot, ignoreSessionId, isMakeup, coachId);
        if (conflict is not null)
        {
            throw new RegistrationException(conflict);
        }
    }

    // Null khi thời điểm mới còn trống. Đổi lịch: HLV và phòng của buổi. Buổi bù: HLV được chọn (mặc định HLV chính)
    // và phòng mặc định của lớp.
    private async Task<string?> FindSlotConflictAsync(ClassSession session, DateOnly date, TimeSlot slot, int ignoreSessionId, bool isMakeup, int? coachId = null)
    {
        var context = await LoadSlotContextAsync(session, date, date, ignoreSessionId);
        return EvaluateSlot(
            context,
            date,
            slot,
            coachId ?? (isMakeup ? context.Class.CoachUserId : session.CoachUserId),
            isMakeup ? MakeupRoomId(context) : session.RoomId,
            isMakeup,
            DateTime.Now);
    }

    // Buổi của các ngày [from, to] (trừ buổi đang xét) cùng dữ liệu để kiểm tra trùng lớp, HLV, phòng, học viên trong bộ nhớ.
    private async Task<SlotContext> LoadSlotContextAsync(ClassSession session, DateOnly from, DateOnly to, int ignoreSessionId)
    {
        var trainingClass = session.Class ?? await db.Classes.AsNoTracking().FirstAsync(item => item.ClassId == session.ClassId);
        var busy = await db.ClassSessions.AsNoTracking()
            .Where(item => item.SessionDate >= from && item.SessionDate <= to && item.SessionId != ignoreSessionId)
            .Select(item => new SlotBusy(
                item.ClassId,
                item.Class!.ClassName,
                item.CoachUserId,
                item.RoomId,
                item.TimeSlotId,
                item.Status,
                item.StartTime,
                item.EndTime,
                item.Class.ClassType,
                item.SessionDate))
            .ToListAsync();

        var memberIds = db.ClassEnrollments
            .Where(enrollment => enrollment.ClassId == session.ClassId && enrollment.Status == "enrolled")
            .Select(enrollment => enrollment.UserId);
        var sharedMembers = (await db.ClassEnrollments.AsNoTracking()
                .Where(enrollment => enrollment.Status == "enrolled"
                    && enrollment.ClassId != session.ClassId
                    && memberIds.Contains(enrollment.UserId))
                .Select(enrollment => new { enrollment.ClassId, enrollment.UserId })
                .ToListAsync())
            .GroupBy(row => row.ClassId)
            .ToDictionary(group => group.Key, group => group.Select(row => row.UserId).ToHashSet());

        var coachIds = busy.Select(item => item.CoachUserId).Append(trainingClass.CoachUserId).Distinct().ToList();
        var coachNames = await db.UserAccounts.AsNoTracking()
            .Where(user => coachIds.Contains(user.UserId))
            .ToDictionaryAsync(user => user.UserId, user => user.FullName);
        var rooms = await db.Rooms.AsNoTracking()
            .ToDictionaryAsync(room => room.RoomId, room => new RoomInfo(room.RoomName, room.PrivateConcurrency));

        return new SlotContext(session, trainingClass, busy, sharedMembers, coachNames, rooms);
    }

    // Lý do không xếp được (null = trống). coachId null: bỏ qua HLV (khi còn chọn được HLV khác dạy thay).
    private static string? EvaluateSlot(SlotContext context, DateOnly date, TimeSlot slot, int? coachId, int roomId, bool isMakeup, DateTime now)
    {
        var today = DateOnly.FromDateTime(now);
        if (date < today || (date == today && slot.StartTime <= TimeOnly.FromDateTime(now)))
        {
            return "Không chọn được thời điểm đã qua.";
        }

        if (isMakeup && MakeupDateProblem(context.Session.SessionDate, date, today) is { } makeupProblem)
        {
            return makeupProblem;
        }

        if (isMakeup && !IsMakeupSlot(slot))
        {
            return "Buổi bù không xếp vào khung tối (sau 18:00).";
        }

        // Cùng ngày với buổi bị hủy vẫn bù được ở khung khác, chỉ không trùng đúng khung của buổi bị hủy.
        if (isMakeup && date == context.Session.SessionDate && slot.TimeSlotId == context.Session.TimeSlotId)
        {
            return "Trùng khung giờ của buổi bị hủy, chọn khung khác.";
        }

        if (slot.Kind != context.Class.ClassType)
        {
            return "Khung giờ không đúng loại lớp.";
        }

        if (context.Busy.Any(item => item.Date == date && item.ClassId == context.Session.ClassId && item.TimeSlotId == slot.TimeSlotId))
        {
            return "Lớp đã có buổi ở khung giờ này.";
        }

        var overlapping = Overlapping(context, date, slot);
        if (overlapping.Any(item => item.ClassId == context.Session.ClassId))
        {
            return "Lớp đã có buổi học trong khoảng giờ này.";
        }

        if (coachId is int coach && CoachBusyWith(overlapping, coach) is { } coachClass)
        {
            return $"HLV {context.CoachNames.GetValueOrDefault(coach, "phụ trách")} đang dạy lớp {coachClass}.";
        }

        var roomHits = overlapping.Where(item => item.RoomId == roomId).ToList();
        var room = context.Rooms.GetValueOrDefault(roomId) ?? new RoomInfo("", 1);
        var roomBlocked = context.Class.ClassType == "group"
            ? roomHits.Count > 0
            : roomHits.Any(item => item.ClassType == "group") || roomHits.Count(item => item.ClassType == "private") >= room.PrivateConcurrency;
        if (roomBlocked)
        {
            return $"Phòng {room.Name} đang có lớp {roomHits[0].ClassName}.";
        }

        var clashing = overlapping
            .Select(item => item.ClassId)
            .Distinct()
            .SelectMany(classId => context.SharedMembers.TryGetValue(classId, out var members) ? members : Enumerable.Empty<int>())
            .Distinct()
            .Count();
        return clashing > 0 ? $"{clashing} học viên của lớp đã có buổi khác trong khoảng giờ này." : null;
    }

    private static List<SlotBusy> Overlapping(SlotContext context, DateOnly date, TimeSlot slot) =>
        context.Busy
            .Where(item => item.Date == date && item.Status != "cancelled" && item.Start < slot.EndTime && item.End > slot.StartTime)
            .ToList();

    private static string? CoachBusyWith(IEnumerable<SlotBusy> overlapping, int coachId) =>
        overlapping.FirstOrDefault(item => item.CoachUserId == coachId)?.ClassName;

    // Buổi bù học ở phòng mặc định của lớp (lớp chưa gán phòng thì dùng phòng của buổi bị hủy).
    private static int MakeupRoomId(SlotContext context) => context.Class.RoomId ?? context.Session.RoomId;

    private async Task<List<TimeSlot>> ClassSlotsAsync(ClassSession session) =>
        await db.TimeSlots.AsNoTracking()
            .Where(slot => slot.IsActive && slot.Kind == session.Class!.ClassType)
            .OrderBy(slot => slot.StartTime)
            .ToListAsync();

    private async Task<List<(int Id, string Name)>> EligibleCoachesAsync(int sportId) =>
        (await db.UserAccounts.AsNoTracking()
            .Where(user => user.Status == "active"
                && user.Role!.RoleCode == "COACH"
                && db.CoachSports.Any(link => link.CoachUserId == user.UserId && link.SportId == sportId))
            .OrderBy(user => user.FullName)
            .Select(user => new { user.UserId, user.FullName })
            .ToListAsync())
        .Select(user => (user.UserId, user.FullName))
        .ToList();

    // HLV dạy buổi bù: bỏ trống là HLV chính của lớp; HLV khác phải dạy được môn này.
    private async Task<UserAccount> ResolveMakeupCoachAsync(ClassSession session, string? coachUserId)
    {
        if (string.IsNullOrWhiteSpace(coachUserId))
        {
            return session.Class!.Coach
                ?? await db.UserAccounts.AsNoTracking().FirstAsync(user => user.UserId == session.Class.CoachUserId);
        }

        return await ResolveCoachAsync(coachUserId, session.Class!.Course!.SportId);
    }

    private static string MakeupWhen(ClassSession makeup, TimeSlot slot, UserAccount coach) =>
        $"Buổi {makeup.SessionNo} ngày {makeup.SessionDate:dd/MM/yyyy} {slot.StartTime:HH\\:mm}-{slot.EndTime:HH\\:mm}"
        + (makeup.CoachChange == "substitute" ? $", HLV dạy thay {coach.FullName}" : "");

    // HLV dạy thay buổi bù (khác HLV của buổi bị hủy) cũng nhận thông báo.
    private void NotifyMakeupCoach(ClassSession session, UserAccount coach, string title, string content)
    {
        if (coach.UserId == session.CoachUserId)
        {
            return;
        }

        db.Notifications.Add(new AccountNotification
        {
            UserId = coach.UserId,
            Title = Shorten(title, 200),
            Content = content,
            IsRead = false,
            CreatedAt = DateTime.Now,
        });
    }

    // Buổi bù rơi vào cuối tuần (thứ 7, chủ nhật) cùng tháng với buổi bị hủy, để tháng đó vẫn đủ số buổi
    // và khóa học không bị kéo dài thêm. Tháng đó đã hết cuối tuần (tính từ hôm nay) thì lấy cuối tuần gần nhất sau đó.
    internal static (DateOnly From, DateOnly To) MakeupWindow(DateOnly cancelledDate, DateOnly today)
    {
        var monthStart = new DateOnly(cancelledDate.Year, cancelledDate.Month, 1);
        var monthEnd = monthStart.AddMonths(1).AddDays(-1);
        var from = today > monthStart ? today : monthStart;
        if (from <= monthEnd && NextWeekendDay(from) <= monthEnd)
        {
            return (from, monthEnd);
        }

        var first = NextWeekendDay(today > monthEnd ? today : monthEnd.AddDays(1));
        return (first, first.DayOfWeek == DayOfWeek.Saturday ? first.AddDays(1) : first);
    }

    private static string? MakeupDateProblem(DateOnly cancelledDate, DateOnly date, DateOnly today)
    {
        if (!IsWeekend(date))
        {
            return "Buổi bù chỉ xếp vào cuối tuần (thứ 7 hoặc chủ nhật).";
        }

        var (from, to) = MakeupWindow(cancelledDate, today);
        return date < from || date > to
            ? $"Buổi bù phải là cuối tuần trong khoảng {from:dd/MM/yyyy} – {to:dd/MM/yyyy} để không kéo dài khóa học."
            : null;
    }

    private static bool IsWeekend(DateOnly date) => date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;

    private static DateOnly NextWeekendDay(DateOnly date)
    {
        while (!IsWeekend(date))
        {
            date = date.AddDays(1);
        }

        return date;
    }

    // Buổi bù do HLV được chọn dạy (mặc định HLV chính) ở phòng mặc định của lớp. HLV khác HLV chính thì là dạy thay.
    private async Task<ClassSession> BuildMakeupAsync(ClassSession session, DateOnly date, TimeSlot slot, UserAccount coach)
    {
        // Buổi bù thay đúng buổi bị hủy nên giữ số buổi đó, không nối thành buổi cuối khóa.
        var sessionNo = session.SessionNo ?? (await db.ClassSessions
            .Where(item => item.ClassId == session.ClassId)
            .MaxAsync(item => (int?)item.SessionNo) ?? 0) + 1;
        var trainingClass = session.Class!;
        if (trainingClass.EndDate is DateOnly end && end < date)
        {
            trainingClass.EndDate = date;
        }

        var substitute = coach.UserId != trainingClass.CoachUserId;
        return new ClassSession
        {
            ClassId = session.ClassId,
            SessionNo = sessionNo,
            SessionDate = date,
            TimeSlotId = slot.TimeSlotId,
            StartTime = slot.StartTime,
            EndTime = slot.EndTime,
            CoachUserId = coach.UserId,
            RoomId = trainingClass.RoomId ?? session.RoomId,
            Status = "scheduled",
            RoomChanged = false,
            CoachChange = substitute ? "substitute" : null,
            Note = Shorten(
                $"Buổi bù cho buổi ngày {session.SessionDate:dd/MM/yyyy}."
                + (substitute ? $"\nHLV thay thế: {coach.FullName} (dạy thay HLV {trainingClass.Coach?.FullName ?? "phụ trách"})" : ""),
                500),
            CreatedAt = DateTime.Now,
        };
    }

    private sealed record SlotBusy(
        int ClassId,
        string ClassName,
        int CoachUserId,
        int RoomId,
        int TimeSlotId,
        string Status,
        TimeOnly Start,
        TimeOnly End,
        string ClassType,
        DateOnly Date);

    private sealed record RoomInfo(string Name, int PrivateConcurrency);

    private sealed record SlotContext(
        ClassSession Session,
        TrainingClass Class,
        List<SlotBusy> Busy,
        Dictionary<int, HashSet<int>> SharedMembers,
        Dictionary<int, string> CoachNames,
        Dictionary<int, RoomInfo> Rooms);

    private async Task<ClassSession> LoadSessionAsync(int id, bool tracking)
    {
        var query = db.ClassSessions
            .Include(session => session.Class).ThenInclude(item => item!.Course)
            .Include(session => session.Class).ThenInclude(item => item!.Coach)
            .Include(session => session.Coach)
            .Include(session => session.Room)
            .AsQueryable();
        if (!tracking)
        {
            query = query.AsNoTracking();
        }

        return await query.FirstOrDefaultAsync(session => session.SessionId == id)
            ?? throw new KeyNotFoundException("Không tìm thấy buổi học.");
    }

    private static void EnsureEditable(ClassSession session)
    {
        if (session.Status is "cancelled" or "completed")
        {
            throw new RegistrationException(session.Status == "cancelled" ? "Buổi học đã bị hủy." : "Buổi học đã kết thúc.");
        }

        if (session.SessionDate < DateOnly.FromDateTime(DateTime.Now))
        {
            throw new RegistrationException("Buổi học đã qua ngày, không thể thay đổi.");
        }

        var now = DateTime.Now;
        if (session.SessionDate == DateOnly.FromDateTime(now) && session.EndTime <= TimeOnly.FromDateTime(now))
        {
            throw new RegistrationException("Buổi học đã kết thúc, không thể thay đổi.");
        }
    }

    private async Task<UserAccount> ResolveCoachAsync(string coachUserId, int sportId)
    {
        var id = int.TryParse(coachUserId, out var parsed) ? parsed : 0;
        var coach = await db.UserAccounts.AsNoTracking()
            .FirstOrDefaultAsync(user => user.UserId == id && user.Status == "active" && user.Role!.RoleCode == "COACH")
            ?? throw new RegistrationException("Huấn luyện viên không hợp lệ.");
        if (!await db.CoachSports.AnyAsync(link => link.CoachUserId == id && link.SportId == sportId))
        {
            throw new RegistrationException("Huấn luyện viên không dạy môn này.");
        }

        return coach;
    }

    private async Task<Room> ResolveRoomAsync(string roomId, TrainingClass trainingClass)
    {
        var id = int.TryParse(roomId, out var parsed) ? parsed : 0;
        var room = await db.Rooms.AsNoTracking().FirstOrDefaultAsync(item => item.RoomId == id)
            ?? throw new RegistrationException("Phòng không hợp lệ.");
        if (!room.IsActive)
        {
            throw new RegistrationException("Phòng này đã ngưng sử dụng.");
        }

        var allowed = await db.SportRooms.AnyAsync(link => link.RoomId == id
            && link.SportId == trainingClass.Course!.SportId
            && (trainingClass.ClassType == "private" ? link.AllowPrivate : link.AllowGroup));
        if (!allowed)
        {
            throw new RegistrationException("Phòng không dùng được cho môn này.");
        }

        if (trainingClass.Capacity is int needed && room.Capacity < needed)
        {
            throw new RegistrationException($"Phòng chỉ chứa {room.Capacity} người, lớp có sĩ số {needed}.");
        }

        return room;
    }

    // Trigger TR_session_rules chặn trùng lịch HLV hoặc phòng: đổi thành lỗi nghiệp vụ.
    private async Task SaveAsync()
    {
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException exception) when (ClassSessionPlanner.IsRuleViolation(exception, out var message))
        {
            throw new RegistrationException(message);
        }
    }

    private async Task NotifyMembersAsync(ClassSession session, string title, string content)
    {
        var memberIds = await db.ClassEnrollments.AsNoTracking()
            .Where(enrollment => enrollment.ClassId == session.ClassId && enrollment.Status == "enrolled")
            .Select(enrollment => enrollment.UserId)
            .ToListAsync();
        var now = DateTime.Now;
        foreach (var memberId in memberIds)
        {
            db.Notifications.Add(new AccountNotification
            {
                UserId = memberId,
                Title = Shorten(title, 200),
                Content = content,
                IsRead = false,
                CreatedAt = now,
            });
        }
    }

    // Thông báo trong hệ thống cho HLV của buổi (và HLV cũ nếu vừa đổi). Chỉ ghi vào context, lưu cùng SaveAsync.
    private void NotifyCoaches(ClassSession session, string title, string content, int? previousCoachId = null)
    {
        var now = DateTime.Now;
        foreach (var coachId in new[] { session.CoachUserId, previousCoachId ?? session.CoachUserId }.Distinct())
        {
            db.Notifications.Add(new AccountNotification
            {
                UserId = coachId,
                Title = Shorten(title, 200),
                Content = content,
                IsRead = false,
                CreatedAt = now,
            });
        }
    }

    // Đổi phòng, đổi HLV hoặc thay đổi lịch khác: gửi Gmail cho học viên đang học lớp, kèm link lịch.
    private async Task EmailMembersScheduleAsync(ClassSession session, string summary)
    {
        var members = await EnrolledMembersAsync(session.ClassId);
        foreach (var member in members)
        {
            await TrySendAsync(
                () => email.SendMemberScheduleChangedAsync(member, session.Class!.ClassName, summary),
                member.UserId);
        }
    }

    // Hủy buổi báo thêm qua email cho mọi học viên đang học lớp. Gửi sau khi đã lưu, lỗi gửi chỉ ghi log.
    private async Task EmailCancelledAsync(ClassSession session, string when, string makeupWhen, string reason)
    {
        var members = await EnrolledMembersAsync(session.ClassId);
        var coach = await db.UserAccounts.AsNoTracking().FirstOrDefaultAsync(user => user.UserId == session.CoachUserId);
        if (coach is not null && !string.IsNullOrWhiteSpace(coach.Email))
        {
            await TrySendAsync(
                () => email.SendSessionCancelledToCoachAsync(coach, session.Class!.ClassName, when, makeupWhen, reason),
                coach.UserId);
        }

        foreach (var member in members)
        {
            await TrySendAsync(
                () => email.SendSessionCancelledAsync(member, session.Class!.ClassName, when, makeupWhen, reason),
                member.UserId);
        }
    }

    private Task<List<UserAccount>> EnrolledMembersAsync(int classId) =>
        db.UserAccounts.AsNoTracking()
            .Where(user => user.Email != null && user.Email.Contains("@")
                && db.ClassEnrollments.Any(enrollment =>
                    enrollment.ClassId == classId && enrollment.UserId == user.UserId && enrollment.Status == "enrolled"))
            .ToListAsync();

    // Đổi HLV một buổi: báo email cho hai HLV (HLV mới và HLV cũ). Học viên nhận thư riêng.
    private async Task EmailCoachChangeAsync(ClassSession session, string when, UserAccount previous, UserAccount current, string? reason)
    {
        var className = session.Class!.ClassName;
        var back = current.UserId == session.Class.CoachUserId;
        if (!string.IsNullOrWhiteSpace(current.Email))
        {
            await TrySendAsync(() => email.SendCoachSessionAssignedAsync(current, className, when, previous.FullName, back, reason), current.UserId);
        }

        if (!string.IsNullOrWhiteSpace(previous.Email))
        {
            await TrySendAsync(() => email.SendCoachSessionReleasedAsync(previous, className, when, current.FullName, reason), previous.UserId);
        }
    }

    // Email là việc phụ sau khi đã lưu: lỗi gửi chỉ ghi log, không làm hỏng thao tác.
    private async Task TrySendAsync(Func<Task> send, int userId)
    {
        try
        {
            await send();
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Không gửi được email buổi học cho người dùng {UserId}", userId);
        }
    }

    // Các dòng "HLV thay thế..." và "Đổi phòng..." của ghi chú buổi (bỏ phần lý do người nhập).
    private void AddLog(string action, ClassSession session, string detail)
    {
        db.ActivityLogs.Add(new ActivityLog
        {
            ActorUserId = actor.UserId == 0 ? null : actor.UserId,
            Action = action,
            EntityName = "session",
            EntityId = session.SessionId,
            Detail = $"{session.Class!.ClassName}, {When(session)}: {detail}",
            CreatedAt = DateTime.Now,
        });
    }

    private static string When(ClassSession session) =>
        $"{ClassSessionPlanner.SessionTitle(session.SessionNo)} ngày {session.SessionDate:dd/MM/yyyy} {session.StartTime:HH\\:mm}-{session.EndTime:HH\\:mm}";

    // HLV khác HLV phụ trách lớp là dạy thay; đổi về đúng HLV phụ trách thì ghi là dạy lại.
    private static string CoachChange(ClassSession session, UserAccount newCoach)
    {
        var mainCoach = session.Class!.Coach?.FullName ?? "phụ trách";
        return newCoach.UserId == session.Class.CoachUserId
            ? $"HLV phụ trách {newCoach.FullName} dạy lại (thay HLV thay thế {session.Coach!.FullName})"
            : $"HLV thay thế: {newCoach.FullName} (dạy thay HLV {mainCoach})";
    }

    private static string? NormalizeNote(string? note)
    {
        var value = note?.Trim() ?? "";
        return value.Length == 0 ? null : Shorten(value, 500);
    }

    private static string Shorten(string value, int max) => value.Length <= max ? value : value[..max];

    private static int ParseId(string sessionId) =>
        int.TryParse(sessionId, out var id) ? id : throw new KeyNotFoundException("Không tìm thấy buổi học.");

    internal static IQueryable<ClassSession> FilterDates(IQueryable<ClassSession> query, DateOnly? from, DateOnly? to)
    {
        if (from is { } start && to is { } end && end < start)
        {
            throw new RegistrationException("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.");
        }

        var since = from ?? DateOnly.FromDateTime(DateTime.Now);
        query = query.Where(session => session.SessionDate >= since);
        return to is { } until ? query.Where(session => session.SessionDate <= until) : query;
    }

    internal async Task<List<SessionDto>> ProjectAsync(IQueryable<ClassSession> query)
    {
        var rows = await query
            .OrderBy(session => session.SessionDate)
            .ThenBy(session => session.StartTime)
            .ThenBy(session => session.ClassId)
            .Select(session => new
            {
                session.SessionId,
                session.ClassId,
                session.Class!.ClassName,
                session.Class.Course!.SportId,
                session.Class.Course.Sport!.SportName,
                session.Class.Course.CourseName,
                session.SessionNo,
                session.SessionDate,
                session.StartTime,
                session.EndTime,
                session.CoachUserId,
                CoachName = session.Coach!.FullName,
                ClassCoachUserId = session.Class.CoachUserId,
                ClassCoachName = session.Class.Coach!.FullName,
                session.RoomId,
                session.Room!.RoomName,
                session.Status,
                session.Note,
                session.CoachChange,
                session.RoomChanged,
                EnrolledCount = session.Class.Enrollments.Count(enrollment => enrollment.Status == "enrolled"),
                session.Class.Capacity,
            })
            .ToListAsync();

        return rows
            .Select(row =>
            {
                var weekday = ClassSessionPlanner.WeekdayOf(row.SessionDate) ?? 8;
                return new SessionDto(
                    row.SessionId.ToString(),
                    row.ClassId.ToString(),
                    row.ClassName,
                    row.SportId.ToString(),
                    row.SportName,
                    row.CourseName,
                    row.SessionNo,
                    row.SessionDate,
                    weekday,
                    ClassSessionPlanner.DayName(row.SessionDate),
                    row.StartTime,
                    row.EndTime,
                    row.CoachUserId.ToString(),
                    row.CoachName,
                    row.RoomId.ToString(),
                    row.RoomName,
                    row.Status,
                    row.Note,
                    row.EnrolledCount,
                    row.Capacity,
                    ClassCoachUserId: row.ClassCoachUserId.ToString(),
                    ClassCoachName: row.ClassCoachName,
                    IsSubstituteCoach: row.CoachChange == "substitute",
                    CoachChange: row.CoachChange,
                    RoomChanged: row.RoomChanged);
            })
            .ToList();
    }
}
