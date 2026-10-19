export function pathForRole(roleId) {
  if (roleId === 'ADMIN') return '/quan-ly';
  if (roleId === 'COACH' || roleId === 'RECEPTIONIST') return '/nhan-su';
  return '/home';
}

export function registrationOnly(user) {
  return user?.roleId === 'MEMBER' && user.hasPaid === false;
}

export const registrationOnlyMessage =
  'Bạn xem được toàn bộ tính năng học viên. Hiện chỉ thực hiện được các bước đăng ký lớp và thanh toán.';

export const guestTabs = [
  { id: 'center', name: 'TRUNG TÂM', title: 'Chọn trung tâm', diagram: 'Select center' },
  { id: 'subject', name: 'MÔN HỌC', title: 'Chọn môn', diagram: 'Select a subject' },
  { id: 'group', name: 'HỌC NHÓM', title: 'Học nhóm?', diagram: 'Group study?' },
  { id: 'schedule', name: 'LỚP / GIỜ', title: 'Lớp hoặc giờ học', diagram: 'View suitable class / Select time & coach' },
  { id: 'tuition', name: 'HỌC PHÍ', title: 'Xem học phí', diagram: 'View tuition fee' },
  { id: 'info', name: 'THÔNG TIN', title: 'Thông tin khách hàng', diagram: 'Enter customer information' },
  { id: 'payment', name: 'THANH TOÁN', title: 'Thanh toán', diagram: 'Process payment' },
];
