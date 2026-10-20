import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import CourseListGrid from '../components/CourseListGrid';
import Footer from '../components/Footer';
import { getSportsByCenter } from '../api/managementApi';

import basketballImg from '../assets/facilities/facility-basketball-1024x683.webp';

export default function CoursesPage() {
  const [hoveredId, setHoveredId] = useState(null);
  const [sportsCount, setSportsCount] = useState(8);

  useEffect(() => {
    document.title = 'Khóa học thể thao - AnhDuy Sport';
    window.scrollTo(0, 0);

    // Lấy số lượng bộ môn thực tế từ API
    getSportsByCenter('1')
      .then((data) => {
        if (Array.isArray(data)) setSportsCount(data.length);
      })
      .catch(() => {});
  }, []);

  const courseStatsData = [
    { id: 1, value: String(sportsCount), label: 'BỘ MÔN ĐÀO TẠO' },
    { id: 2, value: '5+', label: 'ĐỘ TUỔI HỌC VIÊN' },
    { id: 3, value: '2L', label: 'MÔI TRƯỜNG SONG NGỮ' },
    { id: 4, value: 'INTL', label: 'CHUẨN HUẤN LUYỆN QUỐC TẾ' },
  ];

  return (
    <div className="relative w-full min-h-screen font-sans bg-[#12141d] text-white select-none overflow-x-hidden">
      <Header forceWhite />

      <section className="relative w-full h-screen pt-16 bg-[#0d0f17] overflow-hidden flex flex-col justify-between">
        <div className="absolute inset-0 z-0">
          <img
            src={basketballImg}
            alt="AnhDuy Sport Basketball Facility Hero"
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
          <div className="mb-3">
            <span className="inline-block bg-[#e31b23] text-white font-black text-xs sm:text-sm px-3.5 py-1 transform -skew-x-12 uppercase tracking-widest shadow-md">
              <span className="inline-block transform skew-x-12">ANHDUY SPORT CENTER</span>
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white uppercase tracking-tight leading-none drop-shadow-2xl mb-5">
            KHÓA HỌC <span className="text-[#e31b23]">THỂ THAO</span>
          </h1>

          <p className="max-w-xl text-gray-100 text-sm sm:text-base md:text-lg font-semibold leading-relaxed drop-shadow-md border-l-4 border-[#e31b23] pl-4">
            Chương trình đào tạo thể thao chuẩn quốc tế dành cho học viên trẻ từ 5 tuổi và người lớn, kết hợp rèn luyện thể chất với phát triển kỹ năng và tư duy toàn diện.
          </p>
        </div>

        <div className="relative z-20 w-full bg-[#0d0f17] py-6 px-4 sm:px-8 border-t border-gray-800/80 shrink-0">
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
            {courseStatsData.map((stat) => {
              const isHovered = hoveredId === stat.id;

              return (
                <div
                  key={stat.id}
                  onMouseEnter={() => setHoveredId(stat.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`group relative transform -skew-x-12 transition-all duration-300 cursor-pointer overflow-hidden flex items-center justify-center p-4 sm:p-5 shadow-lg ${
                    isHovered
                      ? 'bg-[#e31b23] text-white scale-[1.02] z-10'
                      : 'bg-[#e31b23] text-white'
                  }`}
                >
                  <div className="transform skew-x-12 text-center">
                    <span className="block text-3xl sm:text-4xl font-black tracking-tight leading-none text-white">
                      {stat.value}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider mt-1 block opacity-90 text-white">
                      {stat.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <CourseListGrid />
      <Footer />
    </div>
  );
}