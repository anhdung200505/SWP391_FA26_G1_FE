import React, { useEffect, useState, useRef } from 'react';
import Header from '../components/Header';
import FacilityTourSection from '../components/FacilityTourSection';
import FacilityListSection from '../components/FacilityListSection';
import MapSection from '../components/MapSection'; // Import thêm MapSection
import Footer from '../components/Footer';

import arenaImg from '../assets/facilities/facility-arena-1024x683.webp';

const statsData = [
  {
    id: 1,
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      </svg>
    ),
    value: '9',
    label: 'KHU CHỨC NĂNG THỂ THAO',
  },
  {
    id: 2,
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    value: '1.976m²',
    label: 'DIỆN TÍCH SÂN VẬN ĐỘNG ANHDUY',
  },
  {
    id: 3,
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    value: '2.500',
    label: 'SỨC CHỨA SỰ KIỆN TỐI ĐA',
  },
  {
    id: 4,
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    value: '50m',
    label: 'HỒ BƠI CHUẨN OLYMPIC',
  },
];

export default function FacilitiesPage() {
  const [hoveredId, setHoveredId] = useState(null);
  const formRef = useRef(null);

  useEffect(() => {
    document.title = "AnhDuy Sport - Trung tâm thể thao AnhDuy Sport";
    window.scrollTo(0, 0);
  }, []);

  const handleScrollToForm = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="relative w-full min-h-screen font-sans bg-[#12141d] text-white select-none overflow-x-hidden">
      {/* 1. HEADER */}
      <Header forceWhite />

      {/* 2. HERO BANNER FULL MÀN HÌNH */}
      <section className="relative w-full h-screen pt-16 bg-[#0d0f17] overflow-hidden flex flex-col justify-between">
        <div className="absolute inset-0 z-0">
          <img
            src={arenaImg}
            alt="AnhDuy Sport Center Arena"
            className="w-full h-full object-cover object-center filter brightness-[0.7] contrast-[1.05]"
          />
          <div className="absolute inset-y-0 left-0 w-full lg:w-[60%] bg-gradient-to-r from-black/85 via-black/50 to-transparent"></div>
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
              <span className="inline-block transform skew-x-12">
                ANHDUY SPORT CENTER
              </span>
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white uppercase tracking-tight leading-none drop-shadow-2xl mb-5">
            CƠ SỞ <span className="text-[#e31b23]">VẬT CHẤT</span>
          </h1>

          <p className="max-w-xl text-gray-100 text-sm sm:text-base md:text-lg font-semibold leading-relaxed drop-shadow-md border-l-4 border-[#e31b23] pl-4">
            Hệ thống cơ sở vật chất đẳng cấp quốc tế, đáp ứng mọi nhu cầu tập luyện, thi đấu và tổ chức sự kiện thể thao chuyên nghiệp.
          </p>
        </div>

        {/* DẢI 4 BLOCK THỐNG KÊ */}
        <div className="relative z-20 w-full bg-[#0d0f17] py-6 px-4 sm:px-8 border-t border-gray-800/80 shrink-0">
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
            {statsData.map((stat) => {
              const isHovered = hoveredId === stat.id;

              return (
                <div
                  key={stat.id}
                  onMouseEnter={() => setHoveredId(stat.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`group relative transform -skew-x-12 transition-all duration-300 cursor-pointer overflow-hidden flex items-stretch shadow-lg ${
                    isHovered
                      ? 'bg-[#e31b23] text-white scale-[1.02] z-10'
                      : 'bg-[#181d2a] text-gray-200'
                  }`}
                >
                  <div
                    className={`p-3 sm:p-3.5 flex items-center justify-center shrink-0 border-r transition-colors duration-300 ${
                      isHovered
                        ? 'border-white/30 bg-black/10'
                        : 'border-gray-700/60 bg-black/20'
                    }`}
                  >
                    <div className="transform skew-x-12">{stat.icon}</div>
                  </div>

                  <div className="p-3 sm:p-3.5 flex flex-col justify-center flex-1">
                    <div className="transform skew-x-12">
                      <span
                        className={`block text-2xl sm:text-3xl font-black tracking-tight leading-none ${
                          isHovered ? 'text-white' : 'text-[#e31b23]'
                        }`}
                      >
                        {stat.value}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider mt-0.5 block opacity-90">
                        {stat.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. FORM ĐĂNG KÝ THAM QUAN */}
      <FacilityTourSection formRef={formRef} />

      {/* 4. DANH SÁCH KHỐI CƠ SỞ VẬT CHẤT */}
      <FacilityListSection onRegisterClick={handleScrollToForm} />

      {/* 5. BẢN ĐỒ GOOGLE MAPS (NẰM NGAY DƯỚI CÁC KHỐI CSVC VÀ TRÊN FOOTER) */}
      <MapSection />

      {/* 6. FOOTER */}
      <Footer />
    </div>
  );
}