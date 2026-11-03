import { useEffect } from 'react';
import ManagementShell from '../../components/management/ManagementShell';
import ReceptionCheckIn from '../../components/receptionist/ReceptionCheckIn';

// Quản trị dùng chung màn check-in với lễ tân: check-in, check-out, xem mọi ngày và hoàn tác lượt cũ (lễ tân chỉ hoàn tác trong ngày).
export default function CenterCheckInPage() {
  useEffect(() => {
    document.title = 'Check-in · AnhDuy Sport';
  }, []);

  return (
    <ManagementShell breadcrumb={[{ label: 'Bảng điều khiển', to: '/quan-ly' }, { label: 'Check-in' }]}>
      <ReceptionCheckIn />
    </ManagementShell>
  );
}
