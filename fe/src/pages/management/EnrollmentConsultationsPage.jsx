import { useEffect, useState } from 'react';
import ManagementShell from '../../components/management/ManagementShell';
import { getManagerEnrollmentConsultations, processSupportRequestDecision } from '../../api/managementApi';

function lineOf(description, prefix) {
  const row = String(description || '')
    .split(/\r?\n/)
    .find((item) => item.startsWith(prefix));
  return row ? row.slice(prefix.length).trim() : '';
}

function transferReason(reason) {
  const marker = 'Lý do chuyển quản lý:';
  const text = String(reason || '');
  const index = text.indexOf(marker);
  return index >= 0 ? text.slice(index + marker.length).trim() : text;
}

export default function EnrollmentConsultationsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [noticeError, setNoticeError] = useState(false);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getManagerEnrollmentConsultations();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Không tải được đơn tư vấn ghi danh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Tư vấn ghi danh · AnhDuy Sport';
    load();
  }, []);

  const decide = async (decision) => {
    if (!selected || !note.trim()) return;
    setSubmitting(true);
    setNotice('');
    try {
      await processSupportRequestDecision(selected.id, { decision, note: note.trim() });
      setNoticeError(false);
      setNotice(decision === 'approved' ? 'Đã chấp nhận đơn tư vấn.' : 'Đã từ chối đơn tư vấn.');
      setSelected(null);
      setNote('');
      await load();
    } catch (err) {
      setNoticeError(true);
      setNotice(err.message || 'Chưa lưu được quyết định.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ManagementShell
      breadcrumb={[
        { label: 'Bảng điều khiển', to: '/quan-ly' },
        { label: 'Tư vấn ghi danh' },
      ]}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">Tư vấn ghi danh</h1>
          <p className="mt-1 text-sm text-slate-500">
            Đơn lễ tân đã xác nhận và chuyển lên. Chấp nhận hoặc từ chối để phản hồi khách.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="self-start rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700"
        >
          Làm mới
        </button>
      </div>

      {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      {notice && (
        <p className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${noticeError ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {notice}
        </p>
      )}

      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {loading ? (
          <p className="px-5 py-10 text-center text-sm font-semibold text-slate-400">Đang tải đơn tư vấn...</p>
        ) : requests.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm font-semibold text-slate-400">Chưa có đơn tư vấn ghi danh nào được chuyển lên.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-bold">Khách</th>
                  <th className="px-5 py-3 font-bold">Nội dung</th>
                  <th className="px-5 py-3 font-bold">Trạng thái</th>
                  <th className="px-5 py-3 text-right font-bold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((item) => {
                  const name = item.memberName || lineOf(item.description, 'Họ tên:') || 'Khách';
                  const email = item.memberEmail || lineOf(item.description, 'Email:');
                  const phone = lineOf(item.description, 'Số điện thoại:');
                  const decided = item.decision === 'approved' || item.decision === 'rejected';
                  return (
                    <tr key={item.id}>
                      <td className="px-5 py-3 align-top">
                        <p className="font-bold text-slate-900">{name}</p>
                        <p className="text-xs text-slate-500">{email || 'Chưa có email'}</p>
                        {phone && <p className="text-xs text-slate-500">{phone}</p>}
                      </td>
                      <td className="px-5 py-3 align-top">
                        <p className="font-bold text-slate-800">{item.title}</p>
                        <p className="mt-1 line-clamp-3 whitespace-pre-line text-xs text-slate-600">{item.description}</p>
                        {transferReason(item.classificationReason) && (
                          <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                            Lý do lễ tân chuyển: {transferReason(item.classificationReason)}
                          </p>
                        )}
                        {item.resolutionNote && (
                          <p className="mt-2 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                            {item.resolutionNote}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 align-top">
                        <span className={`inline-block rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${
                          item.decision === 'approved'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : item.decision === 'rejected'
                              ? 'border-red-200 bg-red-50 text-red-700'
                              : 'border-amber-200 bg-amber-50 text-amber-700'
                        }`}>
                          {item.decision === 'approved' ? 'Đã chấp nhận' : item.decision === 'rejected' ? 'Đã từ chối' : 'Chờ quyết định'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right align-top">
                        {decided ? (
                          <span className="text-xs text-slate-400">Đã xử lý</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelected(item);
                              setNote('');
                              setNotice('');
                              setNoticeError(false);
                            }}
                            className="rounded-xl bg-[#e31b23] px-3 py-1.5 text-xs font-bold text-white"
                          >
                            Ra quyết định
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-lg space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-black uppercase text-slate-900">Quyết định đơn tư vấn</h2>
              <button type="button" onClick={() => setSelected(null)} className="font-bold text-slate-400">✕</button>
            </div>
            <div className="space-y-1 rounded-2xl bg-slate-50 p-3 text-xs">
              <p><strong>Khách:</strong> {selected.memberName || lineOf(selected.description, 'Họ tên:')}</p>
              <p><strong>Tiêu đề:</strong> {selected.title}</p>
              <p className="whitespace-pre-line text-slate-600">{selected.description}</p>
            </div>
            <label className="block text-xs font-bold text-slate-700">
              Ghi chú phản hồi
              <textarea
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="mt-1 w-full resize-none rounded-xl border border-slate-300 bg-slate-50 p-3 outline-none"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={submitting || !note.trim()}
                onClick={() => decide('approved')}
                className="rounded-xl bg-emerald-600 py-3 text-xs font-black uppercase text-white disabled:opacity-50"
              >
                Chấp nhận
              </button>
              <button
                type="button"
                disabled={submitting || !note.trim()}
                onClick={() => decide('rejected')}
                className="rounded-xl bg-red-600 py-3 text-xs font-black uppercase text-white disabled:opacity-50"
              >
                Từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </ManagementShell>
  );
}
