import React, { useState, useEffect, useRef } from 'react';

// Hook tùy chỉnh đếm số tự động từ 0 -> Target
function useCountUp(end, duration = 2000, startTrigger = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!startTrigger) return;

    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Hiệu ứng Ease-Out giúp con số chạy nhanh lúc đầu và chậm dần về cuối
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * end));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [end, duration, startTrigger]);

  return count;
}

// Sub-component cho từng thẻ con số màu đỏ vát nghiêng
function StatCard({ number, label, isVisible }) {
  const currentCount = useCountUp(number, 2200, isVisible);

  return (
    <div className="bg-red-600 text-white p-5 md:p-6 shadow-xl transform -skew-x-12 transition-all duration-500 hover:scale-105 hover:bg-red-700">
      <div className="transform skew-x-12 flex items-center justify-start space-x-6 px-4">
        {/* Số đếm chạy từ 0 -> Kết quả */}
        <span className="text-4xl md:text-5xl font-black italic tracking-tight min-w-[100px] text-right">
          {currentCount.toLocaleString('vi-VN')}
        </span>
        {/* Nhãn mô tả */}
        <span className="text-lg md:text-xl font-black uppercase tracking-wider leading-snug">
          {label}
        </span>
      </div>
    </div>
  );
}

export default function AboutSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  // Lắng nghe khi người dùng cuộn tới vị trí Section này
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.25 } // Xuất hiện 25% diện tích là kích hoạt animation
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

  const stats = [
    { number: 9, label: 'SÂN/KHU VỰC TẬP LUYỆN' },
    { number: 12, label: 'MÔN THỂ THAO ĐA DẠNG' },
    { number: 400, label: 'HỌC VIÊN MỖI MÙA' },
    { number: 13000, label: 'M² TỔNG DIỆN TÍCH' },
  ];

  return (
    <section
      ref={sectionRef}
      className="bg-white py-20 px-6 md:px-12 max-w-7xl mx-auto overflow-hidden"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* KHỐI NỘI DUNG BÊN TRÁI (Tên thương hiệu & Bài viết) */}
        <div
          className={`transition-all duration-1000 ease-out ${
            isVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-12'
          }`}
        >
          {/* Tiêu đề chính */}
          <h2 className="text-3xl md:text-4xl font-black text-red-600 uppercase tracking-tight">
            TẠI SAO NÊN CHỌN
          </h2>
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 uppercase tracking-tight leading-none mb-8">
            ANHDUY SPORT
          </h1>

          {/* Nội dung mô tả */}
          <div className="space-y-6 text-gray-600 text-base md:text-lg leading-relaxed font-normal">
            <p>
              Trung tâm thể thao <strong className="text-gray-900">AnhDuy Sport</strong> hướng đến sự phát triển toàn diện của học viên thông qua các hoạt động thể thao bổ ích. Các môn học, hoạt động do trung tâm tổ chức và đồng tổ chức không chỉ giúp học viên rèn luyện sức khỏe, mà còn trau dồi kỹ năng mềm quan trọng.
            </p>
            <p>
              Thuộc hệ sinh thái giáo dục thể thao hiện đại – một trong những tổ chức hàng đầu, <strong className="text-gray-900">AnhDuy Sport</strong> mang đến trải nghiệm thể thao chuẩn quốc tế với cơ sở vật chất hiện đại và đội ngũ huấn luyện viên chuyên nghiệp.
            </p>
          </div>
        </div>

        {/* KHỐI THỐNG KÊ BÊN PHẢI (Thẻ đỏ đếm số vát nghiêng) */}
        <div
          className={`space-y-4 transition-all duration-1000 delay-300 ease-out ${
            isVisible
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 translate-x-12'
          }`}
        >
          {stats.map((stat, index) => (
            <StatCard
              key={index}
              number={stat.number}
              label={stat.label}
              isVisible={isVisible}
            />
          ))}
        </div>
      </div>
    </section>
  );
}