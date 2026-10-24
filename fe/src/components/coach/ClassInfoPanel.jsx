import { useState } from 'react';
import { formatDate, formatTime } from './coachUi';
import WeekSlotTable, { formatClock, toIso, weekContaining } from '../schedule/WeekSlotTable';

const BADGES = {
  cancelled: { label: 'Đã hủy', className: 'border-red-200 bg-red-50 text-[#e31b23]' },
  completed: { label: 'Đã học', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  held: { label: 'Đang diễn ra', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  today: { label: 'Hôm nay', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  upcoming: { label: 'Sắp học', className: 'border-sky-200 bg-sky-50 text-sky-700' },
  missed: { label: 'Chưa học', className: 'border-slate-200 bg-slate-100 text-slate-500' },
};

const pad = (value) => String(value).padStart(2, '0');

function badgeKey(session, now) {
  if (session.status === 'cancelled') return 'cancelled';
  if (session.status === 'completed') return 'completed';
  if (session.status === 'held') return 'held';
  const today = toIso(now);
  const date = String(session.date || '').slice(0, 10);
  if (date < today) return 'missed';
  if (date === today) {
    return formatTime(session.endTime) <= `${pad(now.getHours())}:${pad(now.getMinutes())}` ? 'missed' : 'today';
  }
  return 'upcoming';
}

export default function ClassInfoPanel({ detail }) {
  const sessions = (detail.sessions || []).map((session) => ({
    ...session,
    id: session.sessionId,
    date: String(session.sessionDate || '').slice(0, 10),
  }));
  const [weekStart, setWeekStart] = useState(() => weekContaining(sessions.map((session) => session.date)));
  const now = new Date();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-black text-balance">Thông tin lớp</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-500">Phòng</dt>
              <dd className="font-bold">{detail.roomName || 'Chưa xếp phòng'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Sĩ số</dt>
              <dd className="font-bold tabular-nums">{detail.enrolledCount}/{detail.capacity ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Bắt đầu</dt>
              <dd className="font-bold tabular-nums">{formatDate(detail.startDate) || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Kết thúc</dt>
              <dd className="font-bold tabular-nums">{formatDate(detail.endDate) || '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-black text-balance">Học viên đang học</h2>
          {detail.roster?.length ? (
            <ul className="mt-4 divide-y divide-gray-100">
              {detail.roster.map((member) => (
                <li key={member.memberUserId} className="py-2.5 text-sm font-semibold">
                  {member.memberName}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-pretty text-gray-600">Chưa có học viên ghi danh.</p>
          )}
        </section>
      </div>

      <WeekSlotTable
        weekStart={weekStart}
        onWeekStart={setWeekStart}
        sessions={sessions}
        renderCell={(session) => {
          const badge = BADGES[badgeKey(session, now)];
          const cancelled = session.status === 'cancelled';
          return (
            <div className={cancelled ? 'text-gray-400' : 'text-gray-900'}>
              <p className={`font-semibold leading-snug ${cancelled ? 'line-through' : ''}`}>{detail.className}</p>
              <p className="mt-1 text-xs text-gray-500 tabular-nums">
                {formatClock(session.startTime)}–{formatClock(session.endTime)}
              </p>
              <p className="text-xs text-gray-500">{detail.roomName || 'Chưa xếp phòng'}</p>
              {session.sessionNo ? <p className="text-xs text-gray-500 tabular-nums">Buổi {session.sessionNo}</p> : null}
              {badge && (
                <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${badge.className}`}>
                  {badge.label}
                </span>
              )}
              {session.note && <p className="mt-1 text-xs text-pretty text-gray-600">{session.note}</p>}
            </div>
          );
        }}
      />
    </div>
  );
}
