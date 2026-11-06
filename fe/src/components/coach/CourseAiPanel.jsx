import { useEffect, useMemo, useState } from 'react';
import {
  discardCoursePreview,
  generateCourseAi,
  getCourseAi,
  publishCourseAi,
  regenerateCourseAi,
  saveCourseDraft,
} from '../../api/coachCourseApi';
import { fieldClass, formatDateTime, primaryButtonClass, quietButtonClass } from './coachUi';

function toEditor(plan) {
  if (!plan) return null;
  return {
    summary: plan.summary || '',
    sessions: (plan.sessions || []).map((session) => ({
      sessionId: session.sessionId,
      sessionLabel: session.sessionLabel,
      regenerated: Boolean(session.regenerated),
      exercises: (session.exercises || []).map((item) => ({ ...item })),
    })),
    exam: (plan.exam || []).map((item) => ({ ...item })),
    rubric: (plan.rubric || []).map((item) => ({ ...item })),
  };
}

function signature(plan) {
  if (!plan) return '';
  return JSON.stringify({
    summary: plan.summary || '',
    sessions: (plan.sessions || []).map((session) => ({
      sessionId: session.sessionId,
      exercises: session.exercises,
    })),
    exam: plan.exam || [],
    rubric: plan.rubric || [],
  });
}

function patchList(list, index, patch) {
  return list.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
}

function sessionChoiceLabel(session) {
  const number = session.sessionNo ? `Buổi ${session.sessionNo}` : 'Buổi học';
  const time = String(session.startTime || '').slice(0, 5);
  return `${number} · ${session.sessionDate} · ${time}`;
}

function stamp(session, clock) {
  const date = String(session.sessionDate || '').slice(0, 10);
  const time = String(clock || '00:00').slice(0, 5);
  return `${date} ${time}`;
}

function nowStamp(now) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function hasFinished(session, now) {
  if (session.status === 'cancelled') return false;
  if (session.status === 'completed') return true;
  return stamp(session, session.endTime || session.startTime) <= nowStamp(now);
}

function nextSessionId(list, now = new Date()) {
  const open = [...list]
    .filter((session) => session.status !== 'cancelled')
    .sort((left, right) => stamp(left, left.startTime).localeCompare(stamp(right, right.startTime))
      || (left.sessionNo || 0) - (right.sessionNo || 0));
  const latest = open
    .filter((session) => hasFinished(session, now))
    .sort((left, right) => stamp(right, right.endTime || right.startTime).localeCompare(stamp(left, left.endTime || left.startTime)))[0];
  if (!latest) return open[0]?.sessionId || '';
  const index = open.findIndex((session) => String(session.sessionId) === String(latest.sessionId));
  return index >= 0 && index + 1 < open.length ? open[index + 1].sessionId : '';
}

export default function CourseAiPanel({ classId, sessions = [], onOpenHistory }) {
  const [workspace, setWorkspace] = useState(null);
  const [brief, setBrief] = useState('');
  const [changes, setChanges] = useState('');
  const [editor, setEditor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const openSessions = sessions.filter((session) => session.status !== 'cancelled');
  const [sessionId, setSessionId] = useState(openSessions[0]?.sessionId || '');

  const applyWorkspace = (next) => {
    setWorkspace(next);
    setBrief(next.brief || '');
    const source = next.preview || next.draft;
    setEditor(toEditor(source));
  };

  useEffect(() => {
    const open = sessions.filter((session) => session.status !== 'cancelled');
    setSessionId(nextSessionId(open) || open[0]?.sessionId || '');
  }, [classId]);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError('');
    setNotice('');
    setChanges('');
    getCourseAi(classId)
      .then((next) => {
        if (!ignore) applyWorkspace(next);
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
  }, [classId]);

  const dirty = useMemo(() => signature(editor) !== signature(workspace?.draft), [editor, workspace]);
  const showingPreview = Boolean(workspace?.preview) && signature(editor) === signature(workspace.preview);
  const nextId = useMemo(() => nextSessionId(openSessions), [sessions]);
  const savedRows = [workspace?.preview, workspace?.draft, workspace?.published]
    .filter(Boolean)
    .flatMap((plan) => plan.sessions || [])
    .filter((session) => String(session.sessionId) === String(sessionId));
  const hasExercises = savedRows.some((session) => (session.exercises || []).length > 0);
  const regenerated = savedRows.some((session) => session.regenerated);
  const isNext = Boolean(sessionId) && String(sessionId) === String(nextId);
  const canGenerate = isNext && !regenerated;
  const canRegenerate = isNext && hasExercises;

  const run = async (label, action) => {
    setBusy(label);
    setError('');
    setNotice('');
    try {
      applyWorkspace(await action());
      return true;
    } catch (actionError) {
      setError(actionError.message);
      return false;
    } finally {
      setBusy('');
    }
  };

  const save = () => {
    if (!editor) {
      setError('Hãy sinh bài trước khi lưu.');
      return;
    }
    run('save', () =>
      saveCourseDraft(classId, {
        brief,
        summary: editor.summary,
        sessions: editor.sessions.map((session) => ({
          sessionId: session.sessionId,
          exercises: session.exercises,
        })),
        exam: editor.exam,
        rubric: editor.rubric,
      }),
    ).then((ok) => {
      if (ok) setNotice('Đã lưu nháp. Học viên chưa thấy bản này.');
    });
  };

  const updateExercise = (sessionIndex, exerciseIndex, patch) => {
    setEditor((current) => {
      if (!current) return current;
      const nextSessions = current.sessions.map((session, index) => {
        if (index !== sessionIndex) return session;
        return { ...session, exercises: patchList(session.exercises, exerciseIndex, patch) };
      });
      return { ...current, sessions: nextSessions };
    });
  };

  if (loading) return <p className="text-sm text-slate-500">Đang tải giáo án...</p>;

  const selectedIndex = editor?.sessions.findIndex((session) => String(session.sessionId) === String(sessionId)) ?? -1;
  const selectedSession = selectedIndex >= 0 ? editor.sessions[selectedIndex] : null;

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-balance text-slate-900">Giáo án và bài tập của lớp</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Chỉ buổi kế tiếp được sinh bài, dựa trên giáo trình buổi đó và đánh giá buổi vừa học xong. Buổi đã qua và các buổi xa hơn không tạo được. Sinh lại chỉ bật sau khi buổi đó đã có bài. Sau khi sinh lại, không sinh mới buổi đó nữa.
            </p>
          </div>
          <button type="button" onClick={onOpenHistory} className="cursor-pointer text-sm font-bold text-[#e31b23] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e31b23]">
            Ghi lịch sử tập
          </button>
        </div>
        <label className="mt-4 block text-sm font-bold text-slate-700">
          Buổi học
          <select value={sessionId} onChange={(event) => setSessionId(event.target.value)} className={fieldClass}>
            {openSessions.length === 0 && <option value="">Lớp chưa có buổi</option>}
            {openSessions.map((session) => (
              <option key={session.sessionId} value={session.sessionId}>
                {sessionChoiceLabel(session)}
              </option>
            ))}
          </select>
        </label>
        <textarea
          rows={4}
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
          placeholder="Mục tiêu cuối khóa, nội dung muốn dạy, những gì cần tránh."
          className={fieldClass}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={Boolean(busy) || !canGenerate}
            onClick={() => {
              if (!canGenerate) return;
              run('generate', () => generateCourseAi(classId, brief, sessionId)).then((ok) => ok && setNotice('Đã sinh bài cho buổi kế tiếp.'));
            }}
            className={primaryButtonClass}
          >
            {busy === 'generate' ? 'Đang sinh...' : 'Sinh bài buổi này'}
          </button>
          {workspace?.preview && (
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => run('discard', () => discardCoursePreview(classId)).then((ok) => ok && setNotice('Đã bỏ bản vừa sinh.'))}
              className={quietButtonClass}
            >
              Bỏ bản vừa sinh
            </button>
          )}
        </div>
        <label className="mt-4 block text-sm font-bold text-slate-700">
          Yêu cầu sửa khi sinh lại
          <textarea
            rows={2}
            value={changes}
            onChange={(event) => setChanges(event.target.value)}
            placeholder="Ví dụ: Buổi 3 nhẹ hơn, thêm một câu thi thực hành xuất phát."
            className={fieldClass}
          />
        </label>
        {!isNext && (
          <p className="mt-3 text-sm text-slate-600">Buổi này không phải buổi kế tiếp nên không sinh và không sinh lại.</p>
        )}
        {isNext && regenerated && (
          <p className="mt-3 text-sm text-slate-600">Buổi này đã sinh lại nên không bấm Sinh bài buổi này nữa.</p>
        )}
        {isNext && !hasExercises && (
          <p className="mt-3 text-sm text-slate-600">Sinh lại chỉ mở sau khi buổi này đã có bài tập.</p>
        )}
        <button
          type="button"
          disabled={Boolean(busy) || !canRegenerate}
          onClick={() => {
            if (!canRegenerate) return;
            run('regenerate', () => regenerateCourseAi(classId, brief, changes, sessionId)).then((ok) => {
              if (ok) setNotice('Đã sinh lại buổi kế tiếp. Không sinh mới buổi này nữa.');
            });
          }}
          className={`${quietButtonClass} mt-3`}
        >
          {busy === 'regenerate' ? 'Đang sinh lại...' : 'Sinh lại buổi này'}
        </button>
        {showingPreview && (
          <p className="mt-3 text-sm font-semibold text-amber-800">
            Đang xem bản vừa sinh{workspace.preview.changeNote ? `: ${workspace.preview.changeNote}` : ''}. Bản đã lưu giữ nguyên đến khi bạn bấm Lưu nháp.
          </p>
        )}
        {workspace?.published && (
          <p className="mt-2 text-sm text-slate-500">Đã phát hành lúc {formatDateTime(workspace.published.createdAt)}.</p>
        )}
        {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
        {notice && <p className="mt-3 text-sm font-semibold text-emerald-700">{notice}</p>}
      </section>

      {!editor && (
        <p className="rounded-3xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
          Chưa có bộ bài. Viết mô tả khóa, ghi lịch sử tập, rồi bấm Sinh bài.
        </p>
      )}

      {editor && (
        <section className="space-y-4">
          <label className="block rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6 text-sm font-bold text-slate-700">
            Tóm tắt
            <textarea
              rows={3}
              value={editor.summary}
              onChange={(event) => setEditor((current) => ({ ...current, summary: event.target.value }))}
              className={fieldClass}
            />
          </label>

          {!selectedSession && (
            <p className="rounded-3xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
              Buổi đang chọn chưa có bài tập.
            </p>
          )}

          {selectedSession && (
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
              <h3 className="font-black text-slate-900">{selectedSession.sessionLabel}</h3>
              <ul className="mt-3 space-y-3">
                {selectedSession.exercises.map((exercise, exerciseIndex) => (
                  <li key={`${selectedSession.sessionId}-${exerciseIndex}`} className="rounded-2xl bg-slate-100 p-3 hover:bg-slate-200">
                    <div className="grid gap-2 sm:grid-cols-[1fr_160px]">
                      <input
                        value={exercise.title}
                        onChange={(event) => updateExercise(selectedIndex, exerciseIndex, { title: event.target.value })}
                        className={fieldClass}
                        aria-label="Tên bài tập"
                      />
                      <input
                        value={exercise.dosage}
                        onChange={(event) => updateExercise(selectedIndex, exerciseIndex, { dosage: event.target.value })}
                        className={fieldClass}
                        aria-label="Liều lượng"
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={exercise.instructions}
                      onChange={(event) => updateExercise(selectedIndex, exerciseIndex, { instructions: event.target.value })}
                      className={fieldClass}
                      aria-label="Hướng dẫn"
                    />
                    <button
                      type="button"
                      className={`${quietButtonClass} mt-2 px-3 py-1.5`}
                      onClick={() =>
                        setEditor((current) => ({
                          ...current,
                          sessions: current.sessions.map((item, index) =>
                            index === selectedIndex
                              ? { ...item, exercises: item.exercises.filter((_, inner) => inner !== exerciseIndex) }
                              : item,
                          ),
                        }))
                      }
                    >
                      Xóa bài
                    </button>
                  </li>
                ))}
              </ul>
            </article>
          )}

          {editor.exam.length > 0 && (
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
              <h3 className="font-black text-slate-900">Bài thi cuối kỳ</h3>
              <p className="mt-1 text-sm text-slate-500">Đáp án chỉ coach thấy. Học viên xem đề sau khi phát hành.</p>
              <ul className="mt-3 space-y-3">
                {editor.exam.map((question, index) => (
                  <li key={`exam-${index}`} className="rounded-2xl bg-slate-100 p-3 hover:bg-slate-200">
                    <textarea
                      rows={2}
                      value={question.prompt}
                      onChange={(event) =>
                        setEditor((current) => ({ ...current, exam: patchList(current.exam, index, { prompt: event.target.value }) }))
                      }
                      className={fieldClass}
                      aria-label="Câu hỏi"
                    />
                    <textarea
                      rows={2}
                      value={question.suggestedAnswer}
                      onChange={(event) =>
                        setEditor((current) => ({
                          ...current,
                          exam: patchList(current.exam, index, { suggestedAnswer: event.target.value }),
                        }))
                      }
                      className={fieldClass}
                      aria-label="Đáp án gợi ý"
                    />
                    <label className="mt-2 block text-sm font-bold text-slate-700">
                      Điểm
                      <input
                        type="number"
                        min="0.1"
                        max="10"
                        step="0.1"
                        value={question.points}
                        onChange={(event) =>
                          setEditor((current) => ({
                            ...current,
                            exam: patchList(current.exam, index, { points: Number(event.target.value) }),
                          }))
                        }
                        className={fieldClass}
                      />
                    </label>
                  </li>
                ))}
              </ul>
            </article>
          )}

          {editor.rubric.length > 0 && (
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
              <h3 className="font-black text-slate-900">Tiêu chí chấm</h3>
              <p className="mt-1 text-sm text-slate-500">Hiện ở tab Đánh giá sau khi lưu, để coach nhập một điểm tổng.</p>
              <ul className="mt-3 space-y-3">
                {editor.rubric.map((item, index) => (
                  <li key={`rubric-${index}`} className="rounded-2xl bg-slate-100 p-3 hover:bg-slate-200">
                    <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
                      <input
                        value={item.criterion}
                        onChange={(event) =>
                          setEditor((current) => ({
                            ...current,
                            rubric: patchList(current.rubric, index, { criterion: event.target.value }),
                          }))
                        }
                        className={fieldClass}
                        aria-label="Tiêu chí"
                      />
                      <input
                        type="number"
                        min="0.1"
                        max="10"
                        step="0.1"
                        value={item.maxScore}
                        onChange={(event) =>
                          setEditor((current) => ({
                            ...current,
                            rubric: patchList(current.rubric, index, { maxScore: Number(event.target.value) }),
                          }))
                        }
                        className={fieldClass}
                        aria-label="Điểm tối đa"
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={item.guidance}
                      onChange={(event) =>
                        setEditor((current) => ({
                          ...current,
                          rubric: patchList(current.rubric, index, { guidance: event.target.value }),
                        }))
                      }
                      className={fieldClass}
                      aria-label="Hướng dẫn chấm"
                    />
                  </li>
                ))}
              </ul>
            </article>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={Boolean(busy)} onClick={save} className={primaryButtonClass}>
              {busy === 'save' ? 'Đang lưu...' : 'Lưu nháp'}
            </button>
            <button
              type="button"
              disabled={Boolean(busy) || !workspace?.draft || dirty}
              onClick={() =>
                run('publish', () => publishCourseAi(classId)).then((ok) => ok && setNotice('Đã phát hành cho học viên trong lớp.'))
              }
              className={quietButtonClass}
            >
              {busy === 'publish' ? 'Đang phát hành...' : 'Phát hành'}
            </button>
          </div>
          {dirty && workspace?.draft && (
            <p className="text-sm text-slate-600">Phát hành dùng bản đã lưu. Hãy lưu nháp trước nếu muốn phát hành bản đang sửa.</p>
          )}
          {!workspace?.draft && <p className="text-sm text-slate-600">Chưa có nháp đã lưu nên chưa phát hành được.</p>}
        </section>
      )}
    </div>
  );
}
