import { useEffect, useState } from 'react';
import { getMyClassRegistrations } from '../../api/managementApi';

const enrolledItems = [
  { id: 'overview', label: 'Tổng quan', to: '/hoc-vien-dashboard', end: true },
  { id: 'classes', label: 'Lớp của tôi', to: '/hoc-vien-dashboard#classes' },
  { id: 'course-plan', label: 'Bài tập lớp', to: '/hoc-vien/bai-tap-lop', end: true },
  { id: 'course-material', label: 'Giáo trình', to: '/hoc-vien/giao-trinh', end: true },
  { id: 'personal-ai', label: 'Gợi ý tập', to: '/hoc-vien/giao-an-ai', end: true },
  { id: 'register', label: 'Đăng ký khóa học', to: '/dang-ky-khoa-hoc' },
  { id: 'schedule', label: 'Lịch học', to: '/hoc-vien-dashboard#schedule' },
  { id: 'support', label: 'Đơn hỗ trợ', to: '/hoc-vien-dashboard#support' },
  { id: 'history', label: 'Lịch sử thanh toán', to: '/hoc-vien/lich-su-thanh-toan', end: true },
];

const openItems = [
  { id: 'overview', label: 'Tổng quan', to: '/hoc-vien-dashboard', end: true },
  { id: 'personal-ai', label: 'Gợi ý tập', to: '/hoc-vien/giao-an-ai', end: true },
  { id: 'register', label: 'Đăng ký khóa học', to: '/dang-ky-khoa-hoc' },
  { id: 'membership', label: 'Đăng ký thành viên', to: '/dang-ky-thanh-vien', end: true },
  { id: 'history', label: 'Lịch sử thanh toán', to: '/hoc-vien/lich-su-thanh-toan', end: true },
];

// Chưa biết học viên có lớp hay không: dùng menu cơ bản (chưa có mục chỉ dành cho người chưa có lớp).
const pendingItems = openItems.filter((item) => item.id !== 'membership');

// Bài tập lớp và Gợi ý tập gộp thành nhóm "Học tập". Chỉ còn một mục thì giữ mục đơn.
const STUDY_IDS = ['course-plan', 'personal-ai'];

export function groupStudyItems(items) {
  const members = items.filter((item) => STUDY_IDS.includes(item.id));
  if (members.length < 2) return items;
  const first = items.findIndex((item) => STUDY_IDS.includes(item.id));
  const rest = items.filter((item) => !STUDY_IDS.includes(item.id));
  rest.splice(first, 0, { id: 'study', label: 'Học tập', children: members });
  return rest;
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
