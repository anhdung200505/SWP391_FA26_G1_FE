import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import PasswordField from '../components/PasswordField';
import { pathForRole } from '../auth/destination';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { user } = useAuth();
  const location = useLocation();

  if (user) {
    return <Navigate to={pathForRole(user.roleId)} replace />;
  }

  return (
    <div className="min-h-screen bg-[#12141d] px-4 py-10">
      <div className="mx-auto w-full max-w-5xl">
        <Link to="/home" className="mb-8 flex items-center gap-3">
          <img src={logoImg} alt="AnhDuy Sport" className="h-12 w-auto object-contain" />
          <span className="text-2xl font-black italic tracking-wide text-white">
            AnhDuy <span className="text-[#e31b23]">Sport</span>
          </span>
        </Link>
        <h1 className="text-3xl font-black text-white">Đăng nhập</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/70">
          Chọn đúng cửa. Học viên tự đăng ký. Lễ tân và huấn luyện viên do quản trị trung tâm tạo tài khoản.
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <LoginCard
            eyebrow="Nhân sự"
            title="Lễ tân / Huấn luyện viên"
            description="Quản trị trung tâm cũng đăng nhập tại cửa này để thêm lễ tân và huấn luyện viên."
            portal="staff"
            from={location.state?.from}
          />
          <LoginCard
            eyebrow="Học viên"
            title="Học viên"
            description="Dành cho tài khoản học viên. Chưa có tài khoản thì đăng ký bên dưới."
            portal="member"
            from={location.state?.from}
            registered={location.state?.registered === true}
            footer={
              <Link
                to="/dang-ky"
                className="mt-4 flex w-full items-center justify-center rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-800 hover:border-[#e31b23] hover:text-[#e31b23]"
              >
                Chưa có tài khoản? Đăng ký
              </Link>
            }
          />
        </div>
        <Link
          to="/home"
          className="mt-6 inline-flex text-sm font-bold text-white/70 hover:text-white"
        >
          Quay về trang chủ
        </Link>
      </div>
    </div>
  );
}

function LoginCard({ eyebrow, title, description, portal, from, registered = false, footer }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
      const signedIn = await login(email.trim(), password, portal);
      const next = signedIn.roleId === 'ADMIN' && typeof from === 'string' && from.startsWith('/quan-ly')
        ? from
        : pathForRole(signedIn.roleId);
      navigate(next, { replace: true });
    } catch (requestError) {
      setError(requestError.message);
      setSaving(false);
    }
  };

  return (
    <section className="rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e31b23]">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black text-gray-900">{title}</h2>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
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
            Đăng ký thành công. Hãy đăng nhập ở cửa học viên.
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
      {footer}
    </section>
  );
}
