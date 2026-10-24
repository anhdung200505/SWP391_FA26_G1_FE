export const CLASS_STATUS = {
  open: { label: 'Sắp mở', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  ongoing: { label: 'Đang học', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  closed: { label: 'Đã kết thúc', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  cancelled: { label: 'Đã hủy', className: 'bg-red-50 text-[#e31b23] border-red-200' },
};

// Bỏ phần ca học đuôi tên lớp (" - Chiều thứ 4", " - Sáng thứ 7"); lịch xem ở trang Xem lịch.
export const shortName = (name) => String(name || '').replace(/\s*-\s*(Sáng|Chiều|Tối)\s+thứ\s*\d+\s*$/i, '');

export function formatDate(value) {
  if (!value) return '—';
  const [year, month, day] = String(value).split('-');
  return `${day}/${month}/${year}`;
}
