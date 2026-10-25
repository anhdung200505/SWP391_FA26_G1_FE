import { useEffect, useState } from 'react';
import { getMemberCoursePlans } from '../api/coachCourseApi';
import WorkspaceShell from '../components/workspace/WorkspaceShell';
import NotificationBell from '../components/NotificationBell';
import { studentWorkspaceItems, useHasClassRegistration } from '../components/workspace/studentNav';
import { formatDateTime } from '../components/coach/coachUi';

export default function MemberCoursePlanPage() {
  const hasClass = useHasClassRegistration();
  const [plans, setPlans] = useState([]);
  const [classId, setClassId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Bài tập lớp · AnhDuy Sport';
  }, []);

  useEffect(() => {
    let ignore = false;
    getMemberCoursePlans()
      .then((next) => {
        if (ignore) return;
        setPlans(next || []);
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

  const plan = plans.find((item) => item.classId === classId) || plans[0];

  return (
    <WorkspaceShell
      role="Học viên"
      homeTo="/hoc-vien-dashboard"
      items={studentWorkspaceItems(hasClass)}
      breadcrumb={[{ label: 'Học viên', to: '/hoc-vien-dashboard' }, { label: 'Bài tập lớp' }]}
      headerExtra={<NotificationBell />}
    >
        <h1 className="text-2xl font-black text-balance">Bài tập lớp</h1>
        <p className="mt-2 max-w-prose text-sm text-pretty text-gray-500">Bản huấn luyện viên đã phát hành. Đề thi không kèm đáp án.</p>

        {loading && <p className="mt-6 text-sm text-gray-500">Đang tải...</p>}
        {!loading && error && <p className="mt-6 text-sm font-semibold text-[#b1131a]">{error}</p>}
        {!loading && !error && plans.length === 0 && (
          <p className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
            Chưa có bài tập nào được phát hành cho lớp bạn đang học.
          </p>
        )}

        {plan && (
          <article className="mt-6 space-y-4">
            {plans.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {plans.map((item) => (
                  <button
                    key={item.classId}
                    type="button"
                    onClick={() => setClassId(item.classId)}
                    className={`rounded-full px-4 py-2 text-sm font-bold whitespace-nowrap ${
                      item.classId === plan.classId ? 'bg-[#12141d] text-white' : 'bg-white border border-gray-200'
                    }`}
                  >
                    {item.className}
                  </button>
                ))}
              </div>
            )}
            <header className="rounded-3xl border border-gray-200 bg-white p-5">
              <h2 className="text-xl font-black">{plan.className}</h2>
              <p className="mt-1 text-sm text-gray-500">
                {plan.sportName} · {plan.courseName} · HLV {plan.coachName}
              </p>
              <p className="mt-1 text-xs text-gray-400">Phát hành {formatDateTime(plan.publishedAt)}</p>
              {plan.summary && <p className="mt-3 text-sm text-gray-700">{plan.summary}</p>}
            </header>
            {plan.sessions.map((session) => (
              <section key={session.sessionId} className="rounded-3xl border border-gray-200 bg-white p-5">
                <h3 className="font-black">{session.sessionLabel}</h3>
                <ul className="mt-3 space-y-3">
                  {session.exercises.map((exercise) => (
                    <li key={`${session.sessionId}-${exercise.title}`} className="rounded-2xl bg-[#f4f5f7] px-4 py-3">
                      <p className="font-bold">
                        {exercise.title}
                        <span className="ml-2 text-sm font-semibold text-gray-500">{exercise.dosage}</span>
                      </p>
                      <p className="mt-1 text-sm whitespace-pre-line text-gray-700">{exercise.instructions}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <section className="rounded-3xl border border-gray-200 bg-white p-5">
              <h3 className="font-black">Bài thi cuối kỳ</h3>
              <ol className="mt-3 list-decimal space-y-3 pl-5">
                {plan.exam.map((question) => (
                  <li key={question.prompt} className="text-sm">
                    <p className="font-semibold">{question.prompt}</p>
                    <p className="text-gray-500 tabular-nums">{question.points} điểm</p>
                  </li>
                ))}
              </ol>
            </section>
            <section className="rounded-3xl border border-gray-200 bg-white p-5">
              <h3 className="font-black">Tiêu chí chấm</h3>
              <ul className="mt-3 space-y-3">
                {plan.rubric.map((item) => (
                  <li key={item.criterion}>
                    <p className="font-bold">
                      {item.criterion}
                      <span className="ml-2 tabular-nums text-gray-500">{item.maxScore}</span>
                    </p>
                    <p className="text-sm text-gray-600">{item.guidance}</p>
                  </li>
                ))}
              </ul>
            </section>
          </article>
        )}
    </WorkspaceShell>
  );
}
