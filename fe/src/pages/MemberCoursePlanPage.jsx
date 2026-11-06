import { useEffect, useState } from 'react';
import { getMemberCoursePlans } from '../api/coachCourseApi';
import { formatDateTime } from '../components/coach/coachUi';
import { focusRing, spinnerClass } from '../components/member/memberUi';

const EXAM_ID = 'exam';
const RUBRIC_ID = 'rubric';
const sessionKey = (session) => `s-${session.sessionId}`;

const chevron = (
  <svg
    className="size-5 shrink-0 text-slate-400 transition-transform group-open/plan:rotate-90"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M9 6l6 6-6 6" />
  </svg>
);

// Mỗi lớp là một mục thu gọn: bấm vào mới thấy nội dung các buổi.
function PlanView({ plan }) {
  const choices = [
    ...plan.sessions.map((session) => ({ id: sessionKey(session), label: session.sessionLabel })),
    ...(plan.exam.length > 0 ? [{ id: EXAM_ID, label: 'Bài thi cuối kỳ' }] : []),
    ...(plan.rubric.length > 0 ? [{ id: RUBRIC_ID, label: 'Tiêu chí chấm' }] : []),
  ];
  const [classOpen, setClassOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(choices[0]?.id || '');

  const exerciseCount = plan.sessions.reduce((sum, session) => sum + session.exercises.length, 0);
  const totalPoints = plan.exam.reduce((sum, question) => sum + Number(question.points || 0), 0);
  const stats = [
    `${plan.sessions.length} buổi`,
    `${exerciseCount} bài tập`,
    ...(plan.exam.length > 0 ? [`Thi ${plan.exam.length} câu · ${totalPoints} điểm`] : []),
  ];

  return (
    <details
      open={classOpen}
      onToggle={(event) => setClassOpen(event.currentTarget.open)}
      className="group/plan rounded-3xl border border-slate-200 bg-white shadow-xs"
    >
      <summary
        className={`flex cursor-pointer list-none items-start gap-3 rounded-3xl p-5 hover:bg-slate-50/60 sm:p-6 [&::-webkit-details-marker]:hidden ${focusRing}`}
      >
        <span className="mt-1">{chevron}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-xl font-black text-balance text-slate-900">{plan.className}</span>
          <span className="mt-1 block text-sm text-slate-500">
            {plan.sportName} · {plan.courseName} · HLV {plan.coachName}
          </span>
          <span className="mt-3 flex flex-wrap gap-2">
            {stats.map((stat) => (
              <span key={stat} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 tabular-nums">
                {stat}
              </span>
            ))}
          </span>
        </span>
      </summary>

      <div className="space-y-4 border-t border-slate-100 p-5 sm:p-6">
        <div>
          <p className="text-xs text-slate-500">Phát hành {formatDateTime(plan.publishedAt)}</p>
          {plan.summary && <p className="mt-2 text-sm text-pretty text-slate-700">{plan.summary}</p>}
        </div>

      <section>
        <label className="block text-sm font-black text-slate-900">
          Buổi học
          <select
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            className={`mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold ${focusRing}`}
          >
            {choices.length === 0 && <option value="">Chưa có buổi</option>}
            {choices.map((choice) => (
              <option key={choice.id} value={choice.id}>{choice.label}</option>
            ))}
          </select>
        </label>
        <div className="mt-4">
          {plan.sessions.filter((session) => sessionKey(session) === selectedId).map((session) => (
            <ul key={session.sessionId} className="space-y-3">
              {session.exercises.map((exercise) => (
                <li key={`${session.sessionId}-${exercise.title}`} className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="font-bold text-slate-900">
                    {exercise.title}
                    <span className="ml-2 text-sm font-semibold text-slate-500">{exercise.dosage}</span>
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-line text-slate-700">{exercise.instructions}</p>
                </li>
              ))}
            </ul>
          ))}
          {selectedId === EXAM_ID && (
            <ol className="list-decimal space-y-3 pl-5">
              {plan.exam.map((question) => (
                <li key={question.prompt} className="text-sm">
                  <p className="font-semibold text-slate-900">{question.prompt}</p>
                  <p className="text-slate-500 tabular-nums">{question.points} điểm</p>
                </li>
              ))}
            </ol>
          )}
          {selectedId === RUBRIC_ID && (
            <ul className="space-y-3">
              {plan.rubric.map((item) => (
                <li key={item.criterion}>
                  <p className="font-bold text-slate-900">
                    {item.criterion}
                    <span className="ml-2 tabular-nums text-slate-500">{item.maxScore}</span>
                  </p>
                  <p className="text-sm text-slate-600">{item.guidance}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      </div>
    </details>
  );
}

export default function MemberCoursePlanPage() {
  const [plans, setPlans] = useState([]);
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

  return (
    <>
      <h1 className="text-2xl font-black text-balance text-slate-900">Bài tập lớp</h1>
      <p className="mt-2 max-w-prose text-sm text-pretty text-slate-500">
        Bản huấn luyện viên đã phát hành. Đề thi không kèm đáp án.
      </p>

      {loading && (
        <div className="py-12 text-center">
          <div className={`${spinnerClass} mb-2`}></div>
          <p className="text-sm font-bold text-slate-500">Đang tải bài tập...</p>
        </div>
      )}
      {!loading && error && <p className="mt-6 text-sm font-semibold text-[#b1131a]">{error}</p>}
      {!loading && !error && plans.length === 0 && (
        <p className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Chưa có bài tập nào được phát hành cho lớp bạn đang học.
        </p>
      )}

      {plans.length > 0 && (
        <div className="mt-6 space-y-3">
          {plans.map((item) => (
            <PlanView key={item.classId} plan={item} />
          ))}
        </div>
      )}
    </>
  );
}
