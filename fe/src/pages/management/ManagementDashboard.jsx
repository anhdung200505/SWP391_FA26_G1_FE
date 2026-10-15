import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ManagementShell from '../../components/management/ManagementShell';
import { DiagramCaption, StatusBadge } from '../../components/management/ManagementBits';
import { useAccountManagement } from '../../context/AccountManagementContext';
import { formatDateTime, getRole } from '../../data/accountManagement';

export default function ManagementDashboard() {
  const { users, logs, resetData } = useAccountManagement();
  const location = useLocation();
  const navigate = useNavigate();
  const [confirmReset, setConfirmReset] = useState(false);
  const highlightId = location.state?.logId;
  const highlightedLog = logs.find((log) => log.id === highlightId);

  useEffect(() => {
    document.title = 'Bảng điều khiển quản lý · AnhDuy Sport';
  }, []);

  useEffect(() => {
    if (!highlightId) return undefined;
    const row = document.getElementById(`log-${highlightId}`);
    if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return undefined;
  }, [highlightId]);

  const activeCount = users.filter((user) => user.status === 'active').length;
  const inactiveCount = users.length - activeCount;

  const handleReset = () => {
    resetData();
    setConfirmReset(false);
    navigate('/quan-ly', { replace: true });
  };

  return (
    <ManagementShell breadcrumb={[{ label: 'Bảng điều khiển' }]}>
      <section className="relative overflow-hidden rounded-3xl bg-[#12141d] px-6 py-8 text-white sm:px-8">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] bg-[#e31b23] sm:block"
          style={{ clipPath: 'polygon(22% 0, 100% 0, 100% 100%, 0 100%)' }}
        />
        <div className="relative max-w-xl">
          <span className="inline-block bg-[#e31b23] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white -skew-x-12">
            <span className="inline-block skew-x-12">Center Manager</span>
          </span>
          <h1 className="mt-4 text-3xl font-black uppercase italic leading-none tracking-tight sm:text-5xl">
            Quản lý tài khoản
            <br />
            và hội viên
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/75 sm:text-base">
            Nửa đầu luồng: chọn danh mục tài khoản, đổi vai trò hoặc bật tắt trạng thái.
            Hệ thống cập nhật, gửi email khi đổi trạng thái, rồi ghi nhật ký tại đây.
          </p>
          <DiagramCaption>
            <span className="text-white/40">Access Management Dashboard</span>
          </DiagramCaption>
        </div>
      </section>

      {highlightedLog && (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
            View Updated Management Dashboard
          </p>
          <p className="mt-1 text-base font-black text-emerald-950">Bảng điều khiển đã được cập nhật</p>
          <p className="mt-1 text-sm text-emerald-900">
            {highlightedLog.summary}. {highlightedLog.detail}.
          </p>
          {highlightedLog.email && (
            <p className="mt-1 text-sm text-emerald-900">
              Người dùng đã nhận email tại {highlightedLog.email.to}.
            </p>
          )}
        </div>
      )}

      <section className="mt-6">
        <div className="mb-3">
          <h2 className="text-lg font-black">Chọn danh mục quản lý</h2>
          <DiagramCaption>Select Management Category</DiagramCaption>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Link
            to="/quan-ly/tai-khoan"
            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#e31b23]/40 hover:shadow-md"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#e31b23]">
              User Account Management
            </p>
            <h3 className="mt-2 text-xl font-black">Quản lý tài khoản người dùng</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Mở danh sách, chọn một tài khoản, rồi đổi vai trò và quyền hoặc kích hoạt / vô hiệu hóa.
            </p>
            <p className="mt-4 text-sm font-bold text-[#e31b23]">
              Vào danh sách tài khoản
              <span className="ml-1 inline-block transition group-hover:translate-x-1">→</span>
            </p>
          </Link>

          <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
                Membership packages
              </p>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                Nửa sau
              </span>
            </div>
            <h3 className="mt-2 text-xl font-black text-gray-500">Gói hội viên</h3>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Tạo gói mới hoặc sửa phí, thời hạn và quyền lợi. Nhánh này chưa nằm trong phần đang làm.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Tổng tài khoản" value={users.length} />
        <Stat label="Đang hoạt động" value={activeCount} />
        <Stat label="Ngưng hoạt động" value={inactiveCount} />
      </section>

      <section className="mt-6 rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-black">Nhật ký hệ thống</h2>
            <DiagramCaption>Record Log</DiagramCaption>
          </div>
          {confirmReset ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg bg-[#12141d] px-3 py-2 text-xs font-bold text-white"
              >
                Xác nhận khôi phục
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="rounded-lg px-3 py-2 text-xs font-bold text-gray-500"
              >
                Hủy
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="text-xs font-bold text-gray-500 hover:text-[#e31b23]"
            >
              Khôi phục dữ liệu mẫu
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-5 py-3 font-bold">Thời gian</th>
                <th className="px-5 py-3 font-bold">Thao tác</th>
                <th className="px-5 py-3 font-bold">Chi tiết</th>
                <th className="px-5 py-3 font-bold">Email</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const highlighted = log.id === highlightId;
                return (
                  <tr
                    key={log.id}
                    id={`log-${log.id}`}
                    className={`border-t border-gray-100 ${highlighted ? 'bg-emerald-50' : ''}`}
                  >
                    <td className="px-5 py-3 align-top text-gray-500">{formatDateTime(log.at)}</td>
                    <td className="px-5 py-3 align-top">
                      <p className="font-bold">{log.summary}</p>
                      <p className="text-xs text-gray-400">{log.actor}</p>
                    </td>
                    <td className="px-5 py-3 align-top text-gray-700">{log.detail}</td>
                    <td className="px-5 py-3 align-top">
                      {log.email ? (
                        <span className="font-semibold text-emerald-700">Đã gửi · {log.email.to}</span>
                      ) : (
                        <span className="text-gray-400">Không gửi</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-black">Tài khoản gần đây</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {users.slice(0, 4).map((user) => (
            <Link
              key={user.id}
              to={`/quan-ly/tai-khoan/${user.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 hover:border-[#e31b23]/40"
            >
              <span>
                <span className="block font-bold">{user.fullName}</span>
                <span className="text-xs text-gray-500">{getRole(user.roleId)?.label}</span>
              </span>
              <StatusBadge status={user.status} />
            </Link>
          ))}
        </div>
      </section>
    </ManagementShell>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
      <p className="text-3xl font-black tabular-nums">{value}</p>
      <p className="mt-1 text-sm font-semibold text-gray-500">{label}</p>
    </div>
  );
}
