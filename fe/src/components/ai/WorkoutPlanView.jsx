const PIPELINE = [
  ['collectHealthData', 'Chỉ số sức khỏe'],
  ['trainingHistory', 'Lịch sử tập'],
  ['sendAnalysisRequest', 'Yêu cầu phân tích'],
  ['analyzeHealthMetricAndBmi', 'Phân tích BMI'],
  ['generatePersonalizedWorkoutPlan', 'Giáo án được tạo'],
];

function formatClock(value) {
  if (!value) return '';
  return String(value).slice(0, 5);
}

export default function WorkoutPlanView({ plan }) {
  if (!plan) return null;

  const saved = plan.status === 'saved';

  return (
    <article className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#e31b23]">
            {saved ? 'Giáo án đã lưu' : 'Giáo án chờ xác nhận'} · lần {plan.revision}
          </p>
          <h2 className="mt-1 text-xl font-black text-balance text-gray-900">{plan.title}</h2>
        </div>
        <p className="text-sm font-bold text-gray-700 tabular-nums">
          BMI {plan.bmi} · {plan.bmiCategory}
        </p>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 px-3 py-3">
          <dt className="text-xs font-bold text-gray-500">Mục tiêu</dt>
          <dd className="mt-1 text-sm font-bold text-pretty text-gray-900">{plan.goal}</dd>
        </div>
        <div className="rounded-2xl bg-slate-50 px-3 py-3">
          <dt className="text-xs font-bold text-gray-500">Nhịp tập</dt>
          <dd className="mt-1 text-sm font-bold text-gray-900 tabular-nums">
            {plan.sessionsPerWeek} buổi/tuần · {plan.sessionMinutes} phút
          </dd>
        </div>
        <div className="rounded-2xl bg-slate-50 px-3 py-3">
          <dt className="text-xs font-bold text-gray-500">Thời lượng</dt>
          <dd className="mt-1 text-sm font-bold text-gray-900 tabular-nums">
            {plan.durationWeeks} tuần · bắt đầu {formatClock(plan.startTime)}
          </dd>
        </div>
      </dl>

      {plan.changeNote && (
        <p className="mt-4 text-sm text-pretty text-gray-600">Yêu cầu đã gửi: {plan.changeNote}</p>
      )}

      {plan.sessions?.length ? (
        <ol className="mt-5 space-y-3">
          {plan.sessions.map((session) => (
            <li key={session.dayIndex} className="rounded-2xl border border-gray-200 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-black text-gray-900">
                  <span className="tabular-nums">{session.dayIndex}.</span> {session.weekday} · {session.title}
                </p>
                <p className="text-xs font-bold text-gray-500 tabular-nums">
                  {session.durationMinutes} phút · {session.intensity}
                </p>
              </div>
              <p className="mt-2 text-sm text-pretty whitespace-pre-line text-gray-600">{session.exercises}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-5 text-sm text-gray-500">Giáo án chưa có buổi tập.</p>
      )}

      {plan.pipeline && (
        <details className="mt-5 rounded-2xl bg-slate-50 px-4 py-3">
          <summary className="cursor-pointer text-sm font-bold text-gray-800">Cách hệ thống lập giáo án</summary>
          <dl className="mt-3 space-y-3">
            {PIPELINE.map(([key, label]) =>
              plan.pipeline[key] ? (
                <div key={key}>
                  <dt className="text-xs font-bold text-gray-500">{label}</dt>
                  <dd className="mt-1 text-sm text-pretty text-gray-700">{plan.pipeline[key]}</dd>
                </div>
              ) : null,
            )}
          </dl>
        </details>
      )}
    </article>
  );
}
