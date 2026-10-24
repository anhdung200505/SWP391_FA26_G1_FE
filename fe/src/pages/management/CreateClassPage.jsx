import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ManagementShell from '../../components/management/ManagementShell';
import { DiagramCaption } from '../../components/management/ManagementBits';
import { checkClassAvailability, createClass, getManagementCourses, getTimeSlots } from '../../api/managementApi';

const WEEKDAYS = [2, 3, 4, 5, 6, 7];

const inputClass =
  'w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#e31b23] disabled:opacity-60';

function toIsoDate(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function shiftDate(iso, days) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

function formatDate(value) {
  if (!value) return '—';
  const [year, month, day] = String(value).split('-');
  return `${day}/${month}/${year}`;
}

const formatTime = (value) => String(value || '').slice(0, 5);

function optionLabel(option) {
  const capacity = option.capacity != null ? ` (${option.capacity} chỗ)` : '';
  return option.isBusy ? `${option.name}${capacity} · ${option.busyReason}` : `${option.name}${capacity}`;
}

function Section({ step, title, caption, children }) {
  return (
    <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-5 sm:p-6">
      <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#12141d] text-xs font-black text-white">
          {step}
        </span>
        <div>
          <h2 className="text-sm font-black uppercase text-slate-900">{title}</h2>
          <DiagramCaption>{caption}</DiagramCaption>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</span>
      {children}
      {hint && <span className="block text-[11px] font-semibold text-slate-400">{hint}</span>}
    </label>
  );
}

export default function CreateClassPage() {
  const tomorrow = shiftDate(toIsoDate(new Date()), 1);

  const [courses, setCourses] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loadError, setLoadError] = useState('');

  const [courseId, setCourseId] = useState('');
  const [className, setClassName] = useState('');
  const [capacity, setCapacity] = useState('12');
  const [startDate, setStartDate] = useState(tomorrow);
  const [endDate, setEndDate] = useState(shiftDate(tomorrow, 8 * 7 - 1));
  const [schedules, setSchedules] = useState([{ weekday: '', timeSlotId: '' }]);
  const [coachId, setCoachId] = useState('');
  const [roomId, setRoomId] = useState('');

  const [availability, setAvailability] = useState({ key: '', data: null, error: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

  useEffect(() => {
    document.title = 'Tạo lớp mới · AnhDuy Sport';
    Promise.all([getManagementCourses(), getTimeSlots('group')])
      .then(([courseData, slotData]) => {
        setCourses(Array.isArray(courseData) ? courseData : []);
        setTimeSlots(Array.isArray(slotData) ? slotData : []);
      })
      .catch((err) => setLoadError(err.message || 'Không tải được khóa học và khung giờ.'));
  }, []);

  const course = courses.find((item) => item.id === courseId);
  const validSchedules = schedules.filter((row) => row.weekday && row.timeSlotId);
  const capacityNumber = Number(capacity) || null;

  // Khóa của lần kiểm tra trống: đổi khóa học, ngày, sĩ số hoặc lịch tuần thì kiểm tra lại.
  const availabilityKey =
    courseId && startDate && endDate && endDate >= startDate && validSchedules.length > 0
      ? JSON.stringify({ courseId, startDate, endDate, capacityNumber, validSchedules })
      : '';

  useEffect(() => {
    if (!availabilityKey) return undefined;
    const payload = JSON.parse(availabilityKey);
    const timer = window.setTimeout(() => {
      checkClassAvailability({
        courseId: payload.courseId,
        startDate: payload.startDate,
        endDate: payload.endDate,
        capacity: payload.capacityNumber,
        schedules: payload.validSchedules.map((row) => ({ weekday: Number(row.weekday), timeSlotId: row.timeSlotId })),
      })
        .then((data) => setAvailability({ key: availabilityKey, data, error: '' }))
        .catch((err) => setAvailability({ key: availabilityKey, data: null, error: err.message || 'Không kiểm tra được lịch trống.' }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [availabilityKey]);

  const current = availability.key === availabilityKey ? availability : { data: null, error: '' };
  const checking = Boolean(availabilityKey) && availability.key !== availabilityKey;
  const coaches = current.data?.coaches || [];
  const rooms = current.data?.rooms || [];
  const selectedCoach = coaches.find((item) => item.id === coachId);
  const selectedRoom = rooms.find((item) => item.id === roomId);

  // VD: "Bơi lội - Tối thứ 2 và thứ 5" (buổi trong ngày lấy từ nhãn khung giờ đầu tiên).
  const suggestedName = (() => {
    if (!course || validSchedules.length === 0) return '';
    const first = timeSlots.find((slot) => slot.id === validSchedules[0].timeSlotId);
    const part = first ? first.label.replace(/\s*\d.*$/, '') : '';
    const days = [...new Set(validSchedules.map((row) => Number(row.weekday)))].sort().map((day) => `thứ ${day}`);
    return `${course.name} - ${part} ${days.join(' và ')}`.replace(/\s+/g, ' ').trim();
  })();

  const updateSchedule = (index, field, value) =>
    setSchedules((rows) => rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));

  const problems = [];
  if (!courseId) problems.push('Chọn khóa học.');
  if (!startDate || startDate < tomorrow) problems.push('Ngày bắt đầu phải sau hôm nay.');
  if (!endDate || endDate < startDate) problems.push('Ngày kết thúc phải sau ngày bắt đầu.');
  if (!capacityNumber || capacityNumber < 1) problems.push('Nhập sĩ số lớn hơn 0.');
  if (validSchedules.length === 0) problems.push('Thêm ít nhất 1 buổi trong lịch tuần.');
  if (!coachId) problems.push('Chọn huấn luyện viên.');
  else if (selectedCoach?.isBusy) problems.push(`HLV đang bận: ${selectedCoach.busyReason}.`);
  if (!roomId) problems.push('Chọn phòng.');
  else if (selectedRoom?.isBusy) problems.push(`Phòng không dùng được: ${selectedRoom.busyReason}.`);
  if (current.data && current.data.sessionCount === 0) problems.push('Lịch tuần không sinh được buổi nào trong khoảng ngày đã chọn.');

  const submit = async (event) => {
    event.preventDefault();
    if (problems.length > 0 || saving) return;
    setSaving(true);
    setError('');
    try {
      const result = await createClass({
        courseId,
        className: className.trim() || suggestedName,
        startDate,
        endDate,
        capacity: capacityNumber,
        coachUserId: coachId,
        roomId,
        schedules: validSchedules.map((row) => ({ weekday: Number(row.weekday), timeSlotId: row.timeSlotId })),
      });
      setCreated(result);
    } catch (err) {
      setError(err.message || 'Tạo lớp thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const breadcrumb = [
    { label: 'Bảng điều khiển', to: '/quan-ly' },
    { label: 'Lớp học thể thao', to: '/quan-ly/lop-hoc' },
    { label: 'Tạo lớp mới' },
  ];

  if (created) {
    return (
      <ManagementShell breadcrumb={breadcrumb}>
        <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 sm:p-8 max-w-2xl">
          <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
            Đã tạo lớp
          </span>
          <h1 className="mt-3 text-2xl font-black uppercase text-slate-900">{created.name}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {created.sportName} · {created.courseName} · HLV {created.coachName} · {created.roomName}
          </p>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <span className="text-gray-400 font-bold block">Thời gian</span>
              <strong className="text-slate-800">
                {formatDate(created.startDate)} ~ {formatDate(created.endDate)}
              </strong>
            </div>
            <div>
              <span className="text-gray-400 font-bold block">Số buổi</span>
              <strong className="text-slate-800">{created.sessionCount} buổi</strong>
            </div>
            <div>
              <span className="text-gray-400 font-bold block">Lịch tuần</span>
              <strong className="text-slate-800">
                {created.schedule.map((row) => `${row.weekdayName} ${formatTime(row.startTime)}`).join(', ')}
              </strong>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              to={`/quan-ly/lich-hoc?classId=${created.id}`}
              className="bg-[#e31b23] hover:bg-[#c4131a] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors"
            >
              Xem lịch buổi học
            </Link>
            <Link
              to="/quan-ly/lop-hoc"
              className="bg-slate-900 hover:bg-[#e31b23] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors"
            >
              Về danh sách lớp
            </Link>
            <button
              type="button"
              onClick={() => {
                setCreated(null);
                setClassName('');
                setCoachId('');
                setRoomId('');
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              Tạo thêm lớp khác
            </button>
          </div>
        </section>
      </ManagementShell>
    );
  }

  return (
    <ManagementShell breadcrumb={breadcrumb}>
      <section className="relative overflow-hidden rounded-3xl bg-[#12141d] px-6 py-8 text-white sm:px-8">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] bg-[#e31b23] sm:block"
          style={{ clipPath: 'polygon(22% 0, 100% 0, 100% 100%, 0 100%)' }}
        />
        <div className="relative max-w-xl">
          <span className="inline-block bg-[#e31b23] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white -skew-x-12">
            <span className="inline-block skew-x-12">New Class</span>
          </span>
          <h1 className="mt-4 text-3xl font-black uppercase italic leading-none tracking-tight sm:text-5xl">Tạo lớp mới</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/75 sm:text-base">
            Chọn khóa học, lịch tuần và thời gian. Hệ thống tự kiểm tra HLV và phòng còn trống rồi sinh toàn bộ buổi học.
          </p>
          <DiagramCaption>
            <span className="text-white/40">Course · Schedule · Coach · Room</span>
          </DiagramCaption>
        </div>
      </section>

      {loadError && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold">⚠️ {loadError}</div>
      )}

      <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px] items-start">
        <div className="space-y-6">
          <Section step="1" title="Khóa học & thông tin lớp" caption="Course & Class Info">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Khóa học">
                  <select
                    value={courseId}
                    onChange={(event) => {
                      setCourseId(event.target.value);
                      setCoachId('');
                      setRoomId('');
                    }}
                    className={`${inputClass} cursor-pointer`}
                  >
                    <option value="">Chọn khóa học...</option>
                    {courses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.sportName} · {item.name} ({item.level}) · {item.tuition?.toLocaleString('vi-VN')} đ
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Tên lớp" hint={suggestedName ? `Để trống sẽ dùng: ${suggestedName}` : 'Để trống sẽ tự đặt theo khóa học và lịch tuần.'}>
                  <input
                    value={className}
                    onChange={(event) => setClassName(event.target.value)}
                    maxLength={200}
                    placeholder={suggestedName || 'VD: Bơi lội - Tối thứ 2 và thứ 5'}
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="Sĩ số tối đa">
                <input
                  inputMode="numeric"
                  value={capacity}
                  onChange={(event) => setCapacity(event.target.value.replace(/\D/g, '').slice(0, 3))}
                  className={inputClass}
                />
              </Field>
            </div>
          </Section>

          <Section step="2" title="Thời gian & lịch tuần" caption="Dates & Weekly Schedule">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ngày bắt đầu">
                <input
                  type="date"
                  value={startDate}
                  min={tomorrow}
                  onChange={(event) => setStartDate(event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Ngày kết thúc">
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[4, 8, 10, 12].map((weeks) => (
                <button
                  key={weeks}
                  type="button"
                  onClick={() => setEndDate(shiftDate(startDate, weeks * 7 - 1))}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  {weeks} tuần
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Lịch tuần</span>
              {schedules.map((row, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={row.weekday}
                    onChange={(event) => updateSchedule(index, 'weekday', event.target.value)}
                    className={`${inputClass} sm:w-40 cursor-pointer`}
                  >
                    <option value="">Chọn thứ...</option>
                    {WEEKDAYS.map((day) => (
                      <option key={day} value={day}>
                        Thứ {day}
                      </option>
                    ))}
                  </select>
                  <select
                    value={row.timeSlotId}
                    onChange={(event) => updateSchedule(index, 'timeSlotId', event.target.value)}
                    className={`${inputClass} cursor-pointer`}
                  >
                    <option value="">Chọn khung giờ...</option>
                    {timeSlots.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={schedules.length === 1}
                    onClick={() => setSchedules((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}
                    className="shrink-0 border border-red-200 bg-white text-[#e31b23] hover:bg-red-50 font-bold text-[11px] px-3.5 py-2 rounded-xl transition-colors cursor-pointer disabled:border-slate-200 disabled:text-slate-300 disabled:cursor-not-allowed"
                  >
                    Xóa
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setSchedules((rows) => [...rows, { weekday: '', timeSlotId: '' }])}
                className="text-xs font-bold text-[#e31b23] cursor-pointer"
              >
                + Thêm buổi trong tuần
              </button>
            </div>
          </Section>

          <Section step="3" title="Huấn luyện viên & phòng" caption="Coach & Room Availability">
            {!availabilityKey ? (
              <p className="text-xs font-semibold text-slate-400">
                Chọn khóa học, khoảng ngày và lịch tuần để xem HLV và phòng còn trống.
              </p>
            ) : checking ? (
              <div className="py-6 text-center">
                <div className="inline-block animate-spin rounded-full h-7 w-7 border-4 border-[#e31b23] border-t-transparent" />
                <p className="mt-2 text-xs font-bold text-slate-400">Đang kiểm tra lịch trống...</p>
              </div>
            ) : current.error ? (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold">⚠️ {current.error}</div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={`Huấn luyện viên (${coaches.filter((item) => !item.isBusy).length}/${coaches.length} rảnh)`}
                  hint="HLV dạy được môn của khóa học. HLV trùng lịch bị khóa."
                >
                  <select value={coachId} onChange={(event) => setCoachId(event.target.value)} className={`${inputClass} cursor-pointer`}>
                    <option value="">Chọn HLV...</option>
                    {coaches.map((item) => (
                      <option key={item.id} value={item.id} disabled={item.isBusy}>
                        {optionLabel(item)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label={`Phòng (${rooms.filter((item) => !item.isBusy).length}/${rooms.length} trống)`}
                  hint="Phòng của môn, đủ sức chứa và không trùng lớp khác."
                >
                  <select value={roomId} onChange={(event) => setRoomId(event.target.value)} className={`${inputClass} cursor-pointer`}>
                    <option value="">Chọn phòng...</option>
                    {rooms.map((item) => (
                      <option key={item.id} value={item.id} disabled={item.isBusy}>
                        {optionLabel(item)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            )}
          </Section>
        </div>

        <aside className="lg:sticky lg:top-20 bg-white rounded-3xl border border-gray-200 shadow-xs p-5 space-y-4">
          <div>
            <h2 className="text-sm font-black uppercase text-slate-900">Tóm tắt lớp</h2>
            <DiagramCaption>Preview</DiagramCaption>
          </div>
          <dl className="space-y-3 text-xs">
            <div>
              <dt className="text-gray-400 font-bold">Khóa học</dt>
              <dd className="font-bold text-slate-800">{course ? `${course.sportName} · ${course.name}` : '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-400 font-bold">Lịch tuần</dt>
              <dd className="font-bold text-slate-800">
                {validSchedules.length
                  ? validSchedules
                      .map((row) => `Thứ ${row.weekday} ${timeSlots.find((slot) => slot.id === row.timeSlotId)?.label.replace(/^\D+/, '') || ''}`)
                      .join(', ')
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-400 font-bold">Số buổi sẽ sinh</dt>
              <dd className="text-2xl font-black text-[#e31b23]">{current.data ? current.data.sessionCount : '—'}</dd>
              {current.data?.firstSession && (
                <dd className="text-[11px] font-semibold text-slate-500">
                  Buổi đầu {formatDate(current.data.firstSession)} · buổi cuối {formatDate(current.data.lastSession)}
                </dd>
              )}
            </div>
            <div>
              <dt className="text-gray-400 font-bold">HLV / Phòng</dt>
              <dd className="font-bold text-slate-800">
                {selectedCoach?.name || '—'} · {selectedRoom?.name || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-400 font-bold">Học phí</dt>
              <dd className="font-black text-[#e31b23]">{course ? `${course.tuition?.toLocaleString('vi-VN')} đ` : '—'}</dd>
            </div>
          </dl>

          {problems.length > 0 && (
            <ul className="space-y-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
              {problems.map((problem) => (
                <li key={problem}>• {problem}</li>
              ))}
            </ul>
          )}

          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold">⚠️ {error}</div>}

          <button
            type="submit"
            disabled={problems.length > 0 || saving}
            className="w-full bg-[#e31b23] hover:bg-[#c4131a] text-white font-black text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition-colors cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {saving ? 'Đang tạo lớp...' : 'Tạo lớp & sinh buổi học'}
          </button>
          <Link
            to="/quan-ly/lop-hoc"
            className="block w-full text-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-5 py-2.5 rounded-xl transition-colors"
          >
            Quay lại danh sách lớp
          </Link>
        </aside>
      </form>
    </ManagementShell>
  );
}
