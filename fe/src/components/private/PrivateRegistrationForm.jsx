import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PrivateStatusBadge } from './privateUi';
import { clock, formatDate, formatDateTime, scheduleText } from './privateFormat';
import {
  cancelPrivateRequest,
  checkPrivateAvailability,
  createPrivateRequest,
  getMemberMembership,
  getMemberProfile,
  getMyPrivateRequests,
  getPackages,
  getPrivateCourses,
  getTimeSlots,
  payPrivateRequest,
} from '../../api/managementApi';
import { formatFee } from '../../data/accountManagement';

const DAYS = [
  { weekday: 2, name: 'Thứ 2' },
  { weekday: 3, name: 'Thứ 3' },
  { weekday: 4, name: 'Thứ 4' },
  { weekday: 5, name: 'Thứ 5' },
  { weekday: 6, name: 'Thứ 6' },
  { weekday: 7, name: 'Thứ 7' },
];

const PAYMENT_TIMEOUT_SECONDS = 180;
const fieldClass =
  'mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium outline-none ring-[#e31b23] focus:ring-2';
const primaryButtonClass =
  'rounded-xl bg-[#e31b23] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300';
const errorBox = 'rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700';

const pad = (value) => String(value).padStart(2, '0');

function tomorrowIso() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const isBronzePackage = (pkg) => !!pkg && (pkg.name?.toLowerCase().includes('đồng') || pkg.code === 'PKG-001');

// Dòng "Yêu cầu của tôi ›": bấm vào mới sổ danh sách. Thanh toán tạo đơn qua luồng đăng ký lớp rồi trả đơn về trang để hiện mã QR.
function MyRequests({ onPaymentCreated, refreshKey }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [working, setWorking] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await getMyPrivateRequests();
      setItems(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Không tải được yêu cầu của bạn.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const pay = async (item) => {
    setError('');
    setWorking(item.id);
    try {
      onPaymentCreated(await payPrivateRequest(item.id));
    } catch (err) {
      setError(err.message || 'Chưa tạo được đơn thanh toán.');
      await load();
    } finally {
      setWorking('');
    }
  };

  const cancel = async (item) => {
    if (!window.confirm(`Hủy yêu cầu học 1-1 "${item.courseName}"?`)) return;
    setError('');
    setWorking(item.id);
    try {
      await cancelPrivateRequest(item.id);
      await load();
    } catch (err) {
      setError(err.message || 'Chưa hủy được yêu cầu.');
    } finally {
      setWorking('');
    }
  };

  const waiting = items.filter((item) => item.status === 'approved').length;

  return (
    <section className="rounded-3xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left sm:px-6"
      >
        <span className="flex items-center gap-2 text-lg font-black">
          Yêu cầu của tôi
          {loaded && items.length > 0 && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">{items.length}</span>
          )}
          {waiting > 0 && (
            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-700">{waiting} chờ thanh toán</span>
          )}
        </span>
        <span className={`text-xl font-black text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden="true">›</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-gray-100 px-5 pb-5 pt-4 sm:px-6">
          {error && <p className={errorBox}>{error}</p>}
          {!loaded && <p className="text-sm text-gray-500">Đang tải...</p>}
          {loaded && items.length === 0 && <p className="text-sm text-gray-600">Bạn chưa gửi yêu cầu học 1-1 nào.</p>}
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-gray-200 p-4">
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
              {item.membershipPackageName && <p className="mt-1 text-xs text-slate-500">Kèm gói {item.membershipPackageName}</p>}
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
                  <button type="button" disabled={working === item.id} onClick={() => pay(item)} className={primaryButtonClass}>
                    {working === item.id ? 'Đang tạo đơn...' : 'Thanh toán'}
                  </button>
                )}
                {(item.status === 'pending' || item.status === 'approved') && (
                  <button
                    type="button"
                    disabled={working === item.id}
                    onClick={() => cancel(item)}
                    className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50"
                  >
                    Hủy yêu cầu
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default function PrivateRegistrationForm({ user, onPaymentCreated }) {
  const [courses, setCourses] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [packages, setPackages] = useState([]);
  const [ownedPackageId, setOwnedPackageId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [sportId, setSportId] = useState('');
  const [startDate, setStartDate] = useState(tomorrowIso);
  const [cells, setCells] = useState([]);
  const [availability, setAvailability] = useState(null);
  const [coachId, setCoachId] = useState('');
  const [note, setNote] = useState('');

  const [pickedPackage, setPickedPackage] = useState(null);
  const [skipPackage, setSkipPackage] = useState(false);

  const [fullName, setFullName] = useState(user?.fullName || user?.userName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Nam');

  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const noticeRef = useRef(null);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      getPrivateCourses(),
      getTimeSlots('private'),
      getPackages().catch(() => []),
      user?.id ? getMemberMembership(user.id).catch(() => null) : Promise.resolve(null),
      user?.id ? getMemberProfile(user.id).catch(() => null) : Promise.resolve(null),
    ])
      .then(([courseData, slotData, pkgData, membership, profile]) => {
        if (ignore) return;
        const list = Array.isArray(courseData) ? courseData : [];
        setCourses(list);
        setSportId(list[0]?.sportId || '');
        setTimeSlots(Array.isArray(slotData) ? slotData : []);
        const pkgs = Array.isArray(pkgData) ? pkgData : [];
        setPackages(pkgs);
        const owned = membership?.highestPackageId || null;
        setOwnedPackageId(owned);
        setSkipPackage(Boolean(owned));
        setPickedPackage(pkgs.find((pkg) => isBronzePackage(pkg)) || pkgs[0] || null);
        if (profile) {
          setFullName(profile.fullName || '');
          setPhone(profile.phone || '');
          setDateOfBirth(profile.dateOfBirth ? String(profile.dateOfBirth).slice(0, 10) : '');
          setGender(profile.gender || 'Nam');
        }
      })
      .catch((err) => {
        if (!ignore) setLoadError(err.message || 'Không tải được dữ liệu học 1-1.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [user?.id]);

  const sports = useMemo(() => {
    const seen = new Map();
    courses.forEach((course) => seen.has(course.sportId) || seen.set(course.sportId, course.sportName));
    return [...seen].map(([id, name]) => ({ id, name }));
  }, [courses]);
  const course = courses.find((item) => item.sportId === sportId);

  const ownedPackage = packages.find((pkg) => String(pkg.id) === String(ownedPackageId)) || null;
  const canSkipPackage = !!ownedPackage;
  const isPackageLocked = (pkg) => !!ownedPackage && (pkg?.fee || 0) < (ownedPackage.fee || 0);
  const selectedPackage = canSkipPackage && skipPackage ? null : pickedPackage && isPackageLocked(pickedPackage) ? ownedPackage : pickedPackage;

  const calculatePackagePrice = (pkg) => {
    if (!pkg) return 0;
    if (isBronzePackage(pkg)) return ownedPackage ? pkg.fee || 0 : 0;
    const percent = Number(pkg.upgradeDiscountPercent) || 0;
    return percent <= 0 ? pkg.fee || 0 : Math.round(((pkg.fee || 0) * (100 - percent)) / 100);
  };
  const packageFee = canSkipPackage && skipPackage ? 0 : calculatePackagePrice(selectedPackage);
  const total = packageFee + (course?.price || 0);
  const packageSummaryName = canSkipPackage && skipPackage
    ? `Giữ ${ownedPackage.name}, không gia hạn`
    : !selectedPackage
      ? 'Chưa chọn'
      : isBronzePackage(selectedPackage) && !ownedPackage
        ? `${selectedPackage.name} (bắt buộc, tặng kèm)`
        : selectedPackage.name;

  const slotsPayload = cells.map((cell) => {
    const [weekday, timeSlotId] = cell.split('-');
    return { weekday: Number(weekday), timeSlotId };
  });
  // Mỗi ngày một buổi, chủ nhật nghỉ: không chọn quá số buổi của gói và không quá 6 ngày.
  const maxDays = Math.min(course?.sessionCount || DAYS.length, DAYS.length);

  const toggleCell = (weekday, slotId) => {
    const key = `${weekday}-${slotId}`;
    setAvailability(null);
    setCoachId('');
    setCells((current) => {
      if (current.includes(key)) return current.filter((item) => item !== key);
      const sameDay = current.some((item) => item.startsWith(`${weekday}-`));
      if (!sameDay && current.length >= maxDays) return current;
      return [...current.filter((item) => !item.startsWith(`${weekday}-`)), key];
    });
  };

  const handleSportChange = (id) => {
    setSportId(id);
    setCells([]);
    setAvailability(null);
    setCoachId('');
  };

  const findCoaches = async () => {
    setError('');
    setChecking(true);
    try {
      const result = await checkPrivateAvailability({ courseId: course.id, startDate, slots: slotsPayload });
      setAvailability(result);
      setCoachId('');
    } catch (err) {
      setAvailability(null);
      setError(err.message || 'Chưa kiểm tra được lịch.');
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setError('');
    setNotice('');
    if (!course || cells.length === 0) {
      setError('Vui lòng chọn gói và lịch học hằng tuần.');
      return;
    }
    if (!coachId) {
      setError('Vui lòng tìm và chọn huấn luyện viên.');
      return;
    }
    if (!(canSkipPackage && skipPackage) && !selectedPackage?.id) {
      setError('Vui lòng chọn một gói hội viên.');
      return;
    }
    if (!fullName.trim() || !phone.trim()) {
      setError('Vui lòng điền đầy đủ họ và tên và số điện thoại.');
      return;
    }

    setSubmitting(true);
    try {
      await createPrivateRequest({
        courseId: course.id,
        coachUserId: coachId,
        startDate,
        slots: slotsPayload,
        note: note.trim() || null,
        ...(canSkipPackage && skipPackage
          ? { renewMembership: false }
          : {
              ...(canSkipPackage ? { renewMembership: true } : {}),
              ...(selectedPackage?.id && !(isBronzePackage(selectedPackage) && !ownedPackage)
                ? { membershipPackageId: selectedPackage.id }
                : {}),
            }),
        fullName: fullName.trim(),
        phone: phone.trim(),
        ...(dateOfBirth ? { dateOfBirth } : {}),
        gender,
      });
      setNotice('Đã gửi yêu cầu. Quản lý sẽ duyệt và bạn nhận thông báo, sau đó có 24 giờ để thanh toán. Xem ở mục "Yêu cầu của tôi".');
      setCells([]);
      setAvailability(null);
      setCoachId('');
      setNote('');
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setError(err.message || 'Chưa gửi được yêu cầu.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (notice) noticeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [notice]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-8" aria-busy="true">
        <p className="text-sm font-semibold text-gray-500">Đang tải gói học 1-1...</p>
      </div>
    );
  }

  if (loadError) return <p className={errorBox}>{loadError}</p>;

  return (
    <div className="space-y-4">
      {notice && (
        <p ref={noticeRef} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</p>
      )}

      <MyRequests
        refreshKey={refreshKey}
        onPaymentCreated={(res) =>
          onPaymentCreated({ ...res, deadline: Date.now() + (res.expiresInSeconds ?? PAYMENT_TIMEOUT_SECONDS) * 1000 })
        }
      />

      {courses.length === 0 ? (
        <p className="rounded-3xl border border-gray-200 bg-white p-5 text-sm text-gray-600">Hiện chưa có gói học 1-1 nào đang mở.</p>
      ) : (
        <form onSubmit={handleSubmit} className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            <section className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-black">Môn học 1-1</h2>
              <p className="mt-1 text-sm text-gray-500">Mỗi môn có một gói 1-1 theo số buổi cố định.</p>
              <label className="mt-4 block text-sm font-bold text-gray-700 sm:max-w-sm">
                Bộ môn
                <select value={sportId} onChange={(event) => handleSportChange(event.target.value)} className={fieldClass}>
                  {sports.map((sport) => (
                    <option key={sport.id} value={sport.id}>{sport.name}</option>
                  ))}
                </select>
              </label>
              {course && (
                <dl className="mt-4 grid gap-2 rounded-2xl bg-[#f4f5f7] p-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-gray-500">Gói</dt>
                    <dd className="font-bold">{course.name}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Số buổi</dt>
                    <dd className="font-semibold">{course.sessionCount} buổi, mỗi buổi {course.sessionMinutes} phút</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Học phí</dt>
                    <dd className="font-black text-[#b1131a]">{formatFee(course.price)}</dd>
                  </div>
                </dl>
              )}
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-black">Lịch học hằng tuần</h2>
              <p className="mt-1 text-sm text-gray-500">
                Mỗi ngày chọn một khung giờ, tối đa {maxDays} ngày mỗi tuần. Lịch lặp hằng tuần cho tới đủ {course?.sessionCount} buổi. Chủ nhật trung tâm nghỉ.
              </p>
              <label className="mt-4 block text-sm font-bold text-gray-700 sm:max-w-xs">
                Ngày bắt đầu
                <input
                  type="date"
                  min={tomorrowIso()}
                  value={startDate}
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    setAvailability(null);
                    setCoachId('');
                  }}
                  className={fieldClass}
                />
              </label>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
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
                          const full = !on && cells.length >= maxDays && !cells.some((item) => item.startsWith(`${day.weekday}-`));
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
                                    ? 'cursor-pointer bg-[#e31b23] text-white'
                                    : full
                                      ? 'cursor-not-allowed bg-slate-50 text-slate-300'
                                      : 'cursor-pointer bg-slate-100 text-slate-400 hover:bg-slate-200'
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
              <button
                type="button"
                disabled={checking || cells.length === 0 || !startDate}
                onClick={findCoaches}
                className={`${primaryButtonClass} mt-4`}
              >
                {checking ? 'Đang kiểm tra...' : 'Tìm HLV rảnh'}
              </button>
            </section>

            {availability && (
              <section className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6">
                <h2 className="text-lg font-black">Huấn luyện viên</h2>
                <p className="mt-1 text-sm tabular-nums text-gray-500">
                  {availability.sessionCount} buổi · {formatDate(availability.firstSession)} → {formatDate(availability.lastSession)}
                </p>
                {!availability.roomsAvailable && (
                  <p className={`mt-3 ${errorBox}`}>Lịch này hiện không còn phòng 1-1 trống cho cả gói. Hãy chọn lịch khác.</p>
                )}
                {availability.coaches.length === 0 && <p className="mt-3 text-sm text-gray-500">Môn này chưa có huấn luyện viên.</p>}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {availability.coaches.map((coach) => (
                    <label
                      key={coach.id}
                      className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
                        coach.isBusy
                          ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-70'
                          : coachId === coach.id
                            ? 'cursor-pointer border-[#e31b23] bg-red-50/50'
                            : 'cursor-pointer border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="private_coach"
                        disabled={coach.isBusy}
                        checked={coachId === coach.id}
                        onChange={() => setCoachId(coach.id)}
                        className="mt-1 accent-[#e31b23]"
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
                <label className="mt-4 block text-sm font-bold text-gray-700">
                  Ghi chú cho quản lý (không bắt buộc)
                  <textarea rows={2} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} className={`${fieldClass} resize-none`} />
                </label>
              </section>
            )}

            <section className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-black">Gói hội viên</h2>
              <p className="mt-1 text-sm text-pretty text-gray-500">
                Hạng Đồng là gói bắt buộc khi đăng ký khóa học và được tặng khi thanh toán. Chọn Hạng Bạc hoặc Hạng Vàng nếu muốn nâng hạng thay cho gói tặng.
                Gói và giá được áp lúc bạn thanh toán sau khi quản lý duyệt, nên có thể thay đổi nếu gói hội viên của bạn đổi trong lúc chờ.
              </p>
              {ownedPackage && (
                <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                  Bạn đang có {ownedPackage.name} nên chỉ gia hạn {ownedPackage.name} hoặc nâng lên hạng cao hơn.
                </p>
              )}
              <div className="mt-4 space-y-3">
                {canSkipPackage && (
                  <label className={`block cursor-pointer rounded-2xl border p-4 ${skipPackage ? 'border-[#e31b23] bg-red-50/50' : 'border-gray-200 bg-white'}`}>
                    <span className="flex items-start gap-3">
                      <input type="radio" name="private_package" checked={skipPackage} onChange={() => setSkipPackage(true)} className="mt-1 accent-[#e31b23]" />
                      <span>
                        <span className="block text-sm font-black text-gray-900">Không gia hạn</span>
                        <span className="mt-0.5 block text-sm text-gray-500">Giữ {ownedPackage.name}. Chỉ đóng học phí gói 1-1, không cộng thêm gói.</span>
                      </span>
                    </span>
                  </label>
                )}
                {packages.map((pkg) => {
                  const isSelected = !(canSkipPackage && skipPackage) && selectedPackage?.id === pkg.id;
                  const isLocked = isPackageLocked(pkg);
                  const price = calculatePackagePrice(pkg);
                  return (
                    <label
                      key={pkg.id}
                      className={`block rounded-2xl border p-4 ${
                        isLocked
                          ? 'cursor-not-allowed border-gray-200 bg-gray-100 opacity-60'
                          : isSelected
                            ? 'cursor-pointer border-[#e31b23] bg-red-50/50'
                            : 'cursor-pointer border-gray-200 bg-white'
                      }`}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="private_package"
                            checked={isSelected}
                            disabled={isLocked}
                            onChange={() => {
                              if (isLocked) return;
                              setSkipPackage(false);
                              setPickedPackage(pkg);
                            }}
                            className="mt-1 accent-[#e31b23]"
                          />
                          <span>
                            <span className="block text-sm font-black text-gray-900">
                              {pkg.name}
                              {isLocked ? ' · thấp hơn gói đang có' : ''}
                            </span>
                            <span className="mt-0.5 block text-sm text-gray-500">Thời hạn {pkg.validityMonths || 1} tháng</span>
                            {isBronzePackage(pkg) && !ownedPackage && (
                              <span className="mt-1 block text-sm font-semibold text-emerald-700">Gói bắt buộc khi đăng ký khóa học. Tặng kèm, không tính thêm phí.</span>
                            )}
                            {!isBronzePackage(pkg) && !isLocked && (
                              <span className="mt-1 block text-sm text-gray-500">
                                {ownedPackage ? 'Gia hạn hoặc nâng hạng khi đăng ký kèm lớp, vẫn được giảm giá.' : 'Nâng hạng thay cho Hạng Đồng tặng kèm.'}
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="shrink-0 text-right text-sm font-black">
                          {isBronzePackage(pkg) && !ownedPackage ? (
                            <span className="text-emerald-700">0đ</span>
                          ) : Number(pkg.upgradeDiscountPercent) > 0 ? (
                            <span>
                              <span className="block text-[#b1131a]">{formatFee(price)}</span>
                              <span className="block text-xs font-semibold text-gray-400 line-through">{formatFee(pkg.fee)}</span>
                              <span className="block text-xs font-semibold text-emerald-700">Giảm {pkg.upgradeDiscountPercent}%</span>
                            </span>
                          ) : (
                            formatFee(pkg.fee)
                          )}
                        </span>
                      </span>
                      {Array.isArray(pkg.benefits) && pkg.benefits.length > 0 && (
                        <ul className="mt-3 list-disc space-y-1 pl-9 text-sm text-gray-600">
                          {pkg.benefits.map((benefit) => (
                            <li key={benefit}>{benefit}</li>
                          ))}
                        </ul>
                      )}
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-black">Thông tin học viên</h2>
              <p className="mt-1 text-sm text-gray-500">Dùng để ghi trên hóa đơn, cập nhật vào hồ sơ khi bạn thanh toán.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-bold text-gray-700 sm:col-span-2">
                  Họ và tên
                  <input value={fullName} onChange={(event) => setFullName(event.target.value)} className={fieldClass} placeholder="Nguyễn Văn A" />
                </label>
                <label className="block text-sm font-bold text-gray-700">
                  Số điện thoại
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" className={fieldClass} placeholder="0901234567" />
                </label>
                <label className="block text-sm font-bold text-gray-700">
                  Ngày sinh
                  <input type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} className={fieldClass} />
                </label>
                <label className="block text-sm font-bold text-gray-700">
                  Giới tính
                  <select value={gender} onChange={(event) => setGender(event.target.value)} className={fieldClass}>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </label>
              </div>
            </section>
          </div>

          <aside className="rounded-3xl border border-gray-200 bg-white p-5 lg:sticky lg:top-4">
            <h2 className="text-lg font-black">Tóm tắt</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-gray-600">Gói 1-1</dt>
                <dd className="text-right font-bold">{course?.name || 'Chưa chọn'}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-gray-600">Lịch</dt>
                <dd className="text-right font-semibold">
                  {cells.length === 0
                    ? 'Chưa chọn'
                    : DAYS.filter((day) => cells.some((cell) => cell.startsWith(`${day.weekday}-`))).map((day) => day.name).join(', ')}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-gray-600">HLV</dt>
                <dd className="text-right font-semibold">{availability?.coaches.find((coach) => coach.id === coachId)?.fullName || 'Chưa chọn'}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-gray-600">Gói hội viên</dt>
                <dd className="text-right font-bold">{packageSummaryName}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-gray-600">Phí gói</dt>
                <dd className="font-bold">{formatFee(packageFee)}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-gray-600">Học phí {course?.name || ''}</dt>
                <dd className="font-bold">{formatFee(course?.price || 0)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-gray-100 pt-3">
                <dt className="font-black text-gray-900">Tổng dự kiến</dt>
                <dd className="text-xl font-black text-[#b1131a]">{formatFee(total)}</dd>
              </div>
            </dl>
            {error && <p className="mt-4 text-sm font-semibold text-[#b1131a]">{error}</p>}
            <button
              type="submit"
              disabled={submitting || !course || cells.length === 0 || !coachId || !availability?.roomsAvailable}
              className={`${primaryButtonClass} mt-4 w-full`}
            >
              {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
            <p className="mt-3 text-sm text-gray-500">Chưa thanh toán. Quản lý duyệt xong bạn có 24 giờ để thanh toán qua VietQR / payOS.</p>
          </aside>
        </form>
      )}
    </div>
  );
}
