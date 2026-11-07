import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import ManagementShell from '../../components/management/ManagementShell';
import { DiagramCaption, FlowTrail } from '../../components/management/ManagementBits';
import { useAccountManagement } from '../../context/AccountManagementContext';
import { formatFee } from '../../data/accountManagement';

const PACKAGE_FLOW = ['Bảng điều khiển', 'Danh sách gói', 'Sửa gói hiện tại', 'Hệ thống ghi nhận'];

export default function PackageListPage() {
  const { packages = [], loading, error } = useAccountManagement();

  useEffect(() => {
    document.title = 'Danh sách gói hội viên · AnhDuy Sport';
  }, []);

  return (
    <ManagementShell
      breadcrumb={[
        { label: 'Bảng điều khiển', to: '/quan-ly' },
        { label: 'Gói hội viên' },
      ]}
    >
      <FlowTrail step={1} steps={PACKAGE_FLOW} />
      <div className="mt-5">
        <h1 className="text-2xl font-black sm:text-3xl">Danh sách gói hội viên</h1>
        <DiagramCaption>Access Package List</DiagramCaption>
        <p className="mt-2 text-sm text-gray-600">
          Chỉ có thể chỉnh sửa thông tin của 3 gói hội viên hiện tại. Không hỗ trợ tạo gói mới.
        </p>
      </div>

      {loading && <p className="mt-5 text-sm font-semibold text-gray-500">Đang tải gói từ máy chủ...</p>}
      {error && <p className="mt-5 text-sm font-semibold text-[#b1131a]">{error}</p>}

      {!loading && !error && packages.length === 0 && (
        <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center">
          <p className="font-bold">Chưa có gói hội viên</p>
        </div>
      )}

      {!loading && packages.length > 0 && (
        <div className="mt-5 grid gap-3">
          {packages.map((item) => (
            <article key={item.id} className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-gray-400">{item.code || 'N/A'}</p>
                  <h3 className="text-lg font-black">{item.name || 'Gói hội viên'}</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {formatFee(item.fee || 0)} · {item.validityMonths || 0} tháng
                  </p>
                </div>
                <Link
                  to={`/quan-ly/goi/${item.id}`}
                  className="rounded-xl bg-[#12141d] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#e31b23]"
                >
                  Chỉnh sửa gói
                </Link>
              </div>
              {Array.isArray(item.benefits) && item.benefits.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
                  {item.benefits.map((benefit, idx) => (
                    <li key={`${item.id}-benefit-${idx}`}>{benefit}</li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}
    </ManagementShell>
  );
}
