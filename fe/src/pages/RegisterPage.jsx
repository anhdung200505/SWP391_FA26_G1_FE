import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import arenaImg from '../assets/facilities/facility-arena-1024x683.webp';
import PasswordField from '../components/PasswordField';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { sendOtp, confirmOtp } = useAuth();

  const [step, setStep] = useState('fill'); // 'fill' | 'otp'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // Submit Bước 1: Gửi thông tin nhận OTP
  const handleSubmitInfo = async (event) => {
    event.preventDefault();
    if (saving) return;
    setError('');
    setSuccessMsg('');

    if (!fullName.trim() || !email.trim() || !phone.trim() || !password) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setSaving(true);
    const payload = {
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
    };

    try {
      await sendOtp(payload);
      setStep('otp');
    } catch (requestError) {
      setError(requestError.message || 'Không thể gửi mã OTP. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setSaving(false);
    }
  };

  // Submit Bước 2: Xác nhận OTP -> Tự động Đăng nhập & Chuyển hướng
  const handleConfirmOtp = async (event) => {
    event.preventDefault();
    if (saving) return;
    setError('');
    setSuccessMsg('');

    if (!otpCode.trim()) {
      setError('Vui lòng nhập mã OTP.');
      return;
    }

    setSaving(true);

    try {
      // confirmOtp sẽ trả về token và lưu session đăng nhập tự động
      await confirmOtp({ email: email.trim(), code: otpCode.trim() });
      setSuccessMsg('Xác nhận OTP thành công! Đang tự động đăng nhập...');

      setTimeout(() => {
        navigate('/hoc-vien-dashboard');
      }, 1200);
    } catch (requestError) {
      setError(requestError.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#0d0f17] font-sans select-none overflow-hidden">
      {/* BANNER BÊN TRÁI */}
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
              GIA NHẬP HỘI VIÊN
            </span>
          </div>
          <h2 className="text-4xl xl:text-5xl font-black uppercase text-white leading-tight tracking-tight drop-shadow-xl mb-4">
            KHỞI ĐẦU <span className="text-[#e31b23]">HÀNH TRÌNH</span> MỚI
          </h2>
          <p className="text-gray-300 text-sm xl:text-base font-semibold leading-relaxed border-l-4 border-[#e31b23] pl-4">
            Trở thành học viên chính thức của AnhDuy Sport để nhận đặc quyền trải nghiệm tập luyện chuyên nghiệp.
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

      {/* FORM BÊN PHẢI */}
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
              {step === 'fill'
                ? 'Nhập đầy đủ thông tin để tạo tài khoản mới.'
                : `Mã OTP đã được gửi về email ${email}. Vui lòng nhập mã để kích hoạt.`}
            </p>
          </div>

          {step === 'fill' ? (
            <form className="space-y-3.5" onSubmit={handleSubmitInfo}>
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
                {saving ? 'Đang gửi mã OTP...' : 'Tiếp tục (Nhận OTP)'}
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleConfirmOtp}>
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-300 mb-1.5">
                  Nhập mã OTP từ Email
                </label>
                <input
                  type="text"
                  value={otpCode}
                  placeholder="••••••"
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full rounded-xl bg-[#0d0f17] border border-gray-700/80 px-4 py-3 text-center text-lg font-mono font-bold tracking-widest text-white placeholder-gray-600 outline-none focus:border-[#e31b23] transition-all"
                />
              </div>

              {/* KHỐI THÔNG BÁO LỖI VÀ THÀNH CÔNG CHUẨN UI */}
              {error && (
                <div className="rounded-xl bg-red-950/60 border border-red-800/80 px-4 py-2.5 text-xs font-semibold text-red-300">
                  ⚠️ {error}
                </div>
              )}

              {successMsg && (
                <div className="rounded-xl bg-emerald-950/70 border border-emerald-700/80 px-4 py-3 text-xs font-bold text-emerald-300 flex items-center gap-2">
                  <span>✓</span> {successMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-[#e31b23] hover:bg-[#c4131a] px-4 py-3 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-red-900/40 cursor-pointer disabled:opacity-60 transition-all transform active:scale-[0.99]"
              >
                {saving ? 'Đang xác minh...' : 'Xác nhận Đăng ký'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('fill'); setError(''); setSuccessMsg(''); }}
                className="w-full text-xs font-bold text-gray-400 hover:text-white transition-colors"
              >
                ← Quay lại sửa thông tin
              </button>
            </form>
          )}

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