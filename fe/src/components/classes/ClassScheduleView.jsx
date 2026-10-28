import { useEffect, useRef, useState } from 'react';
import { CancelSessionModal, EditSessionModal } from '../sessions/SessionSchedulePanel';
import { CLASS_STATUS, formatDate } from './classUtils';
import { getSessions } from '../../api/managementApi';
import WeekSlotTable, { formatClock, mondayOf, weekContaining } from '../schedule/WeekSlotTable';
import SessionCoachLine from '../schedule/SessionCoachLine';

const SESSION_STATUS = {
  upcoming: { label: 'Sắp học', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  held: { label: 'Giữ chỗ', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  completed: { label: 'Đã học', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending: { label: 'Chưa cập nhật', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  cancelled: { label: 'Đã hủy', className: 'bg-red-50 text-[#e31b23] border-red-200' },
};

const formatTime = (value) => String(value || '').slice(0, 5);

function todayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

// Buổi đã qua ngày mà chưa được chuyển sang completed thì hiện "Chưa cập nhật".
function sessionStatusKey(session, today) {
  if (session.status === 'scheduled') return session.date < today ? 'pending' : 'upcoming';
  return session.status;
}

// mode = 'admin': đổi HLV/phòng và hủy buổi. mode = 'reception': chỉ đổi HLV. loadClasses trả danh sách lớp để tìm lớp theo id.
export default function ClassScheduleView({ classId, mode = 'admin', loadClasses, back }) {
  const isAdmin = mode === 'admin';
  const today = todayIso();

  const [klass, setKlass] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const weekClass = useRef('');

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const classes = await loadClasses();
        const found = (Array.isArray(classes) ? classes : []).find((item) => item.id === classId);
        if (!found) throw new Error('Không tìm thấy lớp học.');
        const list = await getSessions({ classId, from: found.startDate, to: found.endDate });
        if (ignore) return;
        setKlass(found);
        setSessions(Array.isArray(list) ? list : []);
        if (weekClass.current !== classId) {
          weekClass.current = classId;
          setWeekStart(weekContaining((Array.isArray(list) ? list : []).map((session) => String(session.date || '').slice(0, 10))));
        }
        setError('');
      } catch (err) {
        if (!ignore) setError(err.message || 'Không tải được lịch lớp học.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [classId, reloadKey, loadClasses]);

  const handleSaved = (message) => {
    setEditing(null);
    setCancelling(null);
    setNotice(message);
    setReloadKey((key) => key + 1);
  };

  const canChange = (session) => !['cancelled', 'completed'].includes(session.status) && session.date >= today;
  const countable = sessions.filter((item) => item.status !== 'cancelled');
  const done = countable.filter((item) => item.status === 'completed').length;
  const percent = countable.length ? Math.round((done / countable.length) * 100) : 0;
  const status = klass ? CLASS_STATUS[klass.status] || CLASS_STATUS.open : null;

  return (
    <>
      {back}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold">⚠️ {error}</div>
      )}

      {loading ? (
        <div className="py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#e31b23] border-t-transparent mb-2" />
          <p className="text-xs font-bold text-gray-400">Đang tải lịch lớp học...</p>
        </div>
      ) : (
        klass && (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black uppercase italic tracking-tight text-slate-900">{klass.name}</h1>
              <span className={`inline-block whitespace-nowrap border text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${status.className}`}>
                {status.label}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 lg:grid-cols-3 gap-5 bg-white p-6 rounded-3xl border border-gray-200 shadow-xs text-xs">
              <div>
                <span className="text-gray-400 font-bold block">Môn · Level</span>
                <strong className="text-slate-900 text-sm">
                  {klass.sportName} · {klass.level}
                </strong>
              </div>
              <div>
                <span className="text-gray-400 font-bold block">Coach</span>
                <strong className="text-slate-900 text-sm">{klass.coachName}</strong>
              </div>
              <div>
                <span className="text-gray-400 font-bold block">Phòng</span>
                <strong className="text-slate-900 text-sm">{klass.roomName || 'Chưa xếp phòng'}</strong>
              </div>
              <div>
                <span className="text-gray-400 font-bold block">Khai giảng → kết thúc</span>
                <strong className="text-slate-900 text-sm">
                  {formatDate(klass.startDate)} → {formatDate(klass.endDate)}
                </strong>
              </div>
              <div>
                <span className="text-gray-400 font-bold block">Học viên</span>
                <strong className="text-slate-900 text-sm">
                  {klass.enrolledCount}/{klass.capacity ?? '∞'}
                </strong>
              </div>
              <div>
                <span className="text-gray-400 font-bold block">Học phí</span>
                <strong className="text-[#e31b23] text-sm font-black">{klass.tuition?.toLocaleString('vi-VN')} đ</strong>
              </div>
              <div className="col-span-2 lg:col-span-1">
                <span className="text-gray-400 font-bold block">Lịch tuần</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {klass.schedule?.length ? (
                    klass.schedule.map((row) => (
                      <span
                        key={`${row.weekday}-${row.timeSlotId}`}
                        className="font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded whitespace-nowrap"
                      >
                        {row.weekdayName} · {formatTime(row.startTime)}-{formatTime(row.endTime)}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-300">Chưa xếp lịch</span>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-gray-400 font-bold block">
                  Đã học {done}/{countable.length} buổi
                </span>
                <div className="mt-2 h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
                </div>
              </div>
            </div>

            {notice && (
              <div className="mt-5 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold flex items-center justify-between gap-3">
                <span>✅ {notice}</span>
                <button type="button" onClick={() => setNotice('')} className="text-emerald-500 hover:text-emerald-800 cursor-pointer">
                  ✕
                </button>
              </div>
            )}

            <div className="mt-5">
              <WeekSlotTable
                weekStart={weekStart}
                onWeekStart={setWeekStart}
                sessions={sessions}
                renderCell={(session) => {
                  const key = sessionStatusKey(session, today);
                  const badge = SESSION_STATUS[key] || SESSION_STATUS.upcoming;
                  const editable = canChange(session);
                  const cancelled = session.status === 'cancelled';
                  return (
                    <div className={cancelled ? 'text-gray-400' : 'text-gray-900'}>
                      <p className={`font-semibold leading-snug ${cancelled ? 'line-through' : ''}`}>
                        Buổi {session.sessionNo}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 tabular-nums">
                        {formatClock(session.startTime)}–{formatClock(session.endTime)}
                      </p>
                      <p className="text-xs text-gray-500">{session.roomName}</p>
                      <SessionCoachLine session={session} />
                      <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${badge.className}`}>
                        {badge.label}
                      </span>
                      {session.note && <p className="mt-1 text-xs text-pretty whitespace-pre-line text-gray-600">{session.note}</p>}
                      {editable && (
                        <div className="mt-2 flex gap-2">
                          <button type="button" onClick={() => setEditing(session)} className="text-xs font-semibold text-gray-700 underline">
                            Đổi
                          </button>
                          {isAdmin && (
                            <button type="button" onClick={() => setCancelling(session)} className="text-xs font-semibold text-[#e31b23] underline">
                              Hủy buổi
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }}
              />
            </div>
          </>
        )
      )}

      {editing && <EditSessionModal session={editing} isAdmin={isAdmin} onClose={() => setEditing(null)} onSaved={handleSaved} />}
      {isAdmin && cancelling && <CancelSessionModal session={cancelling} onClose={() => setCancelling(null)} onSaved={handleSaved} />}
    </>
  );
}
