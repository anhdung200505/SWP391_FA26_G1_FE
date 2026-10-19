import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Import chính xác 8 file ảnh từ thư mục src/assets/page course/
import swimmingImg from '../assets/page course/swimming.webp';
import tabletennisImg from '../assets/page course/facility-tabletennis-1024x683.webp';
import soccerImg from '../assets/page course/soccer-768x1024.webp';
import basketballImg from '../assets/page course/basketball-683x1024.webp';
import badmintonImg from '../assets/page course/badminton-1-1024x678.webp';
import golfSimImg from '../assets/page course/facility-golf-sim-1024x683.webp';
import tennisImg from '../assets/page course/tennis-1.webp';
import taekwondoImg from '../assets/page course/taekwondo-1-1024x683.webp';

const coursesData = [
  {
    id: 'swimming',
    slug: 'boi-loi',
    category: 'CÁ NHÂN',
    level: 'BEGINNER',
    title: 'BƠI LỘI',
    desc: 'Xây dựng kỹ thuật bơi an toàn, kiểm soát hơi thở, sức bền và sự tự tin trong môi trường nước.',
    age: '6+',
    img: swimmingImg,
  },
  {
    id: 'tabletennis',
    slug: 'bong-ban',
    category: 'CÁ NHÂN',
    level: 'BEGINNER',
    title: 'BÓNG BÀN',
    desc: 'Rèn phản xạ nhanh, kiểm soát bóng, kỹ thuật xoáy và khả năng xử lý tình huống tốc độ cao.',
    age: '7-17',
    img: tabletennisImg,
  },
  {
    id: 'soccer',
    slug: 'bong-da',
    category: 'ĐỒNG ĐỘI',
    level: 'MỌI CẤP ĐỘ',
    title: 'BÓNG ĐÁ',
    desc: 'Huấn luyện kỹ thuật cá nhân, phối hợp đội hình, thể lực nền và tinh thần thi đấu đồng đội.',
    age: '6-17',
    img: soccerImg,
  },
  {
    id: 'basketball',
    slug: 'bong-ro',
    category: 'ĐỒNG ĐỘI',
    level: 'INTERMEDIATE',
    title: 'BÓNG RỔ',
    desc: 'Rèn kỹ năng kiểm soát bóng, ném rổ, phòng thủ và tư duy chiến thuật trong nhịp độ thi đấu cao.',
    age: '8-17',
    img: basketballImg,
  },
  {
    id: 'badminton',
    slug: 'cau-long',
    category: 'RACKET',
    level: 'MỌI CẤP ĐỘ',
    title: 'CẦU LÔNG',
    desc: 'Nâng cao tốc độ di chuyển, kỹ thuật cầu và khả năng phối hợp chiến thuật đơn hoặc đôi.',
    age: '7-17',
    img: badmintonImg,
  },
  {
    id: 'golf',
    slug: 'golf-3d',
    category: 'CÁ NHÂN',
    level: 'INTERMEDIATE',
    title: 'GOLF 3D',
    desc: 'Làm chủ tư thế swing, kiểm soát lực đánh và etiquette sân golf trong môi trường hướng dẫn chuyên nghiệp.',
    age: '8-17',
    img: golfSimImg,
  },
  {
    id: 'tennis',
    slug: 'quan-vot',
    category: 'RACKET',
    level: 'INTERMEDIATE',
    title: 'QUẦN VỢT',
    desc: 'Tập trung vào footwork, cú đánh ổn định, phản xạ và tư duy thi đấu theo lộ trình chuyên nghiệp.',
    age: '8-17',
    img: tennisImg,
  },
  {
    id: 'taekwondo',
    slug: 'taekwondo',
    category: 'VÕ THUẬT',
    level: 'FOUNDATION',
    title: 'TAEKWONDO',
    desc: 'Rèn kỷ luật, sức bền, phản xạ và kỹ thuật tự vệ qua hệ thống bài tập võ thuật chuẩn mực.',
    age: '6-17',
    img: taekwondoImg,
  },
];

export default function CourseListGrid() {
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  const cardRefs = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('opacity-100', 'translate-y-0');
            entry.target.classList.remove('opacity-0', 'translate-y-12');
          }
        });
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    cardRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleCardClick = (slug) => {
    navigate(`/khoa-hoc/${slug}`);
    window.scrollTo(0, 0);
  };

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-[#1c0f13] py-16 md:py-24 text-white font-sans select-none overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* TIÊU ĐỀ SECTION */}
        <div className="mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight">
            CÁC KHÓA HỌC <span className="text-[#e31b23]">CỦA CHÚNG TÔI</span>
          </h2>
          <div className="w-20 h-1 bg-[#e31b23] mt-3"></div>
        </div>

        {/* LƯỚI 8 KHÓA HỌC */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-7">
          {coursesData.map((course, index) => (
            <div
              key={course.id}
              ref={(el) => (cardRefs.current[index] = el)}
              onClick={() => handleCardClick(course.slug)}
              className="opacity-0 translate-y-12 transition-all duration-700 ease-out bg-[#2a171d] rounded-sm overflow-hidden border border-[#3d2028] hover:border-[#e31b23]/80 shadow-2xl group flex flex-col justify-between cursor-pointer"
            >
              {/* KHỐI ẢNH BÌA */}
              <div className="relative aspect-[16/10] overflow-hidden bg-[#12080a]">
                <img
                  src={course.img}
                  alt={course.title}
                  className="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-500 filter brightness-[0.9]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2a171d] via-transparent to-transparent"></div>

                <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 uppercase tracking-widest border border-gray-700/60 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#e31b23] inline-block"></span>
                  <span>{course.level}</span>
                </div>
              </div>

              {/* KHỐI NỘI DUNG CHÍNH */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-[10px] font-black text-[#e31b23] uppercase tracking-widest block mb-1">
                    🎯 {course.category}
                  </span>

                  <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2 group-hover:text-[#e31b23] transition-colors duration-200">
                    {course.title}
                  </h3>

                  <p className="text-gray-300 text-xs sm:text-sm font-medium leading-relaxed line-clamp-3">
                    {course.desc}
                  </p>
                </div>

                {/* FOOTER THẺ */}
                <div className="pt-3 border-t border-[#3d2028] flex items-center justify-between text-xs">
                  <span className="bg-[#e31b23]/20 border border-[#e31b23]/40 text-white font-black px-2.5 py-0.5 rounded-sm">
                    {course.age}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick(course.slug);
                    }}
                    className="text-[#e31b23] group-hover:text-white font-black uppercase tracking-wider flex items-center gap-1 hover:underline cursor-pointer transition-colors duration-200"
                  >
                    <span>Xem chi tiết</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}