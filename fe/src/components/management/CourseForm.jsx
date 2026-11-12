import { useState } from 'react';
import { controlClass } from './sportLinkUtils';

// Hình thức khóa học do BE định nghĩa: "group" (lớp nhóm) và "private" (học 1-1).
const FORMATS = [
  { id: 'group', label: 'Lớp nhóm' },
  { id: 'private', label: 'Học 1-1' },
];

// sport: môn đang thêm khóa (SportAdminDto). course: khóa đang sửa, null khi tạo mới.
export default function CourseForm({ sport, course, rooms: allRooms, coaches, onClose, onSave }) {
  const editing = Boolean(course);
  const [code, setCode] = useState(course?.code || '');
  const [format, setFormat] = useState(course?.format || 'group');
  const [name, setName] = useState(course?.name || '');
  const [description, setDescription] = useState(course?.description || '');
  const [price, setPrice] = useState(String(course?.price ?? 0));
  const [imagePath, setImagePath] = useState(course?.imagePath || '');
  const [sessionMinutes, setSessionMinutes] = useState(String(course?.sessionMinutes ?? ''));
  const [sessionCount, setSessionCount] = useState(String(course?.sessionCount ?? ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Một phòng chỉ thuộc một môn: chỉ liệt kê phòng chưa gắn môn nào hoặc đã thuộc môn này.
  const rooms = allRooms.filter((room) => (room.sports || []).every((item) => String(item.sportId) === String(sport.id)));
  const activeRoomIds = new Set(rooms.map((room) => room.id));
  const activeCoachIds = new Set(coaches.map((coach) => coach.id));
  const hasCoach = sport.coaches.some((coach) => activeCoachIds.has(coach.id));
  const hasRoom = sport.rooms.some((link) => activeRoomIds.has(link.roomId) && (format === 'group' ? link.allowGroup : link.allowPrivate));

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
      // Trình độ và độ tuổi không còn nhập trên form: khóa mới để trống, khóa đang sửa giữ giá trị hiện có (API sửa ghi đè cả hai trường).
      levelName: course?.levelName ?? null,
      ageRange: course?.ageRange ?? null,
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

        {!editing && (!hasCoach || !hasRoom) && <MissingLinksNote needCoach={!hasCoach} needRoom={!hasRoom} format={format} />}

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
          <button type="submit" disabled={saving} className="h-10 cursor-pointer rounded-xl bg-[#e31b23] px-5 text-sm font-bold text-white hover:bg-[#b1131a] disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? 'Đang lưu...' : 'Lưu khóa học'}
          </button>
        </div>
      </form>
    </div>
  );
}

function MissingLinksNote({ needCoach, needRoom, format }) {
  const missing = [needCoach && 'HLV', needRoom && 'phòng'].filter(Boolean).join(' và ');
  const usable = needRoom ? ` dùng được cho ${format === 'group' ? 'lớp nhóm' : 'học 1-1'}` : '';
  return (
    <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-pretty text-amber-900">
      Lưu ý: môn này chưa có {missing}
      {usable}. Vẫn lưu được khóa học, nhưng cần có khi tạo lớp.
    </p>
  );
}
