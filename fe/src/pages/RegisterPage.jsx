import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import PasswordField from '../components/PasswordField';
import { registerAccount } from '../api/managementApi';
import { useAuth } from '../context/AuthContext';

const specialCharacter = /[@#!]/;

export default function RegisterPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (user) {
    return <Navigate to={user.roleId === 'ADMIN' ? '/quan-ly' : '/home'} replace />;
  }

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
    if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại chưa khớp.');
      return;
    }

    setSaving(true);
    try {
      await registerAccount({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });
      navigate('/dang-nhap', { replace: true, state: { registered: true } });
    } catch (requestError) {
      setError(requestError.message);
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#12141d] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <Link to="/home" className="mb-8 flex items-center gap-3">
          <img src={logoImg} alt="AnhDuy Sport" className="h-12 w-auto object-contain" />
          <span className="text-2xl font-black italic tracking-wide text-gray-900">
            AnhDuy <span className="text-[#e31b23]">Sport</span>
          </span>
        </Link>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e31b23]">Tài khoản mới</p>
        <h1 className="mt-2 text-2xl font-black text-gray-900">Đăng ký</h1>
        <p className="mt-2 text-sm text-gray-500">Tạo tài khoản học viên để đăng nhập vào AnhDuy Sport.</p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="text-sm font-bold text-gray-700">Họ tên</span>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete="name"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#e31b23]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-gray-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#e31b23]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-gray-700">Số điện thoại</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="tel"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#e31b23]"
            />
          </label>
          <PasswordField
            label="Mật khẩu"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            hint="Mật khẩu cần ít nhất một ký tự đặc biệt như @, # hoặc !."
          />
          <PasswordField
            label="Nhập lại mật khẩu"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-[#e31b23]">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-[#e31b23] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>
        <Link
          to="/dang-nhap"
          className="mt-4 flex w-full items-center justify-center rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-800 hover:border-[#e31b23] hover:text-[#e31b23]"
        >
          Đã có tài khoản? Đăng nhập
        </Link>
        <Link
          to="/home"
          className="mt-3 flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-bold text-gray-500 hover:text-[#e31b23]"
        >
          Quay về trang chủ
        </Link>
      </div>
    </div>
  );
}
