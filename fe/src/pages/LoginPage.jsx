import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import arenaImg from '../assets/facilities/facility-arena-1024x683.webp';
import PasswordField from '../components/PasswordField';
import { forgotPassword, resetPassword, updateMemberProfile } from '../api/managementApi';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { user, updateUser, loginAsMember, loginAsStaff, loginWithGoogle, getGoogleClientId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [portal, setPortal] = useState('member'); // 'member' | 'staff'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [googleChoice, setGoogleChoice] = useState(null);
  const [forgotStep, setForgotStep] = useState(null);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);
  const needsContact = (user?.roleId || user?.role) === 'MEMBER' && !String(user?.phone || '').trim();

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = setTimeout(() => setResendSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  // Hàm helper điều hướng theo vai trò người dùng
  const getRoleRedirectPath = (userInfo) => {
    const role = userInfo?.roleId || userInfo?.role;
    if (role === 'RECEPTIONIST') return '/le-tan';
    if (role === 'ADMIN') return '/quan-ly';
    if (role === 'STAFF') return '/le-tan';
    if (role === 'COACH') return '/hlv/lop-hoc';
    
    // Với tài khoản MEMBER (hoặc mặc định), luôn tự động vào /hoc-vien-dashboard
    return '/hoc-vien-dashboard';
  };

  if (user && !needsContact) {
    return <Navigate to={getRoleRedirectPath(user)} replace />;
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
      let loggedInUser;
      if (portal === 'member') {
        loggedInUser = await loginAsMember(email.trim(), password);
      } else {
        loggedInUser = await loginAsStaff(email.trim(), password);
      }

      // Điều hướng đến đúng Route theo Role
      const targetPath = getRoleRedirectPath(loggedInUser);
      navigate(targetPath, { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Đăng nhập thất bại.');
      setSaving(false);
    }
  };

  const finishGmail = (loggedInUser) => {
    if ((loggedInUser?.roleId || loggedInUser?.role) === 'MEMBER' && !String(loggedInUser?.phone || '').trim()) {
      setFullName(loggedInUser.fullName || '');
      setPhoneNumber('');
      setSaving(false);
      return;
    }
    navigate(getRoleRedirectPath(loggedInUser), { replace: true });
  };

  const openGoogleAccount = async () => {
    if (saving || portal !== 'member') return;
    setError('');
    setSaving(true);
    try {
      const config = await getGoogleClientId();
      const clientId = config?.clientId?.trim() || '';
      if (!clientId) {
        throw new Error('Chưa có Client ID Google. Tạo OAuth client loại Web, thêm origin http://localhost:5173, rồi dán vào be/config/google.json và khởi động lại API.');
      }
      await loadGoogleIdentity();
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid email profile',
        prompt: 'select_account',
        callback: async (response) => {
          if (!response || response.error || !response.access_token) {
            setError(response?.error === 'access_denied' ? 'Đã đóng cửa sổ Google.' : 'Không đăng nhập được Google.');
            setSaving(false);
            return;
          }
          setSaving(true);
          try {
            const result = await loginWithGoogle(response.access_token, portal);
            if (result?.requiresChoice) {
              setGoogleChoice({
                email: result.email,
                fullName: result.fullName,
                accessToken: response.access_token,
              });
              setSaving(false);
              return;
            }
            setGoogleChoice(null);
            finishGmail(result);
          } catch (requestError) {
            setError(requestError.message || 'Đăng nhập Google thất bại.');
            setSaving(false);
          }
        },
      });
      client.requestAccessToken();
      setSaving(false);
    } catch (requestError) {
      setError(requestError.message || 'Không mở được cửa sổ Google.');
      setSaving(false);
    }
  };

  const enterExistingGoogle = async () => {
    if (saving || !googleChoice?.accessToken) return;
    setError('');
    setSaving(true);
    try {
      const loggedInUser = await loginWithGoogle(googleChoice.accessToken, portal, true);
      setGoogleChoice(null);
      finishGmail(loggedInUser);
    } catch (requestError) {
      setError(requestError.message || 'Không vào được tài khoản. Hãy đăng nhập bằng Google lại.');
      setSaving(false);
    }
  };

  const backToPasswordLogin = () => {
    setEmail(googleChoice?.email || email);
    setGoogleChoice(null);
    setError('');
    setSaving(false);
  };

  const openForgotPassword = () => {
    setForgotStep('email');
    setError('');
    setNotice('');
    setResetCode('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const closeForgotPassword = () => {
    setForgotStep(null);
    setError('');
    setNotice('');
    setResetCode('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const sendResetCode = async (event) => {
    event?.preventDefault();
    if (saving) return;
    setError('');
    setNotice('');
    const address = email.trim();
    if (!address || !address.includes('@')) {
      setError('Vui lòng nhập email hợp lệ.');
      return;
    }
    setSaving(true);
    try {
      await forgotPassword(address);
      setForgotStep('reset');
      setNotice('Đã gửi mã OTP.');
      setResendSeconds(60);
    } catch (requestError) {
      setError(requestError.message || 'Không gửi được mã.');
    } finally {
      setSaving(false);
    }
  };

  const submitNewPassword = async (event) => {
    event.preventDefault();
    if (saving) return;
    setError('');
    setNotice('');
    const code = resetCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setError('Mã OTP gồm 6 chữ số.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (newPassword.length < 6 || newPassword.length > 100 || !/[@#!]/.test(newPassword)) {
      setError('Mật khẩu cần từ 6 đến 100 ký tự và có ít nhất một ký tự @, # hoặc !.');
      return;
    }
    setSaving(true);
    try {
      await resetPassword(email.trim(), code, newPassword);
      setPassword('');
      setResetCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setForgotStep(null);
      setNotice('Đặt lại mật khẩu thành công. Hãy đăng nhập bằng mật khẩu mới.');
    } catch (requestError) {
      setError(requestError.message || 'Không đặt lại được mật khẩu.');
    } finally {
      setSaving(false);
    }
  };

  const saveContact = async (event) => {
    event.preventDefault();
    if (saving) return;
    setError('');
    const name = fullName.trim();
    const phone = phoneNumber.replace(/\s/g, '');
    if (!name) {
      setError('Vui lòng nhập họ tên.');
      return;
    }
    if (!/^0\d{9}$/.test(phone)) {
      setError('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.');
      return;
    }
    setSaving(true);
    try {
      const result = await updateMemberProfile(user.id, { fullName: name, phone, gender: '' });
      const savedName = result?.profile?.fullName || name;
      const savedPhone = result?.profile?.phone || phone;
      updateUser({ fullName: savedName, phone: savedPhone });
      navigate(getRoleRedirectPath({ ...user, phone: savedPhone }), { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Không lưu được thông tin.');
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-dvh w-full bg-[#0d0f17] font-sans select-none overflow-x-hidden">
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
      <div className="w-full lg:w-1/2 flex items-start sm:items-center justify-center overflow-y-auto px-4 py-6 sm:p-12 md:p-16 bg-[#12141d] relative z-10">
        <div className="w-full max-w-md bg-[#181d2a] rounded-2xl p-5 sm:p-10 border border-gray-800 shadow-2xl">
          <div className="lg:hidden mb-6 flex justify-center">
            <Link to="/home" className="inline-flex items-center gap-2.5">
              <img src={logoImg} alt="AnhDuy Sport" className="h-10 w-auto object-contain" />
              <span className="text-xl font-black italic tracking-wider text-white">
                AnhDuy <span className="text-[#e31b23]">Sport</span>
              </span>
            </Link>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">
              {needsContact ? 'Hoàn tất hồ sơ' : googleChoice ? 'Tài khoản đã đăng ký' : forgotStep ? 'Quên mật khẩu' : 'Đăng nhập'}
            </h1>
            <p className="mt-2 text-xs sm:text-sm font-medium text-gray-400">
              {needsContact
                ? `Gmail ${user.email} đã xác thực. Nhập họ tên và số điện thoại để vào trung tâm.`
                : googleChoice
                  ? `Gmail ${googleChoice.email} đã đăng ký bằng email và mật khẩu.`
                  : forgotStep === 'reset'
                    ? `Nhập mã OTP đã gửi tới ${email.trim()} và mật khẩu mới.`
                    : forgotStep
                      ? 'Nhập email tài khoản. Mã OTP sẽ được gửi tới email đó.'
                      : 'Chọn cổng đăng nhập tương ứng với tài khoản của bạn.'}
            </p>
          </div>

          {needsContact ? (
            <form className="space-y-4" onSubmit={saveContact}>
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-300 mb-1.5">
                  Họ và tên
                </label>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full rounded-xl bg-[#0d0f17] border border-gray-700/80 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-[#e31b23] focus:ring-1 focus:ring-[#e31b23] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-300 mb-1.5">
                  Số điện thoại
                </label>
                <input
                  value={phoneNumber}
                  inputMode="tel"
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  placeholder="0901234567"
                  className="w-full rounded-xl bg-[#0d0f17] border border-gray-700/80 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-[#e31b23] focus:ring-1 focus:ring-[#e31b23] transition-all"
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
                {saving ? 'Đang lưu...' : 'Vào trang học viên'}
              </button>
            </form>
          ) : googleChoice ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-700/80 bg-amber-950/50 px-4 py-3 text-sm font-medium text-amber-100">
                Tài khoản này đã được đăng ký. Bạn có thể vào tài khoản Gmail đó, hoặc quay lại đăng nhập bằng mật khẩu.
              </div>
              {error && (
                <div className="rounded-xl bg-red-950/60 border border-red-800/80 px-4 py-3 text-xs font-semibold text-red-300">
                  ⚠️ {error}
                </div>
              )}
              <button
                type="button"
                disabled={saving}
                onClick={enterExistingGoogle}
                className="w-full rounded-xl bg-[#e31b23] hover:bg-[#c4131a] px-4 py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-red-900/40 cursor-pointer disabled:opacity-60"
              >
                {saving ? 'Đang vào...' : 'Vào tài khoản này'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={backToPasswordLogin}
                className="w-full rounded-xl border border-gray-600 bg-transparent px-4 py-3.5 text-sm font-bold text-white cursor-pointer disabled:opacity-60"
              >
                Đăng nhập lại
              </button>
            </div>
          ) : forgotStep === 'email' ? (
            <form className="space-y-4" onSubmit={sendResetCode}>
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
              {error && (
                <div className="rounded-xl bg-red-950/60 border border-red-800/80 px-4 py-3 text-xs font-semibold text-red-300">
                  ⚠️ {error}
                </div>
              )}
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-[#e31b23] hover:bg-[#c4131a] px-4 py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-red-900/40 cursor-pointer disabled:opacity-60"
              >
                {saving ? 'Đang gửi...' : 'Gửi mã OTP'}
              </button>
              <button
                type="button"
                onClick={closeForgotPassword}
                className="w-full text-xs font-bold text-gray-400 hover:text-white"
              >
                ← Quay lại đăng nhập
              </button>
            </form>
          ) : forgotStep === 'reset' ? (
            <form className="space-y-4" onSubmit={submitNewPassword}>
              {notice && (
                <div className="rounded-xl border border-emerald-800/80 bg-emerald-950/50 px-4 py-3 text-xs font-semibold text-emerald-200">
                  {notice}
                </div>
              )}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-300 mb-1.5">
                  Mã OTP
                </label>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={resetCode}
                  placeholder="6 chữ số"
                  onChange={(event) => setResetCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full rounded-xl bg-[#0d0f17] border border-gray-700/80 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-[#e31b23] focus:ring-1 focus:ring-[#e31b23] transition-all"
                />
              </div>
              <PasswordField
                label="Mật khẩu mới"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                hint="6–100 ký tự, có @, # hoặc !."
              />
              <PasswordField
                label="Nhập lại mật khẩu"
                autoComplete="new-password"
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
              />
              {error && (
                <div className="rounded-xl bg-red-950/60 border border-red-800/80 px-4 py-3 text-xs font-semibold text-red-300">
                  ⚠️ {error}
                </div>
              )}
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-[#e31b23] hover:bg-[#c4131a] px-4 py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-red-900/40 cursor-pointer disabled:opacity-60"
              >
                {saving ? 'Đang lưu...' : 'Đặt lại mật khẩu'}
              </button>
              <button
                type="button"
                disabled={saving || resendSeconds > 0}
                onClick={sendResetCode}
                className="w-full text-xs font-bold text-gray-300 disabled:text-gray-500"
              >
                {resendSeconds > 0 ? `Gửi lại mã sau ${resendSeconds}s` : 'Gửi lại mã'}
              </button>
              <button
                type="button"
                onClick={closeForgotPassword}
                className="w-full text-xs font-bold text-gray-400 hover:text-white"
              >
                ← Quay lại đăng nhập
              </button>
            </form>
          ) : (
          <>
          {/* CỔNG ĐĂNG NHẬP (TAB PORTAL) */}
          <div className="grid grid-cols-2 gap-2 bg-[#0d0f17] p-1.5 rounded-xl border border-gray-800 mb-3">
            <button
              type="button"
              onClick={() => { setPortal('member'); setError(''); }}
              aria-pressed={portal === 'member'}
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
              onClick={() => { setPortal('staff'); setGoogleChoice(null); setError(''); }}
              aria-pressed={portal === 'staff'}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                portal === 'staff'
                  ? 'bg-[#e31b23] text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Nhân viên
            </button>
          </div>

          <p className="mb-6 text-center text-[11px] font-medium text-gray-400" aria-live="polite">
            {portal === 'member'
              ? 'Dành cho học viên đã đăng ký.'
              : 'Dành cho Quản lý, Lễ tân và Huấn luyện viên.'}
          </p>

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

            <div className="flex justify-end">
              <button
                type="button"
                onClick={openForgotPassword}
                className="text-xs font-bold text-[#e31b23] hover:underline"
              >
                Quên mật khẩu?
              </button>
            </div>

            {notice && (
              <div className="rounded-xl border border-emerald-800/80 bg-emerald-950/50 px-4 py-3 text-xs font-semibold text-emerald-200">
                {notice}
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-950/60 border border-red-800/80 px-4 py-3 text-xs font-semibold text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-[#e31b23] hover:bg-[#c4131a] px-4 py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-red-900/40 cursor-pointer disabled:opacity-60 transition-all transform active:scale-[0.99]"
            >
              {saving ? 'Đang xác thực...' : portal === 'member' ? 'Đăng nhập Học viên' : 'Đăng nhập Nhân viên'}
            </button>
          </form>

          {portal === 'member' && (
          <div className="mt-5">
            <div className="mb-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <span className="h-px flex-1 bg-gray-800" />
              hoặc
              <span className="h-px flex-1 bg-gray-800" />
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={openGoogleAccount}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-700 bg-white px-4 py-3 text-sm font-bold text-slate-800 disabled:opacity-60"
            >
              <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.7 7.1l6.3 5.3C37.4 38.4 44 33 44 24c0-1.2-.1-2.3-.4-3.5z" />
              </svg>
              Đăng nhập bằng Google
            </button>
          </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold text-gray-400">
            <span>Chưa có tài khoản?</span>
            <Link to="/dang-ky" className="text-[#e31b23] hover:underline uppercase tracking-wider">
              Đăng ký ngay →
            </Link>
          </div>
          </>
          )}

          {!forgotStep && (
            <div className="mt-4 text-center">
              <Link to="/home" className="inline-block text-xs font-semibold text-gray-500 hover:text-gray-300 transition-colors">
                ← Quay lại trang chủ
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function loadGoogleIdentity() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-identity="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Không tải được cửa sổ Google.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Không tải được cửa sổ Google.'));
    document.head.appendChild(script);
  });
}
