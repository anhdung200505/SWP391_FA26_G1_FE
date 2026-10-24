import { useEffect, useState } from 'react';
import { getCoachTrainingHistory, saveCoachTrainingHistory } from '../../api/workoutRecommendationApi';
import { useAuth } from '../../context/AuthContext';
import { fieldClass, formatDateTime, primaryButtonClass } from './coachUi';

export default function CoachHistoryPanel({ classId, onClassIdChange }) {
  const { user } = useAuth();
  const coachUserId = user?.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [memberUserId, setMemberUserId] = useState('');
  const [content, setContent] = useState('');
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
  const selectedMember =
    members.find((item) => String(item.memberUserId) === String(memberUserId)) || members[0] || null;
  const histories = (data?.histories || []).filter(
    (item) => !selectedClass || String(item.classId) === String(selectedClass.classId),
  );

  const submit = async () => {
    const trimmed = content.trim();
    if (!selectedClass || !selectedMember) {
      setFormError('Chọn lớp và học viên.');
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

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2" aria-busy="true" aria-label="Đang tải lịch sử tập">
        <div className="h-72 rounded-3xl bg-gray-200" />
        <div className="h-72 rounded-3xl bg-gray-200" />
      </div>
    );
  }

  if (loadError && !data) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-[#b1131a]">{loadError}</p>
        <button type="button" onClick={() => reload().finally(() => setLoading(false))} className={`${primaryButtonClass} mt-4`}>
          Tải lại
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-black">Ghi buổi tập</h2>
        <p className="mt-1 text-sm text-gray-500">
          Nội dung này được dùng khi sinh bài ở tab AI. Không lấy điểm danh, nhận xét hay điểm.
        </p>
        {!data?.classes?.length ? (
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              Bạn chưa được phân công lớp nào. Khi quản trị gán lớp, hãy tải lại để ghi lịch sử tập.
            </p>
            <button type="button" onClick={() => reload()} className={`${primaryButtonClass} mt-4`}>
              Tải lại danh sách lớp
            </button>
          </div>
        ) : (
          <>
            <label className="mt-4 block text-sm font-bold text-gray-700">
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
            <label className="mt-4 block text-sm font-bold text-gray-700">
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
            <label className="mt-4 block text-sm font-bold text-gray-700">
              Nội dung đã tập
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={5}
                className={fieldClass}
                placeholder="Ví dụ: Bơi ếch 4x25m, nhịp thở còn gấp. Cần bài thở trên cạn 10 phút trước giờ xuống nước."
              />
            </label>
            {formError && <p className="mt-3 text-sm font-semibold text-[#b1131a]">{formError}</p>}
            {notice && <p className="mt-3 text-sm font-semibold text-emerald-800">{notice}</p>}
            <button
              type="button"
              disabled={saving || !members.length}
              onClick={submit}
              className={`${primaryButtonClass} mt-4`}
            >
              {saving ? 'Đang lưu...' : 'Lưu lịch sử tập'}
            </button>
          </>
        )}
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-black">Đã ghi</h2>
        {histories.length ? (
          <ul className="mt-4 space-y-3">
            {histories.map((item) => (
              <li key={item.id} className="rounded-2xl border border-gray-200 px-4 py-3">
                <p className="font-black text-gray-900">{item.memberName}</p>
                <p className="mt-1 text-xs font-bold text-gray-500">
                  {item.courseName}
                  <span className="mx-1">·</span>
                  <span className="tabular-nums">{formatDateTime(item.recordedAt)}</span>
                </p>
                <p className="mt-2 text-sm whitespace-pre-line text-gray-700">{item.content}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-gray-600">Chưa có lịch sử tập cho lớp này.</p>
        )}
      </section>
    </div>
  );
}
