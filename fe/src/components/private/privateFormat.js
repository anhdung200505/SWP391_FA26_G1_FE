export const clock = (value) => String(value || '').slice(0, 5);

export function formatDate(iso) {
  const [year, month, day] = String(iso || '').slice(0, 10).split('-');
  return year ? `${day}/${month}/${year}` : '';
}

export function formatDateTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} ${formatDate(iso)}`;
}

export function scheduleText(slots = []) {
  return slots.map((slot) => `${slot.weekdayName} ${clock(slot.startTime)}-${clock(slot.endTime)}`).join(', ');
}
