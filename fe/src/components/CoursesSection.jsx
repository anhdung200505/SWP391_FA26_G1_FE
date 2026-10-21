import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Import ảnh 8 môn thể thao chủ đạo từ assets
import swimmingImg from '../assets/sports/swimming-1024x576.png';
import tabletennisImg from '../assets/sports/tabletennis-1024x576.png';
import soccerImg from '../assets/sports/soccer-1024x576.png';
import basketballImg from '../assets/sports/basketball-1024x576.png';
import badmintonImg from '../assets/sports/badminton-1024x576.png';
import golfImg from '../assets/sports/golf-1024x576.png';
import tennisImg from '../assets/sports/tennis-1024x576.png';
import taekwondoImg from '../assets/sports/taekwondo-1024x576.png';

const coursesData = [
  { id: 'bong-ro', name: 'Bóng rổ', img: basketballImg, path: '/khoa-hoc/bong-ro' },
  { id: 'boi-loi', name: 'Bơi lội', img: swimmingImg, path: '/khoa-hoc/boi-loi' },
  { id: 'golf-3d', name: 'Golf 3D', img: golfImg, path: '/khoa-hoc/golf-3d' },
  { id: 'quan-vot', name: 'Quần vợt', img: tennisImg, path: '/khoa-hoc/quan-vot' },
  { id: 'bong-ban', name: 'Bóng bàn', img: tabletennisImg, path: '/khoa-hoc/bong-ban' },
  { id: 'cau-long', name: 'Cầu lông', img: badmintonImg, path: '/khoa-hoc/cau-long' },
  { id: 'taekwondo', name: 'Taekwondo', img: taekwondoImg, path: '/khoa-hoc/taekwondo' },
  { id: 'bong-da', name: 'Bóng đá', img: soccerImg, path: '/khoa-hoc/bong-da' },
];

export default function CoursesSection() {
  const [activeCourse, setActiveCourse] = useState(coursesData[0]);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  // Xử lý khi người dùng nhấp chuột vào nút môn thể thao
  const handleCourseClick = (course) => {
    navigate(course.path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section
      ref={sectionRef}
      id="courses-section"
      className="relative w-full h-[680px] md:h-[760px] lg:h-[820px] bg-black overflow-hidden flex flex-col justify-between pt-28 md:pt-36 pb-12 font-sans select-none"
    >
      {/* 1. KHỐI ẢNH NỀN FADE MƯỢT MÀ */}
      <div className="absolute inset-0 z-0">
        {coursesData.map((course) => {
          const isActive = activeCourse.id === course.id;
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
        {/* TIÊU ĐỀ BÊN TRÊN */}
        <div className="mt-1 md:mt-2">
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-[#e31b23] uppercase tracking-tight drop-shadow-lg">
            8 KHÓA HỌC THỂ THAO
          </h2>
        </div>

        {/* 3. KHỐI NÚT DỐC NGHIÊNG (-skew-x-[20deg]) */}
        <div className="transform -skew-x-[20deg] origin-left w-full max-w-[320px] sm:max-w-[500px] md:max-w-[600px] lg:max-w-[640px] mb-6 md:mb-14">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-3.5">
            {coursesData.map((course) => {
              const isActive = activeCourse.id === course.id;
              return (
                <button
                  key={course.id}
                  onMouseEnter={() => setActiveCourse(course)}
                  onClick={() => handleCourseClick(course)}
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