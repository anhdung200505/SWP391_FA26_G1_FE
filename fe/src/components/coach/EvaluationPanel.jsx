import { useEffect, useState } from 'react';
import { getEvaluations, saveEvaluation } from '../../api/coachCourseApi';
import { fieldClass, formatDateTime, primaryButtonClass } from './coachUi';

export default function EvaluationPanel({ classId }) {
  const [sheet, setSheet] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError('');
    setNotice('');
    getEvaluations(classId)
      .then((next) => {
        if (ignore) return;
        setSheet(next);
        const initial = {};
        for (const row of next.students || []) {
          initial[row.memberUserId] = { score: row.score ?? '', comment: row.comment || '' };
        }
        setDrafts(initial);
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

  const submit = async (memberUserId) => {
    const draft = drafts[memberUserId] || {};
    const score = Number(draft.score);
    if (!Number.isFinite(score) || score < 0 || score > 10) {
      setError('Điểm từ 0 đến 10.');
      return;
    }
    setSavingId(memberUserId);
    setError('');
    setNotice('');
    try {
      const next = await saveEvaluation(classId, {
        memberUserId,
        score,
        comment: draft.comment,
      });
      setSheet(next);
      setNotice('Đã lưu đánh giá.');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSavingId('');
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Đang tải đánh giá...</p>;
  if (!sheet) return <p className="text-sm font-semibold text-[#b1131a]">{error || 'Không tải được đánh giá.'}</p>;

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-3xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-black">Tiêu chí chấm</h2>
        <p className="mt-2 text-sm text-gray-500">
          {sheet.rubricSource === 'draft' && 'Từ bản nháp AI đã lưu.'}
          {sheet.rubricSource === 'published' && 'Từ bản AI đã phát hành.'}
          {!sheet.rubricSource && 'Lưu bài ở tab AI để có tiêu chí. Điểm vẫn nhập được ngay.'}
        </p>
        {sheet.rubric?.length ? (
          <ul className="mt-4 space-y-3">
            {sheet.rubric.map((item) => (
              <li key={item.criterion} className="rounded-2xl bg-[#f4f5f7] px-3 py-3">
                <p className="font-bold">
                  {item.criterion}
                  <span className="ml-2 tabular-nums text-gray-500">{item.maxScore}</span>
                </p>
                <p className="mt-1 text-sm text-gray-600">{item.guidance}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </aside>

      <section className="rounded-3xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-black">Điểm và nhận xét</h2>
        {error && <p className="mt-3 text-sm font-semibold text-[#b1131a]">{error}</p>}
        {notice && <p className="mt-3 text-sm font-semibold text-emerald-800">{notice}</p>}
        {(sheet.students || []).length === 0 && <p className="mt-4 text-sm text-gray-600">Lớp chưa có học viên.</p>}
        <ul className="mt-4 space-y-4">
          {(sheet.students || []).map((student) => {
            const draft = drafts[student.memberUserId] || { score: '', comment: '' };
            return (
              <li key={student.memberUserId} className="rounded-2xl border border-gray-200 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-black">{student.memberName}</p>
                  {student.evaluatedAt && (
                    <p className="text-xs text-gray-500">Lưu lúc {formatDateTime(student.evaluatedAt)}</p>
                  )}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[120px_1fr]">
                  <label className="text-sm font-bold text-gray-700">
                    Điểm
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={draft.score}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [student.memberUserId]: { ...draft, score: event.target.value },
                        }))
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label className="text-sm font-bold text-gray-700">
                    Nhận xét
                    <textarea
                      rows={2}
                      value={draft.comment}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [student.memberUserId]: { ...draft, comment: event.target.value },
                        }))
                      }
                      className={fieldClass}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => submit(student.memberUserId)}
                  disabled={savingId === student.memberUserId}
                  className={`${primaryButtonClass} mt-3`}
                >
                  {savingId === student.memberUserId ? 'Đang lưu...' : 'Lưu đánh giá'}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
