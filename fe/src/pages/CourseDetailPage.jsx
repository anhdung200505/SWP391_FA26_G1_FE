import React, { useEffect, useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { fontDetails } from '../data/coursesData';
import { getSportsByCenter, getClasses } from '../api/managementApi';
import { formatFee } from '../data/accountManagement';

export default function CourseDetailPage() {
  const { courseSlug } = useParams();
  const courseStatic = fontDetails[courseSlug];

  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [error, setError] = useState('');

  // Cuộn mượt lên đầu trang & cập nhật Title khi đổi slug
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (courseStatic) {
      document.title = `${courseStatic.title} · AnhDuy Sport`;
    }
  }, [courseSlug, courseStatic]);

  // Gọi API lấy dữ liệu Lớp học thực tế
  useEffect(() => {
    async function fetchClassesData() {
      try {
        setLoadingClasses(true);
        // Lấy danh sách sports để map slug sang sportId
        const sportsList = await getSportsByCenter('1');
        
        // Tìm sport phù hợp với slug trên URL (ví dụ: 'boi-loi' -> code/slug)
        const currentSport = sportsList.find(
          (s) => s.code === courseSlug || s.id === courseSlug || courseSlug.includes(s.code)
        );

        if (currentSport) {
          const classData = await getClasses('1', currentSport.id);
          setClasses(Array.isArray(classData) ? classData : []);
        } else {
          // Nếu không khớp sportId chính xác, thử lấy toàn bộ hoặc lấy theo index
          const fallbackClasses = await getClasses('1', '1');
          setClasses(Array.isArray(fallbackClasses) ? fallbackClasses : []);
        }
      } catch (err) {
        setError('Không thể tải thông tin lớp học từ máy chủ.');
      } finally {
        setLoadingClasses(false);
      }
    }

    if (courseStatic) {
      fetchClassesData();
    }
  }, [courseSlug, courseStatic]);

  if (!courseStatic) {
    return <Navigate to="/khoa-hoc" replace />;
  }

  return (
    <div className="relative w-full min-h-screen font-sans bg-[#0d0f17] text-white select-none overflow-x-hidden">
      {/* 1. HEADER NỀN TRẮNG CỐ ĐỊNH */}
      <Header forceWhite />

      {/* 2. HERO BANNER MÔN HỌC (ĐÃ BỎ 4 KHỐI ĐỎ NẰM ĐÁY) */}
      <section className="relative w-full min-h-[85vh] pt-24 pb-16 bg-[#0d0f17] overflow-hidden flex flex-col justify-center">
        {/* KHỐI ẢNH NỀN HERO & GRADIENT */}
        <div className="absolute inset-0 z-0">
          <img
            src={courseStatic.heroBg}
            alt={courseStatic.title}
            className="w-full h-full object-cover object-center filter brightness-[0.55] contrast-[1.1]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f17] via-transparent to-black/40"></div>
          
          <div
            className="absolute inset-y-0 right-0 w-full lg:w-[50%] bg-[#e31b23]/20 mix-blend-multiply pointer-events-none"
            style={{
              clipPath: window.innerWidth >= 1024 ? 'polygon(25% 0, 100% 0, 100% 100%, 0% 100%)' : 'none',
            }}
          ></div>
        </div>

        {/* NỘI DUNG CHÍNH HERO */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 my-auto pt-10">
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <span className="inline-block bg-[#e31b23] text-white font-black text-xs sm:text-sm px-4 py-1.5 transform -skew-x-12 uppercase tracking-widest shadow-lg">
              <span className="inline-block transform skew-x-12">
                ANHDUY SPORT • {courseStatic.category}
              </span>
            </span>
            <span className="bg-black/70 backdrop-blur-md border border-gray-700 text-gray-200 font-extrabold text-xs px-3.5 py-1.5 uppercase tracking-wider rounded-sm">
              {courseStatic.level}
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white uppercase tracking-tight leading-none drop-shadow-2xl mb-6">
            {courseStatic.title}
          </h1>

          <p className="max-w-2xl text-gray-200 text-sm sm:text-base md:text-lg font-semibold leading-relaxed drop-shadow-md border-l-4 border-[#e31b23] pl-4">
            {courseStatic.desc}
          </p>

          {/* DẢI THÔNG SỐ TINH TẾ RẤT GỌN GÀNG (MỚI) */}
          {courseStatic.stats && (
            <div className="mt-8 flex flex-wrap gap-6 pt-6 border-t border-gray-800/80">
              {courseStatic.stats.map((st, idx) => (
                <div key={idx} className="flex flex-col">
                  <span className="text-2xl sm:text-3xl font-black text-[#e31b23] tracking-tight">
                    {st.value}
                  </span>
                  <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                    {st.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 3. DANH SÁCH BẢNG LỚP HỌC & HLV TRƯỞNG (CHI TIẾT TỪ API) */}
      <section className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 py-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-4 border-b border-gray-800">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-[#e31b23] bg-[#e31b23]/10 px-3.5 py-1 rounded-sm border border-[#e31b23]/30 mb-2 inline-block">
              LỊCH HỌC & HUẤN LUYỆN VIÊN
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
              CÁC LỚP <span className="text-[#e31b23]">ĐANG MỞ ĐĂNG KÝ</span>
            </h2>
          </div>
          <p className="text-xs text-gray-400 font-semibold mt-2 md:mt-0">
            Cập nhật trực tiếp từ hệ thống quản lý AnhDuy Sport
          </p>
        </div>

        {loadingClasses ? (
          <div className="py-16 text-center text-gray-400 font-bold">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#e31b23] border-t-transparent mb-3"></div>
            <p>Đang tải danh sách lớp học và HLV...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-red-950/40 border border-red-800 text-red-300 text-sm font-bold">
            ⚠️ {error}
          </div>
        ) : classes.length === 0 ? (
          <div className="bg-[#181d2a] rounded-3xl p-12 text-center border border-gray-800 shadow-xl">
            <p className="text-lg font-bold text-gray-300">Hiện chưa có lớp học mới cho bộ môn này.</p>
            <p className="text-xs text-gray-500 mt-2">Vui lòng liên hệ hotline 028.7300.0000 để nhận lịch khai giảng gần nhất.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {classes.map((item) => (
              <div
                key={item.id}
                className="bg-[#181d2a] rounded-3xl p-6 border border-gray-800 hover:border-[#e31b23]/60 transition-all duration-300 shadow-2xl flex flex-col justify-between group"
              >
                <div>
                  {/* Cấp độ & Badge chỗ trống */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#e31b23] bg-[#e31b23]/10 px-2.5 py-1 rounded-md border border-[#e31b23]/30">
                      {item.level || 'MỌI CẤP ĐỘ'}
                    </span>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded-md border border-emerald-800/50">
                      Còn {item.availableSeats}/{item.capacity} chỗ
                    </span>
                  </div>

                  {/* Tên lớp học */}
                  <h3 className="text-xl font-black text-white group-hover:text-[#e31b23] transition-colors mb-4">
                    {item.name}
                  </h3>

                  {/* Bảng thông tin HLV & Địa điểm */}
                  <div className="space-y-2.5 bg-[#0d0f17] p-4 rounded-2xl border border-gray-800/80 mb-5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 font-bold">HLV Trưởng:</span>
                      <span className="text-white font-extrabold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#e31b23]"></span>
                        {item.coachName || 'Chưa phân công'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 font-bold">Phòng/Sân tập:</span>
                      <span className="text-gray-300 font-semibold truncate max-w-[170px]">
                        {item.roomName || 'Sân thi đấu'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 font-bold">Thời gian học:</span>
                      <span className="text-gray-300 font-semibold">
                        {item.startDate} → {item.endDate}
                      </span>
                    </div>
                  </div>

                  {/* Buổi học kế tiếp (Next Slot) */}
                  {item.nextSlot && (
                    <div className="mb-5 bg-gray-900/80 p-3.5 rounded-xl border border-gray-800 text-xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                        📌 Buổi học tiếp theo:
                      </span>
                      <p className="font-bold text-white">
                        {item.nextSlot.title}
                      </p>
                      <p className="text-gray-400 text-[11px] mt-0.5">
                        {item.nextSlot.date} ({item.nextSlot.startTime?.slice(0, 5)} - {item.nextSlot.endTime?.slice(0, 5)})
                      </p>
                    </div>
                  )}
                </div>

                {/* Học phí & Nút Đăng ký */}
                <div className="pt-4 border-t border-gray-800">
                  <div className="flex items-baseline justify-between mb-4">
                    <span className="text-xs font-bold text-gray-400">Học phí khóa:</span>
                    <span className="text-2xl font-black text-[#e31b23]">
                      {formatFee(item.tuition)}
                    </span>
                  </div>

                  <Link
                    to="/dang-nhap"
                    className="w-full inline-flex items-center justify-center bg-[#e31b23] hover:bg-[#c4131a] text-white font-black text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-lg shadow-red-900/30 transition-all transform active:scale-[0.98]"
                  >
                    Đăng ký học ngay →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. FOOTER */}
      <Footer />
    </div>
  );
}