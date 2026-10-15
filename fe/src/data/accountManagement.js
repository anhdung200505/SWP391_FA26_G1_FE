export const CURRENT_MANAGER = {
  id: 'mgr-01',
  name: 'Ngô Anh Duy',
  email: 'manager@anhduysport.vn',
  roleId: 'center-manager',
};

export const ROLES = [
  {
    id: 'center-manager',
    label: 'Quản lý trung tâm',
    permissions: [
      'Truy cập bảng điều khiển quản lý',
      'Xem và chọn tài khoản người dùng',
      'Đổi vai trò và quyền hạn',
      'Kích hoạt hoặc vô hiệu hóa tài khoản',
      'Xem nhật ký hệ thống',
    ],
  },
  {
    id: 'receptionist',
    label: 'Lễ tân',
    permissions: [
      'Check-in hội viên tại quầy',
      'Xem danh sách tài khoản',
      'Cập nhật số điện thoại và email liên hệ',
    ],
  },
  {
    id: 'coach',
    label: 'Huấn luyện viên',
    permissions: [
      'Xem lịch lớp được phân công',
      'Điểm danh học viên',
      'Xem hồ sơ học viên trong lớp của mình',
    ],
  },
  {
    id: 'member',
    label: 'Hội viên',
    permissions: [
      'Đặt lịch tập',
      'Xem gói hội viên của bản thân',
      'Cập nhật hồ sơ cá nhân',
    ],
  },
];

export const SEED_USERS = [
  {
    id: 'u-01',
    code: 'HV-1024',
    fullName: 'Trần Minh Quân',
    email: 'minhquan.tran@gmail.com',
    phone: '0903124567',
    roleId: 'member',
    status: 'active',
    unit: 'Hội viên · Bóng rổ',
    joinedAt: '2025-09-12',
  },
  {
    id: 'u-02',
    code: 'HV-1088',
    fullName: 'Lê Hà My',
    email: 'hamy.le@gmail.com',
    phone: '0918452201',
    roleId: 'member',
    status: 'active',
    unit: 'Hội viên · Bơi lội',
    joinedAt: '2026-01-20',
  },
  {
    id: 'u-03',
    code: 'HV-0901',
    fullName: 'Phạm Đức Anh',
    email: 'ducanh.pham@anhduysport.vn',
    phone: '0988123456',
    roleId: 'coach',
    status: 'active',
    unit: 'Huấn luyện viên · Bóng đá',
    joinedAt: '2024-06-01',
  },
  {
    id: 'u-04',
    code: 'HV-0772',
    fullName: 'Nguyễn Thu Hà',
    email: 'thuha.nguyen@anhduysport.vn',
    phone: '0909888777',
    roleId: 'receptionist',
    status: 'active',
    unit: 'Lễ tân',
    joinedAt: '2024-03-15',
  },
  {
    id: 'u-05',
    code: 'HV-1140',
    fullName: 'Võ Gia Bảo',
    email: 'giabao.vo@gmail.com',
    phone: '0933555123',
    roleId: 'member',
    status: 'inactive',
    unit: 'Hội viên · Cầu lông',
    joinedAt: '2025-12-02',
  },
  {
    id: 'u-06',
    code: 'HV-0833',
    fullName: 'Đặng Khánh Linh',
    email: 'khanhlinh.dang@anhduysport.vn',
    phone: '0977123988',
    roleId: 'coach',
    status: 'active',
    unit: 'Huấn luyện viên · Bơi lội',
    joinedAt: '2025-02-11',
  },
  {
    id: 'u-07',
    code: 'HV-1206',
    fullName: 'Hoàng Nhật Nam',
    email: 'nhatnam.hoang@gmail.com',
    phone: '0966332211',
    roleId: 'member',
    status: 'active',
    unit: 'Hội viên · Taekwondo',
    joinedAt: '2026-03-08',
  },
  {
    id: 'u-08',
    code: 'HV-0994',
    fullName: 'Bùi Thanh Tâm',
    email: 'thanhtam.bui@gmail.com',
    phone: '0944667788',
    roleId: 'member',
    status: 'inactive',
    unit: 'Hội viên · Quần vợt',
    joinedAt: '2025-07-19',
  },
];

export const SEED_LOGS = [
  {
    id: 'log-seed-1',
    at: '2026-10-12T08:15:00.000Z',
    type: 'status',
    actor: CURRENT_MANAGER.name,
    userId: 'u-05',
    userName: 'Võ Gia Bảo',
    summary: 'Vô hiệu hóa tài khoản Võ Gia Bảo',
    detail: 'Đang hoạt động → Ngưng hoạt động',
    email: {
      to: 'giabao.vo@gmail.com',
      subject: '[AnhDuy Sport] Tài khoản của bạn đã bị vô hiệu hóa',
      body: 'Xin chào Võ Gia Bảo, quản lý trung tâm đã vô hiệu hóa tài khoản giabao.vo@gmail.com.',
    },
  },
  {
    id: 'log-seed-2',
    at: '2026-10-08T02:40:00.000Z',
    type: 'role',
    actor: CURRENT_MANAGER.name,
    userId: 'u-03',
    userName: 'Phạm Đức Anh',
    summary: 'Đổi vai trò của Phạm Đức Anh',
    detail: 'Hội viên → Huấn luyện viên',
    email: null,
  },
  {
    id: 'log-seed-3',
    at: '2026-09-28T07:05:00.000Z',
    type: 'role',
    actor: CURRENT_MANAGER.name,
    userId: 'u-04',
    userName: 'Nguyễn Thu Hà',
    summary: 'Đổi vai trò của Nguyễn Thu Hà',
    detail: 'Hội viên → Lễ tân',
    email: null,
  },
  {
    id: 'log-seed-4',
    at: '2026-09-18T03:20:00.000Z',
    type: 'status',
    actor: CURRENT_MANAGER.name,
    userId: 'u-08',
    userName: 'Bùi Thanh Tâm',
    summary: 'Vô hiệu hóa tài khoản Bùi Thanh Tâm',
    detail: 'Đang hoạt động → Ngưng hoạt động',
    email: {
      to: 'thanhtam.bui@gmail.com',
      subject: '[AnhDuy Sport] Tài khoản của bạn đã bị vô hiệu hóa',
      body: 'Xin chào Bùi Thanh Tâm, quản lý trung tâm đã vô hiệu hóa tài khoản thanhtam.bui@gmail.com.',
    },
  },
];

export function getRole(roleId) {
  return ROLES.find((role) => role.id === roleId) ?? null;
}

export function getStatusMeta(status) {
  if (status === 'active') {
    return { id: 'active', label: 'Đang hoạt động' };
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
