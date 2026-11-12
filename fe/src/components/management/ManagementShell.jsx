import WorkspaceShell from '../workspace/WorkspaceShell';
import StaffActivityBell from './StaffActivityBell';

const links = [
  { id: 'home', to: '/quan-ly', label: 'Bảng điều khiển', end: true },
  { id: 'revenue', to: '/quan-ly/doanh-thu', label: 'Doanh thu' },
  { id: 'accounts', to: '/quan-ly/tai-khoan', label: 'Tài khoản người dùng' },
  {
    id: 'members',
    label: 'Hội viên',
    children: [
      { id: 'packages', to: '/quan-ly/goi', label: 'Gói hội viên' },
    ],
  },
  {
    id: 'training',
    label: 'Đào tạo',
    children: [
      { id: 'classes', to: '/quan-ly/lop-hoc', label: 'Lớp học' },
      { id: 'rooms', to: '/quan-ly/phong-tap', label: 'Phòng tập' },
      { id: 'sports', to: '/quan-ly/mon-hoc', label: 'Môn & khóa học' },
      { id: 'material', to: '/quan-ly/giao-trinh', label: 'Giáo trình môn học' },
      { id: 'private', to: '/quan-ly/yeu-cau-1-1', label: 'Yêu cầu 1-1' },
    ],
  },
  {
    id: 'reception',
    label: 'Tiếp nhận',
    children: [
      { id: 'checkin', to: '/quan-ly/check-in', label: 'Check-in' },
      { id: 'enrollment', to: '/quan-ly/tu-van-ghi-danh', label: 'Tư vấn ghi danh' },
    ],
  },
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
