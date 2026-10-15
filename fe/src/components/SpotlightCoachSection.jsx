import React, { useState, useEffect, useRef } from 'react';

// Import 8 ảnh HLV chuẩn từ folder assets/page hlv/
import swimImg from '../assets/page hlv/swim-1024x683.webp';
import pingpongImg from '../assets/page hlv/pingpong-1024x707.webp';
import soccerImg from '../assets/page hlv/soccer-1-683x1024.webp';
import basketballImg from '../assets/page hlv/basketball-1-1024x683.webp';
import badmintonImg from '../assets/page hlv/badminton-683x1024.webp';
import golfImg from '../assets/page hlv/golf-683x1024.webp';
import tennisImg from '../assets/page hlv/tennis-1024x947.webp';
import taekwondoImg from '../assets/page hlv/taekwondo-683x1024.webp';

const spotlightCoaches = [
  {
    id: 1,
    numStr: '01',
    sport: 'BƠI LỘI',
    name: 'NGUYỄN THỊ ÁNH VIÊN',
    title: 'HLV TRƯỞNG MÔN BƠI LỘI',
    img: swimImg,
    skills: ['KỸ NĂNG AN TOÀN', 'KỸ THUẬT THỞ', 'SỨC BỀN ĐƯỜNG BƠI'],
    bio: '10 năm khoác áo đội tuyển quốc gia, Ánh Viên đã chinh phục hàng trăm đường đua xanh, mang về khoảng 150 huy chương các loại gồm 25 HCV SEA Games, 2 HCĐ ASIAD và là kình ngư duy nhất của Việt Nam dự 3 kỳ Olympic liên tiếp. Nay là HLV trưởng bộ môn bơi tại AnhDuy Sport, cô đặt quyết tâm phát triển kỹ năng bơi lội cho học viên.',
    stats: [
      { val: '150+', label: 'HUY CHƯƠNG' },
      { val: '25', label: 'HCV SEA GAMES' },
      { val: '3', label: 'KỲ OLYMPIC' },
    ],
    achievements: [
      '2 Huy chương đồng ASIAD',
      '25 HCV SEA Games',
      'Kình ngư Việt Nam dự 3 kỳ Olympic liên tiếp',
    ],
  },
  {
    id: 2,
    numStr: '02',
    sport: 'BÓNG BÀN',
    name: 'PHAN HOÀNG ĐĂNG',
    title: 'HLV TRƯỞNG MÔN BÓNG BÀN',
    img: pingpongImg,
    skills: ['GIAO BÓNG', 'PHẢN XẠ', 'DI CHUYỂN'],
    bio: 'Thầy Phan Hoàng Đăng có nhiều năm kinh nghiệm giảng dạy bóng bàn cho học viên ở mọi lứa tuổi. Thầy đạt nhiều thành tích huấn luyện gồm huy chương vàng đồng đội và đơn nữ tại giải học sinh cấp thành phố.',
    stats: [
      { val: '12', label: 'TUẦN HỌC' },
      { val: '60', label: 'PHÚT/BUỔI' },
      { val: 'HLV', label: 'ĐỒNG ĐỘI' },
    ],
    achievements: [
      'Kỹ thuật giao bóng thuận và nghịch tay',
      'Kỹ thuật đánh bóng bằng tay phải và trái',
      'Tổ hợp giao bóng, đánh bóng và di chuyển',
    ],
  },
  {
    id: 3,
    numStr: '03',
    sport: 'BÓNG ĐÁ',
    name: 'LÊ ĐÌNH TRỌNG',
    title: 'HLV TRƯỞNG MÔN BÓNG ĐÁ',
    img: soccerImg,
    skills: ['DI CHUYỂN', 'SÚT BÓNG', 'EQ VÀ ĐỒNG ĐỘI'],
    bio: 'Thầy Lê Đình Trọng có chứng chỉ Huấn luyện Bóng đá cộng đồng do Liên đoàn Bóng đá TP.HCM cấp. Thầy có hơn 5 năm kinh nghiệm giảng dạy tại các hệ thống trường quốc tế.',
    stats: [
      { val: '5+', label: 'NĂM KINH NGHIỆM' },
      { val: 'HFF', label: 'CHỨNG CHỈ' },
      { val: 'EQ', label: 'ĐÀO TẠO CẢM XÚC' },
    ],
    achievements: [
      'Chứng chỉ Huấn luyện Bóng đá cộng đồng do Liên đoàn Bóng đá TP.HCM cấp',
      'Hơn 5 năm kinh nghiệm giảng dạy tại các hệ thống trường quốc tế',
      'Góp phần đào tạo và nâng đỡ nhiều thế hệ trẻ theo đuổi bóng đá',
    ],
  },
  {
    id: 4,
    numStr: '04',
    sport: 'BÓNG RỔ',
    name: 'PAUL VILLANOVA',
    title: 'HLV TRƯỞNG MÔN BÓNG RỔ',
    img: basketballImg,
    skills: ['KỸ THUẬT CƠ BẢN', 'CHIẾN THUẬT ĐỘI', 'TINH THẦN ĐỒNG ĐỘI'],
    bio: 'HLV bóng rổ người Úc với hơn 10 năm kinh nghiệm tại các trường quốc tế và học viện thể thao ở Úc, Mỹ và Việt Nam. Thầy xây dựng môi trường tập luyện tích cực, kỷ luật và giàu kết nối.',
    stats: [
      { val: '10+', label: 'NĂM KINH NGHIỆM' },
      { val: '4', label: 'HỆ GIẢI ĐẤU' },
      { val: '3', label: 'QUỐC GIA' },
    ],
    achievements: [
      'Hơn 10 năm kinh nghiệm tại các trường quốc tế và học viện thể thao ở Úc, Mỹ và Việt Nam',
      'Dẫn dắt các đội bóng đạt huy chương tại MRISA, HAC, VSBL, APAC',
      'Từng là HLV trưởng tại UNIS, BIS, CIS và nhiều học viện thể thao quốc tế',
    ],
  },
  {
    id: 5,
    numStr: '05',
    sport: 'CẦU LÔNG',
    name: 'HUỲNH TRÍ THỊNH',
    title: 'HLV TRƯỞNG MÔN CẦU LÔNG',
    img: badmintonImg,
    skills: ['BUNG CẦU', 'DI CHUYỂN NÂNG CAO', 'TƯ DUY CHIẾN THUẬT'],
    bio: 'Thạc sĩ Giáo dục, thành viên Ban Phát triển Liên đoàn Cầu lông Châu Á. Thầy từng là vận động viên đội tuyển trẻ quốc gia và có nhiều năm kinh nghiệm thi đấu, giảng dạy.',
    stats: [
      { val: 'BWF', label: 'CHỨNG CHỈ HLV' },
      { val: 'U19', label: 'LỨA TUỔI ĐÀO TẠO' },
      { val: 'A', label: 'LIÊN ĐOÀN CHÂU Á' },
    ],
    achievements: [
      'Thành viên Ban Phát triển Liên đoàn Cầu lông Châu Á',
      'Từng là VĐV đội tuyển trẻ quốc gia',
      'Chứng chỉ HLV cấp 2 của BWF',
    ],
  },
  {
    id: 6,
    numStr: '06',
    sport: 'GOLF 3D',
    name: 'NGÔ BẢO NGHI',
    title: 'HLV TRƯỞNG MÔN GOLF 3D',
    img: golfImg,
    skills: ['CÚ SWING', 'PUTTING GREEN', 'LUẬT CHƠI GOLF'],
    bio: 'Cô Ngô Bảo Nghi là một trong những vận động viên Golf hàng đầu Việt Nam với nhiều thành tích tại ASIAD và SEA Games. Cô là người Việt Nam đầu tiên nhận chứng chỉ thành viên hạng A của Hiệp hội Golf Chuyên nghiệp Nữ (LPGA Class A Member) và có học bổng toàn phần hạng 1 của NCAA Division 1 tại Mỹ.',
    stats: [
      { val: 'LPGA', label: 'CLASS A' },
      { val: '3', label: 'NĂM VÔ ĐỊCH QG' },
      { val: '4', label: 'LẦN SEA GAMES' },
    ],
    achievements: [
      'Vô địch quốc gia 3 năm liên tiếp 2009-2011',
      'Quán quân giải Trẻ quốc gia 6 năm liên tiếp 2008-2013',
      '4 lần đại diện đội tuyển quốc gia tham dự SEA Games và 2 lần tham dự ASIAD',
      'Thành viên trẻ nhất của Hiệp hội Golf Việt Nam 2016-2019',
    ],
  },
  {
    id: 7,
    numStr: '07',
    sport: 'QUẦN VỢT',
    name: 'NGUYỄN TÔN NHUẬN',
    title: 'HLV TRƯỞNG MÔN QUẦN VỢT',
    img: tennisImg,
    skills: ['CẮM VỢT', 'DI CHUYỂN NÂNG CAO', 'PHẢN XẠ VÀ DỰ ĐOÁN'],
    bio: 'Với hơn 20 năm kinh nghiệm huấn luyện Tennis đa cấp độ từ cơ bản đến nâng cao, thầy Tôn Nhuận đã đồng hành cùng hàng trăm học viên. Thầy giúp học viên xây dựng nền tảng kỹ thuật chuẩn, phát triển kỹ năng an toàn và bền vững theo thời gian.',
    stats: [
      { val: '20+', label: 'NĂM HUẤN LUYỆN' },
      { val: 'ITF', label: 'LEVEL 1' },
      { val: 'VTF', label: 'LEVEL 2' },
    ],
    achievements: [
      'Chứng chỉ Huấn luyện viên ITF Level 1 - Liên đoàn Quần vợt Quốc tế',
      'Bằng cấp VTF Level 2 - Liên đoàn Quần vợt Việt Nam',
      'Huấn luyện theo tiêu chuẩn quốc tế cho lứa tuổi U8/U11 và U14/U19',
    ],
  },
  {
    id: 8,
    numStr: '08',
    sport: 'TAEKWONDO',
    name: 'PHAN THỊ THÚY HẰNG',
    title: 'HLV TRƯỞNG MÔN TAEKWONDO',
    img: taekwondoImg,
    skills: ['TỰ VỆ', 'THỂ LỰC VÀ LINH HOẠT', 'TINH THẦN KỶ LUẬT'],
    bio: 'Cô Thúy Hằng từng là vận động viên đội tuyển quốc gia Taekwondo Việt Nam giai đoạn 2005-2009. Cô sở hữu chứng nhận Đai đen 6 đẳng Taekwondo và nhiều chứng nhận quốc tế.',
    stats: [
      { val: '6', label: 'ĐẲNG ĐAI ĐEN' },
      { val: 'WT', label: 'KUKKIWON' },
      { val: '2005', label: 'ĐỘI TUYỂN QG' },
    ],
    achievements: [
      'Vận động viên đội tuyển Quốc gia Taekwondo Việt Nam từ 2005 đến 2009',
      'Đai đen 6 đẳng Taekwondo và nhiều chứng nhận quốc tế',
      'Kukkiwon công nhận thứ hạng đai quốc tế',
      'Thành viên Ban Giám khảo chuyên môn của Liên đoàn Taekwondo Việt Nam',
    ],
  },
];

export default function SpotlightCoachSection() {
  const [selectedCoach, setSelectedCoach] = useState(spotlightCoaches[0]);
  const [isAnimating, setIsAnimating] = useState(false);
  const sectionRef = useRef(null);

  // Hiệu ứng Fade-In-Up khi cuộn tới
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('opacity-100', 'translate-y-0');
          entry.target.classList.remove('opacity-0', 'translate-y-12');
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleSelectCoach = (coach) => {
    if (coach.id === selectedCoach.id) return;
    setIsAnimating(true);
    setTimeout(() => {
      setSelectedCoach(coach);
      setIsAnimating(false);
    }, 200);
  };

  return (
    <section
      ref={sectionRef}
      className="opacity-0 translate-y-12 transition-all duration-700 ease-out relative w-full bg-[#0e111a] py-16 md:py-24 text-white font-sans select-none overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-10">
          <div>
            <div className="inline-flex items-center space-x-1.5 bg-[#e31b23] text-white text-[10px] font-black px-2.5 py-0.5 uppercase tracking-widest mb-3 transform -skew-x-12">
              <span className="inline-block transform skew-x-12">★ SPOTLIGHT</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight leading-none">
              HUẤN LUYỆN VIÊN <span className="text-[#e31b23]">NGÔI SAO</span>
            </h2>
            <div className="w-20 h-1 bg-[#e31b23] mt-3"></div>
          </div>

          <div className="mt-4 md:mt-0 text-left md:text-right">
            <span className="block text-4xl sm:text-5xl font-black text-gray-100 tracking-tight leading-none">
              8+
            </span>
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest mt-1 block">
              CHUYÊN GIA HÀNG ĐẦU
            </span>
          </div>
        </div>

        {/* DẢI 8 AVATAR HLV DÀN NGANG */}
        <div className="w-full mb-8">
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3.5">
            {spotlightCoaches.map((coach) => {
              const isSelected = coach.id === selectedCoach.id;
              return (
                <div
                  key={coach.id}
                  onClick={() => handleSelectCoach(coach)}
                  className={`relative w-full aspect-[3/4] cursor-pointer rounded-sm overflow-hidden transition-all duration-300 border-2 ${
                    isSelected
                      ? 'border-[#e31b23] scale-105 shadow-xl shadow-red-900/50 z-10'
                      : 'border-gray-700/60 opacity-60 hover:opacity-100 hover:border-gray-400'
                  }`}
                >
                  <img
                    src={coach.img}
                    alt={coach.name}
                    className="w-full h-full object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                  <span className="absolute bottom-1.5 left-1.5 right-1.5 text-[9px] sm:text-[10px] font-black uppercase text-white tracking-wider truncate text-center">
                    {coach.sport}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* MAIN DISPLAY CARD CHI TIẾT HLV - ĐÃ SỬA CHUẨN HIỂN THỊ FULL KHUÔN MẶT 100% */}
        <div
          className={`w-full bg-[#131722] rounded-sm overflow-hidden border border-gray-800 shadow-2xl flex flex-col lg:flex-row transition-opacity duration-300 ${
            isAnimating ? 'opacity-30' : 'opacity-100'
          }`}
        >
          {/* CỘT TRÁI: KHUNG ẢNH KHỔ LỚN CHÍNH XÁC KHUÔN MẶT HLV */}
          <div className="w-full lg:w-1/2 relative min-h-[440px] sm:min-h-[520px] bg-[#0a0c12] flex flex-col justify-between p-6 sm:p-8 overflow-hidden">
            {/* Ảnh HLV hiển thị đầy đủ chi tiết khuôn mặt & thần thái */}
            <img
              src={selectedCoach.img}
              alt={selectedCoach.name}
              className="absolute inset-0 w-full h-full object-contain md:object-cover object-top sm:object-[center_15%] filter brightness-[0.9] contrast-[1.05]"
            />
            {/* Overlay Gradient phủ chuyển tiếp nhẹ nhàng ở dưới chân */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#131722] via-black/40 to-black/20 pointer-events-none"></div>

            {/* Tag Bộ môn + Số thứ tự */}
            <div className="relative z-10 flex items-center justify-between">
              <span className="bg-[#e31b23] text-white text-[10px] font-black px-3 py-1 uppercase tracking-widest transform -skew-x-6 shadow-md">
                <span className="inline-block transform skew-x-6">
                  {selectedCoach.sport}
                </span>
              </span>
              <span className="text-5xl sm:text-6xl font-black text-white/30 tracking-tighter drop-shadow-md">
                {selectedCoach.numStr}
              </span>
            </div>

            {/* Thông tin Tên HLV & Chức danh bên dưới ảnh */}
            <div className="relative z-10 mt-auto pt-16">
              <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase tracking-tight leading-none drop-shadow-2xl mb-1">
                {selectedCoach.name}
              </h3>
              <p className="text-xs sm:text-sm font-extrabold text-gray-300 uppercase tracking-wider mb-4 drop-shadow-md">
                {selectedCoach.title}
              </p>

              {/* Dải Skills Tag */}
              <div className="flex flex-wrap gap-2">
                {selectedCoach.skills.map((skill, sIdx) => (
                  <span
                    key={sIdx}
                    className="bg-black/70 backdrop-blur-md border border-gray-700/80 text-gray-200 text-[10px] font-extrabold px-3 py-1 uppercase tracking-wider rounded-none shadow-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: TIỂU SỬ + THỐNG KÊ + CHECKLIST THÀNH TÍCH */}
          <div className="w-full lg:w-1/2 p-6 sm:p-8 md:p-10 flex flex-col justify-between bg-[#131722] border-t lg:border-t-0 lg:border-l border-gray-800">
            <div>
              <h4 className="text-2xl sm:text-3xl font-black text-[#e31b23] uppercase tracking-tight mb-4 border-b border-gray-800 pb-3">
                {selectedCoach.sport}
              </h4>

              <p className="text-gray-300 text-xs sm:text-sm font-medium leading-relaxed mb-8">
                {selectedCoach.bio}
              </p>

              <div className="grid grid-cols-3 gap-3 bg-[#1a1f2e] p-4 rounded-sm border border-gray-800/80 mb-8 text-center">
                {selectedCoach.stats.map((st, stIdx) => (
                  <div key={stIdx} className="border-r last:border-r-0 border-gray-700/60 pr-2 last:pr-0">
                    <span className="block text-2xl sm:text-3xl font-black text-[#e31b23] leading-none mb-1">
                      {st.val}
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-wider block">
                      {st.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-2">
                {selectedCoach.achievements.map((item, aIdx) => (
                  <div key={aIdx} className="flex items-start space-x-3">
                    <div className="w-4 h-4 rounded-full border border-[#e31b23] flex items-center justify-center shrink-0 mt-0.5 text-[#e31b23]">
                      <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20">
                        <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                      </svg>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-200 font-semibold leading-tight">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}