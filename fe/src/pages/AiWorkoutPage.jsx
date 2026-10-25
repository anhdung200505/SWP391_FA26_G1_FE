import { useEffect, useState } from 'react';
import {
  decideWorkout,
  getWorkoutAccess,
  getWorkoutRoutine,
  regenerateWorkout,
  saveBodyMetrics,
  submitWorkoutGoals,
} from '../api/workoutRecommendationApi';
import WorkoutPlanView from '../components/ai/WorkoutPlanView';
import { FlowTrail } from '../components/management/ManagementBits';
import WorkspaceShell from '../components/workspace/WorkspaceShell';
import NotificationBell from '../components/NotificationBell';
import { studentWorkspaceItems, useHasClassRegistration } from '../components/workspace/studentNav';
import { useAuth } from '../context/AuthContext';

const AI_STEPS = ['Chỉ số BMI', 'Mục tiêu', 'Giáo án AI', 'Lịch tập'];

const fieldClass =
  'mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium outline-none ring-[#e31b23] focus:ring-2';
const primaryButtonClass =
  'rounded-xl bg-[#e31b23] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300';
const secondaryButtonClass = 'rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-800';

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

function quotaNotice(message) {
  const text = String(message || '').trim();
  const index = text.indexOf('Còn ');
  return index > 0 ? text.slice(index) : text;
}

async function readMemberWorkout(memberUserId) {
  const accessData = await getWorkoutAccess(memberUserId);
  const routineData =
    accessData.nextStep === 'view_routine' ? await getWorkoutRoutine(memberUserId) : null;
  return { accessData, routineData };
}

function ActionError({ children }) {
  if (!children) return null;
  return <p className="mt-3 text-sm font-semibold text-[#b1131a]">{children}</p>;
}

function ExerciseList({ title, items }) {
  if (!items?.length) return null;
  return (
    <section className="mt-4">
      <h3 className="text-sm font-black text-gray-900">{title}</h3>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl border border-gray-200 px-4 py-3">
            <p className="font-bold text-gray-900">{item.title}</p>
            <p className="mt-1 text-xs font-bold text-gray-500 tabular-nums">
              {formatDate(item.date)} · {formatClock(item.startTime)}–{formatClock(item.endTime)}
            </p>
            <p className="mt-2 text-sm text-pretty whitespace-pre-line text-gray-600">{item.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function AiWorkoutPage() {
  const hasClass = useHasClassRegistration();
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
  const [changes, setChanges] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [regenerateNote, setRegenerateNote] = useState('');
  const [bodyError, setBodyError] = useState('');
  const [goalError, setGoalError] = useState('');
  const [decisionError, setDecisionError] = useState('');
  const [regenerateError, setRegenerateError] = useState('');

  useEffect(() => {
    document.title = 'Giáo án AI · AnhDuy Sport';
  }, []);

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
        setNotice(quotaNotice(result.message));
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
    if (sessions < 2 || sessions > 6 || minutes < 20 || minutes > 90) {
      setGoalError('Số buổi mỗi tuần từ 2 đến 6, mỗi buổi từ 20 đến 90 phút.');
      return;
    }
    setGoalError('');
    run('goals', async () => {
      try {
        const result = await submitWorkoutGoals(memberUserId, {
          goal: trimmedGoal,
          sessionsPerWeek: sessions,
          sessionMinutes: minutes,
        });
        setNotice(quotaNotice(result.message));
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
      setDecisionError('Chưa có giáo án để xác nhận.');
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
        setNotice([quotaNotice(result.message), calendarNote].filter(Boolean).join(' '));
        setShowEdit(false);
        setChanges('');
        await reload();
      } catch (error) {
        setDecisionError(error.message);
      }
    });
  };

  const submitRegenerate = () => {
    const trimmed = regenerateNote.trim();
    if (!trimmed) {
      setRegenerateError('Nhập lý do muốn tạo lại giáo án.');
      return;
    }
    setRegenerateError('');
    run('regenerate', async () => {
      try {
        const result = await regenerateWorkout(memberUserId, { changes: trimmed });
        setNotice(quotaNotice(result.message));
        setRegenerateNote('');
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
    <WorkspaceShell
      role="Học viên"
      homeTo="/hoc-vien-dashboard"
      items={studentWorkspaceItems(hasClass)}
      breadcrumb={[{ label: 'Học viên', to: '/hoc-vien-dashboard' }, { label: 'Giáo án AI' }]}
      headerExtra={<NotificationBell />}
    >
        <h1 className="text-2xl font-black text-balance">Giáo án tập với AI</h1>
        <p className="mt-2 text-sm text-pretty text-gray-500">
          Nhập chỉ số cơ thể và mục tiêu. Hệ thống dùng lịch sử tập huấn luyện viên đã ghi để lập giáo án, rồi đồng bộ vào lịch cá nhân khi bạn lưu.
        </p>

        {notice && (
          <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            {notice}
          </p>
        )}

        {loading && (
          <div className="mt-6 space-y-3" aria-busy="true" aria-label="Đang tải giáo án">
            <div className="h-8 w-64 rounded-full bg-gray-200" />
            <div className="h-44 rounded-3xl bg-gray-200" />
          </div>
        )}

        {!loading && loadError && !access && (
          <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-5">
            <p className="text-sm font-semibold text-[#b1131a]">{loadError}</p>
            <button type="button" onClick={() => reload()} className={`${primaryButtonClass} mt-4`}>
              Tải lại
            </button>
          </div>
        )}

        {!loading && access && (
          <div className="mt-6 space-y-5">
            <FlowTrail step={stepIndex(nextStep)} steps={AI_STEPS} />
            <p className="text-sm text-pretty text-gray-600">{stepHint(nextStep)}</p>

            {body && !showBodyForm && (
              <section className="rounded-3xl border border-gray-200 bg-white p-5">
                <h2 className="text-lg font-black text-balance">Chỉ số gần nhất</h2>
                <p className="mt-2 text-sm font-bold text-gray-800 tabular-nums">
                  {body.heightCm} cm · {body.weightKg} kg · BMI {body.bmi} ({body.bmiCategory})
                </p>
                <button type="button" onClick={() => setEditingBody(true)} className={`${secondaryButtonClass} mt-4`}>
                  Cập nhật chỉ số
                </button>
              </section>
            )}

            {showBodyForm && (
              <section className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6">
                <h2 className="text-lg font-black text-balance">Nhập chiều cao và cân nặng</h2>
                <p className="mt-2 text-sm text-pretty text-gray-600">
                  Hệ thống tính BMI từ hai số này.
                  {access.proposedPlan ? ' Lưu chỉ số mới sẽ xóa giáo án đang chờ xác nhận.' : ''}
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-bold text-gray-700">
                    Chiều cao (cm)
                    <input
                      value={heightCm}
                      onChange={(event) => setHeightCm(event.target.value)}
                      inputMode="decimal"
                      className={fieldClass}
                      placeholder="170"
                    />
                  </label>
                  <label className="block text-sm font-bold text-gray-700">
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

            {nextStep === 'input_goals' && (
              <section className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6">
                <h2 className="text-lg font-black text-balance">Nhập mục tiêu cá nhân</h2>
                <p className="mt-2 text-sm text-pretty text-gray-600">
                  Huấn luyện viên phụ trách lớp cần ghi lịch sử tập trước. Nếu chưa có, hệ thống sẽ báo ngay tại đây.
                </p>
                <label className="mt-4 block text-sm font-bold text-gray-700">
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
                  <label className="block text-sm font-bold text-gray-700">
                    Số buổi mỗi tuần
                    <select
                      value={sessionsPerWeek}
                      onChange={(event) => setSessionsPerWeek(event.target.value)}
                      className={fieldClass}
                    >
                      {[2, 3, 4, 5, 6].map((value) => (
                        <option key={value} value={value}>
                          {value} buổi
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-bold text-gray-700">
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
                <ActionError>{goalError}</ActionError>
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={submitGoals}
                  className={`${primaryButtonClass} mt-4`}
                >
                  {busy === 'goals' ? 'Đang tạo giáo án...' : 'Tạo giáo án'}
                </button>
              </section>
            )}

            {access.proposedPlan && (
              <section className="space-y-4">
                <div className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6">
                  <h2 className="text-lg font-black text-balance">Xác nhận giáo án</h2>
                  <p className="mt-2 text-sm text-pretty text-gray-600">
                    Lưu để đưa các buổi tập vào lịch cá nhân. Nếu muốn đổi, mô tả phần cần sửa rồi tạo lại.
                  </p>
                  {showEdit && (
                    <label className="mt-4 block text-sm font-bold text-gray-700">
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

            {nextStep === 'view_routine' && routine && (
              <section className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6">
                <h2 className="text-lg font-black text-balance">{routine.planName}</h2>
                <p className="mt-2 text-sm text-pretty text-gray-600">{routine.message}</p>
                {!routine.today?.length && !routine.upcoming?.length ? (
                  <p className="mt-4 text-sm text-gray-500">Chưa có buổi tập từ hôm nay trở đi. Yêu cầu tạo lại giáo án ở bên dưới.</p>
                ) : (
                  <>
                    <ExerciseList title="Hôm nay" items={routine.today} />
                    <ExerciseList title="Các buổi tiếp theo" items={routine.upcoming} />
                  </>
                )}
              </section>
            )}

            {nextStep === 'view_routine' && access.savedPlan && <WorkoutPlanView plan={access.savedPlan} />}

            {nextStep === 'view_routine' && (
              <section className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6">
                <h2 className="text-lg font-black text-balance">Tạo lại giáo án</h2>
                <p className="mt-2 text-sm text-pretty text-gray-600">
                  Nêu phần muốn đổi. Giáo án mới vẫn chờ bạn lưu trước khi thay lịch đang có.
                </p>
                <label className="mt-4 block text-sm font-bold text-gray-700">
                  Lý do tạo lại
                  <textarea
                    value={regenerateNote}
                    onChange={(event) => setRegenerateNote(event.target.value)}
                    rows={3}
                    className={fieldClass}
                    placeholder="Ví dụ: Bổ trợ môn bơi, tránh ngày có buổi học"
                  />
                </label>
                <ActionError>{regenerateError}</ActionError>
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={submitRegenerate}
                  className={`${primaryButtonClass} mt-4`}
                >
                  {busy === 'regenerate' ? 'Đang tạo lại...' : 'Yêu cầu tạo lại'}
                </button>
              </section>
            )}
          </div>
        )}
    </WorkspaceShell>
  );
}

function stepHint(nextStep) {
  if (nextStep === 'input_goals') return 'Đã có BMI. Nhập mục tiêu để hệ thống lập giáo án.';
  if (nextStep === 'decide') return 'Giáo án đang chờ bạn lưu hoặc yêu cầu chỉnh.';
  if (nextStep === 'view_routine') return 'Giáo án đã nằm trên lịch cá nhân.';
  return 'Bắt đầu bằng chiều cao và cân nặng.';
}
