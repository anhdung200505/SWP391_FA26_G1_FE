import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { checkInMember, checkOutMember, getCenterCheckIns, voidCheckIn } from '../../api/receptionClassRegistrationApi';

const STATUS = {
  inside: { label: 'Đang ở trong', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  left: { label: 'Đã ra', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  auto_closed: { label: 'Không có giờ ra', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  voided: { label: 'Đã hoàn tác', className: 'bg-red-50 text-red-600 border-red-200' },
};

const OUTCOME_STYLE = {
  checked_in: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  already_inside: 'border-amber-200 bg-amber-50 text-amber-800',
  duplicate: 'border-sky-200 bg-sky-50 text-sky-800',
};

const pad = (value) => String(value).padStart(2, '0');
const toIso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const formatTime = (value) => (value ? new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—');
// Gói nhận kèm lớp được lưu tên "... (tặng kèm lớp)"; chỉ hiện tên hạng.
const planTitle = (name) => (name ? String(name).replace(/\s*\(tặng kèm lớp\)\s*$/i, '') : '—');
const formatDay = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—');

const filters = [
  { id: '', label: 'Tất cả lượt' },
  { id: 'inside', label: 'Đang ở trong' },
  { id: 'voided', label: 'Đã hoàn tác' },
];

// Check-in vào trung tâm do lễ tân thao tác tay: chỉ cần gói hội viên còn hạn, không gắn lớp học.
export default function ReceptionCheckIn() {
  const { user } = useAuth();
  const isAdmin = (user?.roleId || user?.role) === 'ADMIN';
  const today = toIso(new Date());

  const [keyword, setKeyword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const [date, setDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [list, setList] = useState(null);
  const [listError, setListError] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [voiding, setVoiding] = useState(null);

  const [reloadKey, setReloadKey] = useState(0);
  const load = useCallback(() => setReloadKey((key) => key + 1), []);

  // Gõ tìm kiếm chờ 300ms mới gọi API, và bỏ qua kết quả của yêu cầu cũ nếu đã có yêu cầu mới hơn.
  useEffect(() => {
    let ignore = false;
    const timer = setTimeout(
      () => {
        getCenterCheckIns({ date, q: search, status: statusFilter })
          .then((data) => {
            if (ignore) return;
            setList(data);
            setListError('');
          })
          .catch((err) => {
            if (!ignore) setListError(err.message || 'Không tải được danh sách check-in.');
          })
          .finally(() => {
            if (!ignore) setLoadingList(false);
          });
      },
      search ? 300 : 0,
    );
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [date, search, statusFilter, reloadKey]);

  const submit = async (event) => {
    event.preventDefault();
    const value = keyword.trim();
    if (!value) {
      setError('Nhập mã học viên, email hoặc số điện thoại.');
      setResult(null);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      setResult(await checkInMember(value));
      setKeyword('');
      load();
    } catch (err) {
      setResult(null);
      setError(err.message || 'Không check-in được học viên.');
    } finally {
      setSubmitting(false);
    }
  };

  const checkOut = async (id) => {
    setError('');
    try {
      const next = await checkOutMember(id);
      setResult((current) => (current && current.checkIn.id === id ? { ...current, checkIn: next, message: `Đã check-out ${next.fullName} lúc ${formatTime(next.checkOutAt)}.` } : current));
      load();
    } catch (err) {
      setError(err.message || 'Không check-out được.');
    }
  };

  const afterVoid = (next) => {
    setVoiding(null);
    setResult((current) => (current && current.checkIn.id === next.id ? null : current));
    load();
  };

  const summary = list?.summary;

  return (
    <section className="mt-6 space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <h2 className="text-xl font-black text-balance">Check-in trung tâm</h2>
        <p className="mt-2 text-sm text-pretty text-slate-500">
          Nhập mã học viên, email hoặc số điện thoại. Chỉ cần gói hội viên còn hạn, không cần có lớp. Học viên có thể vào nhiều lần trong ngày.
        </p>
        <form onSubmit={submit} className="mt-5 flex gap-2">
          <label className="sr-only" htmlFor="reception-checkin">
            Mã học viên, email hoặc số điện thoại
          </label>
          <input
            id="reception-checkin"
            type="text"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Mã học viên, email hoặc số điện thoại"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#e31b23]"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[#e31b23] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? 'Đang check-in...' : 'Check-in'}
          </button>
        </form>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>
        )}

        {result && (
          <div className={`mt-4 rounded-xl border px-4 py-4 text-sm ${OUTCOME_STYLE[result.outcome] || OUTCOME_STYLE.checked_in}`}>
            <p className="font-black">{result.message}</p>
            <dl className="mt-3 grid gap-2 text-slate-700 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase text-slate-500">Học viên</dt>
                <dd className="font-semibold">{result.checkIn.fullName}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-slate-500">Điện thoại</dt>
                <dd className="font-semibold">{result.checkIn.phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-slate-500">Gói hội viên</dt>
                <dd className="font-semibold">
                  {planTitle(result.checkIn.membershipName)}
                  {result.checkIn.membershipEndDate && ` · hết hạn ${formatDay(result.checkIn.membershipEndDate)}`}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-slate-500">Giờ vào / ra</dt>
                <dd className="font-semibold">
                  {formatTime(result.checkIn.checkInAt)} → {result.checkIn.checkOutAt ? formatTime(result.checkIn.checkOutAt) : 'chưa ra'}
                </dd>
              </div>
            </dl>
            {result.checkIn.status === 'inside' && (
              <button
                type="button"
                onClick={() => checkOut(result.checkIn.id)}
                className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-[#e31b23] cursor-pointer"
              >
                Check-out học viên này
              </button>
            )}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-lg font-black">Danh sách check-in</h3>
            <p className="mt-1 text-xs text-slate-500">Lượt hôm trước quên check-out hiện "Không có giờ ra" (tự đóng lúc 00:00).</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={date}
              max={today}
              onChange={(event) => {
                setLoadingList(true);
                setDate(event.target.value || today);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold outline-none focus:border-[#e31b23]"
            />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm tên, mã, email, SĐT"
              className="w-48 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#e31b23]"
            />
            <button
              type="button"
              onClick={() => {
                setLoadingList(true);
                load();
              }}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-[#e31b23] cursor-pointer"
            >
              Làm mới
            </button>
          </div>
        </div>

        {summary && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Tổng lượt', summary.total],
              ['Học viên khác nhau', summary.uniqueMembers],
              ['Đang ở trong', summary.inside],
              ['Đã hoàn tác', summary.voided],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          {filters.map((item) => (
            <button
              key={item.id || 'all'}
              type="button"
              onClick={() => {
                setLoadingList(true);
                setStatusFilter(item.id);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-bold cursor-pointer ${
                statusFilter === item.id ? 'bg-[#12141d] text-white' : 'bg-[#f4f5f7] text-slate-600'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {listError && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{listError}</p>}

        {loadingList ? (
          <p className="mt-6 text-center text-sm text-slate-500">Đang tải danh sách...</p>
        ) : !list || list.items.length === 0 ? (
          <p className="mt-6 text-center text-sm text-slate-500">Không có lượt check-in nào.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                  <th className="py-2 pr-3">Học viên</th>
                  <th className="py-2 pr-3">Gói hội viên</th>
                  <th className="py-2 pr-3">Giờ vào</th>
                  <th className="py-2 pr-3">Giờ ra</th>
                  <th className="py-2 pr-3">Trạng thái</th>
                  <th className="py-2 pr-3">Người check-in</th>
                  <th className="py-2 text-right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {list.items.map((item) => {
                  const status = STATUS[item.status] || STATUS.left;
                  const canVoid = item.status !== 'voided' && (isAdmin || date === today);
                  return (
                    <tr key={item.id}>
                      <td className="py-3 pr-3">
                        <p className="font-bold text-slate-900">{item.fullName}</p>
                        <p className="text-xs text-slate-500">{item.phone || item.email || `#${item.memberUserId}`}</p>
                      </td>
                      <td className="py-3 pr-3">
                        {planTitle(item.membershipName)}
                        {item.membershipEndDate && <p className="text-xs text-slate-500">đến {formatDay(item.membershipEndDate)}</p>}
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">{formatTime(item.checkInAt)}</td>
                      <td className="py-3 pr-3 whitespace-nowrap">{item.checkOutAt ? formatTime(item.checkOutAt) : '—'}</td>
                      <td className="py-3 pr-3">
                        <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-black ${status.className}`}>
                          {status.label}
                        </span>
                        {item.status === 'voided' && item.voidReason && <p className="mt-1 max-w-[200px] text-xs text-slate-500">{item.voidReason}</p>}
                      </td>
                      <td className="py-3 pr-3">{item.checkedInBy || '—'}</td>
                      <td className="py-3 text-right whitespace-nowrap">
                        {item.status === 'inside' && (
                          <button
                            type="button"
                            onClick={() => checkOut(item.id)}
                            className="mr-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-[#e31b23] cursor-pointer"
                          >
                            Check-out
                          </button>
                        )}
                        {canVoid && (
                          <button
                            type="button"
                            onClick={() => setVoiding(item)}
                            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-[#e31b23] hover:bg-red-50 cursor-pointer"
                          >
                            Hoàn tác
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
      </div>

      {voiding && <VoidDialog item={voiding} onClose={() => setVoiding(null)} onDone={afterVoid} />}
    </section>
  );
}

function VoidDialog({ item, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!reason.trim()) {
      setError('Nhập lý do hoàn tác.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      onDone(await voidCheckIn(item.id, reason.trim()));
    } catch (err) {
      setError(err.message || 'Hoàn tác thất bại.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
        <div>
          <h3 className="text-lg font-black">Hoàn tác check-in</h3>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {item.fullName} · vào lúc {formatTime(item.checkInAt)}
          </p>
        </div>
        <label className="block text-xs font-extrabold uppercase text-slate-500">
          Lý do (bắt buộc)
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="VD: Check-in nhầm người"
            className="mt-1.5 w-full resize-none rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium normal-case outline-none focus:border-[#e31b23]"
          />
        </label>
        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200 cursor-pointer">
            Không hoàn tác
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#e31b23] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Đang hoàn tác...' : 'Xác nhận hoàn tác'}
          </button>
        </div>
      </form>
    </div>
  );
}
