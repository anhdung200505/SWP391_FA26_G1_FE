export const ROLES = [
  {
    id: 'ADMIN',
    label: 'Quản trị',
    permissions: ['Quản lý người dùng', 'Quản lý khóa học', 'Quản lý thanh toán', 'Xem báo cáo'],
  },
  {
    id: 'RECEPTIONIST',
    label: 'Lễ tân',
    permissions: ['Tiếp nhận yêu cầu tư vấn', 'Tạo thanh toán', 'Cấp gói thành viên'],
  },
  {
    id: 'COACH',
    label: 'Huấn luyện viên',
    permissions: ['Phụ trách lớp học', 'Điểm danh', 'Đánh giá học viên'],
  },
  {
    id: 'MEMBER',
    label: 'Học viên',
    permissions: ['Đăng ký khóa học', 'Xem hồ sơ cá nhân'],
  },
];

export function getRole(roleId) {
  return ROLES.find((role) => role.id === roleId) ?? null;
}

export function getStatusMeta(status) {
  if (status === 'active') {
    return { id: 'active', label: 'Đang hoạt động' };
  }
  if (status === 'locked') {
    return { id: 'locked', label: 'Đã khóa' };
  }
  return { id: 'inactive', label: 'Ngưng hoạt động' };
}

export function formatPhone(phone) {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length !== 10) return phone;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

export function formatDate(isoDate) {
  const [year, month, day] = String(isoDate).split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

export function formatFee(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function formatDateTime(iso) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function initials(fullName) {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[parts.length - 2] || parts[0] || '';
  const second = parts[parts.length - 1] || '';
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
}
