import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ManagementShell from '../../components/management/ManagementShell';
import { DiagramCaption, FlowTrail, RoleBadge, StatusBadge } from '../../components/management/ManagementBits';
import { useAccountManagement } from '../../context/AccountManagementContext';
import {
  ROLES,
  formatDate,
  formatPhone,
  getRole,
  getStatusMeta,
  initials,
} from '../../data/accountManagement';

export default function UserAccountPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { users, roles, loading, error, updateUserRole, updateAccountStatus } = useAccountManagement();
  const user = users.find((item) => item.id === userId);
  const catalog = roles.length > 0 ? roles : ROLES;
  const assignableRoles = catalog.filter((item) => item.id !== 'ADMIN');
  const findRole = (roleId) => catalog.find((item) => item.id === roleId) ?? getRole(roleId);

  const [mode, setMode] = useState('choose');
  const [draftRoleId, setDraftRoleId] = useState(user?.roleId ?? 'MEMBER');
  const [draftStatus, setDraftStatus] = useState(user?.status === 'active' ? 'inactive' : 'active');
  const [steps, setSteps] = useState([]);
  const [shown, setShown] = useState(0);
  const [logId, setLogId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    document.title = user ? `${user.fullName} · Tài khoản` : 'Tài khoản · AnhDuy Sport';
  }, [user]);

  useEffect(() => {
    if (mode !== 'system' || shown >= steps.length) return undefined;
    const timer = window.setTimeout(() => setShown((count) => count + 1), 700);
    return () => window.clearTimeout(timer);
  }, [mode, shown, steps.length]);

  if (loading && !user) {
    return (
      <ManagementShell
        breadcrumb={[
          { label: 'Bảng điều khiển', to: '/quan-ly' },
          { label: 'Tài khoản người dùng', to: '/quan-ly/tai-khoan' },
          { label: 'Đang tải' },
        ]}
      >
        <p className="text-sm font-semibold text-gray-500">{error || 'Đang tải tài khoản từ máy chủ...'}</p>
      </ManagementShell>
    );
  }

  if (!user) {
    return (
      <ManagementShell
        breadcrumb={[
          { label: 'Bảng điều khiển', to: '/quan-ly' },
          { label: 'Tài khoản người dùng', to: '/quan-ly/tai-khoan' },
          { label: 'Không tìm thấy' },
        ]}
      >
        <h1 className="text-2xl font-black">Không tìm thấy tài khoản</h1>
        <p className="mt-2 text-sm text-gray-600">Tài khoản này không còn trong danh sách.</p>
        <Link to="/quan-ly/tai-khoan" className="mt-4 inline-flex text-sm font-bold text-[#e31b23]">
          Quay lại danh sách
        </Link>
      </ManagementShell>
    );
  }

  const role = findRole(user.roleId);
  const flowStep = mode === 'system' ? 4 : mode === 'choose' ? 2 : 3;
  const roleUnchanged = draftRoleId === user.roleId;
  const statusUnchanged = draftStatus === user.status;

  const openRole = () => {
    setDraftRoleId(user.roleId);
    setMode('role');
  };

  const openStatus = () => {
    setDraftStatus(user.status === 'active' ? 'inactive' : 'active');
    setMode('status');
  };

  const startSystem = (nextSteps, id) => {
    setSteps(nextSteps);
    setShown(1);
    setLogId(id);
    setMode('system');
  };

  const confirmRole = async () => {
    const nextRole = findRole(draftRoleId);
    if (!nextRole || !role || saving) return;
    setSaving(true);
    setActionError('');
    try {
      const log = await updateUserRole(user.id, draftRoleId);
      if (!log) return;
    startSystem(
      [
        {
          id: 'update-role',
          lane: 'Hệ thống',
          diagram: 'Update User Role',
          title: 'Cập nhật vai trò người dùng',
          detail: `${user.fullName} được chuyển từ ${role.label} sang ${nextRole.label}. Các quyền đi kèm vai trò mới có hiệu lực ngay.`,
        },
        {
          id: 'record-log',
          lane: 'Hệ thống',
          diagram: 'Record Log',
          title: 'Ghi nhật ký',
          detail: `${log.actor} đã đổi vai trò của ${user.fullName}: ${role.label} → ${nextRole.label}.`,
        },
      ],
      log.id,
    );
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmStatus = async () => {
    if (saving) return;
    const previous = getStatusMeta(user.status);
    const next = getStatusMeta(draftStatus);
    setSaving(true);
    setActionError('');
    let log;
    try {
      log = await updateAccountStatus(user.id, draftStatus);
    } catch (requestError) {
      setActionError(requestError.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    if (!log) return;
    const verb = draftStatus === 'active' ? 'kích hoạt' : 'vô hiệu hóa';
    startSystem(
      [
        {
          id: 'toggle',
          lane: 'Hệ thống',
          diagram: 'Active / Inactive User Account',
          title: draftStatus === 'active' ? 'Kích hoạt tài khoản' : 'Vô hiệu hóa tài khoản',
          detail: `Hệ thống tiếp nhận yêu cầu ${verb} tài khoản ${user.fullName}.`,
        },
        {
          id: 'update-status',
          lane: 'Hệ thống',
          diagram: 'Update Account Status',
          title: 'Cập nhật trạng thái tài khoản',
          detail: `${previous.label} → ${next.label}.`,
        },
        {
          id: 'email',
          lane: 'Người dùng',
          diagram: 'Receive Email Notification',
          title: 'Nhận email thông báo',
          detail: `Thư đã được gửi tới ${user.email}.`,
          email: log.email,
        },
        {
          id: 'record-log',
          lane: 'Hệ thống',
          diagram: 'Record Log',
          title: 'Ghi nhật ký',
          detail: `${log.actor} đã ${verb} tài khoản ${user.fullName}.`,
        },
      ],
      log.id,
    );
  };

  return (
    <ManagementShell
      breadcrumb={[
        { label: 'Bảng điều khiển', to: '/quan-ly' },
        { label: 'Tài khoản người dùng', to: '/quan-ly/tai-khoan' },
        { label: user.fullName },
      ]}
    >
      <FlowTrail step={flowStep} />

      <section className="mt-5 rounded-3xl border border-gray-200 bg-white p-5 sm:p-6">
        <DiagramCaption>Select User Account</DiagramCaption>
        <div className="mt-3 flex flex-wrap items-start gap-4">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#12141d] text-sm font-black text-white">
            {initials(user.fullName)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black">{user.fullName}</h1>
            <p className="text-sm text-gray-500">
              {user.code} · {user.unit}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <RoleBadge roleId={user.roleId} label={user.unit} />
              <StatusBadge status={user.status} />
            </div>
          </div>
        </div>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          <Info label="Email" value={user.email} />
          <Info label="Điện thoại" value={formatPhone(user.phone)} />
          <Info label="Ngày tham gia" value={formatDate(user.joinedAt)} />
        </dl>
      </section>

      {mode === 'choose' && (
        <section className="mt-5">
          <h2 className="text-lg font-black">Chọn danh mục quản lý</h2>
          <DiagramCaption>Select Management Category</DiagramCaption>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <button
              type="button"
              onClick={openRole}
              className="rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm hover:border-[#e31b23]/40"
            >
              <DiagramCaption>Roles & Permissions</DiagramCaption>
              <p className="mt-2 text-xl font-black">Vai trò và quyền hạn</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Đổi vai trò của {user.fullName}. Quyền hạn được gắn theo vai trò vừa chọn.
              </p>
            </button>
            <button
              type="button"
              onClick={openStatus}
              className="rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm hover:border-[#e31b23]/40"
            >
              <DiagramCaption>User Accounts</DiagramCaption>
              <p className="mt-2 text-xl font-black">Trạng thái tài khoản</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Kích hoạt hoặc vô hiệu hóa. Người dùng nhận email sau khi trạng thái thay đổi.
              </p>
            </button>
          </div>
        </section>
      )}

      {mode === 'role' && (
        <section className="mt-5 rounded-3xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">Đổi vai trò</h2>
              <DiagramCaption>Modify Role</DiagramCaption>
            </div>
            <button type="button" onClick={() => setMode('choose')} className="text-sm font-bold text-gray-500">
              Quay lại
            </button>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <fieldset>
              <legend className="text-sm font-bold text-gray-700">Chọn vai trò mới</legend>
              <div className="mt-2 space-y-2">
                {assignableRoles.map((item) => {
                  const selected = draftRoleId === item.id;
                  return (
                    <label
                      key={item.id}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 ${
                        selected ? 'border-[#e31b23] bg-red-50' : 'border-gray-200'
                      }`}
                    >
                      <span className="font-bold">{item.label}</span>
                      <input
                        type="radio"
                        name="role"
                        value={item.id}
                        checked={selected}
                        onChange={() => setDraftRoleId(item.id)}
                        className="accent-[#e31b23]"
                      />
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="rounded-2xl bg-[#f7f7f8] p-4">
              <p className="text-sm font-black">Quyền hạn đi kèm</p>
              <p className="text-xs text-gray-500">{findRole(draftRoleId)?.label}</p>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                {findRole(draftRoleId)?.permissions.map((permission) => (
                  <li key={permission} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e31b23]" />
                    <span>{permission}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={roleUnchanged || saving}
              onClick={confirmRole}
              className="rounded-xl bg-[#e31b23] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {saving ? 'Đang lưu...' : 'Cập nhật vai trò'}
            </button>
            {roleUnchanged && <p className="text-sm text-gray-500">Đây đang là vai trò hiện tại.</p>}
            {actionError && mode === 'role' && <p className="text-sm font-semibold text-[#b1131a]">{actionError}</p>}
          </div>
        </section>
      )}

      {mode === 'status' && (
        <section className="mt-5 rounded-3xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">Kích hoạt hoặc vô hiệu hóa</h2>
              <DiagramCaption>Active / Inactive User Account</DiagramCaption>
            </div>
            <button type="button" onClick={() => setMode('choose')} className="text-sm font-bold text-gray-500">
              Quay lại
            </button>
          </div>

          <p className="mt-3 text-sm text-gray-600">
            Trạng thái hiện tại: <span className="font-bold">{getStatusMeta(user.status).label}</span>.
            Đổi trạng thái sẽ chặn hoặc mở lại quyền đăng nhập, rồi gửi email cho người dùng.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { id: 'active', title: 'Đang hoạt động', text: 'Cho phép đăng nhập và đặt lịch tập.' },
              { id: 'inactive', title: 'Ngưng hoạt động', text: 'Chặn đăng nhập cho đến khi được mở lại.' },
            ].map((option) => {
              const selected = draftStatus === option.id;
              return (
                <label
                  key={option.id}
                  className={`cursor-pointer rounded-2xl border p-4 ${
                    selected ? 'border-[#e31b23] bg-red-50' : 'border-gray-200'
                  }`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-black">{option.title}</span>
                    <input
                      type="radio"
                      name="status"
                      value={option.id}
                      checked={selected}
                      onChange={() => setDraftStatus(option.id)}
                      className="accent-[#e31b23]"
                    />
                  </span>
                  <span className="mt-2 block text-sm text-gray-600">{option.text}</span>
                </label>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={statusUnchanged || saving}
              onClick={confirmStatus}
              className="rounded-xl bg-[#12141d] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {saving ? 'Đang lưu...' : draftStatus === 'inactive' ? 'Vô hiệu hóa tài khoản' : 'Kích hoạt tài khoản'}
            </button>
            {statusUnchanged && <p className="text-sm text-gray-500">Chọn trạng thái khác với hiện tại.</p>}
            {actionError && mode === 'status' && <p className="text-sm font-semibold text-[#b1131a]">{actionError}</p>}
          </div>
        </section>
      )}

      {mode === 'system' && (
        <section className="mt-5 rounded-3xl border border-gray-200 bg-white p-5 sm:p-6" aria-live="polite">
          <h2 className="text-lg font-black">Hệ thống đang ghi nhận</h2>
          <DiagramCaption>System lane</DiagramCaption>
          <ol className="mt-5 space-y-4 border-l-2 border-gray-200 pl-5">
            {steps.slice(0, shown).map((step) => (
              <li key={step.id} className="animate-step-in">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#e31b23]">
                  {step.lane} · {step.diagram}
                </p>
                <p className="mt-1 font-black">{step.title}</p>
                <p className="mt-1 text-sm leading-6 text-gray-600">{step.detail}</p>
                {step.email && (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200">
                    <div className="bg-[#12141d] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                      Hộp thư người dùng
                    </div>
                    <div className="space-y-1 px-4 py-3 text-sm">
                      <p>
                        <span className="text-gray-400">Tới </span>
                        {step.email.to}
                      </p>
                      <p>
                        <span className="text-gray-400">Tiêu đề </span>
                        {step.email.subject}
                      </p>
                      <p className="pt-2 leading-6 text-gray-700">{step.email.body}</p>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ol>

          {shown < steps.length ? (
            <p className="mt-4 text-sm font-semibold text-gray-500">Đang xử lý bước tiếp theo...</p>
          ) : (
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/quan-ly', { state: { logId } })}
                className="rounded-xl bg-[#e31b23] px-4 py-2.5 text-sm font-bold text-white"
              >
                Xem bảng điều khiển đã cập nhật
              </button>
              <button
                type="button"
                onClick={() => setMode('choose')}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold"
              >
                Ở lại hồ sơ này
              </button>
            </div>
          )}
        </section>
      )}
    </ManagementShell>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl bg-[#f7f7f8] px-4 py-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-1 font-semibold break-all">{value}</dd>
    </div>
  );
}
