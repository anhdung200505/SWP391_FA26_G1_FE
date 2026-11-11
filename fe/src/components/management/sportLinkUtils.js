export const controlClass =
  'h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-[#e31b23] focus:ring-2 focus:ring-[#e31b23]/25';
export const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e31b23]';

// Chuyển lựa chọn phòng { [roomId]: { group, private } } thành danh sách gửi lên (bỏ phòng không tick ô nào).
export function pickedRoomRequests(value) {
  return Object.entries(value)
    .filter(([, item]) => item.group || item.private)
    .map(([roomId, item]) => ({ roomId, allowGroup: item.group, allowPrivate: item.private }));
}
