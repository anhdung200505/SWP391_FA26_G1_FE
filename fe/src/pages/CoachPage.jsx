import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import SpotlightCoachSection from '../components/SpotlightCoachSection'; // Component HLV Ngôi sao
import Footer from '../components/Footer';

import heroGymImg from '../assets/page hlv/hero-gym.jpg';

const coachStatsData = [
  {
    id: 1,
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    value: '8+',
    label: 'HLV CHUYÊN NGHIỆP',
  },
  {
    id: 2,
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    value: '150+',
    label: 'HUY CHƯƠNG QUỐC TẾ',
  },
  {
    id: 3,
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      </svg>
    ),
    value: '8',
    label: 'BỘ MÔN ĐÀO TẠO',
  },
  {
    id: 4,
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    value: '10+',
    label: 'NĂM KINH NGHIỆM',
  },
];

export default function CoachPage() {
  const [hoveredId, setHoveredId] = useState(null);

  useEffect(() => {
    document.title = "Đội ngũ HLV - AnhDuy Sport";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="relative w-full min-h-screen font-sans bg-[#12141d] text-white select-none overflow-x-hidden">
      {/* 1. HEADER NỀN TRẮNG */}
      <Header forceWhite />

      {/* 2. HERO BANNER FULL MÀN HÌNH (h-screen) */}
      <section className="relative w-full h-screen pt-16 bg-[#0d0f17] overflow-hidden flex flex-col justify-between">
        
        {/* KHỐI ẢNH NỀN HERO GYM & OVERLAY */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroGymImg}
            alt="AnhDuy Sport Coach Gym Hero"
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

        {/* NỘI DUNG CHÍNH HERO BANNER */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 my-auto pt-8">
          <div className="mb-3">
            <span className="inline-block bg-[#e31b23] text-white font-black text-xs sm:text-sm px-3.5 py-1 transform -skew-x-12 uppercase tracking-widest shadow-md">
              <span className="inline-block transform skew-x-12">
                ANHDUY SPORT CENTER
              </span>
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white uppercase tracking-tight leading-none drop-shadow-2xl mb-5">
            ĐỘI NGŨ <span className="text-[#e31b23]">HLV</span>
          </h1>

          <p className="max-w-xl text-gray-100 text-sm sm:text-base md:text-lg font-semibold leading-relaxed drop-shadow-md border-l-4 border-[#e31b23] pl-4">
            Những huấn luyện viên tận tâm, giàu kinh nghiệm đồng hành cùng bạn trên hành trình chinh phục thể thao.
          </p>
        </div>

        {/* 3. DẢI 4 BLOCK THỐNG KÊ SÁT ĐÁY HERO */}
        <div className="relative z-20 w-full bg-[#0d0f17] py-6 px-4 sm:px-8 border-t border-gray-800/80 shrink-0">
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
            {coachStatsData.map((stat) => {
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

      {/* 4. KHỐI HLV NGÔI SAO SPOTLIGHT */}
      <SpotlightCoachSection />

      {/* 5. FOOTER */}
      <Footer />
    </div>
  );
}