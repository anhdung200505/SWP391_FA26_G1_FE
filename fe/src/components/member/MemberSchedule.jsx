import { useEffect, useState } from 'react';
import { getMySessions } from '../../api/managementApi';
import WeekSlotTable, { addDays, mondayOf, toIso, formatClock } from '../schedule/WeekSlotTable';
import SessionCoachLine from '../schedule/SessionCoachLine';
import SessionRoomLine from '../schedule/SessionRoomLine';

const BADGES = {
  cancelled: { label: 'Đã hủy', className: 'border-red-200 bg-red-50 text-[#e31b23]' },
  present: { label: 'Có mặt', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  late: { label: 'Đi trễ', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  absent: { label: 'Vắng', className: 'border-red-200 bg-red-50 text-red-600' },
  pending: { label: 'Chưa điểm danh', className: 'border-slate-200 bg-slate-100 text-slate-500' },
  today: { label: 'Hôm nay', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  upcoming: { label: 'Chưa điểm danh', className: 'border-slate-200 bg-slate-100 text-slate-500' },
  beforeJoin: { label: 'Chưa vào lớp', className: 'border-slate-200 bg-slate-100 text-slate-500' },
};

const pad = (value) => String(value).padStart(2, '0');

function badgeKey(session, now) {
  if (session.status === 'cancelled') return 'cancelled';
  if (session.attendanceStatus) return session.attendanceStatus;
  // Buổi bắt đầu trước giờ học viên đăng ký lớp thì không tính vắng.
  if (session.beforeEnrollment) return 'beforeJoin';
  const today = toIso(now);
  // Qua 23:59 của ngày học mà chưa có điểm danh thì BE tự ghi vắng; hiện luôn để khỏi chờ job.
  if (session.date < today) return 'absent';
  if (session.date === today) {
    return formatClock(session.endTime) <= `${pad(now.getHours())}:${pad(now.getMinutes())}` ? 'pending' : 'today';
  }
  return 'upcoming';
}

export default function MemberSchedule() {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const firstIso = toIso(weekStart);
  const lastIso = toIso(addDays(weekStart, 6));

  useEffect(() => {
    let ignore = false;
    getMySessions({ from: firstIso, to: lastIso })
      .then((data) => {
        if (ignore) return;
        setSessions(Array.isArray(data) ? data : []);
        setError('');
      })
      .catch((err) => {
        if (!ignore) setError(err.message || 'Không tải được lịch học.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [firstIso, lastIso]);

  const now = new Date();

  return (
    <div className="space-y-3">
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white py-12 text-center shadow-xs">
          <div className="mb-2 inline-block size-8 animate-spin rounded-full border-4 border-[#e31b23] border-t-transparent"></div>
          <p className="text-sm font-bold text-slate-500">Đang tải lịch học...</p>
        </div>
      ) : (
        <WeekSlotTable
          weekStart={weekStart}
          onWeekStart={(next) => {
            setLoading(true);
            setWeekStart(next);
          }}
          sessions={sessions}
          renderCell={(session) => {
            const badge = BADGES[badgeKey(session, now)];
            const cancelled = session.status === 'cancelled';
            return (
              <div className={cancelled ? 'text-gray-400' : ''}>
                <p className={`font-semibold leading-snug ${cancelled ? 'line-through' : ''}`}>{session.className}</p>
                <p className="mt-1 text-xs text-gray-500 tabular-nums">
                  {formatClock(session.startTime)}–{formatClock(session.endTime)}
                </p>
                <SessionRoomLine session={session} />
                <SessionCoachLine session={session} />
                {badge && (
                  <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${badge.className}`}>
                    {badge.label}
                  </span>
                )}
                {session.note && (cancelled || !(session.coachChange || session.roomChanged) || session.note.startsWith('Buổi bù')) && (
                  <p className="mt-1 text-xs text-pretty whitespace-pre-line text-gray-600">{session.note}</p>
                )}
              </div>
            );
          }}
        />
      )}
    </div>
  );
}
