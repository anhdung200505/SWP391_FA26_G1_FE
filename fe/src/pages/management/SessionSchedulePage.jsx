import { useSearchParams } from 'react-router-dom';
import ManagementShell from '../../components/management/ManagementShell';
import { DiagramCaption } from '../../components/management/ManagementBits';
import SessionSchedulePanel from '../../components/sessions/SessionSchedulePanel';

export default function SessionSchedulePage() {
  const [searchParams] = useSearchParams();

  return (
    <ManagementShell breadcrumb={[{ label: 'Bảng điều khiển', to: '/quan-ly' }, { label: 'Lịch buổi học' }]}>
      <section className="relative overflow-hidden rounded-3xl bg-[#12141d] px-6 py-8 text-white sm:px-8">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] bg-[#e31b23] sm:block"
          style={{ clipPath: 'polygon(22% 0, 100% 0, 100% 100%, 0 100%)' }}
        />
        <div className="relative max-w-xl">
          <span className="inline-block bg-[#e31b23] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white -skew-x-12">
            <span className="inline-block skew-x-12">Session Control</span>
          </span>
          <h1 className="mt-4 text-3xl font-black uppercase italic leading-none tracking-tight sm:text-5xl">
            Lịch buổi học
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/75 sm:text-base">
            Đổi huấn luyện viên, đổi phòng hoặc hủy từng buổi học. Mỗi thay đổi kèm ghi chú và được thông báo tới học viên.
          </p>
          <DiagramCaption>
            <span className="text-white/40">Coach · Room · Cancel · Note</span>
          </DiagramCaption>
        </div>
      </section>

      <div className="mt-6">
        <SessionSchedulePanel mode="admin" initialClassId={searchParams.get('classId') || ''} />
      </div>
    </ManagementShell>
  );
}
