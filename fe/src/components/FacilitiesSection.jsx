import React, { useState, useEffect, useRef } from 'react';

// Import chính xác các file ảnh từ src/assets/facilities/
import arenaImg from '../assets/facilities/facility-arena-1024x683.webp';
import basketballImg from '../assets/facilities/facility-basketball-1024x683.webp';
import poolImg from '../assets/facilities/facility-pool-1024x682.webp';
import golfSimImg from '../assets/facilities/facility-golf-sim-1024x683.webp';
import golfGreenImg from '../assets/facilities/facility-golf-green-1024x576.webp';
import tennisImg from '../assets/facilities/facility-tennis-1024x576.webp';
import tabletennisImg from '../assets/facilities/facility-tabletennis-1024x683.webp'; // Không gương
import taekwondoImg from '../assets/facilities/taekwondo-1-1024x683.webp'; // Có gương
import theaterImg from '../assets/facilities/facility-theater-1024x331.webp';

export default function FacilitiesSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
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

  return (
    <section
      ref={sectionRef}
      id="facilities-section"
      className="relative w-full bg-white py-16 md:py-24 text-gray-900 select-none overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* TIÊU ĐỀ ĐỎ NỔI BẬT */}
        <div
          className={`text-center mb-10 md:mb-14 transition-all duration-1000 ease-out ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'
          }`}
        >
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-[#e31b23] uppercase tracking-tight drop-shadow-sm">
            CƠ SỞ VẬT CHẤT
          </h2>
        </div>

        {/* LƯỚI BENTO MẪU CHUẨN XÁC 100% */}
        <div
          className={`grid grid-cols-1 lg:grid-cols-2 gap-3 transition-all duration-1000 delay-200 ease-out ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
        >
          {/* CỘT BÊN TRÁI */}
          <div className="flex flex-col gap-3">
            {/* 1. Sân vận động AnhDuy Sport (Arena) - Lớn */}
            <div className="group relative overflow-hidden rounded-sm bg-gray-900 h-[280px] sm:h-[360px] md:h-[420px]">
              <img
                src={arenaImg}
                alt="Sân vận động AnhDuy Sport (Arena)"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              <div className="absolute bottom-4 left-4 right-4">
                <span className="text-white text-base sm:text-lg md:text-xl font-black tracking-wide drop-shadow-md">
                  Sân vận động AnhDuy Sport (Arena)
                </span>
              </div>
            </div>

            {/* Khối 2 ô bên dưới cột trái */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 2. Sân tennis ngoài trời */}
              <div className="group relative overflow-hidden rounded-sm bg-gray-900 h-[180px] sm:h-[200px]">
                <img
                  src={tennisImg}
                  alt="Sân tennis ngoài trời"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-3 left-3 right-3">
                  <span className="text-white text-sm sm:text-base font-bold drop-shadow-md">
                    Sân tennis ngoài trời
                  </span>
                </div>
              </div>

              {/* 3. Phòng tập đa năng (có gương) - Dùng ảnh taekwondo-1 */}
              <div className="group relative overflow-hidden rounded-sm bg-gray-900 h-[180px] sm:h-[200px]">
                <img
                  src={taekwondoImg}
                  alt="Phòng tập đa năng (có gương)"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-3 left-3 right-3">
                  <span className="text-white text-sm sm:text-base font-bold drop-shadow-md">
                    Phòng tập đa năng (có gương)
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Phòng tập đa năng (không gương) - Dùng ảnh facility-tabletennis */}
            <div className="group relative overflow-hidden rounded-sm bg-gray-900 h-[180px] sm:h-[200px]">
              <img
                src={tabletennisImg}
                alt="Phòng tập đa năng (không gương)"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              <div className="absolute bottom-3 left-3 right-3">
                <span className="text-white text-sm sm:text-base font-bold drop-shadow-md">
                  Phòng tập đa năng (không gương)
                </span>
              </div>
            </div>
          </div>

          {/* CỘT BÊN PHẢI */}
          <div className="flex flex-col gap-3">
            {/* Khối 2 ô hàng trên cột phải */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 5. Sân thi đấu đa năng */}
              <div className="group relative overflow-hidden rounded-sm bg-gray-900 h-[180px] sm:h-[200px]">
                <img
                  src={basketballImg}
                  alt="Sân thi đấu đa năng"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-3 left-3 right-3">
                  <span className="text-white text-sm sm:text-base font-bold drop-shadow-md">
                    Sân thi đấu đa năng
                  </span>
                </div>
              </div>

              {/* 6. Hồ bơi chuẩn Olympic */}
              <div className="group relative overflow-hidden rounded-sm bg-gray-900 h-[180px] sm:h-[200px]">
                <img
                  src={poolImg}
                  alt="Hồ bơi chuẩn Olympic"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-3 left-3 right-3">
                  <span className="text-white text-sm sm:text-base font-bold drop-shadow-md">
                    Hồ bơi chuẩn Olympic
                  </span>
                </div>
              </div>
            </div>

            {/* Khối 2 ô hàng giữa cột phải */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 7. Phòng mô phỏng XSwing – Golf 3D */}
              <div className="group relative overflow-hidden rounded-sm bg-gray-900 h-[180px] sm:h-[200px]">
                <img
                  src={golfSimImg}
                  alt="Phòng mô phỏng XSwing – Golf 3D"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-3 left-3 right-3">
                  <span className="text-white text-sm sm:text-base font-bold drop-shadow-md">
                    Phòng mô phỏng XSwing – Golf 3D
                  </span>
                </div>
              </div>

              {/* 8. Sân tập Golf Putting Green */}
              <div className="group relative overflow-hidden rounded-sm bg-gray-900 h-[180px] sm:h-[200px]">
                <img
                  src={golfGreenImg}
                  alt="Sân tập Golf Putting Green"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-3 left-3 right-3">
                  <span className="text-white text-sm sm:text-base font-bold drop-shadow-md">
                    Sân tập Golf Putting Green
                  </span>
                </div>
              </div>
            </div>

            {/* 9. Nhà hát & sân khấu - Dưới cùng bên phải */}
            <div className="group relative overflow-hidden rounded-sm bg-gray-900 h-[220px] sm:h-[260px] md:h-[420px]">
              <img
                src={theaterImg}
                alt="Nhà hát & sân khấu"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              <div className="absolute bottom-4 left-4 right-4">
                <span className="text-white text-base sm:text-lg md:text-xl font-black tracking-wide drop-shadow-md">
                  Nhà hát & sân khấu
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}