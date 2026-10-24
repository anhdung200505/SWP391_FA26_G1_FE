import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getCoachClass, listCoachClasses } from '../api/coachCourseApi';
import WorkspaceShell from '../components/workspace/WorkspaceShell';
import StaffAccountSettings from '../components/staff/StaffAccountSettings';
import StaffProfileNotice from '../components/staff/StaffProfileNotice';
import AttendancePanel from '../components/coach/AttendancePanel';
import AssignmentPanel from '../components/coach/AssignmentPanel';
import ClassInfoPanel from '../components/coach/ClassInfoPanel';
import CoachHistoryPanel from '../components/coach/CoachHistoryPanel';
import CourseAiPanel from '../components/coach/CourseAiPanel';
import EvaluationPanel from '../components/coach/EvaluationPanel';
import { formatDate, primaryButtonClass, statusLabel } from '../components/coach/coachUi';
import { useAuth } from '../context/AuthContext';

const TABS = [
  { id: 'info', label: 'Thông tin' },
  { id: 'attendance', label: 'Điểm danh' },
  { id: 'evaluation', label: 'Đánh giá' },
  { id: 'assignment', label: 'Bài tập' },
  { id: 'ai', label: 'AI' },
  { id: 'history', label: 'Lịch sử tập' },
  { id: 'settings', label: 'Cài đặt' },
];

const CLASS_TABS = new Set(['info', 'attendance', 'evaluation', 'assignment', 'ai']);

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
      items={TABS.map((item) => ({ id: item.id, label: item.label }))}
      activeId={tab}
      onSelect={selectTab}
      breadcrumb={[
        { label: 'Huấn luyện viên', to: '/hlv/lop-hoc' },
        { label: currentTab?.label || 'Thông tin' },
      ]}
    >
        <StaffProfileNotice userId={user?.id} />

        {loading && classScoped && <p className="mt-6 text-sm text-gray-500">Đang tải lớp...</p>}
        {!loading && classScoped && error && !classes.length && (
          <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-5">
            <p className="text-sm font-semibold text-[#b1131a]">{error}</p>
            <button type="button" className={`${primaryButtonClass} mt-4`} onClick={() => reloadClasses().catch((loadError) => setError(loadError.message))}>
              Tải lại
            </button>
          </div>
        )}
        {!loading && classScoped && !error && classes.length === 0 && (
          <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-600">Bạn chưa được phân công lớp nào.</p>
            <button type="button" className={`${primaryButtonClass} mt-4`} onClick={() => reloadClasses().catch((loadError) => setError(loadError.message))}>
              Tải lại
            </button>
          </div>
        )}

        {!loading && classScoped && classes.length > 0 && (
          <div className="mt-6 grid gap-4 lg:grid-cols-[240px_1fr]">
            <aside className="flex gap-2 overflow-x-auto lg:block lg:space-y-2">
              {classes.map((item) => {
                const active = item.classId === classId;
                return (
                  <button
                    key={item.classId}
                    type="button"
                    onClick={() => setClassId(item.classId)}
                    className={`min-w-52 rounded-2xl border px-4 py-3 text-left lg:min-w-0 lg:w-full ${
                      active ? 'border-[#12141d] bg-[#12141d] text-white' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <p className="font-black">{item.className}</p>
                    <p className={`mt-1 text-xs ${active ? 'text-white/70' : 'text-gray-500'}`}>
                      {item.sportName} · {statusLabel(item.status)}
                    </p>
                    <p className={`mt-1 text-xs tabular-nums ${active ? 'text-white/70' : 'text-gray-500'}`}>
                      {item.enrolledCount} học viên · {formatDate(item.startDate)}
                    </p>
                  </button>
                );
              })}
            </aside>

            <div>
              {detail && (
                <div className="mb-4">
                  <h2 className="text-xl font-black">{detail.className}</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {detail.sportName} · {detail.courseName} · {statusLabel(detail.status)}
                  </p>
                </div>
              )}
              {detailLoading && <p className="text-sm text-gray-500">Đang tải lớp...</p>}
              {detail && !detailLoading && tab === 'info' && <ClassInfoPanel key={classId} detail={detail} />}
              {detail && !detailLoading && tab === 'attendance' && (
                <AttendancePanel classId={classId} sessions={detail.sessions} />
              )}
              {detail && !detailLoading && tab === 'evaluation' && <EvaluationPanel classId={classId} />}
              {detail && !detailLoading && tab === 'assignment' && (
                <AssignmentPanel classId={classId} sessions={detail.sessions} />
              )}
              {detail && !detailLoading && tab === 'ai' && (
                <CourseAiPanel classId={classId} onOpenHistory={() => selectTab('history')} />
              )}
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="mt-6">
            <CoachHistoryPanel classId={classId} onClassIdChange={setClassId} />
          </div>
        )}
        {tab === 'settings' && (
          <div className="mt-6">
            <StaffAccountSettings />
          </div>
        )}
    </WorkspaceShell>
  );
}
