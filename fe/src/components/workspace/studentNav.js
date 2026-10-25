import { useEffect, useState } from 'react';
import { getMyClassRegistrations } from '../../api/managementApi';

const enrolledItems = [
  { id: 'overview', label: 'Tổng quan', to: '/hoc-vien-dashboard', end: true },
  { id: 'classes', label: 'Lớp của tôi', to: '/hoc-vien-dashboard#classes' },
  { id: 'course-plan', label: 'Bài tập lớp', to: '/hoc-vien/bai-tap-lop', end: true },
  { id: 'schedule', label: 'Lịch học', to: '/hoc-vien-dashboard#schedule' },
  { id: 'support', label: 'Đơn hỗ trợ', to: '/hoc-vien-dashboard#support' },
  { id: 'history', label: 'Lịch sử thanh toán', to: '/hoc-vien-dashboard#history' },
];

const openItems = [
  { id: 'overview', label: 'Tổng quan', to: '/hoc-vien-dashboard', end: true },
  { id: 'register', label: 'Đăng ký khóa học', to: '/dang-ky-khoa-hoc' },
  { id: 'history', label: 'Lịch sử thanh toán', to: '/hoc-vien-dashboard#history' },
];

const pendingItems = [
  { id: 'overview', label: 'Tổng quan', to: '/hoc-vien-dashboard', end: true },
  { id: 'history', label: 'Lịch sử thanh toán', to: '/hoc-vien-dashboard#history' },
];

export function studentWorkspaceItems(hasClass) {
  if (hasClass === true) return enrolledItems;
  if (hasClass === false) return openItems;
  return pendingItems;
}

export function useHasClassRegistration(enabled = true) {
  const [hasClass, setHasClass] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setHasClass(false);
      return undefined;
    }
    let ignore = false;
    getMyClassRegistrations()
      .then((classes) => {
        if (!ignore) setHasClass(Array.isArray(classes) && classes.length > 0);
      })
      .catch(() => {
        if (!ignore) setHasClass(false);
      });
    return () => {
      ignore = true;
    };
  }, [enabled]);

  return hasClass;
}
