import React, { useEffect, useRef } from 'react';

// Import chính xác 9 file ảnh thực tế có trong thư mục src/assets/facilities/
import arenaImg from '../assets/facilities/facility-arena-1024x683.webp';
import basketballImg from '../assets/facilities/facility-basketball-1024x683.webp';
import poolImg from '../assets/facilities/facility-pool-1024x682.webp';
import golfSimImg from '../assets/facilities/facility-golf-sim-1024x683.webp';
import golfGreenImg from '../assets/facilities/facility-golf-green-1024x576.webp';
import tennisImg from '../assets/facilities/facility-tennis-1024x576.webp';
import theaterImg from '../assets/facilities/facility-theater-1024x331.webp';
import tabletennisImg from '../assets/facilities/facility-tabletennis-1024x683.webp';
import studioImg from '../assets/facilities/taekwondo-1-1024x683.webp';

const facilitiesData = [
  {
    id: 1,
    tag: 'ARENA',
    title: 'SÂN VẬN ĐỘNG ANHDUY',
    desc: 'Sở hữu hệ thống trang thiết bị đạt chuẩn FIBA, sân vận động AnhDuy có diện tích 1.976m² và sức chứa 1.500 – 2.500 chỗ ngồi. AnhDuy Sport là đối tác chiến lược, sân nhà của đội tuyển bóng rổ Saigon Heat, tạo điều kiện giúp học viên đội tuyển có cơ hội tham dự các giải đấu trong hệ thống SSA, cũng như tham dự những trận đấu của Saigon Heat tổ chức tại AnhDuy Sport.',
    badges: ['1.976M²', '1.500–2.500 CHỖ', 'CHUẨN FIBA'],
    image: arenaImg,
    imageLeft: true,
  },
  {
    id: 2,
    tag: 'INDOOR COURT',
    title: 'SÂN THI ĐẤU ĐA NĂNG',
    desc: 'Sân thi đấu trong nhà với diện tích 540m² được thiết kế phù hợp để tổ chức nhiều môn thể thao như bóng rổ, bóng chuyền, futsal với mục đích huấn luyện cá nhân và thi đấu nhóm.',
    badges: ['540M²', 'ĐA BỘ MÔN', 'TẬP LUYỆN & THI ĐẤU'],
    image: basketballImg,
    imageLeft: false,
  },
  {
    id: 3,
    tag: 'AQUATICS',
    title: 'HỒ BƠI CHUẨN OLYMPIC',
    desc: 'Hồ bơi 50m, 10 làn bơi đạt chuẩn Olympic – đáp ứng tiêu chuẩn thi đấu quốc tế. Hồ phụ dài 25m, lý tưởng cho các lớp học bơi cơ bản và hoạt động làm quen nước. Hệ thống lọc nước UV + Ozone đảm bảo an toàn.',
    badges: ['50M', '10 LÀN BƠI', 'UV + OZONE'],
    image: poolImg,
    imageLeft: true,
  },
  {
    id: 4,
    tag: 'GOLF SIMULATOR',
    title: 'PHÒNG MÔ PHỎNG XSWING – GOLF 3D',
    desc: 'Phòng tập golf công nghệ cao với hệ thống mô phỏng 3D hiện đại, cho phép người chơi luyện tập kỹ thuật đánh bóng chính xác trong điều kiện không gian giống như thật.',
    badges: ['MÔ PHỎNG 3D', 'INDOOR', 'PHÂN TÍCH KỸ THUẬT'],
    image: golfSimImg,
    imageLeft: false,
  },
  {
    id: 5,
    tag: 'PUTTING GREEN',
    title: 'SÂN TẬP GOLF PUTTING GREEN',
    desc: 'Khu sân tập ngoài trời với mặt cỏ chất lượng cao, được thiết kế để mang đến trải nghiệm luyện tập golf chuyên nghiệp trong không gian xanh mát và yên tĩnh.',
    badges: ['NGOÀI TRỜI', 'MẶT CỎ CAO CẤP', 'KHÔNG GIAN XANH'],
    image: golfGreenImg,
    imageLeft: true,
  },
  {
    id: 6,
    tag: 'TENNIS COURT',
    title: 'SÂN TENNIS NGOÀI TRỜI',
    desc: 'Sân tennis ngoài trời được thiết kế đạt chuẩn, phù hợp cho cả luyện tập cá nhân và thi đấu. Bề mặt acrylic cao cấp mang lại độ nảy chuẩn xác và độ bền vượt trội.',
    badges: ['ACRYLIC', 'NGOÀI TRỜI', 'THI ĐẤU'],
    image: tennisImg,
    imageLeft: false,
  },
  {
    id: 7,
    tag: 'THEATER',
    title: 'NHÀ HÁT & SÂN KHẤU',
    desc: 'Với hơn 370 ghế ngồi và không gian rộng 408m², rạp hát AnhDuy Sport được thiết kế chuyên biệt cho các hoạt động trình chiếu, biểu diễn, sự kiện nghệ thuật, hội thảo. Hệ thống màn hình LED và âm thanh chất lượng cao.',
    badges: ['370+ GHẾ', '408M²', 'LED & ÂM THANH'],
    image: theaterImg,
    imageLeft: true,
  },
  {
    id: 8,
    tag: 'TABLE TENNIS',
    title: 'PHÒNG TẬP ĐA NĂNG (KHÔNG GƯƠNG)',
    desc: 'Không gian rộng rãi, linh hoạt, phù hợp cho nhiều bộ môn và nhu cầu tập luyện, thi đấu.',
    badges: ['RỘNG THOẢNG', 'CHUẨN QUỐC TẾ', 'TẬP LUYỆN'],
    image: tabletennisImg,
    imageLeft: false,
  },
  {
    id: 9,
    tag: 'STUDIO',
    title: 'PHÒNG TẬP ĐA NĂNG (CÓ GƯƠNG)',
    desc: 'Phòng tập rộng 266m² được trang bị tường gương toàn phần, đáp ứng nhu cầu tập luyện cho nhiều bộ môn như múa ballet, khiêu vũ, nhảy hiện đại, võ thuật. Hệ thống ánh sáng và âm thanh chất lượng cao.',
    badges: ['266M²', 'TƯỜNG GƯƠNG', 'ÂM THANH & ÁNH SÁNG'],
    image: studioImg,
    imageLeft: true,
  },
];

export default function FacilityListSection({ onRegisterClick }) {
  const itemRefs = useRef([]);

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
      { threshold: 0.15 }
    );

    itemRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative w-full bg-white py-12 md:py-20 text-gray-900 font-sans select-none overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 md:space-y-24">
        {facilitiesData.map((item, index) => {
          return (
            <div
              key={item.id}
              ref={(el) => (itemRefs.current[index] = el)}
              className="opacity-0 translate-y-12 transition-all duration-700 ease-out flex flex-col lg:flex-row items-center gap-8 lg:gap-14"
            >
              {/* KHỐI ẢNH */}
              <div
                className={`w-full lg:w-1/2 relative rounded-sm overflow-hidden shadow-2xl group ${
                  item.imageLeft ? 'lg:order-1' : 'lg:order-2'
                }`}
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4 bg-[#e31b23] text-white text-[10px] font-black tracking-widest px-3 py-1 uppercase shadow-md transform -skew-x-6">
                    <span className="inline-block transform skew-x-6">
                      {item.tag}
                    </span>
                  </div>
                </div>
              </div>

              {/* KHỐI NỘI DUNG */}
              <div
                className={`w-full lg:w-1/2 flex flex-col justify-center ${
                  item.imageLeft ? 'lg:order-2' : 'lg:order-1'
                }`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-[#e31b23]"></span>
                  <span className="text-[11px] font-black uppercase text-gray-400 tracking-widest">
                    ELITE INFRASTRUCTURE
                  </span>
                </div>

                <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#e31b23] uppercase tracking-tight leading-tight mb-4">
                  {item.title}
                </h3>

                <p className="text-gray-600 text-xs sm:text-sm font-medium leading-relaxed mb-6">
                  {item.desc}
                </p>

                <div className="flex flex-wrap gap-2.5 mb-8">
                  {item.badges.map((badge, bIdx) => (
                    <div
                      key={bIdx}
                      className="bg-[#fff2f2] border border-[#ffcccc] text-[#e31b23] text-[11px] font-black px-4 py-2 uppercase tracking-wider rounded-none transform -skew-x-6"
                    >
                      <span className="inline-block transform skew-x-6">
                        {badge}
                      </span>
                    </div>
                  ))}
                </div>

                <div>
                  <button
                    onClick={onRegisterClick}
                    className="inline-flex items-center space-x-2 bg-[#e31b23] hover:bg-red-700 text-white font-black text-xs sm:text-sm px-6 py-3.5 transform -skew-x-6 transition-all duration-200 shadow-lg hover:scale-105 cursor-pointer uppercase tracking-wider"
                  >
                    <span className="inline-flex items-center gap-2 transform skew-x-6">
                      <span>📞</span>
                      <span>ĐẮNG KÝ THAM QUAN NGAY</span>
                      <span>→</span>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}