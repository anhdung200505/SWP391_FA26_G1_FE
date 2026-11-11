import { useEffect, useState } from 'react';
import { getRevenue } from '../../api/managementApi';
import ManagementShell from '../../components/management/ManagementShell';
import { formatDateTime, formatFee } from '../../data/accountManagement';

const TABS = [
  {
    id: 'course',
    label: 'Khóa học',
    note: 'Học phí các lớp đã thanh toán. Phần lên cấp gói trong cùng đơn nằm ở tab Hội viên.',
    groupHeading: 'Theo khóa học',
    lineHeading: 'Từng khoản học phí',
    scope: 'Chỉ gồm học phí khóa học đã thanh toán. Không gồm tiền gói hội viên (xem tab Hội viên).',
    titleColumn: 'Khóa học',
    subtitleColumn: 'Lớp',
    empty: 'Chưa có học phí nào được thanh toán.',
  },
  {
    id: 'membership',
    label: 'Hội viên',
    note: 'Tiền mua, gia hạn hoặc lên cấp gói. Gói tặng kèm lớp không tính vào doanh thu.',
    groupHeading: 'Theo gói',
    lineHeading: 'Từng khoản hội viên',
    scope: 'Chỉ gồm tiền mua, gia hạn và lên cấp gói hội viên. Không gồm học phí khóa học và gói tặng kèm lớp.',
    titleColumn: 'Gói',
    subtitleColumn: 'Nguồn',
    empty: 'Chưa có khoản hội viên nào được thanh toán.',
  },
];

function paidLabel(value) {
  if (!value || String(value).startsWith('0001')) return '—';
  return formatDateTime(value);
}

export default function RevenuePage() {
  const [report, setReport] = useState(null);
  const [tab, setTab] = useState('course');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    document.title = 'Doanh thu · AnhDuy Sport';
    let ignore = false;
    getRevenue()
      .then((data) => {
        if (!ignore) setReport(data);
      })
      .catch((error) => {
        if (!ignore) setLoadError(error.message || 'Không tải được doanh thu.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const selected = TABS.find((item) => item.id === tab) || TABS[0];
  const section = report?.[selected.id];

  return (
    <ManagementShell breadcrumb={[{ label: 'Bảng điều khiển', to: '/quan-ly' }, { label: 'Doanh thu' }]}>
      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-8 sm:px-8">
        <h1 className="text-2xl font-black text-balance text-slate-900 sm:text-3xl">Doanh thu đã thu</h1>
        <p className="mt-2 max-w-prose text-sm text-pretty text-slate-500">
          Khóa học và hội viên được tính riêng. Chỉ các khoản đã thanh toán mới vào doanh thu.
        </p>
      </section>

      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Nguồn doanh thu">
        {TABS.map((item) => {
          const active = tab === item.id;
          const count = report?.[item.id]?.paymentCount;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`revenue-tab-${item.id}`}
              aria-selected={active}
              aria-controls={`revenue-panel-${item.id}`}
              onClick={() => setTab(item.id)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                active
                  ? 'bg-[#e31b23] text-white shadow'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {item.label}
              {count != null && (
                <span className={`ml-2 tabular-nums ${active ? 'text-white/80' : 'text-slate-400'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <section
        className="mt-4"
        role="tabpanel"
        id={`revenue-panel-${selected.id}`}
        aria-labelledby={`revenue-tab-${selected.id}`}
      >
        {loading && <p className="text-sm font-bold text-slate-500">Đang tải doanh thu...</p>}
        {loadError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {loadError}
          </div>
        )}
        {section && (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#e31b23]">{selected.label}</p>
              <p className="mt-2 text-3xl font-black tabular-nums text-slate-900">{formatFee(section.total)}</p>
              <p className="mt-1 text-sm text-slate-500">
                {section.paymentCount} khoản đã thanh toán. {selected.note}
              </p>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-lg font-black text-slate-900">{selected.groupHeading}</h2>
              </div>
              {section.groups.length === 0 ? (
                <p className="px-5 py-8 text-sm font-semibold text-slate-500">{selected.empty}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="px-5 py-3 font-bold">{selected.titleColumn}</th>
                        <th className="px-5 py-3 font-bold">Số khoản</th>
                        <th className="px-5 py-3 text-right font-bold">Doanh thu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {section.groups.map((group) => (
                        <tr key={group.name}>
                          <td className="px-5 py-3 font-bold text-slate-900">{group.name}</td>
                          <td className="px-5 py-3 tabular-nums text-slate-600">{group.paymentCount}</td>
                          <td className="px-5 py-3 text-right font-bold tabular-nums text-slate-900">
                            {formatFee(group.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <RevenueLines key={selected.id} selected={selected} lines={section.lines} />
          </>
        )}
      </section>
    </ManagementShell>
  );
}

const PAGE_SIZES = [10, 20, 50];
const PRESETS = [
  { id: '7', label: '7 ngày' },
  { id: '30', label: '30 ngày' },
  { id: 'month', label: 'Tháng này' },
];

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e31b23]';
const controlClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-[#e31b23] focus:ring-2 focus:ring-[#e31b23]/25';
const pagerButton = `inline-flex h-10 min-w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white ${focusRing}`;

function isoDay(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Ngày theo giờ máy (yyyy-mm-dd) để so với ô chọn ngày.
function dayKey(value) {
  if (!value || String(value).startsWith('0001')) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : isoDay(date);
}

function presetRange(id) {
  const today = new Date();
  if (id === 'month') return { from: isoDay(new Date(today.getFullYear(), today.getMonth(), 1)), to: isoDay(today) };
  const start = new Date(today);
  start.setDate(today.getDate() - (Number(id) - 1));
  return { from: isoDay(start), to: isoDay(today) };
}

// Bỏ dấu để gõ "hung" vẫn tìm ra "Hùng".
function normalize(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase();
}

// Bảng từng khoản có bộ lọc và phân trang ngay trong trình duyệt (API trả đủ dữ liệu một lần).
function RevenueLines({ selected, lines }) {
  const [query, setQuery] = useState('');
  const [title, setTitle] = useState('');
  const [method, setMethod] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [pageSize, setPageSize] = useState(PAGE_SIZES[1]);
  const [page, setPage] = useState(1);

  const titles = [...new Set(lines.map((line) => line.title).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
  const methods = [...new Set(lines.map((line) => line.method).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));

  const needle = normalize(query.trim());
  const filtered = lines.filter((line) => {
    if (title && line.title !== title) return false;
    if (method && line.method !== method) return false;
    const day = dayKey(line.paidAt);
    if (from && (!day || day < from)) return false;
    if (to && (!day || day > to)) return false;
    if (needle && !normalize(`${line.memberName} ${line.subtitle}`).includes(needle)) return false;
    return true;
  });

  const total = filtered.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);
  const filtering = Boolean(query || title || method || from || to);

  const change = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };
  const clear = () => {
    setQuery('');
    setTitle('');
    setMethod('');
    setFrom('');
    setTo('');
    setPage(1);
  };
  const applyPreset = (id) => {
    const range = presetRange(id);
    setFrom(range.from);
    setTo(range.to);
    setPage(1);
  };

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-lg font-black text-slate-900">{selected.lineHeading}</h2>
      </div>

      {lines.length === 0 ? (
        <p className="px-5 py-8 text-sm font-semibold text-slate-500">{selected.empty}</p>
      ) : (
        <>
          <div className="space-y-3 border-b border-slate-100 bg-slate-50/60 px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className="block text-xs font-bold text-slate-600">
                Tìm học viên hoặc {selected.subtitleColumn.toLowerCase()}
                <input
                  type="search"
                  value={query}
                  onChange={change(setQuery)}
                  placeholder="Nhập tên..."
                  className={`${controlClass} mt-1`}
                />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                {selected.titleColumn}
                <select value={title} onChange={change(setTitle)} className={`${controlClass} mt-1 cursor-pointer`}>
                  <option value="">Tất cả</option>
                  {titles.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-bold text-slate-600">
                Hình thức
                <select value={method} onChange={change(setMethod)} className={`${controlClass} mt-1 cursor-pointer`}>
                  <option value="">Tất cả</option>
                  {methods.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs font-bold text-slate-600">
                  Từ ngày
                  <input type="date" value={from} max={to || undefined} onChange={change(setFrom)} className={`${controlClass} mt-1`} />
                </label>
                <label className="block text-xs font-bold text-slate-600">
                  Đến ngày
                  <input type="date" value={to} min={from || undefined} onChange={change(setTo)} className={`${controlClass} mt-1`} />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Nhanh:</span>
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={`inline-flex h-9 cursor-pointer items-center rounded-full border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 transition-colors hover:border-[#e31b23] hover:text-[#e31b23] ${focusRing}`}
                >
                  {preset.label}
                </button>
              ))}
              {filtering && (
                <button
                  type="button"
                  onClick={clear}
                  className={`ml-auto inline-flex h-9 cursor-pointer items-center rounded-full px-3.5 text-xs font-bold text-[#e31b23] transition-colors hover:bg-red-50 ${focusRing}`}
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 py-3 text-sm" aria-live="polite">
            <div>
              <p className="text-slate-600">
                <span className="font-black tabular-nums text-slate-900">{filtered.length}</span> khoản
                {filtering && <span className="tabular-nums"> trên tổng {lines.length}</span>}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">{selected.scope}</p>
            </div>
            <p className="text-slate-600">
              Tổng tiền: <span className="text-base font-black tabular-nums text-slate-900">{formatFee(total)}</span>
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="px-5 pb-8 pt-2 text-center">
              <p className="text-sm font-semibold text-slate-500">Không có khoản nào khớp bộ lọc.</p>
              <button
                type="button"
                onClick={clear}
                className={`mt-3 inline-flex h-10 cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 ${focusRing}`}
              >
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-bold">Ngày thu</th>
                      <th className="px-5 py-3 font-bold">Học viên</th>
                      <th className="px-5 py-3 font-bold">{selected.titleColumn}</th>
                      <th className="px-5 py-3 font-bold">{selected.subtitleColumn}</th>
                      <th className="px-5 py-3 font-bold">Hình thức</th>
                      <th className="px-5 py-3 text-right font-bold">Số tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visible.map((line) => (
                      <tr key={`${selected.id}-${line.paymentId}`} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3 whitespace-nowrap text-slate-600">{paidLabel(line.paidAt)}</td>
                        <td className="px-5 py-3 font-bold text-slate-900">{line.memberName}</td>
                        <td className="px-5 py-3 text-slate-700">{line.title}</td>
                        <td className="px-5 py-3 text-slate-600">{line.subtitle}</td>
                        <td className="px-5 py-3 text-slate-600">{line.method}</td>
                        <td className="px-5 py-3 text-right font-bold tabular-nums text-slate-900">{formatFee(line.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  Hiển thị
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setPage(1);
                    }}
                    className="h-10 cursor-pointer rounded-xl border border-slate-200 bg-white px-2 text-sm font-bold text-slate-800 outline-none focus:border-[#e31b23]"
                  >
                    {PAGE_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size} dòng
                      </option>
                    ))}
                  </select>
                </label>
                <nav className="flex items-center gap-2" aria-label="Phân trang">
                  <span className="mr-1 text-xs font-bold tabular-nums text-slate-500">
                    {start + 1}–{Math.min(start + pageSize, filtered.length)} / {filtered.length}
                  </span>
                  <button type="button" onClick={() => setPage(1)} disabled={current === 1} className={pagerButton} aria-label="Trang đầu">
                    «
                  </button>
                  <button type="button" onClick={() => setPage(current - 1)} disabled={current === 1} className={pagerButton}>
                    Trước
                  </button>
                  <span className="px-1 text-sm font-bold tabular-nums text-slate-700">
                    {current}/{pages}
                  </span>
                  <button type="button" onClick={() => setPage(current + 1)} disabled={current === pages} className={pagerButton}>
                    Sau
                  </button>
                  <button type="button" onClick={() => setPage(pages)} disabled={current === pages} className={pagerButton} aria-label="Trang cuối">
                    »
                  </button>
                </nav>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
