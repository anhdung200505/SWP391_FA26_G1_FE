import WorkspaceShell from '../workspace/WorkspaceShell';
import StaffActivityBell from './StaffActivityBell';

const links = [
  { id: 'home', to: '/quan-ly', label: 'Bảng điều khiển', end: true },
  { id: 'revenue', to: '/quan-ly/doanh-thu', label: 'Doanh thu' },
  { id: 'accounts', to: '/quan-ly/tai-khoan', label: 'Tài khoản người dùng' },
  { id: 'packages', to: '/quan-ly/goi', label: 'Gói hội viên' },
  { id: 'ai', to: '/quan-ly/han-muc-ai', label: 'Hạn mức gợi ý tập' },
  { id: 'classes', to: '/quan-ly/lop-hoc', label: 'Lớp học' },
  { id: 'material', to: '/quan-ly/giao-trinh', label: 'Giáo trình môn học' },
  { id: 'checkin', to: '/quan-ly/check-in', label: 'Check-in' },
  { id: 'private', to: '/quan-ly/yeu-cau-1-1', label: 'Yêu cầu 1-1' },
  { id: 'enrollment', to: '/quan-ly/tu-van-ghi-danh', label: 'Tư vấn ghi danh' },
];

export default function ManagementShell({ breadcrumb = [], children }) {
  return (
    <WorkspaceShell
      role="Quản lý trung tâm"
      homeTo="/quan-ly"
      items={links}
      breadcrumb={breadcrumb}
      headerExtra={<StaffActivityBell />}
    >
      {children}
    </WorkspaceShell>
  );
}
