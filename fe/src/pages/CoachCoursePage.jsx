import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getCoachClass, listCoachClasses } from '../api/coachCourseApi';
import WorkspaceShell from '../components/workspace/WorkspaceShell';
import StaffAccountSettings from '../components/staff/StaffAccountSettings';
import StaffProfileNotice from '../components/staff/StaffProfileNotice';
import AttendancePanel from '../components/coach/AttendancePanel';
import AssignmentPanel from '../components/coach/AssignmentPanel';
import ClassInfoPanel from '../components/coach/ClassInfoPanel';
import CourseAiPanel from '../components/coach/CourseAiPanel';
import CoachMaterialPanel from '../components/coach/CoachMaterialPanel';
import EvaluationPanel from '../components/coach/EvaluationPanel';
import { cardClass, emptyBox, formatDate, primaryButtonClass, statusLabel } from '../components/coach/coachUi';
import { useAuth } from '../context/AuthContext';

const TABS = [
  { id: 'info', label: 'Thông tin' },
  { id: 'attendance', label: 'Điểm danh' },
  { id: 'evaluation', label: 'Đánh giá' },
  { id: 'assignment', label: 'Bài tập' },
  { id: 'ai', label: 'AI' },
  { id: 'material', label: 'Giáo trình' },
  { id: 'settings', label: 'Cài đặt' },
];

const CLASS_TABS = new Set(['info', 'attendance', 'evaluation', 'assignment', 'ai', 'material']);

export default function CoachCoursePage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const tab = TABS.some((item) => item.id === requestedTab) ? requestedTab : 'info';
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Lớp của tôi · AnhDuy Sport';
  }, []);

  const reloadClasses = async () => {
    const next = await listCoachClasses();
    setClasses(next || []);
    setClassId((current) => current || next?.[0]?.classId || '');
    setError('');
  };

  useEffect(() => {
    let ignore = false;
    listCoachClasses()
      .then((next) => {
        if (ignore) return;
        setClasses(next || []);
        setClassId(next?.[0]?.classId || '');
      })
      .catch((loadError) => {
        if (!ignore) setError(loadError.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!classId) {
      setDetail(null);
      return undefined;
    }
    let ignore = false;
    setDetailLoading(true);
    getCoachClass(classId)
      .then((next) => {
        if (!ignore) setDetail(next);
      })
      .catch((loadError) => {
        if (!ignore) setError(loadError.message);
      })
      .finally(() => {
        if (!ignore) setDetailLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [classId]);

  const selectTab = (id) => {
    if (id === 'info') setSearchParams({}, { replace: true });
    else setSearchParams({ tab: id }, { replace: true });
  };

  const classScoped = CLASS_TABS.has(tab);
  const currentTab = TABS.find((item) => item.id === tab);

  return (
    <WorkspaceShell
      role="Huấn luyện viên"
      homeTo="/hlv/lop-hoc"
      items={TABS.filter((item) => item.id !== 'attendance').map((item) => ({ id: item.id, label: item.label }))}
      activeId={tab}
      onSelect={selectTab}
      breadcrumb={[
        { label: 'Huấn luyện viên', to: '/hlv/lop-hoc' },
        { label: currentTab?.label || 'Thông tin' },
      ]}
    >
      <div key={tab} className="page-enter">
        <StaffProfileNotice userId={user?.id} />

        {loading && classScoped && <div className="mt-6 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]" aria-busy="true" aria-label="Đang tải lớp">
            <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
            <div className="h-72 animate-pulse rounded-3xl bg-slate-200" />
          </div>}
        {!loading && classScoped && error && !classes.length && (
          <div className={`${cardClass} mt-6`}>
            <p className="text-sm font-semibold text-red-700">{error}</p>
            <button type="button" className={`${primaryButtonClass} mt-4`} onClick={() => reloadClasses().catch((loadError) => setError(loadError.message))}>
              Tải lại
            </button>
          </div>
        )}
        {!loading && classScoped && !error && classes.length === 0 && (
          <div className={`${cardClass} mt-6`}>
            <p className={emptyBox}>Bạn chưa được phân công lớp nào.</p>
            <button type="button" className={`${primaryButtonClass} mt-4`} onClick={() => reloadClasses().catch((loadError) => setError(loadError.message))}>
              Tải lại
            </button>
          </div>
        )}

        {!loading && classScoped && classes.length > 0 && (
          <div className="mt-6 space-y-5">
            <aside className="flex gap-3 overflow-x-auto pb-1">
              {classes.map((item) => {
                const active = item.classId === classId;
                return (
                  <button
                    key={item.classId}
                    type="button"
                    onClick={() => setClassId(item.classId)}
                    aria-pressed={active}
                    className={`min-w-56 shrink-0 cursor-pointer rounded-2xl border px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e31b23] ${
                      active ? 'border-[#12141d] bg-[#12141d] text-white shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <p className="font-black">{item.className}</p>
                    <p className={`mt-1 text-xs ${active ? 'text-white/70' : 'text-slate-500'}`}>
                      {item.sportName} · {statusLabel(item.status)}
                    </p>
                    <p className={`mt-1 text-xs tabular-nums ${active ? 'text-white/70' : 'text-slate-500'}`}>
                      {item.enrolledCount} học viên · {formatDate(item.startDate)}
                    </p>
                  </button>
                );
              })}
            </aside>

            <div className="min-w-0">
              {detail && (
                <div className="mb-4">
                  <h2 className="text-xl font-black text-balance text-slate-900">{detail.className}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {[detail.sportName, detail.courseName].filter((v, i, a) => v && a.indexOf(v) === i).join(" · ")} · {statusLabel(detail.status)}
                  </p>
                </div>
              )}
              {detailLoading && <div className="h-72 animate-pulse rounded-3xl bg-slate-200" aria-busy="true" aria-label="Đang tải lớp" />}
              {detail && !detailLoading && tab === 'info' && (
                <ClassInfoPanel
                  key={classId}
                  detail={detail}
                  onAttend={(sessionId) => setSearchParams({ tab: 'attendance', session: String(sessionId) }, { replace: true })}
                />
              )}
              {detail && !detailLoading && tab === 'attendance' && (
                <AttendancePanel classId={classId} sessions={detail.sessions} initialSessionId={searchParams.get('session') || ''} />
              )}
              {detail && !detailLoading && tab === 'evaluation' && <EvaluationPanel classId={classId} />}
              {detail && !detailLoading && tab === 'assignment' && (
                <AssignmentPanel classId={classId} sessions={detail.sessions} />
              )}
              {detail && !detailLoading && tab === 'ai' && (
                <CourseAiPanel
                  classId={classId}
                  sessions={detail.sessions}
                  view={searchParams.get('view') === 'draft' ? 'draft' : 'form'}
                  onView={(next) => setSearchParams(next === 'draft' ? { tab: 'ai', view: 'draft' } : { tab: 'ai' }, { replace: true })}
                />
              )}
              {detail && !detailLoading && tab === 'material' && (
                <CoachMaterialPanel sportName={detail.sportName} />
              )}
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="mt-6">
            <StaffAccountSettings />
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
