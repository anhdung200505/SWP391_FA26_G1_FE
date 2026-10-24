import { useEffect, useState } from 'react';
import { getMySessions } from '../../api/managementApi';

const DAY_NAMES = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

const BADGES = {
  cancelled: { label: 'Đã hủy', className: 'bg-red-50 text-[#e31b23] border-red-200' },
  present: { label: 'Có mặt', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  late: { label: 'Đi trễ', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  absent: { label: 'Vắng', className: 'bg-red-50 text-red-600 border-red-200' },
  pending: { label: 'Chưa điểm danh', className: 'bg-slate-100 text-slate-500 border-slate-200' },
  today: { label: 'Hôm nay', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  upcoming: { label: 'Sắp học', className: 'bg-sky-50 text-sky-700 border-sky-200' },
};

const pad = (value) => String(value).padStart(2, '0');
const toIso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const formatTime = (value) => String(value || '').slice(0, 5);

function mondayOf(date) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7));
  return copy;
}

function addDays(date, days) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setDate(copy.getDate() + days);
  return copy;
}

const shortDate = (date) => `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;

// Buổi đã hủy -> Đã hủy; có điểm danh -> theo điểm danh; đã qua giờ mà chưa điểm danh -> Chưa điểm danh;
// hôm nay chưa hết giờ -> Hôm nay; còn lại -> Sắp học.
function badgeKey(session, now) {
  if (session.status === 'cancelled') return 'cancelled';
  if (session.attendanceStatus) return session.attendanceStatus;
  const today = toIso(now);
  if (session.date < today) return 'pending';
  if (session.date === today) {
    return formatTime(session.endTime) <= `${pad(now.getHours())}:${pad(now.getMinutes())}` ? 'pending' : 'today';
  }
  return 'upcoming';
}

// Lịch học theo tuần (Thứ 2 đến Thứ 7): mỗi ngày có buổi nào của lớp đã đăng ký thì hiện thẻ kèm ghi chú và trạng thái điểm danh.
export default function MemberSchedule() {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const days = DAY_NAMES.map((name, index) => ({ name, date: addDays(weekStart, index) }));
  const firstIso = toIso(days[0].date);
  const lastIso = toIso(days[5].date);

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

  const goToWeek = (next) => {
    setLoading(true);
    setWeekStart(next);
  };

  const now = new Date();
  const todayIso = toIso(now);
  const isThisWeek = firstIso === toIso(mondayOf(now));

  return (
    <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-black text-slate-900 uppercase">LỊCH HỌC CỦA TÔI</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Tuần {shortDate(days[0].date)} – {shortDate(days[5].date)}/{days[5].date.getFullYear()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goToWeek(addDays(weekStart, -7))}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            ‹ Tuần trước
          </button>
          <button
            type="button"
            onClick={() => goToWeek(mondayOf(new Date()))}
            disabled={isThisWeek}
            className="bg-slate-900 hover:bg-[#e31b23] text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
          >
            Tuần này
          </button>
          <button
            type="button"
            onClick={() => goToWeek(addDays(weekStart, 7))}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            Tuần sau ›
          </button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold">⚠️ {error}</div>}

      {loading ? (
        <div className="py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#e31b23] border-t-transparent mb-2" />
          <p className="text-xs font-bold text-slate-400">Đang tải lịch học...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {days.map(({ name, date }) => {
            const iso = toIso(date);
            const items = sessions
              .filter((session) => session.date === iso)
              .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
            const isToday = iso === todayIso;
            return (
              <div
                key={iso}
                className={`rounded-2xl border p-3 min-h-[8rem] ${isToday ? 'border-[#e31b23] bg-red-50/30' : 'border-slate-200 bg-slate-50/50'}`}
              >
                <div className="flex items-baseline justify-between mb-2">
                  <span className={`text-xs font-black uppercase ${isToday ? 'text-[#e31b23]' : 'text-slate-700'}`}>{name}</span>
                  <span className="text-[11px] font-bold text-slate-400">{shortDate(date)}</span>
                </div>

                {items.length === 0 ? (
                  <p className="text-[11px] font-medium text-slate-300 py-4 text-center">Không có lớp</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((session) => {
                      const badge = BADGES[badgeKey(session, now)];
                      const cancelled = session.status === 'cancelled';
                      return (
                        <div
                          key={session.id}
                          className={`rounded-xl border bg-white p-2.5 space-y-1 ${cancelled ? 'border-red-200 opacity-80' : 'border-slate-200'}`}
                        >
                          <p className="font-mono text-[11px] font-bold text-slate-800">
                            {formatTime(session.startTime)} - {formatTime(session.endTime)}
                          </p>
                          <p className={`text-xs font-black leading-tight ${cancelled ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                            {session.className}
                          </p>
                          <p className="text-[11px] text-slate-500">📍 {session.roomName}</p>
                          <p className="text-[11px] text-slate-500">👤 {session.coachName}</p>
                          <span className={`inline-block border text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${badge.className}`}>
                            {badge.label}
                          </span>
                          {session.note && (
                            <p className="text-[11px] font-semibold text-slate-600 bg-slate-50 rounded-lg px-2 py-1 leading-4 break-words">
                              📝 {session.note}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
