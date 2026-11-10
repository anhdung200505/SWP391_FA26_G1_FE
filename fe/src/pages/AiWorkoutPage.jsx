import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  decideWorkout,
  getWorkoutAccess,
  getWorkoutRoutine,
  regenerateWorkout,
  saveBodyMetrics,
  submitWorkoutGoals,
} from '../api/workoutRecommendationApi';
import ExerciseSteps from '../components/ai/ExerciseSteps';
import WorkoutPlanView from '../components/ai/WorkoutPlanView';
import { FlowTrail } from '../components/management/ManagementBits';
import { useAuth } from '../context/AuthContext';

const AI_STEPS = ['Chỉ số BMI', 'Mục tiêu', 'Gợi ý tập', 'Lịch tập'];

// Năm mức cường độ: mỗi mức AI chọn kiểu bài tập riêng.
const INTENSITIES = [
  { value: 'Rất nhẹ', hint: 'Bài hồi phục: đi bộ chậm, giãn cơ, yoga nhẹ, bài thở.' },
  { value: 'Nhẹ', hint: 'Tác động thấp: đi bộ nhanh, đạp xe nhẹ, bài thân người ít hiệp.' },
  { value: 'Trung bình', hint: 'Cân bằng sức bền và sức mạnh: tạ vừa, cardio ổn định.' },
  { value: 'Cao', hint: 'Gắng sức nhiều: HIIT vừa, tạ nặng vừa, chạy biến tốc.' },
  { value: 'Tối đa', hint: 'Gần giới hạn: HIIT cao, tạ nặng, plyometric, nghỉ rất ngắn.' },
];

function IntensityField({ value, onChange, label = 'Cường độ' }) {
  const hint = INTENSITIES.find((item) => item.value === value)?.hint;
  return (
    <label className="block text-sm font-bold text-slate-700">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass}>
        {INTENSITIES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.value}
          </option>
        ))}
      </select>
      {hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  );
}

const fieldClass =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none ring-[#e31b23] focus:ring-2';
const primaryButtonClass =
  'rounded-xl bg-[#e31b23] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300';
const secondaryButtonClass = 'rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800';

function stepIndex(nextStep) {
  if (nextStep === 'input_goals') return 1;
  if (nextStep === 'decide') return 2;
  if (nextStep === 'view_routine') return 3;
  return 0;
}

function parseDecimal(value) {
  const number = Number(String(value).trim().replace(',', '.'));
  return Number.isFinite(number) ? number : NaN;
}

function formatDate(value) {
  if (!value) return '';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  if (!year || !month || !day) return String(value);
  return `${day}/${month}/${year}`;
}

function formatClock(value) {
  if (!value) return '';
  return String(value).slice(0, 5);
}

async function readMemberWorkout(memberUserId) {
  const accessData = await getWorkoutAccess(memberUserId);
  const routineData = accessData.savedPlan
    ? await getWorkoutRoutine(memberUserId).catch(() => null)
    : null;
  return { accessData, routineData };
}

function ActionError({ children }) {
  if (!children) return null;
  return <p className="mt-3 text-sm font-semibold text-[#b1131a]">{children}</p>;
}

// Lịch các buổi tập: chọn từng buổi bằng dropdown, mỗi bài tập một dòng.
function ExerciseList({ title, items }) {
  const [picked, setPicked] = useState(0);
  if (!items?.length) return null;
  const index = Math.min(picked, items.length - 1);
  const item = items[index];
  return (
    <section className="mt-4">
      <h3 className="text-sm font-black text-slate-900">{title}</h3>
      <select
        value={index}
        onChange={(event) => setPicked(Number(event.target.value))}
        aria-label={`Chọn buổi trong ${title}`}
        className={fieldClass}
      >
        {items.map((entry, itemIndex) => (
          <option key={entry.id} value={itemIndex}>
            {formatDate(entry.date)} · {formatClock(entry.startTime)}–{formatClock(entry.endTime)} · {entry.title}
          </option>
        ))}
      </select>
      <div className="mt-2 rounded-2xl border border-slate-200 px-4 py-3">
        <p className="font-bold text-slate-900">{item.title}</p>
        <p className="mt-1 text-xs font-bold text-slate-500 tabular-nums">
          {formatDate(item.date)} · {formatClock(item.startTime)}–{formatClock(item.endTime)}
        </p>
        <ExerciseSteps text={item.detail} />
      </div>
    </section>
  );
}

export default function AiWorkoutPage({ mode = 'suggest' }) {
  const navigate = useNavigate();
  const isAdjust = mode === 'adjust';
  // Trang Lộ trình tập và trang Điều chỉnh lộ trình đều không hiện form BMI và mục tiêu.
  const isRoutine = mode === 'routine' || isAdjust;
  const { user } = useAuth();
  const memberUserId = user?.id;

  const [access, setAccess] = useState(null);
  const [routine, setRoutine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [editingBody, setEditingBody] = useState(false);
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [goal, setGoal] = useState('');
  const [sessionsPerWeek, setSessionsPerWeek] = useState('3');
  const [sessionMinutes, setSessionMinutes] = useState('45');
  const [totalSessions, setTotalSessions] = useState('12');
  const [intensity, setIntensity] = useState('Trung bình');
  const [adjust, setAdjust] = useState({ key: '', intensity: 'Trung bình', perWeek: '3', minutes: '45', total: '12', note: '' });
  const [changes, setChanges] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [bodyError, setBodyError] = useState('');
  const [goalError, setGoalError] = useState('');
  const [decisionError, setDecisionError] = useState('');
  const [regenerateError, setRegenerateError] = useState('');

  useEffect(() => {
    document.title = `${isAdjust ? 'Điều chỉnh lộ trình' : isRoutine ? 'Lộ trình tập' : 'AI gợi ý bài tập'} · AnhDuy Sport`;
  }, [isRoutine, isAdjust]);

  // Điền sẵn bảng chỉnh theo gợi ý đang có (đã lưu hoặc chờ lưu).
  useEffect(() => {
    const plan = access?.proposedPlan || access?.savedPlan;
    if (!plan) return;
    const key = `${plan.id}-${plan.revision}`;
    setAdjust((current) =>
      current.key === key
        ? current
        : {
            key,
            intensity: plan.intensityLevel || 'Trung bình',
            perWeek: String(plan.sessionsPerWeek),
            minutes: String(plan.sessionMinutes),
            total: String(plan.totalSessions || plan.sessionsPerWeek * plan.durationWeeks),
            note: '',
          },
    );
  }, [access]);

  const applySnapshot = (accessData, routineData) => {
    setAccess(accessData);
    setRoutine(routineData);
    setLoadError('');
    if (accessData.latestBody) {
      setHeightCm((current) => current || String(accessData.latestBody.heightCm));
      setWeightKg((current) => current || String(accessData.latestBody.weightKg));
    }
    if (accessData.proposedPlan?.goal) {
      setGoal((current) => current || accessData.proposedPlan.goal);
    }
  };

  const reload = async () => {
    try {
      const { accessData, routineData } = await readMemberWorkout(memberUserId);
      applySnapshot(accessData, routineData);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!memberUserId) return undefined;
    let ignore = false;
    readMemberWorkout(memberUserId)
      .then(({ accessData, routineData }) => {
        if (ignore) return;
        setAccess(accessData);
        setRoutine(routineData);
        setLoadError('');
        if (accessData.latestBody) {
          setHeightCm((current) => current || String(accessData.latestBody.heightCm));
          setWeightKg((current) => current || String(accessData.latestBody.weightKg));
        }
        if (accessData.proposedPlan?.goal) {
          setGoal((current) => current || accessData.proposedPlan.goal);
        }
      })
      .catch((error) => {
        if (!ignore) setLoadError(error.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [memberUserId]);

  const run = async (key, action) => {
    if (busy) return;
    setBusy(key);
    setNotice('');
    try {
      await action();
    } finally {
      setBusy('');
    }
  };

  const submitBody = () => {
    const height = parseDecimal(heightCm);
    const weight = parseDecimal(weightKg);
    if (height < 100 || height > 250 || weight < 20 || weight > 300) {
      setBodyError('Chiều cao từ 100 đến 250 cm, cân nặng từ 20 đến 300 kg.');
      return;
    }
    setBodyError('');
    run('body', async () => {
      try {
        const result = await saveBodyMetrics(memberUserId, { heightCm: height, weightKg: weight });
        setNotice(result.message);
        setEditingBody(false);
        await reload();
      } catch (error) {
        setBodyError(error.message);
      }
    });
  };

  const submitGoals = () => {
    const trimmedGoal = goal.trim();
    const sessions = Number(sessionsPerWeek);
    const minutes = Number(sessionMinutes);
    if (!trimmedGoal) {
      setGoalError('Nhập mục tiêu cá nhân.');
      return;
    }
    const total = Number(totalSessions);
    if (!Number.isInteger(total) || total < sessions || total > sessions * 12) {
      setGoalError(`Tổng số buổi từ ${sessions} (bằng số buổi mỗi tuần) đến ${sessions * 12} (tối đa 12 tuần).`);
      return;
    }
    if (sessions < 1 || sessions > 7 || minutes < 20 || minutes > 90) {
      setGoalError('Số buổi mỗi tuần từ 1 đến 7, mỗi buổi từ 20 đến 90 phút.');
      return;
    }
    setGoalError('');
    run('goals', async () => {
      try {
        const result = await submitWorkoutGoals(memberUserId, {
          goal: trimmedGoal,
          sessionsPerWeek: sessions,
          sessionMinutes: minutes,
          totalSessions: total,
          intensity,
        });
        setNotice(result.message);
        setShowEdit(false);
        setChanges('');
        await reload();
      } catch (error) {
        setGoalError(error.message);
      }
    });
  };

  const submitDecision = (editRequired) => {
    const recommendationId = access?.proposedPlan?.id || access?.recommendationId;
    const trimmedChanges = changes.trim();
    if (!recommendationId) {
      setDecisionError('Chưa có gợi ý tập để xác nhận.');
      return;
    }
    if (editRequired && !trimmedChanges) {
      setDecisionError('Nhập nội dung cần chỉnh.');
      return;
    }
    setDecisionError('');
    run('decision', async () => {
      try {
        const result = await decideWorkout(memberUserId, recommendationId, {
          editRequired,
          changes: editRequired ? trimmedChanges : null,
        });
        const calendarNote = result.calendar?.message;
        setNotice([result.message, calendarNote].filter(Boolean).join(' '));
        setShowEdit(false);
        setChanges('');
        await reload();
      } catch (error) {
        setDecisionError(error.message);
      }
    });
  };

  const submitRegenerate = () => {
    const perWeek = Number(adjust.perWeek);
    const minutes = Number(adjust.minutes);
    const total = Number(adjust.total);
    if (!Number.isInteger(total) || total < perWeek || total > perWeek * 12) {
      setRegenerateError(`Tổng số buổi từ ${perWeek} (bằng số buổi mỗi tuần) đến ${perWeek * 12} (tối đa 12 tuần).`);
      return;
    }
    if (minutes < 20 || minutes > 90) {
      setRegenerateError('Mỗi buổi từ 20 đến 90 phút.');
      return;
    }
    setRegenerateError('');
    run('regenerate', async () => {
      try {
        const result = await regenerateWorkout(memberUserId, {
          changes: adjust.note.trim() || null,
          intensity: adjust.intensity,
          sessionsPerWeek: perWeek,
          sessionMinutes: minutes,
          totalSessions: total,
        });
        setNotice(result.message);
        // Xong thì về trang Lộ trình tập, nơi bạn lưu hoặc bỏ gợi ý mới.
        navigate('/hoc-vien/lo-trinh-tap');
        await reload();
      } catch (error) {
        setRegenerateError(error.message);
      }
    });
  };

  const nextStep = access?.nextStep;
  const showBodyForm = nextStep === 'input_body' || editingBody;
  const body = access?.latestBody;

  return (
    <>
        <h1 className="text-2xl font-black text-balance">{isAdjust ? 'Điều chỉnh lộ trình' : isRoutine ? 'Lộ trình tập' : 'AI gợi ý bài tập'}</h1>
        <p className="mt-2 max-w-2xl text-sm text-pretty text-slate-500">
          AI đề xuất lịch tập riêng theo chỉ số và mục tiêu của bạn. Đây không phải bài tập hay giáo án của lớp. Lưu xong, các buổi tập vào lịch cá nhân. Hạn mức lượt tạo lại và token lấy từ gói hội viên bạn đang dùng.
        </p>
        {access?.quota && (
          <p className="mt-3 max-w-2xl rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            Gói {access.quota.packageName}: đã dùng {access.quota.regenerationsUsed}/{access.quota.regenerationLimit} lượt tạo lại gợi ý tập
            và {Number(access.quota.tokensUsed || 0).toLocaleString('vi-VN')}/{Number(access.quota.tokenLimit || 0).toLocaleString('vi-VN')} token trong kỳ hội viên này.
          </p>
        )}

        {notice && (
          <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            {notice}
          </p>
        )}

        {loading && (
          <div className="mt-6 space-y-3" aria-busy="true" aria-label="Đang tải gợi ý tập">
            <div className="h-8 w-64 animate-pulse rounded-full bg-slate-200" />
            <div className="h-44 animate-pulse rounded-3xl bg-slate-200" />
          </div>
        )}

        {!loading && loadError && !access && (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-[#b1131a]">{loadError}</p>
            <button type="button" onClick={() => reload()} className={`${primaryButtonClass} mt-4`}>
              Tải lại
            </button>
          </div>
        )}

        {!loading && access && (
          <div className="mt-6 space-y-5">
            {!isRoutine && <FlowTrail step={stepIndex(nextStep)} steps={AI_STEPS} />}
            <p className="text-sm text-pretty text-slate-600">{stepHint(nextStep)}</p>

            {!isRoutine && body && !showBodyForm && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-black text-balance">Chỉ số gần nhất</h2>
                <p className="mt-2 text-sm font-bold text-slate-800 tabular-nums">
                  {body.heightCm} cm · {body.weightKg} kg · BMI {body.bmi} ({body.bmiCategory})
                </p>
                <button type="button" onClick={() => setEditingBody(true)} className={`${secondaryButtonClass} mt-4`}>
                  Cập nhật chỉ số
                </button>
              </section>
            )}

            {!isRoutine && showBodyForm && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
                <h2 className="text-lg font-black text-balance">Nhập chiều cao và cân nặng</h2>
                <p className="mt-2 text-sm text-pretty text-slate-600">
                  Hệ thống tính BMI từ hai số này.
                  {access.proposedPlan ? ' Lưu chỉ số mới sẽ xóa gợi ý tập đang chờ xác nhận.' : ''}
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-bold text-slate-700">
                    Chiều cao (cm)
                    <input
                      value={heightCm}
                      onChange={(event) => setHeightCm(event.target.value)}
                      inputMode="decimal"
                      className={fieldClass}
                      placeholder="170"
                    />
                  </label>
                  <label className="block text-sm font-bold text-slate-700">
                    Cân nặng (kg)
                    <input
                      value={weightKg}
                      onChange={(event) => setWeightKg(event.target.value)}
                      inputMode="decimal"
                      className={fieldClass}
                      placeholder="65"
                    />
                  </label>
                </div>
                <ActionError>{bodyError}</ActionError>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" disabled={Boolean(busy)} onClick={submitBody} className={primaryButtonClass}>
                    {busy === 'body' ? 'Đang lưu...' : 'Lưu chỉ số BMI'}
                  </button>
                  {nextStep !== 'input_body' && (
                    <button type="button" onClick={() => setEditingBody(false)} className={secondaryButtonClass}>
                      Hủy
                    </button>
                  )}
                </div>
              </section>
            )}

            {!isRoutine && nextStep === 'input_goals' && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
                <h2 className="text-lg font-black text-balance">Nhập mục tiêu cá nhân</h2>
                <p className="mt-2 text-sm text-pretty text-slate-600">
                  AI chỉ dùng chỉ số cơ thể và mục tiêu bạn nhập để đề xuất lịch tập cá nhân, không cần đăng ký lớp.
                </p>
                <label className="mt-4 block text-sm font-bold text-slate-700">
                  Mục tiêu
                  <textarea
                    value={goal}
                    onChange={(event) => setGoal(event.target.value)}
                    rows={3}
                    className={fieldClass}
                    placeholder="Ví dụ: Giảm cân, tập đều 3 buổi mỗi tuần"
                  />
                </label>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-bold text-slate-700">
                    Số buổi mỗi tuần
                    <select
                      value={sessionsPerWeek}
                      onChange={(event) => {
                        const next = event.target.value;
                        setSessionsPerWeek(next);
                        // Tổng số buổi không được nhỏ hơn số buổi mỗi tuần.
                        if (Number(totalSessions) < Number(next)) setTotalSessions(next);
                      }}
                      className={fieldClass}
                    >
                      {[1, 2, 3, 4, 5, 6, 7].map((value) => (
                        <option key={value} value={value}>
                          {value} buổi
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-bold text-slate-700">
                    Số phút mỗi buổi
                    <select
                      value={sessionMinutes}
                      onChange={(event) => setSessionMinutes(event.target.value)}
                      className={fieldClass}
                    >
                      {[20, 30, 45, 60, 75, 90].map((value) => (
                        <option key={value} value={value}>
                          {value} phút
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-4">
                  <IntensityField value={intensity} onChange={setIntensity} />
                </div>
                <label className="mt-4 block text-sm font-bold text-slate-700">
                  Tổng số buổi
                  <input
                    type="number"
                    min={Number(sessionsPerWeek) || 1}
                    max={(Number(sessionsPerWeek) || 1) * 12}
                    value={totalSessions}
                    onChange={(event) => setTotalSessions(event.target.value)}
                    className={fieldClass}
                  />
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    Tổng số buổi tập của cả lịch, tối đa 12 tuần (khoảng {Math.ceil((Number(totalSessions) || 0) / (Number(sessionsPerWeek) || 1))} tuần với số buổi mỗi tuần đã chọn).
                  </span>
                </label>
                <ActionError>{goalError}</ActionError>
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={submitGoals}
                  className={`${primaryButtonClass} mt-4`}
                >
                  {busy === 'goals' ? 'Đang tạo gợi ý...' : 'Tạo gợi ý tập'}
                </button>
              </section>
            )}

            {access.proposedPlan && (
              <section className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
                  <h2 className="text-lg font-black text-balance">Xác nhận gợi ý tập</h2>
                  <p className="mt-2 text-sm text-pretty text-slate-600">
                    Lưu để đưa các buổi tập vào lịch cá nhân. Nếu muốn đổi, mô tả phần cần sửa rồi tạo lại.
                  </p>
                  {showEdit && (
                    <label className="mt-4 block text-sm font-bold text-slate-700">
                      Nội dung cần chỉnh
                      <textarea
                        value={changes}
                        onChange={(event) => setChanges(event.target.value)}
                        rows={3}
                        className={fieldClass}
                        placeholder="Ví dụ: Tập nhẹ hơn vào buổi sáng và bớt 1 buổi"
                      />
                    </label>
                  )}
                  <ActionError>{decisionError}</ActionError>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => submitDecision(false)}
                      className={primaryButtonClass}
                    >
                      {busy === 'decision' && !showEdit ? 'Đang lưu...' : 'Lưu và đồng bộ lịch'}
                    </button>
                    {showEdit ? (
                      <button
                        type="button"
                        disabled={Boolean(busy)}
                        onClick={() => submitDecision(true)}
                        className={secondaryButtonClass}
                      >
                        {busy === 'decision' ? 'Đang tạo lại...' : 'Tạo lại theo yêu cầu'}
                      </button>
                    ) : (
                      <button type="button" onClick={() => setShowEdit(true)} className={secondaryButtonClass}>
                        Tôi muốn sửa
                      </button>
                    )}
                  </div>
                </div>
                <WorkoutPlanView plan={access.proposedPlan} />
              </section>
            )}

            {!isRoutine && nextStep === 'view_routine' && access.savedPlan && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
                <h2 className="text-lg font-black text-balance">Bạn đã có lộ trình tập</h2>
                <p className="mt-2 text-sm text-pretty text-slate-600">
                  Gợi ý đã lưu nằm ở tab Lộ trình tập. Ở đó bạn xem lịch từng buổi và chỉnh cường độ, số buổi, thời gian tập.
                </p>
                <Link to="/hoc-vien/lo-trinh-tap" className={`${primaryButtonClass} mt-4 inline-block`}>
                  Xem lộ trình tập
                </Link>
              </section>
            )}

            {isRoutine && !access.savedPlan && !access.proposedPlan && (
              <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-5 sm:p-6">
                <h2 className="text-lg font-black text-balance">Chưa có lộ trình tập</h2>
                <p className="mt-2 text-sm text-pretty text-slate-600">
                  Lộ trình xuất hiện sau khi bạn lưu một gợi ý bài tập bằng AI.
                </p>
                <Link to="/hoc-vien/giao-an-ai" className={`${primaryButtonClass} mt-4 inline-block`}>
                  Tạo gợi ý bài tập
                </Link>
              </section>
            )}

            {mode === 'routine' && routine && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="text-lg font-black text-balance">{routine.planName}</h2>
                  <Link to="/hoc-vien/lo-trinh-tap/dieu-chinh" className={primaryButtonClass}>
                    Điều chỉnh lộ trình
                  </Link>
                </div>
                <p className="mt-2 text-sm text-pretty text-slate-600">{routine.message}</p>
                {!routine.today?.length && !routine.upcoming?.length ? (
                  <p className="mt-4 text-sm text-slate-500">Chưa có buổi tập từ hôm nay trở đi. Chỉnh lộ trình ở bên dưới để tạo lại.</p>
                ) : (
                  <>
                    <ExerciseList title="Hôm nay" items={routine.today} />
                    <ExerciseList title="Các buổi tiếp theo" items={routine.upcoming} />
                  </>
                )}
              </section>
            )}

            {mode === 'routine' && access.savedPlan && <WorkoutPlanView plan={access.savedPlan} />}

            {mode === 'routine' && !routine && (access.savedPlan || access.proposedPlan) && (
              <div className="flex justify-end">
                <Link to="/hoc-vien/lo-trinh-tap/dieu-chinh" className={primaryButtonClass}>
                  Điều chỉnh lộ trình
                </Link>
              </div>
            )}

            {isAdjust && (access.savedPlan || access.proposedPlan) && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
                <h2 className="text-lg font-black text-balance">Điều chỉnh lộ trình</h2>
                <p className="mt-2 text-sm text-pretty text-slate-600">
                  Đổi cường độ (nặng hơn hoặc nhẹ hơn), số buổi và thời gian tập. AI tạo lại gợi ý mới, tính vào lượt tạo lại của gói. Gợi ý mới vẫn chờ bạn lưu trước khi thay lịch đang có.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <IntensityField value={adjust.intensity} onChange={(value) => setAdjust((current) => ({ ...current, intensity: value }))} />
                  <label className="block text-sm font-bold text-slate-700">
                    Số buổi mỗi tuần
                    <select
                      value={adjust.perWeek}
                      onChange={(event) => {
                        const next = event.target.value;
                        setAdjust((current) => ({
                          ...current,
                          perWeek: next,
                          total: Number(current.total) < Number(next) ? next : current.total,
                        }));
                      }}
                      className={fieldClass}
                    >
                      {[1, 2, 3, 4, 5, 6, 7].map((value) => (
                        <option key={value} value={value}>{value} buổi</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-bold text-slate-700">
                    Số phút mỗi buổi
                    <select
                      value={adjust.minutes}
                      onChange={(event) => setAdjust((current) => ({ ...current, minutes: event.target.value }))}
                      className={fieldClass}
                    >
                      {[20, 30, 45, 60, 75, 90].map((value) => (
                        <option key={value} value={value}>{value} phút</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-bold text-slate-700">
                    Tổng số buổi
                    <input
                      type="number"
                      min={Number(adjust.perWeek) || 1}
                      max={(Number(adjust.perWeek) || 1) * 12}
                      value={adjust.total}
                      onChange={(event) => setAdjust((current) => ({ ...current, total: event.target.value }))}
                      className={fieldClass}
                    />
                  </label>
                </div>
                <label className="mt-4 block text-sm font-bold text-slate-700">
                  Ghi chú thêm (không bắt buộc)
                  <textarea
                    value={adjust.note}
                    onChange={(event) => setAdjust((current) => ({ ...current, note: event.target.value }))}
                    rows={2}
                    className={fieldClass}
                    placeholder="Ví dụ: Tránh bài đau đầu gối, thêm bài cho vai"
                  />
                </label>
                <ActionError>{regenerateError}</ActionError>
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={submitRegenerate}
                  className={`${primaryButtonClass} mt-4`}
                >
                  {busy === 'regenerate' ? 'AI đang tạo lại...' : 'Tạo lại lộ trình bằng AI'}
                </button>
                <Link to="/hoc-vien/lo-trinh-tap" className={`${secondaryButtonClass} ml-3 mt-4 inline-block`}>
                  Quay lại lộ trình
                </Link>
              </section>
            )}
          </div>
        )}
    </>
  );
}

function stepHint(nextStep) {
  if (nextStep === 'input_goals') return 'Đã có BMI. Nhập mục tiêu để nhận gợi ý tập.';
  if (nextStep === 'decide') return 'Gợi ý tập đang chờ bạn lưu hoặc yêu cầu chỉnh.';
  if (nextStep === 'view_routine') return 'Gợi ý tập đã nằm trên lịch cá nhân.';
  return 'Bắt đầu bằng chiều cao và cân nặng.';
}
