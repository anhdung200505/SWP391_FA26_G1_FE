import React from 'react';

export default function HeroSection() {
  return (
    // Sử dụng justify-end kết hợp pb-12 để đẩy chữ xuống sát dải màu đỏ bên dưới hơn
    <main className="relative z-10 flex flex-col items-center justify-end h-[calc(100dvh-80px)] pb-12 md:pb-16 text-center px-4">
      <h1 className="max-w-full text-4xl sm:text-5xl md:text-7xl font-black text-white uppercase tracking-tight drop-shadow-lg leading-tight text-balance">
        Shaping Resilience
      </h1>
      <h2 className="max-w-full text-3xl sm:text-4xl md:text-6xl font-extrabold text-red-600 uppercase tracking-tight mt-2 drop-shadow-md text-balance">
        Through Sports
      </h2>
    </main>
  );
}