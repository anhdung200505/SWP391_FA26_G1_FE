export const fieldClass =
  'mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium outline-none ring-[#e31b23] focus:ring-2';
export const primaryButtonClass =
  'rounded-xl bg-[#e31b23] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300';
export const quietButtonClass =
  'rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 disabled:cursor-not-allowed disabled:text-gray-300';

const STATUS_LABELS = {
  open: 'Sắp mở',
  ongoing: 'Đang học',
  closed: 'Đã kết thúc',
  cancelled: 'Đã hủy',
  scheduled: 'Chưa học',
  held: 'Đang diễn ra',
  completed: 'Đã học',
};

export function statusLabel(status) {
  return STATUS_LABELS[status] || status || '';
}

export function formatDate(value) {
  if (!value) return '';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  if (!day || !month || !year) return String(value);
  return `${day}/${month}/${year}`;
}

export function formatTime(value) {
  return String(value || '').slice(0, 5);
}

export function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('vi-VN');
}
