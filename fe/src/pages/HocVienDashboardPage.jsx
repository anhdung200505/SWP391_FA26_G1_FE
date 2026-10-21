import React, { useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

export default function HocVienDashboardPage() {
  const { user } = useAuth();

  useEffect(() => {
    document.title = 'Dashboard Học viên · AnhDuy Sport';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="relative w-full min-h-screen font-sans bg-[#0d0f17] text-white select-none overflow-x-hidden flex flex-col justify-between">
      <Header forceWhite />

      <main className="pt-32 pb-20 px-6 sm:px-12 lg:px-16 max-w-7xl mx-auto w-full flex-1">
        <div className="mb-8">
          <span className="text-xs font-black uppercase tracking-widest text-[#e31b23] bg-[#e31b23]/10 px-3.5 py-1 rounded-sm border border-[#e31b23]/30 mb-2 inline-block">
            TRANG CÁ NHÂN HỌC VIÊN
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
            XIN CHÀO, <span className="text-[#e31b23]">{user?.fullName || 'HỌC VIÊN'}</span>!
          </h1>
          <p className="text-gray-400 text-sm mt-2 font-medium">
            Chào mừng bạn đến với trung tâm quản lý học tập thể thao AnhDuy Sport.
          </p>
        </div>

        {/* CÁC CARD THÔNG TIN DASHBOARD */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-[#181d2a] p-6 rounded-2xl border border-gray-800 shadow-xl">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider block mb-1">Email đăng ký</span>
            <span className="text-lg font-black text-white truncate block">{user?.email || 'Chưa cập nhật'}</span>
          </div>

          <div className="bg-[#181d2a] p-6 rounded-2xl border border-gray-800 shadow-xl">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider block mb-1">Số điện thoại</span>
            <span className="text-lg font-black text-white block">{user?.phone || 'Chưa cập nhật'}</span>
          </div>

          <div className="bg-[#181d2a] p-6 rounded-2xl border border-gray-800 shadow-xl">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider block mb-1">Trạng thái tài khoản</span>
            <span className="inline-block bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-xs font-bold px-3 py-1 rounded-md mt-1">
              ✓ Đã kích hoạt
            </span>
          </div>
        </div>

        <div className="bg-[#181d2a] rounded-3xl p-8 border border-gray-800 text-center shadow-2xl py-16">
          <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
            LỊCH HỌC & KHÓA HỌC ĐÃ ĐĂNG KÝ
          </h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
            Bạn chưa đăng ký lớp học nào. Hãy khám phá danh sách các khóa học thể thao để bắt đầu rèn luyện!
          </p>
          <a
            href="/khoa-hoc"
            className="inline-block bg-[#e31b23] hover:bg-[#c4131a] text-white font-black text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl shadow-lg transition-all"
          >
            Khám phá các khóa học →
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}