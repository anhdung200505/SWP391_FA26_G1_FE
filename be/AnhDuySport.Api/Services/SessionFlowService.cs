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
        return rows
            .Select(row => row with { AttendanceStatus = attendance.GetValueOrDefault(int.Parse(row.Id)) })
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

        var makeupDate = await FindMakeupDateAsync(session);
        var nextNo = (await db.ClassSessions
            .Where(item => item.ClassId == session.ClassId)
            .MaxAsync(item => (int?)item.SessionNo) ?? 0) + 1;
        var makeup = new ClassSession
        {
            ClassId = session.ClassId,
            SessionNo = nextNo,
            SessionDate = makeupDate,
            TimeSlotId = session.TimeSlotId,
            StartTime = session.StartTime,
            EndTime = session.EndTime,
            CoachUserId = session.CoachUserId,
            RoomId = session.RoomId,
            Status = "scheduled",
            RoomChanged = session.RoomChanged,
            CoachChange = session.CoachChange,
            Note = Shorten(
                $"Buổi bù cho buổi ngày {session.SessionDate:dd/MM/yyyy}."
                + (session.RoomChanged || session.CoachChange is not null ? "\n" + ChangeLines(session.Note) : ""),
                500),
            CreatedAt = DateTime.Now,
        };
        if (session.Class!.EndDate is DateOnly end && end < makeupDate)
        {
            session.Class.EndDate = makeupDate;
        }

        session.Status = "cancelled";
        session.Note = reason;
        db.ClassSessions.Add(makeup);
        var makeupWhen = $"Buổi {nextNo} ngày {makeupDate:dd/MM/yyyy} {session.StartTime:HH\\:mm}-{session.EndTime:HH\\:mm}";
        await NotifyMembersAsync(
            session,
            $"Hủy buổi học lớp {session.Class.ClassName}",
            TextFormat.WithNote($"{When(session)} bị hủy.\nBuổi bù: {makeupWhen}.", reason));
        NotifyCoaches(session, $"Hủy buổi học lớp {session.Class.ClassName}", $"{When(session)} bị hủy.\nBuổi bù: {makeupWhen}.\nLý do: {TextFormat.Sentence(reason)}");
        AddLog("Hủy buổi học", session, $"{reason}. Buổi bù: {makeupWhen}");
        var cancelledWhen = When(session);
        await SaveAsync();
        await EmailCancelledAsync(session, cancelledWhen, makeupWhen, reason);
        return new CancelSessionResult(
            await SelectSessionAsync(session.SessionId.ToString()),
            await SelectSessionAsync(makeup.SessionId.ToString()));
    }

    // Cùng thứ, cùng giờ. Ưu tiên đúng tuần sau; nếu lớp đã có buổi đó hoặc HLV/phòng trùng thì tuần cùng thứ kế tiếp.
    private async Task<DateOnly> FindMakeupDateAsync(ClassSession session)
    {
        const int maxWeeks = 26;
        var from = session.SessionDate.AddDays(7);
        var until = session.SessionDate.AddDays(7 * maxWeeks);
        var classType = session.Class!.ClassType;
        var roomLimit = session.Room?.PrivateConcurrency ?? 1;

        var occupied = (await db.ClassSessions.AsNoTracking()
            .Where(item => item.ClassId == session.ClassId
                && item.TimeSlotId == session.TimeSlotId
                && item.SessionDate >= from
                && item.SessionDate <= until)
            .Select(item => item.SessionDate)
            .ToListAsync()).ToHashSet();

        var overlaps = await db.ClassSessions.AsNoTracking()
            .Where(item => item.Status != "cancelled"
                && item.SessionDate >= from
                && item.SessionDate <= until
                && item.StartTime < session.EndTime
                && item.EndTime > session.StartTime
                && (item.CoachUserId == session.CoachUserId || item.RoomId == session.RoomId))
            .Select(item => new MakeupOverlap(item.SessionDate, item.CoachUserId, item.RoomId, item.Class!.ClassType))
            .ToListAsync();

        for (var week = 1; week <= maxWeeks; week++)
        {
            var date = session.SessionDate.AddDays(7 * week);
            if (occupied.Contains(date))
            {
                continue;
            }

            var sameDay = overlaps.Where(item => item.Date == date).ToList();
            if (sameDay.Any(item => item.CoachUserId == session.CoachUserId))
            {
                continue;
            }

            var roomHits = sameDay.Where(item => item.RoomId == session.RoomId).ToList();
            var roomBlocked = classType == "group"
                ? roomHits.Count > 0
                : roomHits.Any(item => item.ClassType == "group")
                    || roomHits.Count(item => item.ClassType == "private") >= roomLimit;
            if (roomBlocked)
            {
                continue;
            }

            return date;
        }

        throw new RegistrationException("Không xếp được buổi bù cùng thứ trong 26 tuần tới vì lịch lớp, huấn luyện viên hoặc phòng đã kín.");
    }

    private sealed record MakeupOverlap(DateOnly Date, int CoachUserId, int RoomId, string ClassType);

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
    private static string ChangeLines(string? note) =>
        string.Join("\n", (note ?? "").Replace("\r\n", "\n").Split('\n')
            .TakeWhile(line => line != "Ghi chú:")
            .Where(line => line.StartsWith("HLV thay thế", StringComparison.Ordinal) || line.StartsWith("Đổi phòng", StringComparison.Ordinal)));

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
                var weekday = ClassSessionPlanner.WeekdayOf(row.SessionDate) ?? 0;
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
                    ClassSessionPlanner.WeekdayName(weekday),
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
