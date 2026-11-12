// Ngày sinh khi đăng ký khóa học: trước hôm nay (tối đa là hôm qua) và không trước 1900-01-01.
// Dùng giờ máy (local), không dùng toISOString vì nó đổi sang UTC và có thể lệch một ngày.
export const DOB_ERROR = 'Ngày sinh phải trước hôm nay.';

const pad = (n) => String(n).padStart(2, '0');
const toYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function dobBounds() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return { min: '1900-01-01', max: toYmd(d) };
}

// Ô để trống là hợp lệ (ngày sinh không bắt buộc).
export function isValidDob(value) {
  if (!value) return true;
  const { min, max } = dobBounds();
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= min && value <= max;
}
