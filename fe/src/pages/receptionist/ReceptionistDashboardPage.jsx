import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import WorkspaceShell from '../../components/workspace/WorkspaceShell';
import ReceptionistPage from '../../components/receptionist/ReceptionistPage';
import ReceptionClassRegistration from '../../components/receptionist/ReceptionClassRegistration';
import ReceptionRegistrationsList from '../../components/receptionist/ReceptionRegistrationsList';
import ReceptionClassSchedule from '../../components/classes/ReceptionClassSchedule';
import StaffActivityBell from '../../components/management/StaffActivityBell';
import StaffAccountSettings from '../../components/staff/StaffAccountSettings';
import StaffProfileNotice from '../../components/staff/StaffProfileNotice';
import ReceptionCheckIn from '../../components/receptionist/ReceptionCheckIn';

const TABS = [
  { id: 'support', label: 'Hỗ trợ và tư vấn' },
  { id: 'registrations', label: 'Đăng ký và lớp học' },
  { id: 'schedule', label: 'Lịch buổi học' },
  { id: 'checkin', label: 'Check-in học viên' },
  { id: 'members', label: 'Tra cứu học viên' },
];

export default function ReceptionistDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('support');
  const [subTab, setSubTab] = useState('register_form');

  useEffect(() => {
    document.title = 'Lễ tân · AnhDuy Sport';
  }, []);

  const current = TABS.find((item) => item.id === activeTab);

  return (
    <WorkspaceShell
      role="Lễ tân"
      homeTo="/le-tan"
      items={TABS}
      activeId={activeTab}
      onSelect={setActiveTab}
      breadcrumb={[{ label: 'Lễ tân' }, { label: current?.label || '' }]}
      headerExtra={<StaffActivityBell audience="receptionist" />}
    >
      <StaffProfileNotice userId={user?.id} />

      {activeTab === 'support' && (
        <div className="mt-6">
          <ReceptionistPage />
        </div>
      )}

      {activeTab === 'registrations' && (
        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSubTab('register_form')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                subTab === 'register_form' ? 'bg-[#12141d] text-white' : 'border border-gray-200 bg-white text-gray-700'
              }`}
            >
              Đăng ký lớp tại quầy
            </button>
            <button
              type="button"
              onClick={() => setSubTab('registrations_list')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                subTab === 'registrations_list' ? 'bg-[#12141d] text-white' : 'border border-gray-200 bg-white text-gray-700'
              }`}
            >
              Học viên đã ghi danh
            </button>
          </div>

          {subTab === 'register_form' && (
            <ReceptionClassRegistration onRegistrationSuccess={() => setSubTab('registrations_list')} />
          )}
          {subTab === 'registrations_list' && <ReceptionRegistrationsList />}
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="mt-6">
          <ReceptionClassSchedule />
        </div>
      )}

      {activeTab === 'checkin' && <ReceptionCheckIn />}

      {activeTab === 'settings' && (
        <div className="mt-6">
          <StaffAccountSettings />
        </div>
      )}

      {activeTab === 'members' && (
        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-black text-balance">Hồ sơ học viên</h2>
          <p className="mt-2 text-sm text-pretty text-gray-500">
            Tra cứu thông tin và lịch sử tham gia lớp của hội viên.
          </p>
        </section>
      )}
    </WorkspaceShell>
  );
}
