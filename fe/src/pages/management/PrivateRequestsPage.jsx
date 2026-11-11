import { useCallback, useEffect, useState } from 'react';
import ManagementShell from '../../components/management/ManagementShell';
import { PrivateStatusBadge } from '../../components/private/privateUi';
import { clock, formatDate, formatDateTime, scheduleText } from '../../components/private/privateFormat';
import {
  approvePrivateRequest,
  getPrivateRequestDetail,
  getPrivateRequests,
  rejectPrivateRequest,
} from '../../api/managementApi';
import { formatFee } from '../../data/accountManagement';

const FILTERS = [
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'approved', label: 'Chờ thanh toán' },
  { key: 'paid', label: 'Đã thanh toán' },
  { key: 'rejected', label: 'Từ chối' },
  { key: 'cancelled', label: 'Đã hủy' },
  { key: 'expired', label: 'Hết hạn' },
];

const EMPTY = {
  pending: 'Không có yêu cầu nào đang chờ duyệt.',
  approved: 'Không có yêu cầu nào đang chờ thanh toán.',
  paid: 'Chưa có yêu cầu nào đã thanh toán.',
  rejected: 'Chưa có yêu cầu nào bị từ chối.',
  cancelled: 'Chưa có yêu cầu nào bị hủy.',
  expired: 'Chưa có yêu cầu nào hết hạn thanh toán.',
};

const WEEKDAYS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

// "yyyy-MM-dd" -> Date theo giờ máy (tránh lệch múi giờ khi new Date(chuỗi)).
function parseDay(value) {
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

const shortDay = (date) => `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;

// Gom các buổi dự kiến theo tuần lịch (thứ 2 đến chủ nhật): mỗi tuần một dòng, kèm khoảng ngày của tuần.
function groupSessionsByWeek(sessions) {
  const weeks = new Map();
  [...sessions]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || a.no - b.no)
    .forEach((session) => {
      const day = parseDay(session.date);
      const monday = new Date(day);
      monday.setDate(day.getDate() - ((day.getDay() + 6) % 7));
      const key = `${monday.getFullYear()}-${monday.getMonth()}-${monday.getDate()}`;
      if (!weeks.has(key)) {
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        weeks.set(key, { range: `${shortDay(monday)} – ${shortDay(sunday)}`, sessions: [] });
      }
      weeks.get(key).sessions.push({ ...session, weekday: WEEKDAYS[day.getDay()] });
    });
  return [...weeks.values()].map((week, index) => ({ ...week, number: index + 1 }));
}

export default function PrivateRequestsPage() {
  const [status, setStatus] = useState('pending');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (nextStatus) => {
    setLoading(true);
    setError('');
    try {
      const data = await getPrivateRequests(nextStatus);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Không tải được yêu cầu học 1-1.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Yêu cầu 1-1 · AnhDuy Sport';
  }, []);

  useEffect(() => {
    load(status);
  }, [status, load]);

  const open = async (item) => {
    setSelected(item);
    setDetail(null);
    setDetailError('');
    setRejecting(false);
    setReason('');
    try {
      setDetail(await getPrivateRequestDetail(item.id));
    } catch (err) {
      setDetailError(err.message || 'Không tải được chi tiết yêu cầu.');
    }
  };

  const close = () => {
    if (submitting) return;
    setSelected(null);
    setDetail(null);
  };

  const decide = async (action) => {
    setSubmitting(true);
    setDetailError('');
    try {
      if (action === 'approve') {
        await approvePrivateRequest(selected.id);
        setNotice(`Đã duyệt yêu cầu của ${selected.memberName}. Học viên và HLV đã nhận thông báo, học viên có 24 giờ để thanh toán.`);
      } else {
        await rejectPrivateRequest(selected.id, reason.trim());
        setNotice(`Đã từ chối yêu cầu của ${selected.memberName} và gửi email kèm lý do.`);
      }
      setSelected(null);
      setDetail(null);
      await load(status);
    } catch (err) {
      setDetailError(err.message || 'Chưa lưu được quyết định.');
      try {
        setDetail(await getPrivateRequestDetail(selected.id));
      } catch {
        // Giữ chi tiết cũ
      }
    } finally {
      setSubmitting(false);
    }
  };

  const view = detail || selected;

  return (
    <ManagementShell breadcrumb={[{ label: 'Bảng điều khiển', to: '/quan-ly' }, { label: 'Yêu cầu 1-1' }]}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">Yêu cầu học 1-1</h1>
          <p className="mt-1 max-w-prose text-sm text-pretty text-slate-500">
            Học viên chọn môn, lịch tuần và huấn luyện viên. Duyệt thì hệ thống tạo lớp 1-1, gán phòng và giữ lịch 24 giờ chờ thanh toán.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(status)}
          className="self-start rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 cursor-pointer"
        >
          Làm mới
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Lọc theo trạng thái">
        {FILTERS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            role="tab"
            aria-selected={status === filter.key}
            onClick={() => setStatus(filter.key)}
            className={`rounded-full px-4 py-2 text-xs font-bold cursor-pointer ${
              status === filter.key ? 'bg-[#e31b23] text-white shadow' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      {notice && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</p>
      )}

      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {loading ? (
          <p className="px-5 py-10 text-center text-sm font-semibold text-slate-400">Đang tải yêu cầu...</p>
        ) : items.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm font-semibold text-slate-400">{EMPTY[status]}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-bold">Học viên</th>
                  <th className="px-5 py-3 font-bold">Gói và HLV</th>
                  <th className="px-5 py-3 font-bold">Lịch học</th>
                  <th className="px-5 py-3 font-bold">Trạng thái</th>
                  <th className="px-5 py-3 text-right font-bold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3 align-top">
                      <p className="font-bold text-slate-900">{item.memberName}</p>
                      <p className="text-xs text-slate-500">{item.memberPhone || 'Chưa có số điện thoại'}</p>
                      <p className="text-xs text-slate-400">Gửi {formatDateTime(item.createdAt)}</p>
                    </td>
                    <td className="px-5 py-3 align-top">
                      <p className="font-bold text-slate-800">{item.courseName}</p>
                      <p className="text-xs text-slate-500">HLV {item.coachName}</p>
                      <p className="text-xs font-bold text-emerald-600">{formatFee(item.price)}</p>
                    </td>
                    <td className="px-5 py-3 align-top text-xs text-slate-600">
                      <p className="font-semibold text-slate-800">{scheduleText(item.slots)}</p>
                      <p className="tabular-nums">
                        {item.sessionCount} buổi · {formatDate(item.firstSession)} → {formatDate(item.lastSession)}
                      </p>
                    </td>
                    <td className="px-5 py-3 align-top">
                      <PrivateStatusBadge status={item.status} />
                      {item.status === 'approved' && (
                        <p className="mt-1 text-[11px] font-semibold text-slate-500">Hạn trả {formatDateTime(item.approvalExpiresAt)}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right align-top">
                      <button
                        type="button"
                        onClick={() => open(item)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold cursor-pointer ${
                          item.status === 'pending' ? 'bg-[#e31b23] text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.status === 'pending' ? 'Xem và duyệt' : 'Xem'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[92vh] w-full max-w-3xl space-y-4 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-black uppercase text-slate-900">Yêu cầu học 1-1 của {view.memberName}</h2>
              <button type="button" onClick={close} aria-label="Đóng" className="font-bold text-slate-400 cursor-pointer">✕</button>
            </div>

            <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-xs sm:grid-cols-2">
              <p><strong>Gói:</strong> {view.courseName} ({view.sessionCount} buổi, {view.sessionMinutes} phút/buổi)</p>
              <p><strong>Học phí:</strong> {formatFee(view.price)}</p>
              <p><strong>HLV:</strong> {view.coachName}</p>
              <p><strong>Học viên:</strong> {view.memberName} · {view.memberPhone || 'chưa có SĐT'}</p>
              <p className="sm:col-span-2"><strong>Lịch tuần:</strong> {scheduleText(view.slots)}</p>
              <p className="sm:col-span-2 tabular-nums">
                <strong>Thời gian:</strong> {formatDate(view.firstSession)} → {formatDate(view.lastSession)}
              </p>
              {view.note && <p className="sm:col-span-2"><strong>Ghi chú của học viên:</strong> {view.note}</p>}
              {view.rejectReason && <p className="sm:col-span-2 text-red-700"><strong>Lý do từ chối:</strong> {view.rejectReason}</p>}
              {view.roomName && <p className="sm:col-span-2"><strong>Phòng {view.status === 'pending' ? 'sẽ gán' : 'đã gán'}:</strong> {view.roomName}</p>}
              {view.status === 'approved' && (
                <p className="sm:col-span-2"><strong>Hạn thanh toán:</strong> {formatDateTime(view.approvalExpiresAt)}</p>
              )}
            </div>

            {!detail && !detailError && <p className="text-sm font-semibold text-slate-400">Đang kiểm tra lịch HLV, phòng và học viên...</p>}

            {detail?.plannedSessions?.length > 0 && (
              <div>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <p className="text-xs font-black uppercase text-slate-500">Các buổi dự kiến</p>
                  <p className="text-xs tabular-nums text-slate-400">{detail.plannedSessions.length} buổi</p>
                </div>
                <ol className="space-y-2">
                  {groupSessionsByWeek(detail.plannedSessions).map((week) => (
                    <li key={week.number} className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-3 sm:flex-row sm:items-stretch sm:gap-3">
                      <div className="shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-white sm:w-28">
                        <p className="text-xs font-black uppercase">Tuần {week.number}</p>
                        <p className="mt-0.5 text-[11px] tabular-nums text-white/70">{week.range}</p>
                      </div>
                      <ul className="grid flex-1 grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-2">
                        {week.sessions.map((session) => (
                          <li key={session.no} className="rounded-xl bg-slate-50 px-3 py-2 text-xs tabular-nums">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-black text-slate-800">Buổi {session.no}</span>
                              <span className="font-semibold text-slate-500">
                                {clock(session.startTime)}–{clock(session.endTime)}
                              </span>
                            </div>
                            <p className="mt-0.5 font-bold text-slate-700">
                              {session.weekday}, {formatDate(session.date)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {detail?.status === 'pending' && detail.canApprove === false && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                Chưa duyệt được: {detail.blockReason}
              </p>
            )}
            {detailError && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{detailError}</p>}

            {detail?.status === 'pending' && !rejecting && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={submitting || !detail.canApprove}
                  onClick={() => decide('approve')}
                  className="rounded-xl bg-emerald-600 py-3 text-xs font-black uppercase text-white disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {submitting ? 'Đang duyệt...' : 'Duyệt và tạo lớp'}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setRejecting(true)}
                  className="rounded-xl bg-red-600 py-3 text-xs font-black uppercase text-white disabled:opacity-50 cursor-pointer"
                >
                  Từ chối
                </button>
              </div>
            )}

            {detail?.status === 'pending' && rejecting && (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Lý do từ chối (gửi email cho học viên)
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    className="mt-1 w-full resize-none rounded-xl border border-slate-300 bg-slate-50 p-3 outline-none"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={submitting || !reason.trim()}
                    onClick={() => decide('reject')}
                    className="rounded-xl bg-red-600 py-3 text-xs font-black uppercase text-white disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Đang gửi...' : 'Xác nhận từ chối'}
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setRejecting(false)}
                    className="rounded-xl bg-slate-100 py-3 text-xs font-black uppercase text-slate-700 cursor-pointer"
                  >
                    Quay lại
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </ManagementShell>
  );
}
