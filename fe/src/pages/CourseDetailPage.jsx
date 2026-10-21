import React, { useEffect, useState } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { fontDetails } from '../data/coursesData';
import { getSportsByCenter, getClasses } from '../api/managementApi';
import { formatFee } from '../data/accountManagement';
import { useAuth } from '../context/AuthContext';

export default function CourseDetailPage() {
  const { courseSlug } = useParams();
  const courseStatic = fontDetails[courseSlug];
  const { user } = useAuth();
  const navigate = useNavigate();

  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (courseStatic) {
      document.title = `${courseStatic.title} · AnhDuy Sport`;
    }
  }, [courseSlug, courseStatic]);

  useEffect(() => {
    let active = true;

    async function fetchClassesData() {
      if (!user) return;
      try {
        setLoadingClasses(true);
        const sportsList = await getSportsByCenter('1');
        const currentSport = sportsList.find(
          (s) => s.code === courseSlug || s.id === courseSlug || courseSlug.includes(s.code)
        );

        const sportId = currentSport ? currentSport.id : '1';
        const classData = await getClasses('1', sportId);

        if (active && Array.isArray(classData)) {
          setClasses(classData);
        }
      } catch {
        // Ignored
      } finally {
        if (active) setLoadingClasses(false);
      }
    }

    if (courseStatic && user) {
      fetchClassesData();
    }

    return () => {
      active = false;
    };
  }, [courseSlug, courseStatic, user]);

  // Chuyển hướng sang trang xác nhận thông tin đăng ký
  const handleRegisterClass = (classItem) => {
    navigate(`/dang-ky-khoa-hoc?classId=${classItem.id}`);
  };

  if (!courseStatic) {
    return <Navigate to="/khoa-hoc" replace />;
  }

  const headCoach = courseStatic.headCoach;
  const facility = courseStatic.facility;

  return (
    <div className="relative w-full min-h-screen font-sans bg-[#0d0f17] text-white select-none overflow-x-hidden">
      <Header forceWhite />

      {/* HERO BANNER */}
      <section className="relative w-full min-h-[60vh] pt-24 pb-16 bg-[#0d0f17] overflow-hidden flex flex-col justify-center">
        <div className="absolute inset-0 z-0">
          <img
            src={courseStatic.heroBg}
            alt={courseStatic.title}
            className="w-full h-full object-cover object-center filter brightness-[0.5] contrast-[1.1]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-transparent"></div>
        </div>

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
        </div>
      </section>

      {/* KHỐI QUẢNG CÁO HLV TRƯỞNG & CSVC */}
      <section className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <div className="bg-[#161a26] border border-gray-800/80 rounded-2xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden shadow-2xl">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
              <div className="w-36 h-48 sm:w-44 sm:h-56 shrink-0 rounded-xl overflow-hidden border border-gray-700/80 bg-[#0d0f17] shadow-lg">
                <img
                  src={headCoach.avatar}
                  alt={headCoach.name}
                  className="w-full h-full object-cover object-top"
                />
              </div>

              <div className="flex-1 text-center sm:text-left">
                <span className="inline-block bg-[#1f283d] text-[#4a8bf5] text-[10px] sm:text-xs font-black uppercase tracking-widest px-3 py-1 rounded-sm mb-2">
                  {headCoach.role}
                </span>

                <h3 className="text-2xl sm:text-3xl font-black text-[#3b82f6] uppercase tracking-tight leading-tight mb-3">
                  {headCoach.name}
                </h3>

                <p className="text-xs sm:text-sm font-medium text-gray-300 leading-relaxed mb-4">
                  {headCoach.desc}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 pt-4 border-t border-gray-800/80">
              {headCoach.achievements.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-[#11141f] p-3 rounded-xl border border-gray-800 flex items-center gap-2.5"
                >
                  <div className="w-5 h-5 rounded-full bg-[#1e293b] flex items-center justify-center text-[#3b82f6] text-xs font-bold shrink-0">
                    ✓
                  </div>
                  <span className="text-[11px] font-bold text-gray-200 leading-snug">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-gray-800 shadow-2xl min-h-[380px] flex flex-col justify-end group">
            <img
              src={facility.image}
              alt={facility.title}
              className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>

            <div className="relative z-10 p-6 sm:p-8">
              <span className="inline-block bg-[#3b82f6] text-white text-[10px] sm:text-xs font-black uppercase tracking-widest px-3 py-1 rounded-sm mb-2">
                CƠ SỞ VẬT CHẤT
              </span>

              <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mb-2">
                {facility.title}
              </h3>

              <p className="text-xs sm:text-sm font-medium text-gray-200 leading-relaxed max-w-xl">
                {facility.desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BANNER TẬP LUYỆN -> DẪN SANG TRANG TUYỂN SINH (CHỈ HIỂN THỊ DÀNH CHO GUEST Chưa Đăng Nhập) */}
      {!user && (
        <section className="relative z-20 w-full bg-[#121622] border-y border-gray-800/80 py-16 px-6 text-center overflow-hidden">
          <div className="max-w-4xl mx-auto relative z-10">
            <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight mb-4">
              TẬP LUYỆN CÙNG HLV {headCoach.name}
            </h2>

            <p className="text-sm sm:text-base font-semibold text-gray-300 max-w-xl mx-auto mb-8">
              Xem học phí, chọn lộ trình phù hợp và đặt lịch tư vấn cho bộ môn {courseStatic.title}.
            </p>

            <button
              onClick={() => {
                navigate('/tuyen-sinh');
                window.scrollTo(0, 0);
              }}
              className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-black text-xs uppercase tracking-wider px-8 py-4 rounded-lg shadow-xl shadow-blue-900/40 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <span>ĐĂNG KÝ TUYỂN SINH NGAY</span>
              <span>→</span>
            </button>
          </div>
        </section>
      )}

      {/* BẢNG LỚP HỌC CHI TIẾT (CHỈ HIỂN THỊ KHI NGƯỜI DÙNG ĐÃ ĐĂNG NHẬP) */}
      {user && (
        <section className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 py-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-4 border-b border-gray-800">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-[#e31b23] bg-[#e31b23]/10 px-3.5 py-1 rounded-sm border border-[#e31b23]/30 mb-2 inline-block">
                LỊCH HỌC & LỚP ĐANG MỞ
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
                BẢNG LỚP HỌC <span className="text-[#e31b23]">CHI TIẾT</span>
              </h2>
            </div>
          </div>

          {loadingClasses ? (
            <div className="py-16 text-center text-gray-400 font-bold">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#e31b23] border-t-transparent mb-3"></div>
              <p>Đang tải danh sách lớp...</p>
            </div>
          ) : classes.length === 0 ? (
            <div className="bg-[#181d2a] rounded-3xl p-12 text-center border border-gray-800 shadow-xl">
              <p className="text-lg font-bold text-gray-300">Hiện chưa có lớp học mới cho bộ môn này.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {classes.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#181d2a] rounded-3xl p-6 border border-gray-800 hover:border-[#e31b23]/60 transition-all duration-300 shadow-2xl flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#e31b23] bg-[#e31b23]/10 px-2.5 py-1 rounded-md border border-[#e31b23]/30">
                        {item.level || 'MỌI CẤP ĐỘ'}
                      </span>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded-md border border-emerald-800/50">
                        Còn {item.availableSeats}/{item.capacity} chỗ
                      </span>
                    </div>

                    <h3 className="text-xl font-black text-white group-hover:text-[#e31b23] transition-colors mb-4">
                      {item.name}
                    </h3>

                    <div className="space-y-2.5 bg-[#0d0f17] p-4 rounded-2xl border border-gray-800/80 mb-5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400 font-bold">HLV Trưởng:</span>
                        <span className="text-white font-extrabold flex items-center gap-1.5">
                          {item.coachName || headCoach.name}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400 font-bold">Địa điểm:</span>
                        <span className="text-gray-300 font-semibold truncate max-w-[170px]">
                          {item.roomName || 'Sân thi đấu đa năng'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-800">
                    <div className="flex items-baseline justify-between mb-4">
                      <span className="text-xs font-bold text-gray-400">Học phí:</span>
                      <span className="text-2xl font-black text-[#e31b23]">
                        {formatFee(item.tuition)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRegisterClass(item)}
                      className="w-full inline-flex items-center justify-center bg-[#e31b23] hover:bg-[#c4131a] text-white font-black text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-lg transition-all cursor-pointer"
                    >
                      Đăng ký học ngay →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <Footer />
    </div>
  );
}