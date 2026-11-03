import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import WorkspaceShell from '../components/workspace/WorkspaceShell';
import NotificationBell from '../components/NotificationBell';
import { studentWorkspaceItems, useHasClassRegistration } from '../components/workspace/studentNav';
import { PrivateStatusBadge } from '../components/private/privateUi';
import { clock, formatDate, formatDateTime, scheduleText } from '../components/private/privateFormat';
import {
  cancelPrivateRequest,
  checkPrivateAvailability,
  createPrivateRequest,
  getMyPrivateRequests,
  getPrivateCourses,
  getTimeSlots,
  payPrivateRequest,
} from '../api/managementApi';
import { formatFee } from '../data/accountManagement';

const DAYS = [
  { weekday: 2, name: 'Thứ 2' },
  { weekday: 3, name: 'Thứ 3' },
  { weekday: 4, name: 'Thứ 4' },
  { weekday: 5, name: 'Thứ 5' },
  { weekday: 6, name: 'Thứ 6' },
  { weekday: 7, name: 'Thứ 7' },
];

const STEPS = ['Môn học', 'Lịch hằng tuần', 'Huấn luyện viên'];

const pad = (value) => String(value).padStart(2, '0');

function tomorrowIso() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const errorBox = 'rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700';

export default function PrivateClassPage() {
  const navigate = useNavigate();
  const hasClass = useHasClassRegistration();
  const [courses, setCourses] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [step, setStep] = useState(0);
  const [sportId, setSportId] = useState('');
  const [startDate, setStartDate] = useState(tomorrowIso);
  const [cells, setCells] = useState([]);
  const [availability, setAvailability] = useState(null);
  const [coachId, setCoachId] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [working, setWorking] = useState('');

  const loadRequests = useCallback(async () => {
    const data = await getMyPrivateRequests();
    setRequests(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    document.title = 'Học 1-1 · AnhDuy Sport';
    let ignore = false;
    Promise.all([getPrivateCourses(), getTimeSlots('private'), getMyPrivateRequests()])
      .then(([courseData, slotData, requestData]) => {
        if (ignore) return;
        const list = Array.isArray(courseData) ? courseData : [];
        setCourses(list);
        setTimeSlots(Array.isArray(slotData) ? slotData : []);
        setRequests(Array.isArray(requestData) ? requestData : []);
        setSportId(list[0]?.sportId || '');
      })
      .catch((error) => {
        if (!ignore) setLoadError(error.message || 'Không tải được dữ liệu học 1-1.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const sports = useMemo(() => {
    const seen = new Map();
    courses.forEach((course) => seen.has(course.sportId) || seen.set(course.sportId, course.sportName));
    return [...seen].map(([id, name]) => ({ id, name }));
  }, [courses]);
  const course = courses.find((item) => item.sportId === sportId);
  const pendingCount = requests.filter((item) => item.status === 'pending').length;

  const slotsPayload = cells.map((cell) => {
    const [weekday, timeSlotId] = cell.split('-');
    return { weekday: Number(weekday), timeSlotId };
  });

  const toggleCell = (weekday, slotId) => {
    const key = `${weekday}-${slotId}`;
    setAvailability(null);
    setCoachId('');
    // Mỗi ngày chỉ một buổi: chọn khung khác trong cùng thứ thì thay khung cũ.
    setCells((current) => {
      if (current.includes(key)) return current.filter((item) => item !== key);
      const sameDay = current.some((item) => item.startsWith(`${weekday}-`));
      if (!sameDay && course && current.length >= course.sessionCount) return current;
      return [...current.filter((item) => !item.startsWith(`${weekday}-`)), key];
    });
  };

  const findCoaches = async () => {
    setFormError('');
    setBusy(true);
    try {
      const result = await checkPrivateAvailability({ courseId: course.id, startDate, slots: slotsPayload });
      setAvailability(result);
      setCoachId('');
      setStep(2);
    } catch (error) {
      setFormError(error.message || 'Chưa kiểm tra được lịch.');
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setFormError('');
    setBusy(true);
    try {
      await createPrivateRequest({
        courseId: course.id,
        coachUserId: coachId,
        startDate,
        slots: slotsPayload,
        note: note.trim() || null,
      });
      setNotice('Đã gửi yêu cầu. Quản lý sẽ duyệt và bạn nhận thông báo, sau đó có 24 giờ để thanh toán.');
      setStep(0);
      setCells([]);
      setAvailability(null);
      setCoachId('');
      setNote('');
      await loadRequests();
    } catch (error) {
      setFormError(error.message || 'Chưa gửi được yêu cầu.');
    } finally {
      setBusy(false);
    }
  };

  const pay = async (item) => {
    setActionError('');
    setWorking(item.id);
    try {
      await payPrivateRequest(item.id);
      navigate('/dang-ky-khoa-hoc');
    } catch (error) {
      setActionError(error.message || 'Chưa tạo được đơn thanh toán.');
      await loadRequests().catch(() => {});
    } finally {
      setWorking('');
    }
  };

  const cancel = async (item) => {
    if (!window.confirm(`Hủy yêu cầu học 1-1 "${item.courseName}"?`)) return;
    setActionError('');
    setNotice('');
    setWorking(item.id);
    try {
      await cancelPrivateRequest(item.id);
      await loadRequests();
    } catch (error) {
      setActionError(error.message || 'Chưa hủy được yêu cầu.');
    } finally {
      setWorking('');
    }
  };

  const canNext = [Boolean(course), cells.length > 0 && Boolean(startDate)];

  return (
    <WorkspaceShell
      role="Học viên"
      homeTo="/hoc-vien-dashboard"
      items={studentWorkspaceItems(hasClass)}
      breadcrumb={[{ label: 'Học viên', to: '/hoc-vien-dashboard' }, { label: 'Học 1-1' }]}
      headerExtra={<NotificationBell />}
    >
      <h1 className="text-2xl font-black text-balance">Học 1-1 với huấn luyện viên</h1>
      <p className="mt-2 max-w-prose text-sm text-pretty text-gray-500">
        Chọn môn, khung giờ lặp hằng tuần và huấn luyện viên. Quản lý duyệt xong bạn có 24 giờ để thanh toán, lịch mới được giữ cho bạn.
      </p>

      {loading && <p className="mt-6 text-sm text-gray-500">Đang tải...</p>}
      {!loading && loadError && <p className={`mt-6 ${errorBox}`}>{loadError}</p>}

      {!loading && !loadError && (
        <div className="mt-6 space-y-8">
          {notice && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</p>
          )}

          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
            <h2 className="text-base font-black uppercase text-slate-900">Gửi yêu cầu mới</h2>
            <ol className="mt-3 flex flex-wrap gap-2">
              {STEPS.map((label, index) => (
                <li
                  key={label}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
                    index === step ? 'bg-[#e31b23] text-white' : index < step ? 'bg-[#12141d] text-white' : 'bg-white text-gray-400 ring-1 ring-gray-200'
                  }`}
                >
                  <span className="tabular-nums">{index + 1}</span>
                  {label}
                </li>
              ))}
            </ol>

            {pendingCount >= 3 && (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                Bạn đang có 3 yêu cầu chờ duyệt, đây là mức tối đa. Hãy đợi duyệt hoặc hủy bớt trước khi gửi thêm.
              </p>
            )}

            {courses.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">Hiện chưa có gói học 1-1 nào đang mở.</p>
            ) : (
              <>
                {step === 0 && (
                  <div className="mt-5 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {sports.map((sport) => (
                        <button
                          key={sport.id}
                          type="button"
                          onClick={() => setSportId(sport.id)}
                          aria-pressed={sportId === sport.id}
                          className={`rounded-full px-4 py-2 text-xs font-bold cursor-pointer ${
                            sportId === sport.id ? 'bg-[#e31b23] text-white shadow' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {sport.name}
                        </button>
                      ))}
                    </div>
                    {course && (
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                        <p className="font-black text-slate-900">{course.name}</p>
                        <p className="mt-1 text-xs text-slate-600">
                          {course.sessionCount} buổi · mỗi buổi {course.sessionMinutes} phút · lặp hằng tuần theo lịch bạn chọn
                        </p>
                        <p className="mt-1 text-sm font-black text-emerald-600">{formatFee(course.price)}</p>
                      </div>
                    )}
                  </div>
                )}

                {step === 1 && course && (
                  <div className="mt-5 space-y-4">
                    <label className="block text-xs font-bold text-slate-700">
                      Ngày bắt đầu (buổi đầu rơi vào khung giờ đầu tiên từ ngày này)
                      <input
                        type="date"
                        min={tomorrowIso()}
                        value={startDate}
                        onChange={(event) => {
                          setStartDate(event.target.value);
                          setAvailability(null);
                        }}
                        className="mt-1 block rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none"
                      />
                    </label>
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-2 font-bold uppercase text-slate-400">Giờ</th>
                            {DAYS.map((day) => (
                              <th key={day.weekday} className="border-l border-slate-200 px-3 py-2 font-black text-slate-700">{day.name}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {timeSlots.map((slot) => (
                            <tr key={slot.id} className="border-t border-slate-100">
                              <th className="whitespace-nowrap bg-slate-50/60 px-3 py-2 font-bold tabular-nums text-slate-600">
                                {clock(slot.startTime)}-{clock(slot.endTime)}
                              </th>
                              {DAYS.map((day) => {
                                const on = cells.includes(`${day.weekday}-${slot.id}`);
                                const full = !on && cells.length >= course.sessionCount && !cells.some((item) => item.startsWith(`${day.weekday}-`));
                                return (
                                  <td key={day.weekday} className="border-l border-slate-100 p-1.5">
                                    <button
                                      type="button"
                                      aria-pressed={on}
                                      aria-label={`${day.name} ${clock(slot.startTime)}`}
                                      disabled={full}
                                      onClick={() => toggleCell(day.weekday, slot.id)}
                                      className={`h-9 w-full rounded-lg text-[11px] font-bold ${
                                        on
                                          ? 'bg-[#e31b23] text-white cursor-pointer'
                                          : full
                                            ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200 cursor-pointer'
                                      }`}
                                    >
                                      {on ? 'Đã chọn' : ''}
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-slate-500">
                      Mỗi ngày chỉ chọn một khung giờ, tối đa {course.sessionCount} ngày mỗi tuần (gói có {course.sessionCount} buổi). Các ngày đã chọn lặp mỗi tuần cho tới đủ buổi. Chủ nhật trung tâm nghỉ.
                    </p>
                  </div>
                )}

                {step === 2 && availability && (
                  <div className="mt-5 space-y-4">
                    <p className="text-xs font-semibold tabular-nums text-slate-600">
                      {availability.sessionCount} buổi · {formatDate(availability.firstSession)} → {formatDate(availability.lastSession)}
                    </p>
                    {!availability.roomsAvailable && (
                      <p className={errorBox}>Lịch này hiện không còn phòng 1-1 trống cho cả gói. Hãy quay lại chọn lịch khác.</p>
                    )}
                    {availability.coaches.length === 0 && <p className="text-sm text-gray-500">Môn này chưa có huấn luyện viên.</p>}
                    <div className="grid gap-3 sm:grid-cols-2">
                      {availability.coaches.map((coach) => (
                        <label
                          key={coach.id}
                          className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
                            coach.isBusy
                              ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-70'
                              : coachId === coach.id
                                ? 'cursor-pointer border-[#e31b23] bg-red-50'
                                : 'cursor-pointer border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="coach"
                            disabled={coach.isBusy}
                            checked={coachId === coach.id}
                            onChange={() => setCoachId(coach.id)}
                            className="mt-1"
                          />
                          <span>
                            <span className="block font-black text-slate-900">{coach.fullName}</span>
                            <span className={`block text-xs font-semibold ${coach.isBusy ? 'text-red-600' : 'text-emerald-600'}`}>
                              {coach.isBusy ? coach.busyReason || 'Bận một số buổi' : 'Rảnh toàn bộ các buổi'}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                    <label className="block text-xs font-bold text-slate-700">
                      Ghi chú cho quản lý (không bắt buộc)
                      <textarea
                        rows={2}
                        maxLength={500}
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        className="mt-1 w-full resize-none rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm outline-none"
                      />
                    </label>
                  </div>
                )}

                {formError && <p className={`mt-4 ${errorBox}`}>{formError}</p>}

                <div className="mt-5 flex flex-wrap gap-3">
                  {step > 0 && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setFormError('');
                        setStep(step - 1);
                      }}
                      className="rounded-xl bg-slate-100 px-5 py-3 text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      ← Quay lại
                    </button>
                  )}
                  {step === 0 && (
                    <button
                      type="button"
                      disabled={!canNext[0]}
                      onClick={() => setStep(1)}
                      className="rounded-xl bg-[#e31b23] px-5 py-3 text-xs font-black uppercase text-white disabled:opacity-50 cursor-pointer"
                    >
                      Chọn lịch học →
                    </button>
                  )}
                  {step === 1 && (
                    <button
                      type="button"
                      disabled={busy || !canNext[1]}
                      onClick={findCoaches}
                      className="rounded-xl bg-[#e31b23] px-5 py-3 text-xs font-black uppercase text-white disabled:opacity-50 cursor-pointer"
                    >
                      {busy ? 'Đang kiểm tra...' : 'Tìm HLV rảnh →'}
                    </button>
                  )}
                  {step === 2 && (
                    <button
                      type="button"
                      disabled={busy || !coachId || !availability?.roomsAvailable || pendingCount >= 3}
                      onClick={submit}
                      className="rounded-xl bg-emerald-600 px-5 py-3 text-xs font-black uppercase text-white disabled:opacity-50 cursor-pointer"
                    >
                      {busy ? 'Đang gửi...' : 'Gửi yêu cầu'}
                    </button>
                  )}
                </div>
              </>
            )}
          </section>

          <section>
            <h2 className="text-base font-black uppercase text-slate-900">Yêu cầu của tôi</h2>
            {actionError && <p className={`mt-3 ${errorBox}`}>{actionError}</p>}
            {requests.length === 0 ? (
              <p className="mt-3 rounded-3xl border border-gray-200 bg-white p-5 text-sm text-gray-600">Bạn chưa gửi yêu cầu học 1-1 nào.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {requests.map((item) => (
                  <article key={item.id} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-900">{item.courseName}</p>
                        <p className="text-xs text-slate-500">HLV {item.coachName} · {formatFee(item.price)}</p>
                      </div>
                      <PrivateStatusBadge status={item.status} />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-700">{scheduleText(item.slots)}</p>
                    <p className="text-xs tabular-nums text-slate-500">
                      {item.sessionCount} buổi · {formatDate(item.firstSession)} → {formatDate(item.lastSession)}
                      {item.roomName ? ` · ${item.roomName}` : ''}
                    </p>
                    {item.note && <p className="mt-1 text-xs text-slate-500">Ghi chú: {item.note}</p>}
                    {item.status === 'rejected' && item.rejectReason && (
                      <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">Lý do từ chối: {item.rejectReason}</p>
                    )}
                    {item.status === 'approved' && (
                      <p className="mt-2 rounded-lg bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
                        Đã được duyệt. Thanh toán trước {formatDateTime(item.approvalExpiresAt)}, quá hạn lịch sẽ được nhả.
                      </p>
                    )}
                    {item.status === 'expired' && (
                      <p className="mt-2 text-xs text-slate-500">Quá hạn thanh toán nên lịch đã được nhả. Bạn có thể gửi yêu cầu mới.</p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.status === 'approved' && (
                        <button
                          type="button"
                          disabled={working === item.id}
                          onClick={() => pay(item)}
                          className="rounded-xl bg-[#e31b23] px-4 py-2 text-xs font-black uppercase text-white disabled:opacity-50 cursor-pointer"
                        >
                          {working === item.id ? 'Đang tạo đơn...' : 'Thanh toán'}
                        </button>
                      )}
                      {(item.status === 'pending' || item.status === 'approved') && (
                        <button
                          type="button"
                          disabled={working === item.id}
                          onClick={() => cancel(item)}
                          className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-50 cursor-pointer"
                        >
                          Hủy yêu cầu
                        </button>
                      )}
                      {item.status === 'paid' && (
                        <Link to="/hoc-vien-dashboard#schedule" className="rounded-xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">
                          Xem lịch học
                        </Link>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </WorkspaceShell>
  );
}
