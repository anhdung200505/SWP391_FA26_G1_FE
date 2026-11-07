using AnhDuySport.Api.Models;

namespace AnhDuySport.Api.Services;

// Buổi vừa học xong là buổi đã kết thúc gần nhất. Buổi kế tiếp là buổi chưa hủy ngay sau buổi đó.
public static class SessionWindow
{
    public static bool HasFinished(ClassSession session, DateTime now)
    {
        if (session.Status == "cancelled")
        {
            return false;
        }

        if (session.Status == "completed")
        {
            return true;
        }

        var today = DateOnly.FromDateTime(now);
        if (session.SessionDate < today)
        {
            return true;
        }

        return session.SessionDate == today && session.EndTime <= TimeOnly.FromDateTime(now);
    }

    public static ClassSession? LatestFinished(IEnumerable<ClassSession> sessions, DateTime now) =>
        sessions
            .Where(session => HasFinished(session, now))
            .OrderByDescending(session => session.SessionDate)
            .ThenByDescending(session => session.EndTime)
            .ThenByDescending(session => session.SessionNo ?? 0)
            .ThenByDescending(session => session.SessionId)
            .FirstOrDefault();

    public static ClassSession? NextUp(IEnumerable<ClassSession> sessions, DateTime now)
    {
        var open = sessions
            .Where(session => session.Status != "cancelled")
            .OrderBy(session => session.SessionDate)
            .ThenBy(session => session.StartTime)
            .ThenBy(session => session.SessionNo ?? 0)
            .ThenBy(session => session.SessionId)
            .ToList();
        var latest = LatestFinished(open, now);
        if (latest is null)
        {
            return open.FirstOrDefault();
        }

        var index = open.FindIndex(session => session.SessionId == latest.SessionId);
        return index >= 0 && index + 1 < open.Count ? open[index + 1] : null;
    }
}
