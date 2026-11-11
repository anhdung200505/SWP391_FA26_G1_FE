import { useEffect, useState } from 'react';
import { getAttendance, saveAttendance } from '../../api/coachCourseApi';
import { fieldClass, formatDate, formatTime, primaryButtonClass, statusLabel } from './coachUi';

const MARKS = [
  { id: 'present', label: 'Có mặt' },
  { id: 'late', label: 'Đi trễ' },
  { id: 'absent', label: 'Vắng' },
];

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function sessionDay(session) {
  return String(session?.sessionDate || '').slice(0, 10);
}

function pickSession(sessions) {
  const today = todayIso();
  const due = sessions.filter((session) => sessionDay(session) && sessionDay(session) <= today);
  return (due.at(-1) || sessions[0])?.sessionId || '';
}

export default function AttendancePanel({ classId, sessions, initialSessionId }) {
  const openSessions = (sessions || []).filter((session) => session.status !== 'cancelled');
  const [sessionId, setSessionId] = useState(() => initialSessionId || pickSession(openSessions));
  const [sheet, setSheet] = useState(null);
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setSessionId(initialSessionId || pickSession(openSessions));
  }, [classId, initialSessionId]);

  useEffect(() => {
    if (!classId || !sessionId) {
      setSheet(null);
      return undefined;
    }
    let ignore = false;
    setLoading(true);
    setError('');
    setNotice('');
    getAttendance(classId, sessionId)
      .then((next) => {
        if (ignore) return;
        setSheet(next);
        const initial = {};
        for (const row of next.rows || []) initial[row.memberUserId] = row.status || '';
        setMarks(initial);
      })
      .catch((loadError) => {
        if (!ignore) setError(loadError.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [classId, sessionId]);

  const submit = async () => {
    const payload = Object.entries(marks).map(([memberUserId, status]) => ({ memberUserId, status }));
    if (payload.some((item) => !item.status)) {
      setError('Điểm danh đủ học viên trước khi lưu.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const next = await saveAttendance(classId, sessionId, payload);
      setSheet(next);
      setNotice('Đã lưu điểm danh.');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  if (!openSessions.length) {
    return <p className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6 text-sm text-slate-600">Lớp chưa có buổi để điểm danh.</p>;
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
      <label className="block text-sm font-bold text-slate-700">
        Buổi học
        <select value={sessionId} onChange={(event) => setSessionId(event.target.value)} className={fieldClass}>
          {openSessions.map((session) => (
            <option key={session.sessionId} value={session.sessionId}>
              {session.sessionNo ? `Buổi ${session.sessionNo}` : 'Buổi'} · {formatDate(session.sessionDate)} · {formatTime(session.startTime)} · {statusLabel(session.status)}
            </option>
          ))}
        </select>
      </label>

      {loading && <p className="mt-4 text-sm text-slate-500">Đang tải sĩ số...</p>}
      {error && <p className="mt-4 text-sm font-semibold text-red-700">{error}</p>}
      {notice && <p className="mt-4 text-sm font-semibold text-emerald-700">{notice}</p>}

      {sheet && !loading && !sheet.canEdit && sheet.lockReason && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{sheet.lockReason}</p>
      )}

      {sheet && !loading && (
        <ul className="mt-4 divide-y divide-slate-100">
          {(sheet.rows || []).length === 0 && (
            <li className="py-3 text-sm text-slate-600">Lớp chưa có học viên để điểm danh.</li>
          )}
          {(sheet.rows || []).map((row) => (
            <li key={row.memberUserId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-bold">{row.memberName}</p>
              <div className="flex gap-2">
                {MARKS.map((mark) => {
                  const active = marks[row.memberUserId] === mark.id;
                  return (
                    <button
                      key={mark.id}
                      type="button"
                      disabled={!sheet.canEdit}
                      onClick={() => setMarks((current) => ({ ...current, [row.memberUserId]: mark.id }))}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60 ${
                        active ? 'bg-[#12141d] text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {mark.label}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}

      <button type="button" onClick={submit} disabled={saving || loading || !sheet?.rows?.length || !sheet?.canEdit} className={`${primaryButtonClass} mt-4`}>
        {saving ? 'Đang lưu...' : 'Lưu điểm danh'}
      </button>
    </section>
  );
}
