import { useEffect, useState } from 'react';
import { getAdminAttendance, saveAdminAttendance } from '../../api/managementApi';
import { formatDate } from './classUtils';

const MARKS = [
  { id: 'present', label: 'Có mặt', active: 'bg-emerald-600 text-white' },
  { id: 'late', label: 'Đi trễ', active: 'bg-amber-500 text-white' },
  { id: 'absent', label: 'Vắng', active: 'bg-[#e31b23] text-white' },
];

const formatTime = (value) => String(value || '').slice(0, 5);

// Quản trị xem và sửa điểm danh một buổi từ hôm nay về quá khứ (coach chỉ sửa được từ giờ bắt đầu đến hết ngày hôm đó).
export default function AdminAttendanceModal({ classId, session, onClose, onSaved }) {
  const [sheet, setSheet] = useState(null);
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    getAdminAttendance(classId, session.id)
      .then((data) => {
        if (ignore) return;
        setSheet(data);
        const initial = {};
        for (const row of data.rows || []) initial[row.memberUserId] = row.status || '';
        setMarks(initial);
      })
      .catch((err) => {
        if (!ignore) setError(err.message || 'Không tải được danh sách điểm danh.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [classId, session.id]);

  const rows = sheet?.rows || [];
  const locked = sheet ? !sheet.canEdit : true;
  const unmarked = rows.filter((row) => !marks[row.memberUserId]).length;

  const markAll = (status) => setMarks(Object.fromEntries(rows.map((row) => [row.memberUserId, status])));

  const submit = async () => {
    if (unmarked > 0) {
      setError(`Còn ${unmarked} học viên chưa chọn trạng thái.`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await saveAdminAttendance(
        classId,
        session.id,
        rows.map((row) => ({ memberUserId: row.memberUserId, status: marks[row.memberUserId] })),
      );
      onSaved(`Đã lưu điểm danh buổi ${session.sessionNo} (${formatDate(session.date)}).`);
    } catch (err) {
      setError(err.message || 'Lưu điểm danh thất bại.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-xl font-black uppercase text-slate-900">Điểm danh buổi {session.sessionNo}</h3>
            <p className="mt-1 text-xs font-bold text-slate-500">
              {session.className} · {formatDate(session.date)} · {formatTime(session.startTime)}-{formatTime(session.endTime)}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">Quản trị sửa được buổi từ hôm nay về quá khứ, kể cả sau khi coach đã bị khóa. Không sửa buổi tương lai.</p>
          </div>
          <button type="button" onClick={onClose} className="cursor-pointer p-1 text-lg font-bold text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>

        {loading && <p className="py-6 text-center text-sm text-gray-500">Đang tải học viên...</p>}
        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</p>}
        {sheet && locked && sheet.lockReason && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">{sheet.lockReason}</p>
        )}

        {sheet && !loading && (
          <>
            {rows.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">Lớp chưa có học viên để điểm danh.</p>
            ) : (
              <>
                {!locked && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-slate-500">Đặt tất cả:</span>
                    {MARKS.map((mark) => (
                      <button
                        key={mark.id}
                        type="button"
                        onClick={() => markAll(mark.id)}
                        className="cursor-pointer rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-700 hover:bg-slate-200"
                      >
                        {mark.label}
                      </button>
                    ))}
                  </div>
                )}
                <ul className="divide-y divide-gray-100">
                  {rows.map((row) => (
                    <li key={row.memberUserId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-bold text-slate-900">{row.memberName}</p>
                      <div className="flex gap-2">
                        {MARKS.map((mark) => (
                          <button
                            key={mark.id}
                            type="button"
                            disabled={locked}
                            onClick={() => setMarks((current) => ({ ...current, [row.memberUserId]: mark.id }))}
                            className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60 ${
                              marks[row.memberUserId] === mark.id ? mark.active : 'bg-[#f4f5f7] text-gray-600'
                            }`}
                          >
                            {mark.label}
                          </button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="cursor-pointer rounded-xl bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200">
            Đóng
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || loading || locked || rows.length === 0}
            className="cursor-pointer rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-[#e31b23] disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : 'Lưu điểm danh'}
          </button>
        </div>
      </div>
    </div>
  );
}
