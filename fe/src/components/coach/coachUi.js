const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e31b23]';
export const fieldClass =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-[#e31b23] focus:ring-2 focus:ring-[#e31b23]/30 disabled:bg-slate-50 disabled:text-slate-400';
export const primaryButtonClass = `inline-flex cursor-pointer items-center justify-center rounded-xl bg-[#e31b23] px-4 py-2.5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-[#c4131a] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none ${focusRing}`;
export const quietButtonClass = `inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 ${focusRing}`;
export const cardClass = 'rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6';
export const emptyBox = 'rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-500';

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
