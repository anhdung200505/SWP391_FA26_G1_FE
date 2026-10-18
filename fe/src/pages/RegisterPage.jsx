import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import arenaImg from '../assets/facilities/facility-arena-1024x683.webp';
import PasswordField from '../components/PasswordField';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setError('');

    if (!fullName.trim() || !email.trim() || !phone.trim() || !password) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setSaving(true);
    try {
      // Giả lập hoặc gọi API đăng ký hội viên mới tại đây
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert('Đăng ký thành công! Vui lòng đăng nhập.');
      navigate('/dang-nhap');
    } catch (requestError) {
      setError(requestError.message || 'Đăng ký không thành công.');
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#0d0f17] font-sans select-none overflow-hidden">
      {/* BÊN TRÁI: BANNER THỂ THAO ĐẲNG CẤP */}
      <div className="relative hidden w-1/2 lg:flex flex-col justify-between p-12 overflow-hidden bg-[#0d0f17]">
        <div className="absolute inset-0 z-0">
          <img
            src={arenaImg}
            alt="AnhDuy Sport Banner"
            className="w-full h-full object-cover object-center filter brightness-[0.55] contrast-[1.1]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
          <div
            className="absolute -right-20 inset-y-0 w-80 bg-[#e31b23]/30 mix-blend-multiply pointer-events-none"
            style={{ clipPath: 'polygon(30% 0, 100% 0, 100% 100%, 0% 100%)' }}
          ></div>
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
              <span className="inline-block transform skew-x-12">GIA NHẬP HỘI VIÊN</span>
            </span>
          </div>
          <h2 className="text-4xl xl:text-5xl font-black uppercase text-white leading-tight tracking-tight drop-shadow-xl mb-4">
            KHỞI ĐẦU <span className="text-[#e31b23]">HÀNH TRÌNH</span> MỚI
          </h2>
          <p className="text-gray-300 text-sm xl:text-base font-semibold leading-relaxed border-l-4 border-[#e31b23] pl-4">
            Trở thành hội viên chính thức của AnhDuy Sport để nhận đặc quyền trải nghiệm trang thiết bị hiện đại và huấn luyện viên quốc tế.
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

      {/* BÊN PHẢI: FORM ĐĂNG KÝ */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-[#12141d] relative z-10 my-auto">
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
            <span className="inline-block text-[11px] font-black uppercase tracking-widest text-[#e31b23] bg-[#e31b23]/10 px-3 py-1 rounded-sm border border-[#e31b23]/30 mb-2">
              Tạo tài khoản mới
            </span>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">Đăng ký</h1>
            <p className="mt-2 text-xs sm:text-sm font-medium text-gray-400">
              Điền đầy đủ thông tin bên dưới để đăng ký tài khoản AnhDuy Sport.
            </p>
          </div>

          <form className="space-y-3.5" onSubmit={submit}>
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-300 mb-1">
                Họ và tên *
              </label>
              <input
                type="text"
                value={fullName}
                placeholder="vd: Nguyễn Văn A"
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl bg-[#0d0f17] border border-gray-700/80 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#e31b23] transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  placeholder="nguyenvana@gmail.com"
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-[#0d0f17] border border-gray-700/80 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#e31b23] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-300 mb-1">
                  Số điện thoại *
                </label>
                <input
                  type="tel"
                  value={phone}
                  placeholder="0901234567"
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl bg-[#0d0f17] border border-gray-700/80 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#e31b23] transition-all"
                />
              </div>
            </div>

            <div>
              <PasswordField
                label="Mật khẩu *"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <PasswordField
                label="Xác nhận mật khẩu *"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-950/60 border border-red-800/80 px-4 py-2.5 text-xs font-semibold text-red-300">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-[#e31b23] hover:bg-[#c4131a] px-4 py-3 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-red-900/40 cursor-pointer disabled:opacity-60 transition-all transform active:scale-[0.99] mt-2"
            >
              {saving ? 'Đang tạo tài khoản...' : 'Đăng ký ngay'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-800 flex items-center justify-between text-xs font-bold text-gray-400">
            <span>Đã có tài khoản?</span>
            <Link to="/dang-nhap" className="text-[#e31b23] hover:underline uppercase tracking-wider">
              Đăng nhập ngay →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}