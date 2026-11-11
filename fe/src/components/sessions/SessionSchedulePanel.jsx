import { useEffect, useMemo, useState } from 'react';
import SessionCoachLine from '../schedule/SessionCoachLine';
import SessionRoomLine from '../schedule/SessionRoomLine';
import {
  cancelSession,
  changeSessionCoach,
  getMakeupPlan,
  getSessionSlots,
  rescheduleSession,
  scheduleSessionMakeup,
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
  const [slotting, setSlotting] = useState(null);

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
    setSlotting(null);
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
              ? 'Đổi HLV, phòng hoặc hủy buổi chưa diễn ra. Hủy buổi hôm nay hoặc buổi sắp tới thì xếp buổi bù vào cuối tuần cùng tháng. Học viên trong lớp nhận thông báo.'
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
                      <td className="p-4 min-w-[130px]">
                        <SessionCoachLine session={session} className="text-sm font-bold text-slate-800" />
                      </td>
                      <td className="p-4 min-w-[120px]">
                        <SessionRoomLine session={session} className="text-sm text-slate-600" />
                      </td>
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
                        ) : isAdmin && session.status === 'cancelled' && !hasMakeup(sessions, session) && session.date >= today ? (
                          <button
                            type="button"
                            onClick={() => setSlotting({ session, mode: 'makeup' })}
                            className="bg-slate-900 hover:bg-[#e31b23] text-white font-bold text-[11px] px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                          >
                            Xếp buổi bù
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-300">—</span>
                        )}
                      </td>
                      <td className="p-4 min-w-[160px] max-w-[220px]">
                        {session.note ? (
                          <p className="text-[11px] font-semibold text-slate-600 leading-5 break-words whitespace-pre-line">{session.note}</p>
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

      {slotting && (
        <SessionSlotModal session={slotting.session} mode={slotting.mode} onClose={() => setSlotting(null)} onSaved={handleSaved} />
      )}
    </div>
  );
}

// Buổi đã hủy đã có buổi bù khi cùng lớp có buổi ghi "Buổi bù cho buổi ngày dd/MM/yyyy".
export function hasMakeup(sessions, cancelled) {
  const marker = `Buổi bù cho buổi ngày ${formatDate(String(cancelled.date).slice(0, 10))}`;
  return sessions.some(
    (item) => item.classId === cancelled.classId && item.status !== 'cancelled' && String(item.note || '').startsWith(marker),
  );
}

// Tiêu đề đứng yên, chỉ phần nội dung cuộn (thanh cuộn mảnh nằm trong khung bo góc). wide: hộp có nhiều lựa chọn (buổi bù).
function ModalFrame({ title, badge, session, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className={`bg-white rounded-3xl w-full shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden ${
          wide ? 'max-w-2xl' : 'max-w-lg'
        }`}
      >
        <div className="flex shrink-0 items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
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
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 [scrollbar-color:#cbd5e1_transparent] [scrollbar-gutter:stable] [scrollbar-width:thin]">
          {children}
        </div>
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

export function EditSessionModal({ session, isAdmin, onClose, onSaved }) {
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
              {isAdmin ? 'Ghi chú (hiện ở cuối hàng, xuống dòng trong thông báo)' : 'Ghi chú đổi HLV (ghi là thay thế)'}
            </span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder={isAdmin ? 'VD: HLV nghỉ phép. Khi đổi HLV, hệ thống ghi HLV thay thế rồi xuống dòng phần ghi chú này.' : 'VD: HLV phụ trách nghỉ ốm. Ghi chú này xuống dòng dưới dòng HLV thay thế.'}
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

const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

// Chọn ngày rồi chọn khung giờ còn trống (khung bận bị khóa kèm lý do). Dùng cho đổi lịch một buổi.
export function SlotPicker({ session, date, onDate, slotId, onSlot, minDate }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date) {
      setSlots([]);
      return undefined;
    }

    let ignore = false;
    setLoading(true);
    getSessionSlots(session.id, date)
      .then((data) => {
        if (!ignore) setSlots(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!ignore) setSlots([]);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [session.id, date]);

  return (
    <div className="space-y-3">
      <label className="block space-y-1.5">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Ngày học mới</span>
        <input
          type="date"
          value={date}
          min={minDate}
          onChange={(event) => {
            onDate(event.target.value);
            onSlot('');
          }}
          className={`${inputClass} w-full`}
        />
      </label>
      {date && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Khung giờ</span>
          {loading ? (
            <p className="text-xs font-semibold text-slate-400">Đang kiểm tra lịch trống...</p>
          ) : slots.length === 0 ? (
            <p className="text-xs font-semibold text-slate-400">Không có khung giờ phù hợp.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  disabled={slot.isBusy}
                  title={slot.busyReason || ''}
                  onClick={() => onSlot(slot.id)}
                  className={`rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors ${
                    String(slotId) === String(slot.id)
                      ? 'border-[#e31b23] bg-red-50 text-[#e31b23]'
                      : slot.isBusy
                        ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-[#e31b23]'
                  }`}
                >
                  <span className="block tabular-nums">{slot.name}</span>
                  {slot.isBusy && <span className="mt-0.5 block text-[10px] font-semibold text-red-500">{slot.busyReason}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const weekdayShort = (day) => WEEKDAY_SHORT[new Date(`${day}T00:00:00`).getDay()];

// Chọn buổi bù theo thứ tự: HLV dạy (mặc định HLV chính) → ngày thứ 7 / chủ nhật cùng tháng → khung giờ.
// Số khung trống và khung giờ tính theo HLV đang chọn. value = { date, slotId, coachId }; onChange là setter của
// useState (nhận hàm cập nhật) để tự điền buổi gợi ý. Đổi HLV thì bỏ ngày, giờ đã chọn và gợi ý lại cho HLV đó.
export function MakeupPicker({ session, value, onChange }) {
  const { date, slotId, coachId } = value;
  // Kế hoạch / khung giờ đã tải cho HLV (và ngày) nào, để biết đang tải mà không phải đặt state trong effect.
  const [planState, setPlanState] = useState({ key: null, data: null });
  const [slotState, setSlotState] = useState({ key: '', list: [] });
  const plan = planState.data;
  const loadingPlan = planState.key !== coachId;
  const slotsKey = `${date}|${coachId}`;
  const loadingSlots = Boolean(date) && slotState.key !== slotsKey;
  const slots = slotState.key === slotsKey ? slotState.list : [];

  useEffect(() => {
    let ignore = false;
    getMakeupPlan(session.id, coachId)
      .then((data) => {
        if (ignore) return;
        setPlanState({ key: coachId, data: data || { coaches: [], days: [] } });
        onChange((current) => {
          if (current.coachId !== coachId) return current;
          const suggestion = data?.suggestion;
          if (current.date) return current.coachId ? current : { ...current, coachId: String(data?.coachUserId || '') };
          if (!suggestion) return { ...current, coachId: current.coachId || String(data?.coachUserId || '') };
          return {
            date: String(suggestion.date).slice(0, 10),
            slotId: String(suggestion.timeSlotId),
            coachId: String(suggestion.coachUserId),
          };
        });
      })
      .catch(() => {
        if (!ignore) setPlanState({ key: coachId, data: { coaches: [], days: [] } });
      });
    return () => {
      ignore = true;
    };
  }, [session.id, coachId, onChange]);

  useEffect(() => {
    if (!date || !coachId) return undefined;

    let ignore = false;
    const key = `${date}|${coachId}`;
    getSessionSlots(session.id, date, true, coachId)
      .then((data) => {
        if (!ignore) setSlotState({ key, list: Array.isArray(data) ? data : [] });
      })
      .catch(() => {
        if (!ignore) setSlotState({ key, list: [] });
      });
    return () => {
      ignore = true;
    };
  }, [session.id, date, coachId]);

  const suggestion = plan?.suggestion;
  const suggestionDay = suggestion ? String(suggestion.date).slice(0, 10) : '';
  const suggestionSlot = slots.find((slot) => date === suggestionDay && String(slot.id) === String(suggestion?.timeSlotId));
  const usingSuggestion =
    suggestion && date === suggestionDay && String(slotId) === String(suggestion.timeSlotId) && String(coachId) === String(suggestion.coachUserId);
  const coachList = plan?.coaches || [];
  const selectedCoach = coachList.find((coach) => String(coach.id) === String(coachId));

  return (
    <div className="space-y-3">
      <label className="block space-y-1.5">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">1. HLV dạy buổi bù</span>
        <select
          value={coachId}
          onChange={(event) => onChange({ coachId: event.target.value, date: '', slotId: '' })}
          className={`${inputClass} w-full`}
        >
          {coachList.length === 0 && <option value="">Đang tải HLV...</option>}
          {coachList.map((coach) => (
            <option key={coach.id} value={coach.id} disabled={coach.freeSlots === 0 && String(coach.id) !== String(coachId)}>
              {coach.name}
              {coach.isMain ? ' (HLV chính)' : ''}
              {coach.freeSlots > 0 ? ` · còn ${coach.freeSlots} khung trong tháng` : ' · bận hết'}
            </option>
          ))}
        </select>
        {selectedCoach && !selectedCoach.isMain && (
          <span className="block text-[11px] font-semibold text-amber-700">
            Buổi bù sẽ là dạy thay: HLV {selectedCoach.name} thay HLV {plan?.mainCoachName}.
          </span>
        )}
      </label>

      {plan === null || loadingPlan ? (
        <p className="text-xs font-semibold text-slate-400">Đang tìm lịch bù...</p>
      ) : suggestion ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
          <span>
            ★ Gợi ý: {weekdayShort(suggestionDay)} {formatDate(suggestionDay)}
            {suggestionSlot ? ` · ${suggestionSlot.name}` : ''} · HLV {suggestion.coachName}
            {suggestion.isMainCoach ? ' (HLV chính)' : ' (dạy thay)'}
          </span>
          {!usingSuggestion && (
            <button
              type="button"
              onClick={() => onChange({ date: suggestionDay, slotId: String(suggestion.timeSlotId), coachId: String(suggestion.coachUserId) })}
              className="font-bold text-amber-800 underline cursor-pointer"
            >
              Dùng gợi ý
            </button>
          )}
        </div>
      ) : (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          {selectedCoach
            ? `HLV ${selectedCoach.name} không còn khung cuối tuần nào trong tháng (lớp, phòng, học viên cũng phải rảnh). Chọn HLV khác.`
            : 'Không còn khung cuối tuần nào trong tháng mà lớp, phòng, học viên và HLV đều rảnh.'}
        </p>
      )}

      <div className="space-y-1.5">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">2. Ngày bù (cuối tuần cùng tháng)</span>
        <div className="flex flex-wrap gap-2">
          {(plan?.days || []).map((dayInfo) => {
            const day = String(dayInfo.date).slice(0, 10);
            const full = dayInfo.freeSlots === 0;
            return (
              <button
                key={day}
                type="button"
                disabled={full}
                onClick={() => onChange((current) => ({ ...current, date: day, slotId: '' }))}
                className={`rounded-xl border px-3 py-2 text-left text-xs font-bold tabular-nums transition-colors ${
                  date === day
                    ? 'border-[#e31b23] bg-red-50 text-[#e31b23]'
                    : full
                      ? 'cursor-not-allowed border-dashed border-slate-200 bg-slate-50 text-slate-400'
                      : 'border-slate-200 bg-white text-slate-800 hover:border-[#e31b23]'
                }`}
              >
                <span className="block">
                  {weekdayShort(day)} · {formatDate(day)}
                  {day === suggestionDay ? ' ★' : ''}
                </span>
                <span className={`block text-[10px] font-semibold ${full ? 'text-slate-400' : 'text-emerald-700'}`}>
                  {full ? 'hết khung' : `còn ${dayInfo.freeSlots}/${dayInfo.totalSlots} khung`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {date && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">3. Khung giờ · {formatDate(date)}</span>
          {loadingSlots ? (
            <p className="text-xs font-semibold text-slate-400">Đang kiểm tra lịch trống...</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  disabled={slot.isBusy}
                  title={slot.busyReason || ''}
                  onClick={() => onChange((current) => ({ ...current, slotId: String(slot.id) }))}
                  className={`rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors ${
                    String(slotId) === String(slot.id)
                      ? 'border-[#e31b23] bg-red-50 text-[#e31b23]'
                      : slot.isBusy
                        ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-[#e31b23]'
                  }`}
                >
                  <span className="block tabular-nums">
                    {slot.name}
                    {date === suggestionDay && String(slot.id) === String(suggestion?.timeSlotId) ? ' ★' : ''}
                  </span>
                  {slot.busyReason && (
                    <span className={`mt-0.5 block text-[10px] font-semibold ${slot.isBusy ? 'text-red-500' : 'text-amber-700'}`}>
                      {slot.busyReason}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] font-medium text-slate-500">
        Buổi bù giữ số buổi của buổi bị hủy, chỉ xếp vào thứ 7 hoặc chủ nhật trong tháng (không xếp khung tối sau 18:00) để tháng đó đủ số
        buổi và khóa học không bị kéo dài.
      </p>
    </div>
  );
}

// mode = 'reschedule': dời chính buổi này. mode = 'makeup': xếp buổi bù cho buổi đã hủy.
export function SessionSlotModal({ session, mode, onClose, onSaved }) {
  const [date, setDate] = useState('');
  const [slotId, setSlotId] = useState('');
  const [makeup, setMakeup] = useState({ date: '', slotId: '', coachId: '' });
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const tomorrow = addDays(0);
  const isMakeup = mode === 'makeup';
  const ready = isMakeup ? makeup.date && makeup.slotId && makeup.coachId : date && slotId;

  const submit = async (event) => {
    event.preventDefault();
    if (!ready) {
      setError(isMakeup ? 'Chọn ngày, khung giờ và HLV dạy buổi bù.' : 'Chọn ngày và khung giờ.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (isMakeup) {
        await scheduleSessionMakeup(session.id, { date: makeup.date, timeSlotId: makeup.slotId, coachUserId: makeup.coachId });
        onSaved(`Đã xếp buổi bù cho ${session.className} vào ${formatDate(makeup.date)}.`);
      } else {
        await rescheduleSession(session.id, { date, timeSlotId: slotId, reason });
        onSaved(`Đã đổi lịch ${session.className}, buổi ${session.sessionNo} sang ${formatDate(date)}.`);
      }
    } catch (err) {
      setError(err.message || 'Không lưu được thay đổi.');
      setSaving(false);
    }
  };

  return (
    <ModalFrame
      title={mode === 'makeup' ? 'Xếp buổi bù' : 'Đổi lịch buổi học'}
      badge={mode === 'makeup' ? 'Buổi bù' : 'Đổi lịch'}
      session={session}
      onClose={onClose}
      wide={isMakeup}
    >
      <form onSubmit={submit} className="space-y-4">
        {isMakeup ? (
          <MakeupPicker session={session} value={makeup} onChange={setMakeup} />
        ) : (
          <SlotPicker session={session} date={date} onDate={setDate} slotId={slotId} onSlot={setSlotId} minDate={tomorrow} />
        )}
        {!isMakeup && (
          <label className="block space-y-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Lý do đổi lịch (không bắt buộc)</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
              maxLength={500}
              className={`${inputClass} w-full font-medium resize-none`}
            />
          </label>
        )}
        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer">
            Đóng
          </button>
          <button type="submit" disabled={saving || !ready} className="bg-[#e31b23] hover:bg-[#c4131a] text-white font-bold text-xs px-6 py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
            {saving ? 'Đang lưu...' : isMakeup ? 'Xếp buổi bù' : 'Đổi lịch'}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

export function CancelSessionModal({ session, onClose, onSaved }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [makeup, setMakeup] = useState({ date: '', slotId: '', coachId: '' });

  const submit = async (event) => {
    event.preventDefault();
    if (!reason.trim()) {
      setError('Nhập lý do hủy buổi học.');
      return;
    }

    if (!makeup.date || !makeup.slotId || !makeup.coachId) {
      setError('Hủy buổi phải chọn luôn ngày, khung giờ và HLV dạy buổi bù.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const result = await cancelSession(session.id, reason.trim(), {
        date: makeup.date,
        timeSlotId: makeup.slotId,
        coachUserId: makeup.coachId,
      });
      const makeupDate = result?.makeupSession?.date ? formatDate(String(result.makeupSession.date).slice(0, 10)) : formatDate(makeup.date);
      onSaved(`Đã hủy ${session.className}, buổi ${session.sessionNo} (${formatDate(session.date)}). Buổi bù: ${makeupDate}.`);
    } catch (err) {
      setError(err.message || 'Hủy buổi học thất bại.');
      setSaving(false);
    }
  };

  return (
    <ModalFrame title="Hủy buổi học" badge="Xác nhận" session={session} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="text-xs text-slate-600 bg-red-50/50 border border-red-100 p-3.5 rounded-xl">
          Buổi học sẽ chuyển sang <strong className="text-[#e31b23]">Đã hủy</strong>. Chọn buổi bù vào thứ 7 hoặc chủ nhật trong cùng tháng,
          buổi bù giữ số buổi cũ nên khóa học không bị kéo dài.{' '}
          {session.enrolledCount} học viên trong lớp sẽ nhận thông báo kèm lý do và ngày bù.
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

        <div className="space-y-3 rounded-xl border border-slate-200 p-3.5">
          <span className="block text-xs font-black uppercase text-slate-700">Buổi bù (bắt buộc)</span>
          <MakeupPicker session={session} value={makeup} onChange={setMakeup} />
        </div>

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
