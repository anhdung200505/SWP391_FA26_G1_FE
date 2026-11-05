import { Link } from 'react-router-dom';
import ChangePasswordForm from '../account/ChangePasswordForm';

export default function StaffAccountSettings() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
      <h2 className="text-lg font-black text-slate-900">Cài đặt tài khoản</h2>
      <p className="mt-1 text-sm text-slate-500">Đổi mật khẩu đăng nhập. Tên, email và số điện thoại sửa ở hồ sơ cá nhân.</p>
      <Link to="/ho-so" className="mt-3 inline-flex text-sm font-bold text-[#e31b23] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e31b23]">
        Mở hồ sơ cá nhân
      </Link>

      <div className="mt-6">
        <ChangePasswordForm />
      </div>
    </section>
  );
}
