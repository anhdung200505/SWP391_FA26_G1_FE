import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStudentShell } from '../components/workspace/studentShell';
import { studentWorkspaceItems } from '../components/workspace/studentNav';

// Học viên chưa có lớp dùng trang này làm "Tổng quan": cùng một menu với các trang còn lại.
const MENU_ITEMS = studentWorkspaceItems(false).map((item) =>
  item.id === 'overview' ? { ...item, to: '/hoc-vien-kham-pha' } : item,
);
const BREADCRUMB = [{ label: 'Học viên' }, { label: 'Tổng quan' }];

export default function HocVienKhamPhaPage() {
  const { user } = useAuth();
  const displayName = user?.fullName || user?.userName || 'Học viên';
  const displayEmail = user?.email || 'Chưa cập nhật';
  const displayPhone = user?.phone || 'Chưa cập nhật';

  useStudentShell({ items: MENU_ITEMS, breadcrumb: BREADCRUMB }, []);

  return (
    <>
      <div>
        <div className="mt-6 space-y-8 mb-12">
          {/* BANNER CHÀO MỪNG SANG TRỌNG */}
          <section className="relative overflow-hidden rounded-3xl bg-slate-900 text-white shadow-xl border border-slate-800">
            {/* Background Glow Overlay */}
            <div className="absolute -right-20 -top-20 w-96 h-96 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 p-6 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="space-y-4 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  Trải nghiệm dành riêng cho bạn
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                  Chào mừng, <span className="bg-gradient-to-r from-red-400 via-orange-400 to-amber-300 bg-clip-text text-transparent">{displayName}</span>! 👋
                </h1>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  Bắt đầu hành trình biến đổi bản thân cùng hệ thống huấn luyện tiêu chuẩn 5 sao. Đăng ký gói tập ngay hôm nay để kích hoạt trợ lý AI, lịch học riêng và đội ngũ HLV đồng hành.
                </p>

                {/* Badge thông tin nhanh */}
                <div className="pt-2 flex flex-wrap gap-3 text-xs">
                  <div className="bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 text-slate-200">
                    📧 <span className="font-semibold text-white ml-1">{displayEmail}</span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 text-slate-200">
                    📱 <span className="font-semibold text-white ml-1">{displayPhone}</span>
                  </div>
                  <div className="bg-amber-500/20 backdrop-blur-md px-3 py-2 rounded-xl border border-amber-500/30 text-amber-300 font-bold">
                    ⚡ Trạng thái: Chưa đăng ký gói
                  </div>
                </div>
              </div>

              {/* Nút thao tác nhanh */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[200px] shrink-0">
                <Link
                  to="/dang-ky-khoa-hoc"
                  className="inline-flex items-center justify-center gap-2 bg-[#e31b23] hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider px-6 py-4 rounded-2xl shadow-lg shadow-red-600/30 transition-all hover:scale-[1.02] active:scale-95 text-center"
                >
                  🔥 Đăng ký khóa học ngay
                </Link>
                <Link
                  to="/ho-so"
                  className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-5 py-3.5 rounded-2xl border border-slate-700 transition-all text-center"
                >
                  ⚙️ Chỉnh sửa hồ sơ
                </Link>
              </div>
            </div>
          </section>

          {/* THỐNG KÊ ẤN TƯỢNG */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-red-500 to-rose-600 text-white p-5 rounded-3xl shadow-md space-y-1">
              <span className="text-2xl font-black">50+</span>
              <p className="text-xs font-semibold text-red-100 uppercase tracking-wide">Khóa học thể thao</p>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 rounded-3xl shadow-md space-y-1">
              <span className="text-2xl font-black">100%</span>
              <p className="text-xs font-semibold text-blue-100 uppercase tracking-wide">HLV Quốc Tế</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-5 rounded-3xl shadow-md space-y-1">
              <span className="text-2xl font-black">24/7</span>
              <p className="text-xs font-semibold text-amber-100 uppercase tracking-wide">Gợi ý AI Cá nhân hóa</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-5 rounded-3xl shadow-md space-y-1">
              <span className="text-2xl font-black">4.9 ★</span>
              <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wide">Đánh giá từ hội viên</p>
            </div>
          </section>

          {/* 2 LỰA CHỌN TẬP LUYỆN CHÍNH */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* THẺ LỚP HỌC NHÓM */}
            <div className="group relative bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-bl-full group-hover:scale-110 transition-transform" />
              <div className="space-y-4 relative z-10">
                <div className="w-14 h-14 bg-red-100 text-[#e31b23] text-3xl flex items-center justify-center rounded-2xl font-black">
                  🏅
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase text-red-600 tracking-wider">Tập luyện tập thể</span>
                  <h3 className="text-xl font-black text-slate-900 mt-1">Đăng Ký Khóa Học Nhóm</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tham gia vào không khí tập luyện sôi nổi cùng các đồng môn. Lịch học phong phú các ca sáng, chiều, tối với chi phí tối ưu nhất.
                </p>
                <ul className="space-y-2 text-xs font-semibold text-slate-700 pt-2">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span> Giảng dạy theo giáo án tiêu chuẩn chuẩn hóa
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span> Linh hoạt chọn lịch và theo dõi chuyên cần
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span> Tăng tính kết nối và động lực tập luyện
                  </li>
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 relative z-10">
                <Link
                  to="/dang-ky-khoa-hoc"
                  className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-[#e31b23] text-white font-bold text-xs uppercase px-5 py-3.5 rounded-xl shadow transition-all group-hover:shadow-red-500/20"
                >
                  Xem danh sách lớp & Đăng ký →
                </Link>
              </div>
            </div>

            {/* THẺ HỌC 1-1 */}
            <div className="group relative bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full group-hover:scale-110 transition-transform" />
              <div className="space-y-4 relative z-10">
                <div className="w-14 h-14 bg-amber-100 text-amber-600 text-3xl flex items-center justify-center rounded-2xl font-black">
                  🎯
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase text-amber-600 tracking-wider">Đặc quyền VIP</span>
                  <h3 className="text-xl font-black text-slate-900 mt-1">Huấn Luyện Viên 1-1</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Lộ trình được thiết kế riêng biệt 100% dựa trên chỉ số cơ thể, mục tiêu giảm cân/tăng cơ và tình trạng sức khỏe thực tế của bạn.
                </p>
                <ul className="space-y-2 text-xs font-semibold text-slate-700 pt-2">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span> HLV cam kết đồng hành và sửa tư thế từng buổi
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span> Chủ động thỏa thuận thời gian tập riêng
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span> Đạt mục tiêu nhanh gấp 3 lần tập nhóm
                  </li>
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 relative z-10">
                <Link
                  to="/hoc-vien/hoc-1-1"
                  className="w-full inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase px-5 py-3.5 rounded-xl shadow transition-all"
                >
                  Yêu cầu tư vấn Học 1-1 →
                </Link>
              </div>
            </div>
          </div>

          {/* QUYỀN LỢI HỘI VIÊN CHÍNH THỨC */}
          <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <h2 className="text-2xl font-black text-slate-900">Đặc quyền sau khi đăng ký thành công</h2>
              <p className="text-xs text-slate-500">Mọi tính năng nâng cao trong Dashboard sẽ được mở khóa tự động</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-2">
                <div className="text-3xl">📅</div>
                <h4 className="font-bold text-slate-900 text-sm">Lịch học thông minh</h4>
                <p className="text-xs text-slate-500">Xem điểm danh, lịch học hàng tuần và thông báo đổi ca ngay trên ứng dụng.</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-2">
                <div className="text-3xl">🤖</div>
                <h4 className="font-bold text-slate-900 text-sm">Trợ lý bài tập AI</h4>
                <p className="text-xs text-slate-500">Đề xuất bài tập bổ trợ tại nhà phù hợp với nhóm cơ và lượng calo tiêu thụ.</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-2">
                <div className="text-3xl">🛟</div>
                <h4 className="font-bold text-slate-900 text-sm">Hỗ trợ ưu tiên 24/7</h4>
                <p className="text-xs text-slate-500">Gửi đơn yêu cầu bảo lưu, chuyển ca học hoặc khiếu nại tới Ban Quản Lý cực nhanh.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}