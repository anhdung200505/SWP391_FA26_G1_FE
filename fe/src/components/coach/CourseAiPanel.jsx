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

export default function CourseAiPanel({ classId, onOpenHistory }) {
  const [workspace, setWorkspace] = useState(null);
  const [brief, setBrief] = useState('');
  const [changes, setChanges] = useState('');
  const [editor, setEditor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const applyWorkspace = (next) => {
    setWorkspace(next);
    setBrief(next.brief || '');
    const source = next.preview || next.draft;
    setEditor(toEditor(source));
  };

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
      const sessions = current.sessions.map((session, index) => {
        if (index !== sessionIndex) return session;
        return { ...session, exercises: patchList(session.exercises, exerciseIndex, patch) };
      });
      return { ...current, sessions };
    });
  };

  if (loading) return <p className="text-sm text-gray-500">Đang tải tab AI...</p>;

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">Mô tả khóa</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              AI chỉ đọc mô tả này và lịch sử tập bạn đã ghi cho đúng lớp. Hiện có {workspace?.historyCount ?? 0} ghi chú.
            </p>
          </div>
          <button type="button" onClick={onOpenHistory} className="text-sm font-bold text-[#e31b23]">
            Ghi lịch sử tập
          </button>
        </div>
        <textarea
          rows={4}
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
          placeholder="Trình độ lớp, mục tiêu cuối khóa, nội dung muốn dạy, những gì cần tránh."
          className={fieldClass}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => run('generate', () => generateCourseAi(classId, brief)).then((ok) => ok && setNotice('Đã sinh bản mới. Nháp cũ vẫn giữ đến khi bạn lưu.'))}
            className={primaryButtonClass}
          >
            {busy === 'generate' ? 'Đang sinh...' : 'Sinh bài'}
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
        <label className="mt-4 block text-sm font-bold text-gray-700">
          Yêu cầu sửa khi sinh lại
          <textarea
            rows={2}
            value={changes}
            onChange={(event) => setChanges(event.target.value)}
            placeholder="Ví dụ: Buổi 3 nhẹ hơn, thêm một câu thi thực hành xuất phát."
            className={fieldClass}
          />
        </label>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() =>
            run('regenerate', () => regenerateCourseAi(classId, brief, changes)).then((ok) => {
              if (ok) setNotice('Đã sinh lại. Bản đã lưu chưa đổi.');
            })
          }
          className={`${quietButtonClass} mt-3`}
        >
          {busy === 'regenerate' ? 'Đang sinh lại...' : 'Sinh lại theo yêu cầu'}
        </button>
        {showingPreview && (
          <p className="mt-3 text-sm font-semibold text-amber-800">
            Đang xem bản vừa sinh{workspace.preview.changeNote ? `: ${workspace.preview.changeNote}` : ''}. Bản đã lưu giữ nguyên đến khi bạn bấm Lưu nháp.
          </p>
        )}
        {workspace?.published && (
          <p className="mt-2 text-sm text-gray-500">Đã phát hành lúc {formatDateTime(workspace.published.createdAt)}.</p>
        )}
        {error && <p className="mt-3 text-sm font-semibold text-[#b1131a]">{error}</p>}
        {notice && <p className="mt-3 text-sm font-semibold text-emerald-800">{notice}</p>}
      </section>

      {!editor && (
        <p className="rounded-3xl border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-600">
          Chưa có bộ bài. Viết mô tả khóa, ghi lịch sử tập, rồi bấm Sinh bài.
        </p>
      )}

      {editor && (
        <section className="space-y-4">
          <label className="block rounded-3xl border border-gray-200 bg-white p-5 text-sm font-bold text-gray-700">
            Tóm tắt
            <textarea
              rows={3}
              value={editor.summary}
              onChange={(event) => setEditor((current) => ({ ...current, summary: event.target.value }))}
              className={fieldClass}
            />
          </label>

          {editor.sessions.map((session, sessionIndex) => (
            <article key={session.sessionId} className="rounded-3xl border border-gray-200 bg-white p-5">
              <h3 className="font-black">{session.sessionLabel}</h3>
              <ul className="mt-3 space-y-3">
                {session.exercises.map((exercise, exerciseIndex) => (
                  <li key={`${session.sessionId}-${exerciseIndex}`} className="rounded-2xl bg-[#f4f5f7] p-3">
                    <div className="grid gap-2 sm:grid-cols-[1fr_160px]">
                      <input
                        value={exercise.title}
                        onChange={(event) => updateExercise(sessionIndex, exerciseIndex, { title: event.target.value })}
                        className={fieldClass}
                        aria-label="Tên bài tập"
                      />
                      <input
                        value={exercise.dosage}
                        onChange={(event) => updateExercise(sessionIndex, exerciseIndex, { dosage: event.target.value })}
                        className={fieldClass}
                        aria-label="Liều lượng"
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={exercise.instructions}
                      onChange={(event) => updateExercise(sessionIndex, exerciseIndex, { instructions: event.target.value })}
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
                            index === sessionIndex
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
          ))}

          <article className="rounded-3xl border border-gray-200 bg-white p-5">
            <h3 className="font-black">Bài thi cuối kỳ</h3>
            <p className="mt-1 text-sm text-gray-500">Đáp án chỉ coach thấy. Học viên xem đề sau khi phát hành.</p>
            <ul className="mt-3 space-y-3">
              {editor.exam.map((question, index) => (
                <li key={`exam-${index}`} className="rounded-2xl bg-[#f4f5f7] p-3">
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
                  <label className="mt-2 block text-sm font-bold text-gray-700">
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

          <article className="rounded-3xl border border-gray-200 bg-white p-5">
            <h3 className="font-black">Tiêu chí chấm</h3>
            <p className="mt-1 text-sm text-gray-500">Hiện ở tab Đánh giá sau khi lưu, để coach nhập một điểm tổng.</p>
            <ul className="mt-3 space-y-3">
              {editor.rubric.map((item, index) => (
                <li key={`rubric-${index}`} className="rounded-2xl bg-[#f4f5f7] p-3">
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
            <p className="text-sm text-gray-600">Phát hành dùng bản đã lưu. Hãy lưu nháp trước nếu muốn phát hành bản đang sửa.</p>
          )}
          {!workspace?.draft && <p className="text-sm text-gray-600">Chưa có nháp đã lưu nên chưa phát hành được.</p>}
        </section>
      )}
    </div>
  );
}
