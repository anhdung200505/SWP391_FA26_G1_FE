import { useState } from 'react';
import { addCatalogSportCoaches, addCatalogSportRoom } from '../../api/managementApi';
import { CoachPicker, RoomPicker } from './SportLinkPickers';
import { controlClass, focusRing, pickedRoomRequests } from './sportLinkUtils';

// Hình thức khóa học do BE định nghĩa: "group" (lớp nhóm) và "private" (học 1-1).
const FORMATS = [
  { id: 'group', label: 'Lớp nhóm' },
  { id: 'private', label: 'Học 1-1' },
];

const linkClass = `font-bold text-[#e31b23] underline hover:text-[#b1131a] ${focusRing}`;

// sport: môn đang thêm khóa (SportAdminDto). course: khóa đang sửa, null khi tạo mới.
export default function CourseForm({ sport, course, rooms, coaches, onClose, onSave, onSportChanged, onReload }) {
  const editing = Boolean(course);
  const [code, setCode] = useState(course?.code || '');
  const [format, setFormat] = useState(course?.format || 'group');
  const [name, setName] = useState(course?.name || '');
  const [levelName, setLevelName] = useState(course?.levelName || '');
  const [ageRange, setAgeRange] = useState(course?.ageRange || '');
  const [description, setDescription] = useState(course?.description || '');
  const [price, setPrice] = useState(String(course?.price ?? 0));
  const [imagePath, setImagePath] = useState(course?.imagePath || '');
  const [sessionMinutes, setSessionMinutes] = useState(String(course?.sessionMinutes ?? ''));
  const [sessionCount, setSessionCount] = useState(String(course?.sessionCount ?? ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const activeRoomIds = new Set(rooms.map((room) => room.id));
  const activeCoachIds = new Set(coaches.map((coach) => coach.id));
  const hasCoach = sport.coaches.some((coach) => activeCoachIds.has(coach.id));
  const hasRoom = sport.rooms.some((link) => activeRoomIds.has(link.roomId) && (format === 'group' ? link.allowGroup : link.allowPrivate));
  const ready = editing || (hasCoach && hasRoom);

  const submit = async (event) => {
    event.preventDefault();
    const isPrivate = format === 'private';
    if ((!editing && !code.trim()) || !name.trim()) {
      setError('Nhập mã và tên khóa học.');
      return;
    }
    if (!/^\d+(\.\d{1,2})?$/.test(price.trim())) {
      setError('Học phí phải là số không âm, tối đa 2 chữ số thập phân (dùng dấu chấm).');
      return;
    }
    if (isPrivate && (!(Number(sessionMinutes) > 0) || !(Number(sessionCount) > 0))) {
      setError('Khóa 1-1 cần số buổi và số phút mỗi buổi lớn hơn 0.');
      return;
    }
    const common = {
      name: name.trim(),
      levelName: levelName.trim() || null,
      ageRange: ageRange.trim() || null,
      description: description.trim() || null,
      price: Number(price),
      imagePath: imagePath.trim() || null,
      sessionMinutes: isPrivate ? Number(sessionMinutes) : null,
      sessionCount: isPrivate ? Number(sessionCount) : null,
    };
    setSaving(true);
    setError('');
    try {
      await onSave(editing ? common : { ...common, sportId: sport.id, code: code.trim(), format });
    } catch (requestError) {
      setError(requestError.message || 'Không lưu được khóa học.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <form onSubmit={submit} className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-black text-slate-900">{editing ? `Sửa khóa ${course.name}` : `Thêm khóa học cho ${sport.name}`}</h2>

        {!editing && !ready && (
          <MissingLinksPanel
            sport={sport}
            rooms={rooms}
            coaches={coaches}
            needCoach={!hasCoach}
            needRoom={!hasRoom}
            format={format}
            onSportChanged={onSportChanged}
            onReload={onReload}
          />
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-bold text-slate-700">
            Mã khóa học
            <input value={code} onChange={(event) => setCode(event.target.value)} disabled={editing} maxLength={50} className={`${controlClass} mt-1 w-full uppercase disabled:bg-slate-100 disabled:text-slate-500`} />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Hình thức
            <select value={format} onChange={(event) => setFormat(event.target.value)} disabled={editing} className={`${controlClass} mt-1 w-full disabled:bg-slate-100 disabled:text-slate-500`}>
              {FORMATS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-sm font-bold text-slate-700">
          Tên khóa học
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={200} className={`${controlClass} mt-1 w-full`} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-bold text-slate-700">
            Trình độ
            <input value={levelName} onChange={(event) => setLevelName(event.target.value)} maxLength={50} className={`${controlClass} mt-1 w-full`} />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Độ tuổi
            <input value={ageRange} onChange={(event) => setAgeRange(event.target.value)} maxLength={50} placeholder="Ví dụ: 6-12 tuổi" className={`${controlClass} mt-1 w-full`} />
          </label>
        </div>
        <label className="block text-sm font-bold text-slate-700">
          Mô tả
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className={`${controlClass} mt-1 h-auto w-full py-2`} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-bold text-slate-700">
            Học phí (VND)
            <input type="number" min="0" step="1" value={price} onChange={(event) => setPrice(event.target.value)} className={`${controlClass} mt-1 w-full`} />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Đường dẫn ảnh
            <input value={imagePath} onChange={(event) => setImagePath(event.target.value)} maxLength={500} className={`${controlClass} mt-1 w-full`} />
          </label>
        </div>
        {format === 'private' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-bold text-slate-700">
              Số buổi
              <input type="number" min="1" step="1" value={sessionCount} onChange={(event) => setSessionCount(event.target.value)} className={`${controlClass} mt-1 w-full`} />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Số phút mỗi buổi
              <input type="number" min="1" step="1" value={sessionMinutes} onChange={(event) => setSessionMinutes(event.target.value)} className={`${controlClass} mt-1 w-full`} />
            </label>
          </div>
        )}
        {editing && format === 'private' && (
          <p className="-mt-2 text-xs text-slate-500">Đổi số buổi hoặc số phút áp dụng cho cả yêu cầu 1-1 đang chờ.</p>
        )}

        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 cursor-pointer rounded-xl bg-slate-100 px-5 text-sm font-bold text-slate-700 hover:bg-slate-200">
            Đóng
          </button>
          <button type="submit" disabled={saving || !ready} className="h-10 cursor-pointer rounded-xl bg-[#e31b23] px-5 text-sm font-bold text-white hover:bg-[#b1131a] disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? 'Đang lưu...' : 'Lưu khóa học'}
          </button>
        </div>
      </form>
    </div>
  );
}

function MissingLinksPanel({ sport, rooms, coaches, needCoach, needRoom, format, onSportChanged, onReload }) {
  // Ô tick khởi tạo từ quyền đã gán của môn; ô đã tick bị khóa vì chỉ được thêm, không gỡ.
  const [pickedRooms, setPickedRooms] = useState({});
  const [pickedCoaches, setPickedCoaches] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (task) => {
    setBusy(true);
    setError('');
    try {
      await task();
    } catch (requestError) {
      setError(requestError.message || 'Không gán được cho môn.');
    } finally {
      setBusy(false);
    }
  };

  const existingFlags = (roomId) => {
    const link = sport.rooms.find((item) => item.roomId === roomId);
    return { group: Boolean(link?.allowGroup), private: Boolean(link?.allowPrivate) };
  };
  // Giá trị hiển thị: quyền đã có OR quyền vừa tick.
  const shownRooms = Object.fromEntries(
    rooms.map((room) => {
      const existing = existingFlags(room.id);
      const extra = pickedRooms[room.id] || { group: false, private: false };
      return [room.id, { group: existing.group || extra.group, private: existing.private || extra.private }];
    }),
  );
  const lockedRooms = Object.fromEntries(rooms.map((room) => [room.id, existingFlags(room.id)]));
  // Chỉ gửi phòng có thêm ô tick mới, kèm OR của quyền cũ và mới (BE ghi đè cờ của liên kết có sẵn).
  const roomRequests = () =>
    pickedRoomRequests(shownRooms).filter((request) => {
      const existing = existingFlags(request.roomId);
      return (request.allowGroup && !existing.group) || (request.allowPrivate && !existing.private);
    });

  const assignRooms = () =>
    run(async () => {
      for (const request of roomRequests()) {
        onSportChanged(await addCatalogSportRoom(sport.id, request));
        setPickedRooms((current) => {
          const next = { ...current };
          delete next[request.roomId];
          return next;
        });
      }
    });

  const assignCoaches = () =>
    run(async () => {
      if (pickedCoaches.length === 0) return;
      onSportChanged(await addCatalogSportCoaches(sport.id, pickedCoaches));
      setPickedCoaches([]);
    });

  return (
    <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-black text-amber-900">Môn này chưa có HLV / phòng</p>
      <p className="text-xs text-pretty text-amber-900">
        Cần ít nhất một HLV đang hoạt động và một phòng đang hoạt động dùng được cho {format === 'group' ? 'lớp nhóm' : 'học 1-1'} thì mới lưu được khóa học.
      </p>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <a href="/quan-ly/phong-tap" target="_blank" rel="noreferrer" className={linkClass}>
          Tạo phòng mới
        </a>
        <a href="/quan-ly/tai-khoan/moi" target="_blank" rel="noreferrer" className={linkClass}>
          Tạo HLV mới
        </a>
        <button type="button" onClick={() => run(onReload)} disabled={busy} className={`h-8 cursor-pointer rounded-lg border border-amber-300 bg-white px-3 font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-60 ${focusRing}`}>
          Tải lại
        </button>
      </div>
      {needCoach && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-700">HLV có sẵn</p>
          <CoachPicker coaches={coaches} value={pickedCoaches} onChange={setPickedCoaches} />
          <button type="button" onClick={assignCoaches} disabled={busy || pickedCoaches.length === 0} className={`h-9 cursor-pointer rounded-xl bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50 ${focusRing}`}>
            Gán HLV cho môn
          </button>
        </div>
      )}
      {needRoom && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-700">Phòng đang hoạt động</p>
          <RoomPicker rooms={rooms} value={shownRooms} locked={lockedRooms} onChange={(next) => setPickedRooms(next)} />
          <button type="button" onClick={assignRooms} disabled={busy || roomRequests().length === 0} className={`h-9 cursor-pointer rounded-xl bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50 ${focusRing}`}>
            Gán phòng cho môn
          </button>
        </div>
      )}
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
    </div>
  );
}
