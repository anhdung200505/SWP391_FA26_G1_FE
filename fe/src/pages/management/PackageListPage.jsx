import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import ManagementShell from '../../components/management/ManagementShell';
import { DiagramCaption, FlowTrail } from '../../components/management/ManagementBits';
import { useAccountManagement } from '../../context/AccountManagementContext';
import { formatFee } from '../../data/accountManagement';

const PACKAGE_FLOW = ['Bảng điều khiển', 'Danh sách gói', 'Tạo hoặc sửa gói', 'Hệ thống ghi nhận'];

export default function PackageListPage() {
  const { packages, loading, error } = useAccountManagement();

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
      </div>

      <section className="mt-5">
        <h2 className="text-lg font-black">Chọn thao tác với gói</h2>
        <DiagramCaption>Select Package Action</DiagramCaption>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <Link
            to="/quan-ly/goi/moi"
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:border-[#e31b23]/40"
          >
            <DiagramCaption>Create new package</DiagramCaption>
            <p className="mt-2 text-xl font-black">Tạo gói mới</p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Nhập tên, phí, thời hạn và quyền lợi. Hệ thống lưu gói rồi ghi nhật ký.
            </p>
          </Link>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <DiagramCaption>Modify existing package</DiagramCaption>
            <p className="mt-2 text-xl font-black">Sửa gói đang có</p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Chọn một gói bên dưới để sửa phí, thời hạn và quyền lợi.
            </p>
          </div>
        </div>
      </section>

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
                  <p className="text-xs font-bold text-gray-400">{item.code}</p>
                  <h3 className="text-lg font-black">{item.name}</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {formatFee(item.fee)} · {item.validityMonths} tháng
                  </p>
                </div>
                <Link
                  to={`/quan-ly/goi/${item.id}`}
                  className="rounded-xl bg-[#12141d] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#e31b23]"
                >
                  Chọn gói
                </Link>
              </div>
              <ul className="mt-3 flex flex-wrap gap-2">
                {item.benefits.map((benefit) => (
                  <li key={benefit} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                    {benefit}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </ManagementShell>
  );
}

