import { useEffect, useState } from 'react';
import { getMyClassRegistrations } from '../../api/managementApi';

// Tab AI chính, hai tab phụ: gợi ý bài tập và lộ trình tập đã lưu.
const AI_TAB = {
  id: 'ai',
  label: 'AI',
  children: [
    { id: 'personal-ai', label: 'Gợi ý bài tập bằng AI', to: '/hoc-vien/giao-an-ai', end: true },
    { id: 'routine', label: 'Lộ trình tập', to: '/hoc-vien/lo-trinh-tap', end: true },
  ],
};

const enrolledItems = [
  { id: 'overview', label: 'Tổng quan', to: '/hoc-vien-dashboard', end: true },
  { id: 'course-plan', label: 'Bài tập lớp', to: '/hoc-vien/bai-tap-lop', end: true },
  { id: 'course-material', label: 'Giáo trình', to: '/hoc-vien/giao-trinh', end: true },
  AI_TAB,
  { id: 'register', label: 'Đăng ký khóa học', to: '/dang-ky-khoa-hoc' },
  { id: 'history', label: 'Lịch sử thanh toán', to: '/hoc-vien/lich-su-thanh-toan', end: true },
];

const openItems = [
  { id: 'overview', label: 'Tổng quan', to: '/hoc-vien-dashboard', end: true },
  AI_TAB,
  { id: 'register', label: 'Đăng ký khóa học', to: '/dang-ky-khoa-hoc' },
  { id: 'membership', label: 'Đăng ký thành viên', to: '/dang-ky-thanh-vien', end: true },
  { id: 'history', label: 'Lịch sử thanh toán', to: '/hoc-vien/lich-su-thanh-toan', end: true },
];

// Chưa biết học viên có lớp hay không: dùng menu cơ bản (chưa có mục chỉ dành cho người chưa có lớp).
const pendingItems = openItems.filter((item) => item.id !== 'membership');

export function groupStudyItems(items) {
  return items;
}

export function studentWorkspaceItems(hasClass) {
  if (hasClass === true) return groupStudyItems(enrolledItems);
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
