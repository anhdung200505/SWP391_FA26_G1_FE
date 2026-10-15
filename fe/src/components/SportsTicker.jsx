import React from 'react';

const sportsList = [
  'BÓNG RỔ',
  'BƠI LỘI',
  'GOLF',
  'TENNIS',
  'BÓNG BÀN',
  'CẦU LÔNG',
  'TAEKWONDO',
  'BÓNG ĐÁ',
];

export default function SportsMarqueeTicker() {
  return (
    <div className="relative w-full bg-[#e31b23] py-5 sm:py-6 overflow-hidden shadow-2xl border-y-2 border-red-700 select-none">
      {/* Vát nhẹ 2 đầu dải băng tạo phong cách thể thao */}
      <div className="flex whitespace-nowrap animate-marquee">
        {/* Nhân bản 4 lần danh sách để chạy liên tục mượt mà không bị hẫng */}
        {[...Array(4)].map((_, arrayIdx) => (
          <div key={arrayIdx} className="flex items-center shrink-0">
            {sportsList.map((sport, index) => (
              <React.Fragment key={index}>
                {/* Tăng kích thước chữ to rõ ràng & khoảng cách thưa ra vừa tầm mắt 5 môn */}
                <span className="text-white font-black text-2xl sm:text-3xl md:text-4xl uppercase tracking-wider italic px-8 sm:px-12 md:px-16 drop-shadow-md">
                  {sport}
                </span>
                {/* Dấu sao phân cách to đậm */}
                <span className="text-white/70 text-lg sm:text-xl md:text-2xl font-bold">
                  ★
                </span>
              </React.Fragment>
            ))}
          </div>
        ))}
      </div>

      {/* Hiệu ứng mờ bóng 2 mép dải băng */}
      <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-black/25 to-transparent pointer-events-none"></div>
      <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-black/20 to-transparent pointer-events-none"></div>
    </div>
  );
}