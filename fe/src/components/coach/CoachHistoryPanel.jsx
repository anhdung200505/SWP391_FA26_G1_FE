import { useEffect, useState } from 'react';
import { getIntake, saveIntake } from '../../api/coachCourseApi';
import { getCoachTrainingHistory, saveCoachTrainingHistory } from '../../api/workoutRecommendationApi';
import { useAuth } from '../../context/AuthContext';
import { fieldClass, formatDateTime, primaryButtonClass, quietButtonClass } from './coachUi';

export default function CoachHistoryPanel({ classId, onClassIdChange }) {
  const { user } = useAuth();
  const coachUserId = user?.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [memberUserId, setMemberUserId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [content, setContent] = useState('');
  const [intake, setIntake] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [savingEvaluationId, setSavingEvaluationId] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  const reload = async () => {
    const next = await getCoachTrainingHistory(coachUserId);
    setData(next);
    setLoadError('');
    return next;
  };

  useEffect(() => {
    if (!coachUserId) return undefined;
    let ignore = false;
    setLoading(true);
    getCoachTrainingHistory(coachUserId)
      .then((next) => {
        if (ignore) return;
        setData(next);
        setLoadError('');
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
  }, [coachUserId]);

  const selectedClass =
    data?.classes?.find((item) => String(item.classId) === String(classId)) || data?.classes?.[0] || null;
  const members = selectedClass?.members || [];
  const sessions = selectedClass?.sessions || [];
  const selectedMember =
    members.find((item) => String(item.memberUserId) === String(memberUserId)) || members[0] || null;
  const selectedSession =
    sessions.find((item) => String(item.sessionId) === String(sessionId)) || sessions[0] || null;
  const histories = (data?.histories || []).filter(
    (item) => !selectedClass || String(item.classId) === String(selectedClass.classId),
  );

  useEffect(() => {
    if (!selectedClass?.classId) {
      setIntake(null);
      return undefined;
    }
    let ignore = false;
    getIntake(selectedClass.classId)
      .then((next) => {
        if (ignore) return;
        setIntake(next);
        const initial = {};
        for (const row of next.students || []) {
          initial[row.memberUserId] = row.comment || '';
        }
        setDrafts(initial);
      })
      .catch((error) => {
        if (!ignore) setFormError(error.message);
      });
    return () => {
      ignore = true;
    };
  }, [selectedClass?.classId]);

  const submit = async () => {
    const trimmed = content.trim();
    if (!selectedClass || !selectedMember || !selectedSession) {
      setFormError(selectedSession ? 'Chọn lớp và học viên.' : 'Chỉ buổi vừa học xong mới ghi được lịch sử.');
      return;
    }
    if (!trimmed) {
      setFormError('Nhập nội dung buổi tập.');
      return;
    }
    setFormError('');
    setNotice('');
    setSaving(true);
    try {
      const result = await saveCoachTrainingHistory(coachUserId, {
        memberUserId: selectedMember.memberUserId,
        classId: selectedClass.classId,
        sessionId: selectedSession.sessionId,
        content: trimmed,
      });
      setNotice(result.message || 'Đã ghi lịch sử tập.');
      setContent('');
      await reload();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const saveIntakeNote = async (memberId) => {
    const comment = String(drafts[memberId] || '').trim();
    if (!selectedClass || !intake?.canEdit) {
      setFormError(intake?.lockReason || 'Buổi đầu khóa chưa diễn ra.');
      return;
    }
    if (!comment) {
      setFormError('Nhập nhận xét đầu khóa.');
      return;
    }
    setSavingEvaluationId(memberId);
    setFormError('');
    setNotice('');
    try {
      const next = await saveIntake(selectedClass.classId, { memberUserId: memberId, comment });
      setIntake(next);
      setNotice('Đã lưu nhận xét đầu khóa.');
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSavingEvaluationId('');
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 xl:grid-cols-2" aria-busy="true" aria-label="Đang tải lịch sử tập">
        <div className="h-72 rounded-3xl bg-slate-200" />
        <div className="h-72 rounded-3xl bg-slate-200" />
      </div>
    );
  }

  if (loadError && !data) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <p className="text-sm font-semibold text-red-700">{loadError}</p>
        <button type="button" onClick={() => reload().finally(() => setLoading(false))} className={`${primaryButtonClass} mt-4`}>
          Tải lại
        </button>
      </div>
    );
  }

  const students = intake?.students || [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
          <h2 className="text-lg font-black text-balance text-slate-900">Ghi buổi tập</h2>
          <p className="mt-1 text-sm text-slate-500">
            Chỉ ghi đánh giá cho buổi vừa học xong. Buổi quá khứ xa hơn và buổi chưa diễn ra không lưu được. Nhận xét bên dưới là đánh giá đầu khóa, không có điểm.
          </p>
          {!data?.classes?.length ? (
            <div className="mt-4">
              <p className="text-sm text-slate-600">
                Bạn chưa được phân công lớp nào. Khi quản trị gán lớp, hãy tải lại để ghi lịch sử tập.
              </p>
              <button type="button" onClick={() => reload()} className={`${primaryButtonClass} mt-4`}>
                Tải lại danh sách lớp
              </button>
            </div>
          ) : (
            <>
              <label className="mt-4 block text-sm font-bold text-slate-700">
                Lớp
                <select
                  value={selectedClass ? String(selectedClass.classId) : ''}
                  onChange={(event) => onClassIdChange?.(event.target.value)}
                  className={fieldClass}
                >
                  {data.classes.map((item) => (
                    <option key={item.classId} value={item.classId}>
                      {item.courseName} · {item.className}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-4 block text-sm font-bold text-slate-700">
                Buổi vừa học xong
                <select
                  value={selectedSession ? String(selectedSession.sessionId) : ''}
                  onChange={(event) => setSessionId(event.target.value)}
                  className={fieldClass}
                  disabled={!sessions.length}
                >
                  {sessions.length === 0 && <option value="">Chưa có buổi nào vừa học xong</option>}
                  {sessions.map((item) => (
                    <option key={item.sessionId} value={item.sessionId}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-4 block text-sm font-bold text-slate-700">
                Học viên
                <select
                  value={selectedMember ? String(selectedMember.memberUserId) : ''}
                  onChange={(event) => setMemberUserId(event.target.value)}
                  className={fieldClass}
                  disabled={!members.length}
                >
                  {members.length === 0 && <option value="">Lớp chưa có học viên ghi danh</option>}
                  {members.map((item) => (
                    <option key={item.memberUserId} value={item.memberUserId}>
                      {item.memberName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-4 block text-sm font-bold text-slate-700">
                Nội dung đã tập
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  rows={5}
                  className={fieldClass}
                  placeholder="Ví dụ: Bơi ếch 4x25m, nhịp thở còn gấp. Cần bài thở trên cạn 10 phút trước giờ xuống nước."
                />
              </label>
              {formError && <p className="mt-3 text-sm font-semibold text-red-700">{formError}</p>}
              {notice && <p className="mt-3 text-sm font-semibold text-emerald-700">{notice}</p>}
              <button
                type="button"
                disabled={saving || !members.length || !sessions.length}
                onClick={submit}
                className={`${primaryButtonClass} mt-4`}
              >
                {saving ? 'Đang lưu...' : 'Lưu lịch sử tập'}
              </button>
            </>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
          <h2 className="text-lg font-black text-balance text-slate-900">Đã ghi</h2>
          {histories.length ? (
            <ul className="mt-4 space-y-3">
              {histories.map((item) => (
                <li key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <p className="font-black text-slate-900">{item.memberName}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {item.sessionLabel || 'Chưa gắn buổi'}
                    <span className="mx-1">·</span>
                    {item.courseName}
                    <span className="mx-1">·</span>
                    <span className="tabular-nums">{formatDateTime(item.recordedAt)}</span>
                  </p>
                  <p className="mt-2 text-sm whitespace-pre-line text-slate-700">{item.content}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-600">Chưa có lịch sử tập cho lớp này.</p>
          )}
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <h2 className="text-lg font-black text-balance text-slate-900">Đánh giá đầu khóa</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Nhận xét buổi đầu tiên{intake?.sessionLabel ? ` (${intake.sessionLabel})` : ''}. Không chấm điểm. Đánh giá tổng môn vẫn ở tab Đánh giá.
        </p>
        {intake?.lockReason && <p className="mt-3 text-sm text-slate-600">{intake.lockReason}</p>}
        {students.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">Lớp chưa có học viên.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500">
                  <th className="py-2 pr-3 font-medium">Học viên</th>
                  <th className="py-2 pr-3 font-medium">Nhận xét buổi đầu</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.memberUserId} className="border-b border-slate-100 last:border-b-0">
                    <td className="py-3 pr-3 font-semibold text-slate-900">{student.memberName}</td>
                    <td className="py-3 pr-3">
                      <input
                        value={drafts[student.memberUserId] || ''}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [student.memberUserId]: event.target.value,
                          }))
                        }
                        disabled={!intake?.canEdit}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 disabled:bg-slate-50"
                        aria-label={`Nhận xét đầu khóa của ${student.memberName}`}
                      />
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        disabled={!intake?.canEdit || Boolean(savingEvaluationId)}
                        onClick={() => saveIntakeNote(student.memberUserId)}
                        className={quietButtonClass}
                      >
                        {savingEvaluationId === student.memberUserId ? 'Đang lưu...' : 'Lưu'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
