import { useEffect, useState } from 'react';
import { getAttendance, saveAttendance } from '../../api/coachCourseApi';
import { fieldClass, formatDate, formatTime, primaryButtonClass, statusLabel } from './coachUi';

const MARKS = [
  { id: 'present', label: 'Có mặt' },
  { id: 'late', label: 'Đi trễ' },
  { id: 'absent', label: 'Vắng' },
];

export default function AttendancePanel({ classId, sessions }) {
  const openSessions = (sessions || []).filter((session) => session.status !== 'cancelled');
  const [sessionId, setSessionId] = useState(openSessions[0]?.sessionId || '');
  const [sheet, setSheet] = useState(null);
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setSessionId(openSessions[0]?.sessionId || '');
  }, [classId]);

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
    return <p className="rounded-3xl border border-gray-200 bg-white p-5 text-sm text-gray-600">Lớp chưa có buổi để điểm danh.</p>;
  }

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5">
      <label className="block text-sm font-bold text-gray-700">
        Buổi học
        <select value={sessionId} onChange={(event) => setSessionId(event.target.value)} className={fieldClass}>
          {openSessions.map((session) => (
            <option key={session.sessionId} value={session.sessionId}>
              {session.sessionNo ? `Buổi ${session.sessionNo}` : 'Buổi'} · {formatDate(session.sessionDate)} · {formatTime(session.startTime)} · {statusLabel(session.status)}
            </option>
          ))}
        </select>
      </label>

      {loading && <p className="mt-4 text-sm text-gray-500">Đang tải sĩ số...</p>}
      {error && <p className="mt-4 text-sm font-semibold text-[#b1131a]">{error}</p>}
      {notice && <p className="mt-4 text-sm font-semibold text-emerald-800">{notice}</p>}

      {sheet && !loading && (
        <ul className="mt-4 divide-y divide-gray-100">
          {(sheet.rows || []).length === 0 && (
            <li className="py-3 text-sm text-gray-600">Lớp chưa có học viên để điểm danh.</li>
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
                      onClick={() => setMarks((current) => ({ ...current, [row.memberUserId]: mark.id }))}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                        active ? 'bg-[#12141d] text-white' : 'bg-[#f4f5f7] text-gray-600'
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

      <button type="button" onClick={submit} disabled={saving || loading || !sheet?.rows?.length} className={`${primaryButtonClass} mt-4`}>
        {saving ? 'Đang lưu...' : 'Lưu điểm danh'}
      </button>
    </section>
  );
}
