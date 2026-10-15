import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ManagementShell from '../../components/management/ManagementShell';
import PasswordField from '../../components/PasswordField';
import { useAccountManagement } from '../../context/AccountManagementContext';

const specialCharacter = /[@#!]/;

export default function CreateStaffPage() {
  const navigate = useNavigate();
  const { createStaffAccount } = useAccountManagement();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState('RECEPTIONIST');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setError('');
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Nhập họ tên, email và mật khẩu.');
      return;
    }
    if (!specialCharacter.test(password)) {
      setError('Mật khẩu phải có ít nhất một ký tự đặc biệt như @, # hoặc !.');
      return;
    }

    setSaving(true);
    try {
      const created = await createStaffAccount({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        roleId,
      });
      navigate(`/quan-ly/tai-khoan/${created.id}`, { replace: true });
    } catch (requestError) {
      setError(requestError.message);
      setSaving(false);
    }
  };

  return (
    <ManagementShell
      breadcrumb={[
        { label: 'Bảng điều khiển', to: '/quan-ly' },
        { label: 'Tài khoản người dùng', to: '/quan-ly/tai-khoan' },
        { label: 'Thêm nhân sự' },
      ]}
    >
      <div className="max-w-xl rounded-3xl border border-gray-200 bg-white p-5 sm:p-6">
        <h1 className="text-2xl font-black">Thêm lễ tân / huấn luyện viên</h1>
        <p className="mt-2 text-sm text-gray-600">
          Học viên tự đăng ký. Quản trị trung tâm chỉ tạo tài khoản lễ tân và huấn luyện viên.
        </p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="text-sm font-bold text-gray-700">Họ tên</span>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#e31b23]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-gray-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#e31b23]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-gray-700">Số điện thoại</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#e31b23]"
            />
          </label>
          <fieldset>
            <legend className="text-sm font-bold text-gray-700">Vai trò</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {[
                { id: 'RECEPTIONIST', label: 'Lễ tân' },
                { id: 'COACH', label: 'Huấn luyện viên' },
              ].map((role) => (
                <label
                  key={role.id}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 ${
                    roleId === role.id ? 'border-[#e31b23] bg-red-50' : 'border-gray-200'
                  }`}
                >
                  <span className="font-bold">{role.label}</span>
                  <input
                    type="radio"
                    name="staff-role"
                    value={role.id}
                    checked={roleId === role.id}
                    onChange={() => setRoleId(role.id)}
                    className="accent-[#e31b23]"
                  />
                </label>
              ))}
            </div>
          </fieldset>
          <PasswordField
            label="Mật khẩu"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            hint="Mật khẩu cần ít nhất một ký tự đặc biệt như @, # hoặc !."
          />
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-[#e31b23]">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#e31b23] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
            <Link to="/quan-ly/tai-khoan" className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold">
              Hủy
            </Link>
          </div>
        </form>
      </div>
    </ManagementShell>
  );
}
