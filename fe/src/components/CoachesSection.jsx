import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Import chính xác 8 file ảnh HLV tương ứng với 8 bộ môn
import coachBasketball from '../assets/coachs/coach-basketball.webp';
import coachSwimming from '../assets/coachs/coach-swimming.webp';
import coachGolf from '../assets/coachs/coach-golf.webp';
import coachTennis from '../assets/coachs/coach-tennis-687x1024.webp';
import coachTableTennis from '../assets/coachs/coach-tabletennis-683x1024.webp';
import coachBadminton from '../assets/coachs/coach-badminton.webp';
import coachTaekwondo from '../assets/coachs/coach-taekwondo-683x1024.webp';
import coachSoccer from '../assets/coachs/coach-soccer-683x1024.webp';

// Danh sách 8 HLV đại diện cho 8 bộ môn thể thao chủ đạo
const coachesData = [
  { id: 1, sport: 'BÓNG RỔ', name: 'PAUL VILLANOVA', img: coachBasketball },
  { id: 2, sport: 'BƠI LỘI', name: 'NGUYỄN THỊ ÁNH VIÊN', img: coachSwimming },
  { id: 3, sport: 'GOLF 3D', name: 'NGÔ BẢO NGHI', img: coachGolf },
  { id: 4, sport: 'QUẦN VỢT', name: 'NGUYỄN TÔN NHUẬN', img: coachTennis },
  { id: 5, sport: 'BÓNG BÀN', name: 'PHAN HOÀNG ĐĂNG', img: coachTableTennis },
  { id: 6, sport: 'CẦU LÔNG', name: 'HUỲNH TRÍ THỊNH', img: coachBadminton },
  { id: 7, sport: 'TAEKWONDO', name: 'PHAN THỊ THÚY HẰNG', img: coachTaekwondo },
  { id: 8, sport: 'BÓNG ĐÁ', name: 'LÊ ĐÌNH TRỌNG', img: coachSoccer },
];

export default function CoachesSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);
  const navigate = useNavigate();

  // Hiệu ứng xuất hiện khi cuộn chuột tới khu vực này
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

  // Tự động chuyển slide liên tục mỗi 3.5 giây
  useEffect(() => {
    const interval = setInterval(() => {
      handleNext();
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % coachesData.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + coachesData.length) % coachesData.length);
  };

  // Mở rộng mảng để cuộn vô tận mượt mà
  const extendedCoaches = [...coachesData, ...coachesData, ...coachesData];

  return (
    <section
      ref={sectionRef}
      id="coaches-section"
      className="relative w-full bg-[#12141d] py-16 md:py-24 overflow-hidden text-white select-none font-sans"
    >
      {/* TIÊU ĐỀ SECTION */}
      <div
        className={`text-center mb-10 md:mb-14 px-4 transition-all duration-1000 ease-out ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'
        }`}
      >
        <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-[#e31b23] uppercase tracking-tight mb-2 drop-shadow-md">
          ĐỘI NGŨ HUẤN LUYỆN VIÊN
        </h3>
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-white uppercase tracking-wider drop-shadow-lg">
          ĐẰNG SAU NHỮNG NHÀ VÔ ĐỊCH
        </h2>
      </div>

      {/* KHỐI SLIDER CAROUSEL */}
      <div
        className={`relative w-full max-w-[1400px] mx-auto px-4 md:px-12 transition-all duration-1000 delay-200 ease-out ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
        }`}
      >
        {/* NÚT MŨI TÊN TRÁI */}
        <button
          onClick={handlePrev}
          className="absolute left-2 sm:left-4 md:left-6 top-1/2 -translate-y-1/2 z-30 text-white/80 hover:text-[#e31b23] transition-colors duration-200 p-2 cursor-pointer focus:outline-none"
          aria-label="Previous coach"
        >
          <svg className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>

        {/* CONTAINER CHỨA THẺ HLV */}
        <div className="overflow-hidden w-full py-4">
          <div
            className="flex transition-transform duration-700 ease-in-out gap-4 sm:gap-5 md:gap-6"
            style={{
              transform: `translateX(-${(currentIndex + coachesData.length) * 268}px)`,
            }}
          >
            {extendedCoaches.map((coach, index) => (
              <div
                key={`${coach.id}-${index}`}
                className="group relative flex-none w-[240px] sm:w-[250px] md:w-[260px] h-[380px] sm:h-[420px] md:h-[460px] rounded-sm overflow-hidden bg-gradient-to-b from-[#e31b23] via-[#b51219] to-[#3a0306] border border-red-900/30 shadow-2xl transition-all duration-300 hover:scale-[1.04] hover:z-20 cursor-pointer flex flex-col justify-end"
              >
                {/* Ảnh HLV */}
                <div className="absolute inset-0 flex items-end justify-center overflow-hidden">
                  <img
                    src={coach.img}
                    alt={coach.name}
                    className="h-[92%] w-auto object-contain object-bottom transition-transform duration-500 group-hover:scale-105 filter drop-shadow-2xl"
                  />
                </div>

                {/* Phủ mờ gradient phần chân thẻ */}
                <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/95 via-black/50 to-transparent z-10"></div>

                {/* THÔNG TIN BỘ MÔN VÀ TÊN HLV */}
                <div className="relative z-20 p-4 sm:p-5 flex flex-col justify-end">
                  <div className="flex items-center space-x-1.5 text-[11px] sm:text-xs font-bold tracking-wider text-white/90 uppercase mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#e31b23] inline-block shadow-sm"></span>
                    <span>{coach.sport}</span>
                  </div>
                  <h4 className="text-base sm:text-lg md:text-xl font-black text-white uppercase tracking-tight leading-tight drop-shadow-md">
                    {coach.name}
                  </h4>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* NÚT MŨI TÊN PHẢI */}
        <button
          onClick={handleNext}
          className="absolute right-2 sm:right-4 md:right-6 top-1/2 -translate-y-1/2 z-30 text-white/80 hover:text-[#e31b23] transition-colors duration-200 p-2 cursor-pointer focus:outline-none"
          aria-label="Next coach"
        >
          <svg className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </svg>
        </button>

        {/* DẢI CHẤM INDICATOR */}
        <div className="flex justify-center items-center space-x-2 mt-8 md:mt-10">
          {coachesData.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 transition-all duration-300 rounded-full cursor-pointer focus:outline-none ${
                idx === currentIndex % coachesData.length
                  ? 'w-8 bg-[#e31b23]'
                  : 'w-2 bg-gray-600 hover:bg-gray-400'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* NÚT XEM THÊM */}
      <div
        className={`flex justify-center mt-8 md:mt-12 transition-all duration-1000 delay-300 ease-out ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <button
          onClick={() => navigate('/hlv')}
          className="bg-[#e31b23] hover:bg-red-700 text-white font-extrabold text-sm md:text-base px-8 sm:px-10 py-3.5 transform -skew-x-12 transition-all duration-200 shadow-xl hover:scale-105 flex items-center space-x-2 cursor-pointer select-none"
        >
          <span className="inline-block transform skew-x-12 tracking-wider uppercase">
            XEM THÊM &rarr;
          </span>
        </button>
      </div>
    </section>
  );
}