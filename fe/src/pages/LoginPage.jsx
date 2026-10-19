import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import arenaImg from '../assets/facilities/facility-arena-1024x683.webp';
import PasswordField from '../components/PasswordField';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { user, loginAsMember, loginAsStaff } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [portal, setPortal] = useState('member'); // 'member' | 'staff'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Nếu đã đăng nhập thì điều hướng theo vai trò
  if (user) {
    const defaultNav = user.roleId === 'ADMIN' || user.roleId === 'STAFF' ? '/quan-ly' : '/home';
    return <Navigate to={defaultNav} replace />;
  }

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setError('');

    if (!email.trim() || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setSaving(true);
    try {
      if (portal === 'member') {
        await loginAsMember(email.trim(), password);
        const from = location.state?.from || '/home';
        navigate(from, { replace: true });
      } else {
        await loginAsStaff(email.trim(), password);
        const from = location.state?.from || '/quan-ly';
        navigate(from, { replace: true });
      }
    } catch (requestError) {
      setError(requestError.message || 'Đăng nhập thất bại.');
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#0d0f17] font-sans select-none overflow-hidden">
      {/* BÊN TRÁI: BANNER THỂ THAO */}
      <div className="relative hidden w-1/2 lg:flex flex-col justify-between p-12 overflow-hidden bg-[#0d0f17]">
        <div className="absolute inset-0 z-0">
          <img
            src={arenaImg}
            alt="AnhDuy Sport Banner"
            className="w-full h-full object-cover object-center filter brightness-[0.55] contrast-[1.1]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
        </div>

        <div className="relative z-10">
          <Link to="/home" className="inline-flex items-center gap-3 group">
            <img src={logoImg} alt="AnhDuy Sport" className="h-12 w-auto object-contain drop-shadow-md" />
            <span className="text-2xl font-black italic tracking-wider uppercase text-white drop-shadow-md">
              AnhDuy <span className="text-[#e31b23]">Sport</span>
            </span>
          </Link>
        </div>

        <div className="relative z-10 max-w-lg my-auto pt-10">
          <div className="mb-4">
            <span className="inline-block bg-[#e31b23] text-white font-black text-xs px-3.5 py-1 transform -skew-x-12 uppercase tracking-widest shadow-lg">
              ANHDUY SPORT PORTAL
            </span>
          </div>
          <h2 className="text-4xl xl:text-5xl font-black uppercase text-white leading-tight tracking-tight drop-shadow-xl mb-4">
            CHINH PHỤC <span className="text-[#e31b23]">ĐỈNH CAO</span> THỂ THAO
          </h2>
          <p className="text-gray-300 text-sm xl:text-base font-semibold leading-relaxed border-l-4 border-[#e31b23] pl-4">
            Hệ thống đào tạo và chăm sóc hội viên chuyên nghiệp dành riêng cho trung tâm AnhDuy Sport.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-4 pt-6 border-t border-gray-800/80">
          <div>
            <span className="block text-2xl font-black text-[#e31b23]">8+</span>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Bộ môn đào tạo</span>
          </div>
          <div>
            <span className="block text-2xl font-black text-[#e31b23]">2.500+</span>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Hội viên tích cực</span>
          </div>
          <div>
            <span className="block text-2xl font-black text-[#e31b23]">100%</span>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">HLV Chuyên nghiệp</span>
          </div>
        </div>
      </div>

      {/* BÊN PHẢI: FORM ĐĂNG NHẬP */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 md:p-16 bg-[#12141d] relative z-10">
        <div className="w-full max-w-md bg-[#181d2a] rounded-2xl p-8 sm:p-10 border border-gray-800 shadow-2xl">
          <div className="lg:hidden mb-6 flex justify-center">
            <Link to="/home" className="inline-flex items-center gap-2.5">
              <img src={logoImg} alt="AnhDuy Sport" className="h-10 w-auto object-contain" />
              <span className="text-xl font-black italic tracking-wider text-white">
                AnhDuy <span className="text-[#e31b23]">Sport</span>
              </span>
            </Link>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">Đăng nhập</h1>
            <p className="mt-2 text-xs sm:text-sm font-medium text-gray-400">
              Chọn cổng đăng nhập tương ứng với tài khoản của bạn.
            </p>
          </div>

          {/* CỔNG ĐĂNG NHẬP (TAB PORTAL) */}
          <div className="grid grid-cols-2 gap-2 bg-[#0d0f17] p-1.5 rounded-xl border border-gray-800 mb-6">
            <button
              type="button"
              onClick={() => { setPortal('member'); setError(''); }}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                portal === 'member'
                  ? 'bg-[#e31b23] text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Học viên
            </button>
            <button
              type="button"
              onClick={() => { setPortal('staff'); setError(''); }}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                portal === 'staff'
                  ? 'bg-[#e31b23] text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Quản trị & Lễ tân
            </button>
          </div>

          <form className="space-y-4" onSubmit={submit}>
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                autoComplete="username"
                value={email}
                placeholder="vd: nguyenvana@gmail.com"
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl bg-[#0d0f17] border border-gray-700/80 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-[#e31b23] focus:ring-1 focus:ring-[#e31b23] transition-all"
              />
            </div>

            <div>
              <PasswordField
                label="Mật khẩu"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-950/60 border border-red-800/80 px-4 py-3 text-xs font-semibold text-red-300">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-[#e31b23] hover:bg-[#c4131a] px-4 py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-red-900/40 cursor-pointer disabled:opacity-60 transition-all transform active:scale-[0.99]"
            >
              {saving ? 'Đang xác thực...' : portal === 'member' ? 'Đăng nhập Học viên' : 'Đăng nhập Quản trị'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold text-gray-400">
            <span>Chưa có tài khoản?</span>
            <Link to="/dang-ky" className="text-[#e31b23] hover:underline uppercase tracking-wider">
              Đăng ký ngay →
            </Link>
          </div>

          <div className="mt-4 text-center">
            <Link to="/home" className="inline-block text-xs font-semibold text-gray-500 hover:text-gray-300 transition-colors">
              ← Quay lại trang chủ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}