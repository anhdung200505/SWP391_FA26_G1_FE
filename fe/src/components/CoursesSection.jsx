import React, { useState, useEffect, useRef } from 'react';
import { getSportsByCenter } from '../api/managementApi';

// Fallback Ảnh môn học theo mã code trả về từ API
import swimmingImg from '../assets/sports/swimming-1024x576.png';
import tabletennisImg from '../assets/sports/tabletennis-1024x576.png';
import soccerImg from '../assets/sports/soccer-1024x576.png';
import basketballImg from '../assets/sports/basketball-1024x576.png';
import badmintonImg from '../assets/sports/badminton-1024x576.png';
import golfImg from '../assets/sports/golf-1024x576.png';
import tennisImg from '../assets/sports/tennis-1024x576.png';
import taekwondoImg from '../assets/sports/taekwondo-1024x576.png';

const SPORTS_IMAGE_MAP = {
  basketball: basketballImg,
  swimming: swimmingImg,
  golf: golfImg,
  tennis: tennisImg,
  tabletennis: tabletennisImg,
  badminton: badmintonImg,
  taekwondo: taekwondoImg,
  soccer: soccerImg,
};

export default function CoursesSection() {
  const [sports, setSports] = useState([]);
  const [activeCourse, setActiveCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  // Gọi API lấy bộ môn thể thao từ Center ID 1
  useEffect(() => {
    getSportsByCenter('1')
      .then((data) => {
        const mappedData = data.map((item) => ({
          ...item,
          img: SPORTS_IMAGE_MAP[item.code] || basketballImg,
        }));
        setSports(mappedData);
        if (mappedData.length > 0) setActiveCourse(mappedData[0]);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => {
      if (sectionRef.current) observer.unobserve(sectionRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[300px] bg-black flex items-center justify-center text-white font-bold">
        Đang tải danh sách bộ môn thể thao...
      </div>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="courses-section"
      className="relative w-full h-[680px] md:h-[760px] lg:h-[820px] bg-black overflow-hidden flex flex-col justify-between pt-28 md:pt-36 pb-12 font-sans select-none"
    >
      {/* 1. KHỐI ẢNH NỀN FADE MƯỢT MÀ */}
      <div className="absolute inset-0 z-0">
        {sports.map((course) => {
          const isActive = activeCourse?.id === course.id;
          return (
            <div
              key={course.id}
              className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
                isActive ? 'opacity-100 scale-100' : 'opacity-0'
              }`}
            >
              <img
                src={course.img}
                alt={course.name}
                className="w-full h-full object-cover object-center filter brightness-[0.75]"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-black/10"></div>
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/40"></div>
            </div>
          );
        })}
      </div>

      {/* 2. KHỐI NỘI DUNG CHÍNH */}
      <div
        className={`relative z-10 w-full px-6 sm:px-12 md:px-20 lg:px-28 flex flex-col h-full justify-between transition-all duration-1000 ease-out ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="mt-1 md:mt-2">
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-[#e31b23] uppercase tracking-tight drop-shadow-lg">
            {sports.length} KHÓA HỌC THỂ THAO
          </h2>
        </div>

        {/* 3. KHỐI NÚT DỐC NGHIÊNG (-skew-x-[20deg]) */}
        <div className="transform -skew-x-[20deg] origin-left w-full max-w-[320px] sm:max-w-[500px] md:max-w-[600px] lg:max-w-[640px] mb-6 md:mb-14">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-3.5">
            {sports.map((course) => {
              const isActive = activeCourse?.id === course.id;
              return (
                <button
                  key={course.id}
                  onMouseEnter={() => setActiveCourse(course)}
                  onClick={() => setActiveCourse(course)}
                  className={`group relative h-12 sm:h-13 md:h-[54px] w-full transition-all duration-200 border-0 flex items-center justify-center cursor-pointer rounded-none shadow-md ${
                    isActive
                      ? 'bg-[#e31b23] text-white shadow-xl z-10 scale-[1.02]'
                      : 'bg-white text-[#d01018] hover:bg-[#e31b23] hover:text-white'
                  }`}
                >
                  <span className="inline-block transform skew-x-[20deg] text-sm sm:text-base md:text-[17px] font-extrabold tracking-wide whitespace-nowrap">
                    {course.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}