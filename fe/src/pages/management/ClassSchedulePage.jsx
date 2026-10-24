import { Link, useParams } from 'react-router-dom';
import ManagementShell from '../../components/management/ManagementShell';
import ClassScheduleView from '../../components/classes/ClassScheduleView';
import { getManagementClasses } from '../../api/managementApi';

export default function ClassSchedulePage() {
  const { classId } = useParams();

  return (
    <ManagementShell
      breadcrumb={[
        { label: 'Bảng điều khiển', to: '/quan-ly' },
        { label: 'Lớp học', to: '/quan-ly/lop-hoc' },
        { label: 'Lịch lớp học' },
      ]}
    >
      <ClassScheduleView
        classId={classId}
        mode="admin"
        loadClasses={getManagementClasses}
        back={
          <Link to="/quan-ly/lop-hoc" className="inline-block text-xs font-bold text-slate-500 hover:text-[#e31b23] transition-colors">
            ← Quay lại danh sách
          </Link>
        }
      />
    </ManagementShell>
  );
}
