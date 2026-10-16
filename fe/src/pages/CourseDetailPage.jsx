import React, { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { fontDetails } from '../data/coursesData';

export default function CourseDetailPage() {
  const { courseSlug } = useParams();
  const course = fontDetails[courseSlug];

  // Mỗi khi courseSlug trên URL thay đổi -> Cuộn lên đầu trang & cập nhật document title
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Tự động cuộn mượt lên đầu trang
    
    if (course) {
      document.title = `${course.title} - AnhDuy Sport`;
    }
  }, [courseSlug, course]); // Lắng nghe sự thay đổi của courseSlug

  if (!course) {
    return <Navigate to="/khoa-hoc" replace />;
  }

  return (
    <div className="relative w-full min-h-screen font-sans bg-[#12141d] text-white select-none overflow-x-hidden">
      {/* 1. HEADER NỀN TRẮNG CỐ ĐỊNH */}
      <Header forceWhite />

      {/* 2. HERO BANNER CỦA MÔN HỌC */}
      <section className="relative w-full h-screen pt-16 bg-[#0d0f17] overflow-hidden flex flex-col justify-between">
        <div className="absolute inset-0 z-0">
          <img
            src={course.heroBg}
            alt={course.title}
            className="w-full h-full object-cover object-center filter brightness-[0.65] contrast-[1.05]"
          />
          <div className="absolute inset-y-0 left-0 w-full lg:w-[60%] bg-gradient-to-r from-black/90 via-black/60 to-transparent"></div>
          <div
            className="absolute inset-y-0 right-0 w-full lg:w-[55%] bg-[#e31b23]/35 mix-blend-multiply pointer-events-none"
            style={{
              clipPath: window.innerWidth >= 1024 ? 'polygon(20% 0, 100% 0, 100% 100%, 0% 100%)' : 'none',
            }}
          ></div>
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 my-auto pt-8">
          <div className="mb-3 flex items-center space-x-2">
            <span className="inline-block bg-[#e31b23] text-white font-black text-xs sm:text-sm px-3.5 py-1 transform -skew-x-12 uppercase tracking-widest shadow-md">
              <span className="inline-block transform skew-x-12">
                ANHDUY SPORT • {course.category}
              </span>
            </span>
            <span className="bg-black/60 border border-gray-700 text-gray-200 font-extrabold text-xs px-3 py-1 uppercase tracking-wider">
              {course.level}
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white uppercase tracking-tight leading-none drop-shadow-2xl mb-5">
            {course.title}
          </h1>

          <p className="max-w-2xl text-gray-100 text-sm sm:text-base md:text-lg font-semibold leading-relaxed drop-shadow-md border-l-4 border-[#e31b23] pl-4">
            {course.desc}
          </p>
        </div>

        {/* DẢI THỐNG KÊ SÁT ĐÁY HERO */}
        <div className="relative z-20 w-full bg-[#0d0f17] py-6 px-4 sm:px-8 border-t border-gray-800/80 shrink-0">
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
            {course.stats.map((st, idx) => (
              <div
                key={idx}
                className="group relative transform -skew-x-12 transition-all duration-300 bg-[#e31b23] text-white overflow-hidden flex items-center justify-center p-4 sm:p-5 shadow-lg"
              >
                <div className="transform skew-x-12 text-center">
                  <span className="block text-3xl sm:text-4xl font-black tracking-tight leading-none text-white">
                    {st.value}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider mt-1 block opacity-90 text-white">
                    {st.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. FOOTER */}
      <Footer />
    </div>
  );
}