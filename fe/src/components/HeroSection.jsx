import React from 'react';

export default function HeroSection() {
  return (
    // Sử dụng justify-end kết hợp pb-12 để đẩy chữ xuống sát dải màu đỏ bên dưới hơn
    <main className="relative z-10 flex flex-col items-center justify-end h-[calc(100vh-80px)] pb-12 md:pb-16 text-center px-4">
      <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tight drop-shadow-lg leading-tight">
        Shaping Resilience
      </h1>
      <h2 className="text-4xl md:text-6xl font-extrabold text-red-600 uppercase tracking-tight mt-2 drop-shadow-md">
        Through Sports
      </h2>
    </main>
  );
}