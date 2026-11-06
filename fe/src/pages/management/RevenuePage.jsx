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
      <section className="rounded-3xl border border-gray-200 bg-white px-6 py-8 sm:px-8">
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
            <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#e31b23]">{selected.label}</p>
              <p className="mt-2 text-3xl font-black tabular-nums text-slate-900">{formatFee(section.total)}</p>
              <p className="mt-1 text-sm text-slate-500">
                {section.paymentCount} khoản đã thanh toán. {selected.note}
              </p>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-5 py-4">
                <h2 className="text-lg font-black text-slate-900">{selected.groupHeading}</h2>
              </div>
              {section.groups.length === 0 ? (
                <p className="px-5 py-8 text-sm font-semibold text-slate-500">{selected.empty}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-gray-400">
                      <tr>
                        <th className="px-5 py-3 font-bold">{selected.titleColumn}</th>
                        <th className="px-5 py-3 font-bold">Số khoản</th>
                        <th className="px-5 py-3 text-right font-bold">Doanh thu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
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

            <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-5 py-4">
                <h2 className="text-lg font-black text-slate-900">{selected.lineHeading}</h2>
              </div>
              {section.lines.length === 0 ? (
                <p className="px-5 py-8 text-sm font-semibold text-slate-500">{selected.empty}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-gray-400">
                      <tr>
                        <th className="px-5 py-3 font-bold">Ngày thu</th>
                        <th className="px-5 py-3 font-bold">Học viên</th>
                        <th className="px-5 py-3 font-bold">{selected.titleColumn}</th>
                        <th className="px-5 py-3 font-bold">{selected.subtitleColumn}</th>
                        <th className="px-5 py-3 font-bold">Hình thức</th>
                        <th className="px-5 py-3 text-right font-bold">Số tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {section.lines.map((line) => (
                        <tr key={`${selected.id}-${line.paymentId}`}>
                          <td className="px-5 py-3 whitespace-nowrap text-slate-600">{paidLabel(line.paidAt)}</td>
                          <td className="px-5 py-3 font-bold text-slate-900">{line.memberName}</td>
                          <td className="px-5 py-3 text-slate-700">{line.title}</td>
                          <td className="px-5 py-3 text-slate-600">{line.subtitle}</td>
                          <td className="px-5 py-3 text-slate-600">{line.method}</td>
                          <td className="px-5 py-3 text-right font-bold tabular-nums text-slate-900">
                            {formatFee(line.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </ManagementShell>
  );
}
