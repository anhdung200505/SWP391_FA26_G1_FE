import WorkspaceShell from '../workspace/WorkspaceShell';
import StaffActivityBell from './StaffActivityBell';

const links = [
  { id: 'home', to: '/quan-ly', label: 'Bảng điều khiển', end: true },
  { id: 'accounts', to: '/quan-ly/tai-khoan', label: 'Tài khoản người dùng' },
  { id: 'packages', to: '/quan-ly/goi', label: 'Gói hội viên' },
  { id: 'ai', to: '/quan-ly/han-muc-ai', label: 'Hạn mức AI' },
  { id: 'classes', to: '/quan-ly/lop-hoc', label: 'Lớp học' },
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
