import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import PasswordField from '../components/PasswordField';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (user) {
    return <Navigate to={user.roleId === 'ADMIN' ? '/quan-ly' : '/home'} replace />;
  }

  const registered = location.state?.registered === true;

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setError('');
    if (!email.trim() || !password) {
      setError('Nhập email và mật khẩu.');
      return;
    }

    setSaving(true);
    try {
      const signedIn = await login(email.trim(), password);
      const from = location.state?.from;
      const next = signedIn.roleId === 'ADMIN'
        ? (typeof from === 'string' && from.startsWith('/quan-ly') ? from : '/quan-ly')
        : '/home';
      navigate(next, { replace: true });
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
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e31b23]">Tài khoản</p>
        <h1 className="mt-2 text-2xl font-black text-gray-900">Đăng nhập</h1>
        <p className="mt-2 text-sm text-gray-500">
          Tài khoản quản trị vào bảng điều khiển. Học viên đăng nhập để dùng trang trung tâm.
        </p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="text-sm font-bold text-gray-700">Email</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#e31b23]"
            />
          </label>
          <PasswordField
            label="Mật khẩu"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {registered && !error && (
            <p className="rounded-xl bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
              Đăng ký thành công. Hãy đăng nhập.
            </p>
          )}
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-[#e31b23]">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-[#e31b23] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
        <Link
          to="/dang-ky"
          className="mt-4 flex w-full items-center justify-center rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-800 hover:border-[#e31b23] hover:text-[#e31b23]"
        >
          Chưa có tài khoản? Đăng ký
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
