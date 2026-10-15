import React from 'react';

export default function HeroBackground() {
  return (
    <div className="absolute inset-0 z-0">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover"
      >
        {/* Nếu để video ở thư mục public/vid.webm */}
        <source src="/vid.webm" type="video/webm" />
        Trình duyệt của bạn không hỗ trợ thẻ video.
      </video>

      {/* Lớp phủ đen mờ */}
      <div className="absolute inset-0 bg-black/40"></div>
    </div>
  );
}