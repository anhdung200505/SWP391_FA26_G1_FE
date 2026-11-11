// Danh sách phòng đang hoạt động, mỗi phòng có hai ô tick Lớp nhóm / 1-1.
// value: { [roomId]: { group, private } }
export function RoomPicker({ rooms, value, onChange }) {
  const toggle = (roomId, kind) => {
    const existing = value[roomId] || { group: false, private: false };
    onChange({ ...value, [roomId]: { ...existing, [kind]: !existing[kind] } });
  };
  if (rooms.length === 0) return <p className="text-xs text-slate-500">Chưa có phòng đang hoạt động nào.</p>;
  return (
    <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-2xl border border-slate-200 p-3">
      {rooms.map((room) => {
        const current = value[room.id] || { group: false, private: false };
        return (
          <li key={room.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-slate-800">{room.name}</span>
            <span className="flex gap-4 text-xs font-bold text-slate-600">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={current.group} onChange={() => toggle(room.id, 'group')} /> Lớp nhóm
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={current.private} onChange={() => toggle(room.id, 'private')} /> 1-1
              </label>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// Danh sách HLV có ô tick. value: mảng id.
export function CoachPicker({ coaches, value, onChange }) {
  if (coaches.length === 0) return <p className="text-xs text-slate-500">Chưa có HLV đang hoạt động nào.</p>;
  const toggle = (id) => onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  return (
    <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-2xl border border-slate-200 p-3">
      {coaches.map((coach) => (
        <li key={coach.id}>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <input type="checkbox" checked={value.includes(coach.id)} onChange={() => toggle(coach.id)} /> {coach.fullName}
          </label>
        </li>
      ))}
    </ul>
  );
}
