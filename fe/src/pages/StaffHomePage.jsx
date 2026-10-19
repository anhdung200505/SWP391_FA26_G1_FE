import { Link, Navigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';

export default function StaffHomePage() {
  const { user, logout } = useAuth();

  if (!user) {
    return <Navigate to="/dang-nhap" replace />;
  }

  if (user.roleId === 'ADMIN') {
    return <Navigate to="/quan-ly" replace />;
  }

  if (user.roleId !== 'COACH' && user.roleId !== 'RECEPTIONIST') {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      <Header forceWhite />
      <main className="mx-auto w-full max-w-lg px-4 pb-16 pt-28">
        <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e31b23]">Nhân sự</p>
          <h1 className="mt-2 text-2xl font-black text-gray-900">Xin chào, {user.fullName}</h1>
          <p className="mt-2 text-sm text-gray-500">
            Bạn đang đăng nhập với vai trò {user.roleName}. Tài khoản này do quản trị trung tâm tạo. Chỉ quản trị trung tâm tạo thêm lễ tân và huấn luyện viên.
          </p>
          <p className="mt-4 text-sm font-semibold text-gray-700">{user.email}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/home" className="rounded-xl bg-[#e31b23] px-4 py-2.5 text-sm font-bold text-white">
              Về trang chủ
            </Link>
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-800"
            >
              Đăng xuất
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
