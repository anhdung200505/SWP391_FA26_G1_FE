import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ManagementShell from '../../components/management/ManagementShell';
import { DiagramCaption, FlowTrail, RoleBadge, StatusBadge } from '../../components/management/ManagementBits';
import { useAccountManagement } from '../../context/AccountManagementContext';
import { ROLES, formatPhone, initials } from '../../data/accountManagement';

export default function UserAccountListPage() {
  const { users, roles, loading, error } = useAccountManagement();
  const catalog = roles.length > 0 ? roles : ROLES;
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    document.title = 'Danh sách tài khoản · AnhDuy Sport';
  }, []);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesRole = roleFilter === 'all' || user.roleId === roleFilter;
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      const haystack = `${user.fullName} ${user.email} ${user.code} ${user.phone}`.toLowerCase();
      const matchesQuery = !keyword || haystack.includes(keyword);
      return matchesRole && matchesStatus && matchesQuery;
    });
  }, [users, query, roleFilter, statusFilter]);

  return (
    <ManagementShell
      breadcrumb={[
        { label: 'Bảng điều khiển', to: '/quan-ly' },
        { label: 'Tài khoản người dùng' },
      ]}
    >
      <FlowTrail step={1} />

      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">Danh sách tài khoản</h1>
          <DiagramCaption>Access User Account List</DiagramCaption>
          <p className="mt-2 text-sm text-gray-600">
            Chọn một tài khoản để đổi vai trò, quyền hạn hoặc trạng thái hoạt động.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/quan-ly/tai-khoan/moi"
            className="rounded-xl bg-[#e31b23] px-4 py-2.5 text-sm font-bold text-white"
          >
            Thêm lễ tân / huấn luyện viên
          </Link>
          <p className="text-sm font-bold text-gray-500">{filtered.length} tài khoản</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 md:grid-cols-[1fr_180px_180px]">
        <label className="block text-sm font-bold text-gray-700">
          Tìm kiếm
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tên, email hoặc mã hội viên"
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium outline-none ring-[#e31b23] focus:ring-2"
          />
        </label>
        <label className="block text-sm font-bold text-gray-700">
          Vai trò
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium outline-none ring-[#e31b23] focus:ring-2"
          >
            <option value="all">Tất cả</option>
            {catalog.filter((role) => role.id !== 'ADMIN').map((role) => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-bold text-gray-700">
          Trạng thái
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium outline-none ring-[#e31b23] focus:ring-2"
          >
            <option value="all">Tất cả</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Ngưng hoạt động</option>
          </select>
        </label>
      </div>

      {loading && <p className="mt-5 text-sm font-semibold text-gray-500">Đang tải tài khoản từ máy chủ...</p>}
      {error && <p className="mt-5 text-sm font-semibold text-[#b1131a]">{error}</p>}

      {!loading && !error && filtered.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center">
          <p className="font-bold">Không có tài khoản khớp bộ lọc</p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setRoleFilter('all');
              setStatusFilter('all');
            }}
            className="mt-3 text-sm font-bold text-[#e31b23]"
          >
            Xóa bộ lọc
          </button>
        </div>
      ) : !loading && !error ? (
        <>
          <div className="mt-5 space-y-3 md:hidden">
            {filtered.map((user) => (
              <article key={user.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={user.fullName} />
                  <div className="min-w-0 flex-1">
                    <p className="font-black">{user.fullName}</p>
                    <p className="truncate text-sm text-gray-500">{user.email}</p>
                    <p className="mt-1 text-xs font-semibold text-gray-400">{user.code}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <RoleBadge roleId={user.roleId} label={user.unit} />
                  <StatusBadge status={user.status} />
                </div>
                <Link
                  to={`/quan-ly/tai-khoan/${user.id}`}
                  className="mt-4 inline-flex rounded-xl bg-[#e31b23] px-4 py-2 text-sm font-bold text-white"
                >
                  Chọn tài khoản
                </Link>
              </article>
            ))}
          </div>

          <div className="mt-5 hidden overflow-hidden rounded-2xl border border-gray-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-5 py-3 font-bold">Tài khoản</th>
                  <th className="px-5 py-3 font-bold">Liên hệ</th>
                  <th className="px-5 py-3 font-bold">Vai trò</th>
                  <th className="px-5 py-3 font-bold">Trạng thái</th>
                  <th className="px-5 py-3 font-bold" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className="border-t border-gray-100">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.fullName} />
                        <div>
                          <p className="font-bold">{user.fullName}</p>
                          <p className="text-xs text-gray-400">
                            {user.code} · {user.unit}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p>{user.email}</p>
                      <p className="text-xs text-gray-400">{formatPhone(user.phone)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <RoleBadge roleId={user.roleId} label={user.unit} />
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        to={`/quan-ly/tai-khoan/${user.id}`}
                        className="inline-flex rounded-xl bg-[#12141d] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#e31b23]"
                      >
                        Chọn
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </ManagementShell>
  );
}

function Avatar({ name }) {
  return (
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#12141d] text-xs font-black text-white">
      {initials(name)}
    </span>
  );
}
