import { useState } from 'react';
import { PublishContext } from './studentShell';
import { Outlet, useLocation } from 'react-router-dom';
import WorkspaceShell from './WorkspaceShell';
import NotificationBell from '../NotificationBell';
import Footer from '../Footer';
import { studentWorkspaceItems, useHasClassRegistration } from './studentNav';

const HOME = '/hoc-vien-dashboard';
const STUDENT = { label: 'Học viên', to: HOME };

// Tên trang mặc định theo đường dẫn, để breadcrumb đúng ngay từ lần vẽ đầu.
const PAGE_LABELS = {
  '/hoc-vien/bai-tap-lop': 'Bài tập lớp',
  '/hoc-vien/giao-an-ai': 'Gợi ý tập',
  '/dang-ky-khoa-hoc': 'Đăng ký khóa học',
};

// Một khung duy nhất cho mọi trang học viên: thanh bên và đầu trang giữ nguyên, chỉ phần nội dung đổi.
export default function StudentLayout() {
  const { pathname } = useLocation();
  const hasClass = useHasClassRegistration();
  const [extra, setExtra] = useState(null);

  const pageLabel = PAGE_LABELS[pathname];
  const breadcrumb = extra?.breadcrumb || [STUDENT, ...(pageLabel ? [{ label: pageLabel }] : [])];

  return (
    <PublishContext.Provider value={setExtra}>
      <WorkspaceShell
        role="Học viên"
        homeTo={HOME}
        items={extra?.items || studentWorkspaceItems(hasClass)}
        activeId={extra?.activeId}
        onSelect={extra?.onSelect}
        breadcrumb={breadcrumb}
        headerExtra={<NotificationBell />}
        footer={<Footer />}
      >
        <div key={pathname} className="page-enter">
          <Outlet />
        </div>
      </WorkspaceShell>
    </PublishContext.Provider>
  );
}
