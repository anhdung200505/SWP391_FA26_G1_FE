import { useEffect, useMemo, useState } from 'react';
import {
  cancelSession,
  changeSessionCoach,
  getClasses,
  getSessionOptions,
  getSessions,
  getSports,
  updateSession,
} from '../../api/managementApi';

const STATUS_STYLES = {
  scheduled: { label: 'Sắp diễn ra', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  held: { label: 'Giữ chỗ', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  completed: { label: 'Đã học', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  cancelled: { label: 'Đã hủy', className: 'bg-red-50 text-[#e31b23] border-red-200' },
};

const inputClass =
  'bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#e31b23]';

function toIsoDate(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

function formatDate(value) {
  const [year, month, day] = String(value).split('-');
  return `${day}/${month}/${year}`;
}

const formatTime = (value) => String(value || '').slice(0, 5);

// mode = 'admin': đổi HLV, đổi phòng, hủy buổi, ghi chú. mode = 'reception': chỉ đổi HLV khi HLV bận.
export default function SessionSchedulePanel({ mode = 'admin', initialClassId = '' }) {
  const isAdmin = mode === 'admin';
  const today = toIsoDate(new Date());

  const [sports, setSports] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [sportId, setSportId] = useState('');
  const [classId, setClassId] = useState(initialClassId);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(addDays(13));
  const [statusFilter, setStatusFilter] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [editing, setEditing] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    getSports('1').then((data) => setSports(Array.isArray(data) ? data : [])).catch(() => setSports([]));
  }, []);

  useEffect(() => {
    getClasses('1', sportId || undefined)
      .then((data) => setClasses(Array.isArray(data) ? data : []))
      .catch(() => setClasses([]));
  }, [sportId]);

  useEffect(() => {
    let ignore = false;
    getSessions({ classId, sportId, from, to })
      .then((data) => {
        if (ignore) return;
        setSessions(Array.isArray(data) ? data : []);
        setError('');
      })
      .catch((err) => {
        if (!ignore) setError(err.message || 'Không tải được lịch buổi học.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [classId, sportId, from, to, reloadKey]);

  const visibleSessions = useMemo(
    () => (statusFilter ? sessions.filter((item) => item.status === statusFilter) : sessions),
    [sessions, statusFilter],
  );

  const reload = () => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  const changeFilter = (setter) => (event) => {
    setLoading(true);
    setter(event.target.value);
  };

  const changeSport = (event) => {
    setLoading(true);
    setSportId(event.target.value);
    setClassId('');
  };

  const canChange = (session) => !['cancelled', 'completed'].includes(session.status) && session.date >= today;

  const handleSaved = (message) => {
    setEditing(null);
    setCancelling(null);
    setNotice(message);
    reload();
  };

  return (
    <div className="space-y-6">
      {/* BỘ LỌC */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 w-full">
          <label className="space-y-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Môn học</span>
            <select value={sportId} onChange={changeSport} className={`${inputClass} w-full cursor-pointer`}>
              <option value="">Tất cả môn học</option>
              {sports.map((sport) => (
                <option key={sport.id} value={sport.id}>
                  {sport.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Lớp học</span>
            <select value={classId} onChange={changeFilter(setClassId)} className={`${inputClass} w-full cursor-pointer`}>
              <option value="">Tất cả lớp</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Từ ngày</span>
            <input type="date" value={from} onChange={changeFilter(setFrom)} className={`${inputClass} w-full`} />
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Đến ngày</span>
            <input type="date" value={to} min={from} onChange={changeFilter(setTo)} className={`${inputClass} w-full`} />
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Trạng thái</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={`${inputClass} w-full cursor-pointer`}>
              <option value="">Tất cả</option>
              <option value="scheduled">Sắp diễn ra</option>
              <option value="completed">Đã học</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className="w-full lg:w-auto shrink-0 bg-slate-900 hover:bg-[#e31b23] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
        >
          🔄 Làm mới
        </button>
      </div>

      {notice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold flex items-center justify-between gap-3">
          <span>✅ {notice}</span>
          <button type="button" onClick={() => setNotice('')} className="text-emerald-500 hover:text-emerald-800 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold">⚠️ {error}</div>
      )}

      {/* BẢNG BUỔI HỌC */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Lịch buổi học ({visibleSessions.length})
          </h2>
          <p className="text-[11px] font-bold text-slate-400">
            {isAdmin
              ? 'Đổi HLV, phòng hoặc hủy buổi chưa diễn ra. Học viên trong lớp nhận thông báo.'
              : 'Đổi HLV khi HLV phụ trách bận. Học viên trong lớp nhận thông báo.'}
          </p>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#e31b23] border-t-transparent mb-2" />
            <p className="text-xs font-bold text-slate-400">Đang tải lịch buổi học...</p>
          </div>
        ) : visibleSessions.length === 0 ? (
          <div className="py-16 text-center text-xs font-bold text-slate-400">Không có buổi học nào trong khoảng đã chọn.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="p-4">Thời gian</th>
                  <th className="p-4">Lớp / Môn</th>
                  <th className="p-4">Huấn luyện viên</th>
                  <th className="p-4">Phòng</th>
                  <th className="p-4">Sĩ số</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4 text-right">Thao tác</th>
                  <th className="p-4">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {visibleSessions.map((session) => {
                  const status = STATUS_STYLES[session.status] || STATUS_STYLES.scheduled;
                  const editable = canChange(session);
                  return (
                    <tr
                      key={session.id}
                      className={`transition-colors ${session.status === 'cancelled' ? 'bg-red-50/30' : 'hover:bg-slate-50/80'}`}
                    >
                      <td className="p-4 whitespace-nowrap">
                        <p className="font-bold text-slate-900">
                          {formatDate(session.date)} <span className="text-[11px] font-bold text-slate-400">{session.weekdayName}</span>
                        </p>
                        <span className="inline-block mt-1 font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                          {formatTime(session.startTime)} - {formatTime(session.endTime)}
                        </span>
                      </td>
                      <td className="p-4 min-w-[170px]">
                        <p className="font-bold text-slate-900">{session.className}</p>
                        <span className="inline-block bg-red-50 text-[#e31b23] border border-red-100 font-bold text-[10px] px-2 py-0.5 rounded mt-1">
                          {session.sportName}
                        </span>
                        <span className="ml-1.5 text-[10px] font-bold text-slate-400">Buổi {session.sessionNo}</span>
                      </td>
                      <td className="p-4 min-w-[130px] font-bold text-slate-800">👤 {session.coachName}</td>
                      <td className="p-4 min-w-[120px] text-slate-600">📍 {session.roomName}</td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900">
                          {session.enrolledCount}/{session.capacity ?? '∞'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-block whitespace-nowrap border text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        {editable ? (
                          <div className="inline-flex flex-col items-stretch gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditing(session)}
                              className="bg-slate-900 hover:bg-[#e31b23] text-white font-bold text-[11px] px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                            >
                              {isAdmin ? '✏️ Đổi HLV / Phòng' : '🔁 Đổi HLV'}
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => setCancelling(session)}
                                className="border border-red-200 bg-white text-[#e31b23] hover:bg-red-50 font-bold text-[11px] px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                              >
                                ✕ Hủy buổi
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-300">—</span>
                        )}
                      </td>
                      <td className="p-4 min-w-[160px] max-w-[220px]">
                        {session.note ? (
                          <p className="text-[11px] font-semibold text-slate-600 leading-5 break-words">{session.note}</p>
                        ) : (
                          <span className="text-[11px] text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <EditSessionModal
          session={editing}
          isAdmin={isAdmin}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      {cancelling && (
        <CancelSessionModal session={cancelling} onClose={() => setCancelling(null)} onSaved={handleSaved} />
      )}
    </div>
  );
}

function ModalFrame({ title, badge, session, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between pb-4 border-b border-gray-100">
          <div>
            <span className="inline-block bg-[#e31b23] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded -skew-x-12 mb-1">
              <span className="inline-block skew-x-12">{badge}</span>
            </span>
            <h3 className="text-xl font-black text-slate-900 uppercase">{title}</h3>
            <p className="mt-1 text-xs font-bold text-slate-500">
              {session.className} · Buổi {session.sessionNo} · {session.weekdayName} {formatDate(session.date)} ·{' '}
              {formatTime(session.startTime)}-{formatTime(session.endTime)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 font-bold text-lg p-1 cursor-pointer">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function optionLabel(option) {
  const capacity = option.capacity != null ? ` (${option.capacity} chỗ)` : '';
  if (option.isCurrent) return `${option.name}${capacity} · đang xếp`;
  if (option.isBusy) return `${option.name}${capacity} · ${option.busyReason}`;
  return `${option.name}${capacity}`;
}

function EditSessionModal({ session, isAdmin, onClose, onSaved }) {
  const [options, setOptions] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [coachId, setCoachId] = useState(session.coachUserId);
  const [roomId, setRoomId] = useState(session.roomId);
  const [note, setNote] = useState(isAdmin ? session.note || '' : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getSessionOptions(session.id)
      .then(setOptions)
      .catch((err) => setLoadError(err.message || 'Không tải được danh sách HLV và phòng.'));
  }, [session.id]);

  const coachChanged = coachId !== session.coachUserId;
  const roomChanged = roomId !== session.roomId;
  const noteChanged = isAdmin && note.trim() !== (session.note || '');

  const submit = async (event) => {
    event.preventDefault();
    if (!isAdmin && !coachChanged) {
      setError('Hãy chọn huấn luyện viên khác.');
      return;
    }
    if (isAdmin && !coachChanged && !roomChanged && !noteChanged) {
      setError('Chưa có thay đổi nào.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (isAdmin) {
        await updateSession(session.id, {
          coachUserId: coachChanged ? coachId : null,
          roomId: roomChanged ? roomId : null,
          note: note.trim(),
        });
      } else {
        await changeSessionCoach(session.id, { coachUserId: coachId, note: note.trim() || null });
      }
      onSaved(`Đã cập nhật ${session.className}, buổi ${session.sessionNo} (${formatDate(session.date)}).`);
    } catch (err) {
      setError(err.message || 'Cập nhật buổi học thất bại.');
      setSaving(false);
    }
  };

  return (
    <ModalFrame
      title={isAdmin ? 'Đổi HLV / Phòng' : 'Đổi huấn luyện viên'}
      badge={session.sportName}
      session={session}
      onClose={onClose}
    >
      {loadError ? (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold">⚠️ {loadError}</div>
      ) : !options ? (
        <div className="py-10 text-center">
          <div className="inline-block animate-spin rounded-full h-7 w-7 border-4 border-[#e31b23] border-t-transparent" />
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Huấn luyện viên</span>
            <select value={coachId} onChange={(event) => setCoachId(event.target.value)} className={`${inputClass} w-full cursor-pointer`}>
              {options.coaches.map((coach) => (
                <option key={coach.id} value={coach.id} disabled={coach.isBusy && !coach.isCurrent}>
                  {optionLabel(coach)}
                </option>
              ))}
            </select>
            {options.coaches.filter((coach) => !coach.isBusy && !coach.isCurrent).length === 0 && (
              <p className="text-[11px] font-bold text-amber-600">Không còn HLV nào khác của môn này rảnh vào giờ này.</p>
            )}
          </label>

          {isAdmin && (
            <label className="block space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Phòng</span>
              <select value={roomId} onChange={(event) => setRoomId(event.target.value)} className={`${inputClass} w-full cursor-pointer`}>
                {options.rooms.map((room) => (
                  <option key={room.id} value={room.id} disabled={room.isBusy && !room.isCurrent}>
                    {optionLabel(room)}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block space-y-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {isAdmin ? 'Ghi chú (hiện ở cuối hàng)' : 'Lý do đổi HLV (ghi chú)'}
            </span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder={isAdmin ? 'VD: HLV nghỉ phép, chuyển sang phòng 2 do bảo trì...' : 'VD: HLV phụ trách nghỉ ốm.'}
              className={`${inputClass} w-full font-medium resize-none`}
            />
          </label>

          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold">⚠️ {error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-slate-900 hover:bg-[#e31b23] text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      )}
    </ModalFrame>
  );
}

function CancelSessionModal({ session, onClose, onSaved }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!reason.trim()) {
      setError('Nhập lý do hủy buổi học.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await cancelSession(session.id, reason.trim());
      onSaved(`Đã hủy ${session.className}, buổi ${session.sessionNo} (${formatDate(session.date)}).`);
    } catch (err) {
      setError(err.message || 'Hủy buổi học thất bại.');
      setSaving(false);
    }
  };

  return (
    <ModalFrame title="Hủy buổi học" badge="Xác nhận" session={session} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="text-xs text-slate-600 bg-red-50/50 border border-red-100 p-3.5 rounded-xl">
          Buổi học sẽ chuyển sang <strong className="text-[#e31b23]">Đã hủy</strong> và không thể hoàn tác.{' '}
          {session.enrolledCount} học viên trong lớp sẽ nhận thông báo kèm lý do.
        </div>
        <label className="block space-y-1.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Lý do hủy (ghi chú)</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="VD: Sân bảo trì, mưa bão, HLV và HLV thay thế đều vắng..."
            className={`${inputClass} w-full font-medium resize-none`}
          />
        </label>

        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold">⚠️ {error}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            Không hủy
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-[#e31b23] hover:bg-[#c4131a] text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
          >
            {saving ? 'Đang hủy...' : 'Xác nhận hủy buổi'}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}
