import { useEffect, useState } from 'react';
import { createAssignment, deleteAssignment, getAssignments, updateAssignment } from '../../api/coachCourseApi';
import { fieldClass, formatDate, formatDateTime, formatTime, primaryButtonClass, quietButtonClass, statusLabel } from './coachUi';

const emptyForm = { sessionId: '', title: '', description: '', dueAt: '' };

export default function AssignmentPanel({ classId, sessions }) {
  const openSessions = (sessions || []).filter((session) => session.status !== 'cancelled');
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ ...emptyForm, sessionId: openSessions[0]?.sessionId || '' });
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setEditingId('');
    setForm({ ...emptyForm, sessionId: openSessions[0]?.sessionId || '' });
    getAssignments(classId)
      .then((next) => {
        if (!ignore) setItems(next || []);
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

  const submit = async () => {
    if (!form.sessionId || !form.title.trim()) {
      setError('Chọn buổi và nhập tiêu đề.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    const payload = {
      sessionId: form.sessionId,
      title: form.title.trim(),
      description: form.description.trim(),
      dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
    };
    try {
      const next = editingId
        ? await updateAssignment(classId, editingId, payload)
        : await createAssignment(classId, payload);
      setItems(next || []);
      setEditingId('');
      setForm({ ...emptyForm, sessionId: form.sessionId });
      setNotice(editingId ? 'Đã sửa bài tập.' : 'Đã thêm bài tập.');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (assignmentId) => {
    setError('');
    setNotice('');
    try {
      setItems(await deleteAssignment(classId, assignmentId));
      if (editingId === assignmentId) {
        setEditingId('');
        setForm({ ...emptyForm, sessionId: openSessions[0]?.sessionId || '' });
      }
      setNotice('Đã xóa bài tập.');
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <section className="rounded-3xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-black">Bài tập theo buổi</h2>
        {loading && <p className="mt-4 text-sm text-gray-500">Đang tải...</p>}
        {!loading && items.length === 0 && <p className="mt-4 text-sm text-gray-600">Chưa có bài tập. Thêm ở cột bên cạnh.</p>}
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.assignmentId} className="rounded-2xl border border-gray-200 px-4 py-3">
              <p className="font-black">{item.title}</p>
              <p className="mt-1 text-xs font-semibold text-gray-500">{item.sessionLabel}</p>
              {item.description && <p className="mt-2 text-sm whitespace-pre-line text-gray-700">{item.description}</p>}
              {item.dueAt && <p className="mt-2 text-xs text-gray-500">Hạn {formatDateTime(item.dueAt)}</p>}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className={quietButtonClass}
                  onClick={() => {
                    setEditingId(item.assignmentId);
                    setForm({
                      sessionId: item.sessionId,
                      title: item.title,
                      description: item.description || '',
                      dueAt: item.dueAt ? String(item.dueAt).slice(0, 16) : '',
                    });
                  }}
                >
                  Sửa
                </button>
                <button type="button" className={quietButtonClass} onClick={() => remove(item.assignmentId)}>
                  Xóa
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-black">{editingId ? 'Sửa bài tập' : 'Thêm bài tập'}</h2>
        <label className="mt-4 block text-sm font-bold text-gray-700">
          Buổi
          <select
            value={form.sessionId}
            onChange={(event) => setForm((current) => ({ ...current, sessionId: event.target.value }))}
            className={fieldClass}
          >
            {openSessions.map((session) => (
              <option key={session.sessionId} value={session.sessionId}>
                {session.sessionNo ? `Buổi ${session.sessionNo}` : 'Buổi'} · {formatDate(session.sessionDate)} {formatTime(session.startTime)} · {statusLabel(session.status)}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-sm font-bold text-gray-700">
          Tiêu đề
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            className={fieldClass}
          />
        </label>
        <label className="mt-3 block text-sm font-bold text-gray-700">
          Nội dung
          <textarea
            rows={4}
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            className={fieldClass}
          />
        </label>
        <label className="mt-3 block text-sm font-bold text-gray-700">
          Hạn nộp
          <input
            type="datetime-local"
            value={form.dueAt}
            onChange={(event) => setForm((current) => ({ ...current, dueAt: event.target.value }))}
            className={fieldClass}
          />
        </label>
        {error && <p className="mt-3 text-sm font-semibold text-[#b1131a]">{error}</p>}
        {notice && <p className="mt-3 text-sm font-semibold text-emerald-800">{notice}</p>}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={submit} disabled={saving || !openSessions.length} className={primaryButtonClass}>
            {saving ? 'Đang lưu...' : editingId ? 'Lưu sửa' : 'Thêm bài'}
          </button>
          {editingId && (
            <button
              type="button"
              className={quietButtonClass}
              onClick={() => {
                setEditingId('');
                setForm({ ...emptyForm, sessionId: openSessions[0]?.sessionId || '' });
              }}
            >
              Hủy sửa
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
