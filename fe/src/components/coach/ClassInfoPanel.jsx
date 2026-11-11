import { useState } from 'react';
import { formatDate, formatTime } from './coachUi';
import WeekSlotTable, { formatClock, toIso, weekContaining } from '../schedule/WeekSlotTable';
import SessionCoachLine from '../schedule/SessionCoachLine';
import SessionRoomLine from '../schedule/SessionRoomLine';

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

export default function ClassInfoPanel({ detail, onAttend }) {
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
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
          <h2 className="text-lg font-black text-balance text-slate-900">Thông tin lớp</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-slate-500">Phòng</dt>
              <dd className="font-bold">{detail.roomName || 'Chưa xếp phòng'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Sĩ số</dt>
              <dd className="font-bold tabular-nums">{detail.enrolledCount}/{detail.capacity ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Bắt đầu</dt>
              <dd className="font-bold tabular-nums">{formatDate(detail.startDate) || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Kết thúc</dt>
              <dd className="font-bold tabular-nums">{formatDate(detail.endDate) || '—'}</dd>
            </div>
          </dl>
        </section>

        <details className="group/roster rounded-3xl border border-slate-200 bg-white shadow-xs">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-3xl p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e31b23] sm:p-6 [&::-webkit-details-marker]:hidden">
            <span>
              <span className="block text-lg font-black text-balance text-slate-900">Học viên đang học</span>
              <span className="mt-0.5 block text-sm text-slate-500 tabular-nums">{detail.roster?.length || 0} học viên</span>
            </span>
            <svg className="size-5 shrink-0 text-slate-400 transition-transform group-open/roster:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>
          <div className="border-t border-slate-100 px-5 pb-3 sm:px-6">
            {detail.roster?.length ? (
              <ul className="divide-y divide-slate-100">
                {detail.roster.map((member) => (
                  <li key={member.memberUserId} className="py-2.5 text-sm font-semibold text-slate-800">
                    {member.memberName}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-sm text-pretty text-slate-600">Chưa có học viên ghi danh.</p>
            )}
          </div>
        </details>
      </div>

      <WeekSlotTable
        weekStart={weekStart}
        onWeekStart={setWeekStart}
        sessions={sessions}
        renderCell={(session) => {
          const badge = BADGES[badgeKey(session, now)];
          const cancelled = session.status === 'cancelled';
          return (
            <div className={cancelled ? 'text-slate-400' : 'text-slate-900'}>
              <p className={`font-semibold leading-snug ${cancelled ? 'line-through' : ''}`}>{detail.className}</p>
              <p className="mt-1 text-xs text-slate-500 tabular-nums">
                {formatClock(session.startTime)}–{formatClock(session.endTime)}
              </p>
              <SessionRoomLine session={session} fallback={detail.roomName || 'Chưa xếp phòng'} />
              {session.sessionNo ? <p className="text-xs text-slate-500 tabular-nums">Buổi {session.sessionNo}</p> : null}
              {session.coachChange && <SessionCoachLine session={session} />}
              {badgeKey(session, now) === 'missed' && onAttend ? (
                <button
                  type="button"
                  onClick={() => onAttend(session.sessionId)}
                  className="mt-1 inline-block cursor-pointer rounded-full bg-[#e31b23] px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-[#c4131a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e31b23]"
                >
                  Điểm danh
                </button>
              ) : badge && (
                <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${badge.className}`}>
                  {badge.label}
                </span>
              )}
              {session.note && (cancelled || !(session.coachChange || session.roomChanged) || session.note.startsWith('Buổi bù')) && (
                <p className="mt-1 text-xs text-pretty whitespace-pre-line text-slate-600">{session.note}</p>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
