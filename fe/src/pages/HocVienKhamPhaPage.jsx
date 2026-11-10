import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMemberMembership } from '../api/managementApi';
import StudentHeader from '../components/StudentHeader';
import Footer from '../components/Footer';

// Import hình ảnh cơ sở vật chất & khóa học
import facilityArena from '../assets/facilities/facility-arena-1024x683.webp';
import facilityPool from '../assets/facilities/facility-pool-1024x682.webp';
import facilityGym from '../assets/facilities/facility-basketball-1024x683.webp';
import facilityTheater from '../assets/facilities/facility-theater-1024x331.webp';

export default function HocVienKhamPhaPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [checkingMembership, setCheckingMembership] = useState(true);

  // Kiểm tra nếu học viên đã có gói hội viên thì đẩy sang Dashboard
  useEffect(() => {
    let isMounted = true;
    const userId = user?.id || user?.userId;

    if (userId) {
      getMemberMembership(userId)
        .then((res) => {
          if (!isMounted) return;
          // Nếu có thông tin gói hội viên đang hoạt động -> Chuyển hướng ngay sang Dashboard
          if (res?.highestPackageId || res?.currentMembership) {
            navigate('/hoc-vien-dashboard', { replace: true });
          } else {
            setCheckingMembership(false);
          }
        })
        .catch(() => {
          if (isMounted) setCheckingMembership(false);
        });
    } else {
      setCheckingMembership(false);
    }

    return () => {
      isMounted = false;
    };
  }, [user, navigate]);

  const displayName = user?.fullName || user?.userName || 'Học viên';
  const displayEmail = user?.email || 'Chưa cập nhật';
  const displayPhone = user?.phone || 'Chưa cập nhật';

  const handleLogout = async () => {
    if (logout) await logout();
    navigate('/dang-nhap');
  };

  // Tránh nhấp nháy giao diện khám phá trong lúc chờ API kiểm tra gói
  if (checkingMembership) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-sans text-sm">
        <div className="flex items-center gap-3">
          <div className="size-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          <span>Đang kiểm tra thông tin tài khoản...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-red-600 selection:text-white">
      {/* Keyframe Styles */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-delay-1 { animation-delay: 0.12s; }
        .animate-delay-2 { animation-delay: 0.24s; }
        .animate-delay-3 { animation-delay: 0.36s; }
      `}</style>

      {/* 1. STUDENT HEADER */}
      <StudentHeader user={user} onLogout={handleLogout} />

      {/* 2. HERO BANNER SANG TRỌNG & HIỆN ĐẠI */}
      <section className="relative flex w-full items-center overflow-hidden border-b border-slate-800/80 bg-slate-950 pt-32 pb-8 sm:min-h-[540px] sm:pt-28 sm:pb-0">
        {/* Glow ambient background effects */}
        <div className="absolute top-1/4 left-10 w-96 h-96 bg-red-600/15 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[28rem] h-[28rem] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="absolute inset-0 z-0">
          <img
            src={facilityArena}
            alt="Khu phức hợp AnhDuy Sport"
            className="w-full h-full object-cover object-center opacity-25 scale-105 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-5xl animate-fade-in-up flex-col items-center space-y-4 px-4 py-6 text-center sm:items-start sm:space-y-6 sm:px-12 sm:py-14 sm:text-left lg:px-16">
          <div className="inline-flex items-center gap-2 rounded-sm border border-red-800/50 bg-red-950/60 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-red-400 backdrop-blur-md sm:text-xs">
            <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
            Khu phức hợp thể thao
          </div>

          <h1 className="max-w-xl text-balance text-2xl font-black leading-tight tracking-tight text-white sm:text-5xl sm:leading-none">
            Chào mừng, <span className="bg-gradient-to-r from-red-500 via-rose-400 to-amber-300 bg-clip-text text-transparent">{displayName}</span>
          </h1>

          <p className="max-w-xl text-sm font-normal leading-relaxed text-slate-300 sm:max-w-3xl sm:text-lg">
            Khám phá không gian tập luyện chuẩn quốc tế. Chọn chương trình huấn luyện phù hợp hoặc kích hoạt gói hội viên để mở khóa toàn bộ tiện ích cùng trợ lý AI tối ưu lịch trình.
          </p>

          {/* User info badges with professional SVG icons */}
          <div className="flex w-full max-w-md flex-col items-stretch gap-2 pt-1 text-xs sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-800 bg-slate-900/90 px-3 py-2 font-medium text-slate-300 backdrop-blur-md sm:w-auto sm:justify-start">
              <svg className="size-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              <span className="min-w-0 truncate">{displayEmail}</span>
            </div>

            <div className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-800 bg-slate-900/90 px-3 py-2 font-medium text-slate-300 backdrop-blur-md sm:w-auto sm:justify-start">
              <svg className="size-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
              </svg>
              <span className="min-w-0 truncate">{displayPhone}</span>
            </div>

            <div className="flex w-full items-center justify-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 font-semibold text-amber-300 backdrop-blur-md sm:w-auto sm:justify-start">
              <span className="size-1.5 rounded-full bg-amber-400" />
              <span>Chưa kích hoạt gói</span>
            </div>
          </div>

          <div className="flex w-full max-w-md flex-col gap-2 pt-2 sm:max-w-none sm:flex-row sm:flex-wrap sm:gap-4">
            <Link
              to="/dang-ky-khoa-hoc-kham-pha"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#e31b23] px-5 py-3 text-xs font-bold uppercase tracking-wide text-white shadow-xl shadow-red-950/50 transition-all duration-200 hover:bg-red-700 sm:w-auto sm:px-7 sm:py-4 cursor-pointer"
            >
              <span>Khám phá các khóa học</span>
              <svg className="size-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              to="/dang-ky-thanh-vien-kham-pha"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-200 backdrop-blur-md transition-all duration-200 hover:bg-slate-800 hover:text-white sm:w-auto sm:px-7 sm:py-4 cursor-pointer"
            >
              Đăng ký gói hội viên
            </Link>
          </div>
        </div>
      </section>

      {/* 3. NỘI DUNG CHÍNH */}
      <main className="flex-1 w-full px-4 sm:px-8 lg:px-12 py-12 space-y-12">

        {/* BANNER DIRECT KHÓA HỌC THỂ THAO */}
        <section className="opacity-0 animate-fade-in-up animate-delay-1 relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-900 via-slate-900 to-red-950 border border-slate-800 shadow-2xl group">
          <div className="absolute inset-0 z-0 opacity-20 group-hover:scale-105 transition-transform duration-1000">
            <img src={facilityTheater} alt="Khóa học thể thao" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-transparent" />
          </div>

          <div className="relative z-10 flex flex-col items-center justify-between gap-6 p-5 text-center sm:p-12 lg:flex-row lg:items-center lg:p-14 lg:text-left">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-red-900/40 border border-red-700/40 text-red-400 text-[11px] font-bold uppercase tracking-widest backdrop-blur-md">
                Chương Trình Đào Tạo Chuyên Nghiệp
              </div>
              <h2 className="text-balance text-xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                Tìm Khóa Học Phù Hợp Cho Hành Trình Bứt Phá
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-normal">
                Hệ thống 50+ lớp học chuyên nghiệp từ cơ bản đến nâng cao. Đội ngũ Huấn luyện viên đạt chứng chỉ quốc tế sẵn sàng đồng hành cùng bạn.
              </p>

              <div className="flex flex-wrap gap-6 pt-2 text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-2">
                  <svg className="size-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Giảm giá khi gia hạn
                </span>
                <span className="flex items-center gap-2">
                  <svg className="size-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Tặng kèm Hạng Đồng
                </span>
                <span className="flex items-center gap-2">
                  <svg className="size-4 text-red-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Lịch học linh hoạt
                </span>
              </div>
            </div>

            <div className="shrink-0 w-full lg:w-auto">
              <Link
                to="/khoa-hoc"
                className="group relative inline-flex items-center justify-center gap-3 w-full lg:w-auto bg-[#e31b23] hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider px-8 py-4.5 rounded-md shadow-lg shadow-red-950/60 transition-all duration-200"
              >
                <span>Danh sách khóa học</span>
                <svg className="size-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* CARDS HÌNH THỨC TẬP LUYỆN */}
        <section className="opacity-0 animate-fade-in-up animate-delay-2 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Lớp Học Nhóm */}
          <div className="bg-slate-900/90 rounded-xl border border-slate-800 shadow-xl overflow-hidden flex flex-col justify-between group hover:border-slate-700 transition-all duration-300">
            <div className="relative h-60 overflow-hidden">
              <img
                src={facilityGym}
                alt="Lớp học nhóm"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
              <div className="absolute bottom-4 left-6 right-6 flex justify-between items-end">
                <div>
                  <span className="px-2.5 py-0.5 rounded-xs bg-red-700 text-white text-[10px] font-bold uppercase tracking-wider">
                    Phổ biến nhất
                  </span>
                  <h3 className="text-2xl font-black text-white mt-1">Đăng Ký Khóa Học Nhóm</h3>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                Tham gia không khí luyện tập sôi nổi cùng bạn học. Được hướng dẫn trực tiếp bởi đội ngũ Huấn luyện viên giàu kinh nghiệm với giáo án bài bản.
              </p>

              <ul className="space-y-2.5 text-xs font-medium text-slate-300">
                <li className="flex items-center gap-2.5">
                  <svg className="size-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Giáo án thiết kế chuẩn hóa cho từng bộ môn
                </li>
                <li className="flex items-center gap-2.5">
                  <svg className="size-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Tặng kèm Hạng Đồng sử dụng tiện ích trung tâm
                </li>
                <li className="flex items-center gap-2.5">
                  <svg className="size-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Lịch học cố định linh hoạt các buổi trong tuần
                </li>
              </ul>

              <div className="pt-4 border-t border-slate-800">
                <Link
                  to="/dang-ky-khoa-hoc-kham-pha"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#e31b23] hover:bg-red-700 text-white font-bold text-xs uppercase px-5 py-3.5 rounded-md shadow-md transition-all duration-200"
                >
                  <span>Chọn Lớp Nhóm & Đăng Ký</span>
                  <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          {/* Huấn Luyện Viên 1-1 */}
          <div className="bg-slate-900/90 rounded-xl border border-slate-800 shadow-xl overflow-hidden flex flex-col justify-between group hover:border-slate-700 transition-all duration-300">
            <div className="relative h-60 overflow-hidden">
              <img
                src={facilityPool}
                alt="Tập 1-1"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
              <div className="absolute bottom-4 left-6 right-6 flex justify-between items-end">
                <div>
                  <span className="px-2.5 py-0.5 rounded-xs bg-amber-500 text-slate-950 text-[10px] font-bold uppercase tracking-wider">
                    Đặc quyền VIP
                  </span>
                  <h3 className="text-2xl font-black text-white mt-1">Huấn Luyện Viên 1-1</h3>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                Lộ trình cá nhân hóa 100% dựa trên thể trạng và mục tiêu riêng. HLV kèm sát từng động tác, theo dõi sát sao chế độ dinh dưỡng và lịch tập.
              </p>

              <ul className="space-y-2.5 text-xs font-medium text-slate-300">
                <li className="flex items-center gap-2.5">
                  <svg className="size-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Tự chọn thời gian và Huấn luyện viên riêng
                </li>
                <li className="flex items-center gap-2.5">
                  <svg className="size-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Cam kết hiệu quả & đạt mục tiêu nhanh hơn
                </li>
                <li className="flex items-center gap-2.5">
                  <svg className="size-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Bảo lưu & linh hoạt sắp xếp ca tập riêng
                </li>
              </ul>

              <div className="pt-4 border-t border-slate-800">
                <Link
                  to="/dang-ky-khoa-hoc-kham-pha?type=private"
                  className="w-full inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase px-5 py-3.5 rounded-md shadow-md transition-all duration-200"
                >
                  <span>Đăng Ký Khóa Tập 1-1</span>
                  <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* THỐNG KÊ TỰ HÀO */}
        <section className="opacity-0 animate-fade-in-up animate-delay-3 bg-slate-900/80 rounded-xl p-8 text-white shadow-xl border border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-6 text-center backdrop-blur-md">
          <div className="space-y-1">
            <span className="text-3xl sm:text-4xl font-black text-red-500">50+</span>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Khóa Học Đa Dạng</p>
          </div>
          <div className="space-y-1">
            <span className="text-3xl sm:text-4xl font-black text-rose-400">100%</span>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">HLV Quốc Tế</p>
          </div>
          <div className="space-y-1">
            <span className="text-3xl sm:text-4xl font-black text-amber-400">24/7</span>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hỗ Trợ & Gợi Ý AI</p>
          </div>
          <div className="space-y-1">
            <span className="text-3xl sm:text-4xl font-black text-emerald-400">4.9 / 5</span>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Đánh Giá Hội Viên</p>
          </div>
        </section>
      </main>

      {/* 4. FOOTER */}
      <Footer />
    </div>
  );
}