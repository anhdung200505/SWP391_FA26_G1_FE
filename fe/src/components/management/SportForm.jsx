import { useState } from 'react';
import { CoachPicker, RoomPicker } from './SportLinkPickers';
import { controlClass, pickedRoomRequests } from './sportLinkUtils';

export default function SportForm({ rooms, coaches, onClose, onSave }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [pickedRooms, setPickedRooms] = useState({});
  const [pickedCoaches, setPickedCoaches] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!code.trim() || !name.trim()) {
      setError('Nhập mã môn và tên môn.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        code: code.trim(),
        name: name.trim(),
        category: category.trim() || null,
        rooms: pickedRoomRequests(pickedRooms),
        coachUserIds: pickedCoaches,
      });
    } catch (requestError) {
      setError(requestError.message || 'Không tạo được môn.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <form onSubmit={submit} className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-black text-slate-900">Thêm môn mới</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-bold text-slate-700">
            Mã môn
            <input value={code} onChange={(event) => setCode(event.target.value)} maxLength={50} className={`${controlClass} mt-1 w-full uppercase`} />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Nhóm môn
            <input value={category} onChange={(event) => setCategory(event.target.value)} maxLength={100} placeholder="Ví dụ: Thể thao vợt" className={`${controlClass} mt-1 w-full`} />
          </label>
        </div>
        <label className="block text-sm font-bold text-slate-700">
          Tên môn
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} className={`${controlClass} mt-1 w-full`} />
        </label>
        <p className="text-xs text-slate-500">Phòng và HLV có thể gán sau, nhưng phải có đủ mới tạo được khóa học.</p>
        <fieldset>
          <legend className="text-sm font-bold text-slate-700">Phòng dùng được</legend>
          <div className="mt-2">
            <RoomPicker rooms={rooms} value={pickedRooms} onChange={setPickedRooms} />
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-bold text-slate-700">Huấn luyện viên</legend>
          <div className="mt-2">
            <CoachPicker coaches={coaches} value={pickedCoaches} onChange={setPickedCoaches} />
          </div>
        </fieldset>
        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 cursor-pointer rounded-xl bg-slate-100 px-5 text-sm font-bold text-slate-700 hover:bg-slate-200">
            Đóng
          </button>
          <button type="submit" disabled={saving} className="h-10 cursor-pointer rounded-xl bg-[#e31b23] px-5 text-sm font-bold text-white hover:bg-[#b1131a] disabled:opacity-60">
            {saving ? 'Đang lưu...' : 'Lưu môn'}
          </button>
        </div>
      </form>
    </div>
  );
}
