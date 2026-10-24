import { Link } from 'react-router-dom';
import ChangePasswordForm from '../account/ChangePasswordForm';

export default function StaffAccountSettings() {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8">
      <h2 className="text-lg font-black text-gray-900">Cài đặt tài khoản</h2>
      <p className="mt-1 text-sm text-gray-500">Đổi mật khẩu đăng nhập. Tên, email và số điện thoại sửa ở hồ sơ cá nhân.</p>
      <Link to="/ho-so" className="mt-3 inline-flex text-sm font-bold text-[#e31b23]">
        Mở hồ sơ cá nhân
      </Link>

      <div className="mt-6">
        <ChangePasswordForm />
      </div>
    </section>
  );
}
