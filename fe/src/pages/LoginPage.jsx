import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import arenaImg from '../assets/facilities/facility-arena-1024x683.webp';
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
    return <Navigate to="/quan-ly" replace />;
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
      await login(email.trim(), password);
      const from = location.state?.from;
      const next = typeof from === 'string' && from.startsWith('/quan-ly') ? from : '/quan-ly';
      navigate(next, { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Đăng nhập thất bại.');
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#0d0f17] font-sans select-none overflow-hidden">
      {/* BÊN TRÁI: BANNER THỂ THAO ĐẲNG CẤP (Ẩn trên màn hình nhỏ) */}
      <div className="relative hidden w-1/2 lg:flex flex-col justify-between p-12 overflow-hidden bg-[#0d0f17]">
        {/* Ảnh nền + Overlay Gradient */}
        <div className="absolute inset-0 z-0">
          <img
            src={arenaImg}
            alt="AnhDuy Sport Banner"
            className="w-full h-full object-cover object-center filter brightness-[0.55] contrast-[1.1]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
          {/* Mảng trang trí vát chéo đỏ */}
          <div
            className="absolute -right-20 inset-y-0 w-80 bg-[#e31b23]/30 mix-blend-multiply pointer-events-none"
            style={{ clipPath: 'polygon(30% 0, 100% 0, 100% 100%, 0% 100%)' }}
          ></div>
        </div>

        {/* Logo góc trên bên trái */}
        <div className="relative z-10">
          <Link to="/home" className="inline-flex items-center gap-3 group">
            <img src={logoImg} alt="AnhDuy Sport" className="h-12 w-auto object-contain drop-shadow-md" />
            <span className="text-2xl font-black italic tracking-wider uppercase text-white drop-shadow-md">
              AnhDuy <span className="text-[#e31b23]">Sport</span>
            </span>
          </Link>
        </div>

        {/* Khẩu hiệu & Thông điệp ở giữa */}
        <div className="relative z-10 max-w-lg my-auto pt-10">
          <div className="mb-4">
            <span className="inline-block bg-[#e31b23] text-white font-black text-xs px-3.5 py-1 transform -skew-x-12 uppercase tracking-widest shadow-lg">
              <span className="inline-block transform skew-x-12">ANHDUY SPORT PORTAL</span>
            </span>
          </div>
          <h2 className="text-4xl xl:text-5xl font-black uppercase text-white leading-tight tracking-tight drop-shadow-xl mb-4">
            CHINH PHỤC <span className="text-[#e31b23]">ĐỈNH CAO</span> THỂ THAO
          </h2>
          <p className="text-gray-300 text-sm xl:text-base font-semibold leading-relaxed border-l-4 border-[#e31b23] pl-4">
            Hệ thống quản trị đào tạo và chăm sóc hội viên chuyên nghiệp dành riêng cho trung tâm AnhDuy Sport.
          </p>
        </div>

        {/* Dải thống kê ở đáy Banner */}
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
          {/* Logo cho thiết bị di động */}
          <div className="lg:hidden mb-6 flex justify-center">
            <Link to="/home" className="inline-flex items-center gap-2.5">
              <img src={logoImg} alt="AnhDuy Sport" className="h-10 w-auto object-contain" />
              <span className="text-xl font-black italic tracking-wider text-white">
                AnhDuy <span className="text-[#e31b23]">Sport</span>
              </span>
            </Link>
          </div>

          <div className="mb-6">
            <span className="inline-block text-[11px] font-black uppercase tracking-widest text-[#e31b23] bg-[#e31b23]/10 px-3 py-1 rounded-sm border border-[#e31b23]/30 mb-2">
              Đăng nhập vào hệ thống
            </span>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">Đăng nhập</h1>
            <p className="mt-2 text-xs sm:text-sm font-medium text-gray-400">
              Nhập tài khoản để truy cập hệ thống quản lý hội viên và gói tập.
            </p>
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
              {saving ? 'Đang xác thực...' : 'Đăng nhập'}
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