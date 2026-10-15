import React from 'react';
import Header from '../components/Header';
import HeroBackground from '../components/HeroBackground';
import HeroSection from '../components/HeroSection';
import SportsTicker from '../components/SportsTicker';
import AboutSection from '../components/AboutSection';
import CoursesSection from '../components/CoursesSection';
import CoachesSection from '../components/CoachesSection';
import FacilitiesSection from '../components/FacilitiesSection';
import Footer from '../components/Footer'; // Import Footer

export default function HomePage() {
  return (
    <div className="relative w-full min-h-screen font-sans bg-white selection:bg-red-600 selection:text-white">
      {/* 1. HEADER */}
      <Header />

      {/* 2. HERO BANNER */}
      <div className="relative w-full h-screen overflow-hidden">
        <HeroBackground />
        <HeroSection />
      </div>

      {/* 3. DẢI BĂNG MÔN THỂ THAO */}
      <SportsTicker />

      {/* 4. VỀ CHÚNG TÔI */}
      <AboutSection />

      {/* 5. KHÓA HỌC THỂ THAO */}
      <CoursesSection />

      {/* 6. HUẤN LUYỆN VIÊN */}
      <CoachesSection />

      {/* 7. CƠ SỞ VẬT CHẤT */}
      <FacilitiesSection />

      {/* 8. FOOTER & FORM TƯ VẤN GHI DANH */}
      <Footer />
    </div>
  );
}