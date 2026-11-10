import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import NotificationBell from './NotificationBell';

export default function StudentHeader({ user, onLogout }) {
  const [isTransparent, setIsTransparent] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Hiệu ứng cuộn trang đổi màu sắc Header
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setIsTransparent(false);
      } else {
        setIsTransparent(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setAccountOpen(false);
  }, [location.pathname]);

  const displayName = user?.fullName || user?.userName || 'Học viên';
  const displayEmail = user?.email || '';

  const getInitial = (name) => {
    if (!name) return 'H';
    return name.charAt(0).toUpperCase();
  };

  const navItems = [
    { name: 'KHÁM PHÁ', path: '/hoc-vien-kham-pha' },
    { name: 'ĐĂNG KÝ KHÓA HỌC', path: '/dang-ky-khoa-hoc-kham-pha' },
    { name: 'GÓI HỘI VIÊN', path: '/dang-ky-thanh-vien-kham-pha' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 pt-[env(safe-area-inset-top)] transition-all duration-300 ease-in-out ${
        isTransparent
          ? 'bg-slate-950/95 text-white backdrop-blur-md lg:bg-gradient-to-b lg:from-slate-950/90 lg:via-slate-950/50 lg:to-transparent lg:py-4'
          : 'bg-slate-900/95 shadow-xl border-b border-slate-800/80 text-white backdrop-blur-md lg:py-3'
      }`}
    >
      <div className="mx-auto flex w-full items-center justify-between gap-2 px-3 py-2 sm:px-6 md:px-12 lg:py-0">
        <Link to="/home" className="flex min-w-0 items-center gap-2 group">
          <img
            src={logoImg}
            alt="AnhDuy Sport Logo"
            className="h-8 w-auto shrink-0 object-contain drop-shadow-md sm:h-10 lg:h-11"
          />
          <div className="min-w-0 select-none">
            <div className="flex items-center font-black italic uppercase tracking-wide text-sm sm:text-xl lg:text-2xl">
              <span className="text-white group-hover:text-red-400">AnhDuy</span>
              <span className="ml-1 text-[#e31b23]">Sport</span>
            </div>
            <span className="block truncate text-[8px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-[9px]">
              Portal học viên
            </span>
          </div>
        </Link>

        {/* MENU ĐIỀU HƯỚNG VUÔNG VỨC & BÔI ĐỎ TRƯỢT TỪ TRÁI SANG PHẢI (GIỐNG ẢNH MẪU) */}
        <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path;

            return (
              <div key={index} className="relative group">
                <Link
                  to={item.path}
                  className={`relative overflow-hidden px-4 py-2.5 text-xs xl:text-sm font-bold tracking-wider transition-colors duration-300 whitespace-nowrap block cursor-pointer select-none rounded-none uppercase ${
                    isActive
                      ? 'bg-[#e31b23] text-white shadow-md'
                      : isTransparent
                      ? 'text-white/90 hover:text-white'
                      : 'text-slate-200 hover:text-white'
                  }`}
                >
                  {/* Hiệu ứng trượt phủ nền đỏ từ trái sang phải khi rê chuột */}
                  {!isActive && (
                    <span className="absolute inset-0 bg-[#e31b23] transition-transform duration-300 ease-out origin-left -z-10 scale-x-0 group-hover:scale-x-100" />
                  )}

                  <span className="relative z-10">{item.name}</span>
                </Link>
              </div>
            );
          })}
        </nav>

        {/* KHU VỰC THÔNG BÁO & AVATAR DROPDOWN */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <NotificationBell compact variant="dark" />

          <div className="group relative">
            <button
              type="button"
              aria-expanded={accountOpen}
              aria-label="Tài khoản"
              onClick={() => setAccountOpen((open) => !open)}
              className="flex items-center focus:outline-none cursor-pointer"
            >
              <div className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#e31b23] to-red-700 text-sm font-black text-white ring-2 ring-white/20 sm:size-10 sm:text-base">
                {user?.avatarUrl && /^(\/|https?:)/.test(user.avatarUrl) ? (
                  <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  getInitial(displayName)
                )}
              </div>
            </button>

            {/* DROPDOWN MENU KHI HOVER VÀO AVATAR */}
            <div className={`absolute right-0 top-full z-50 w-[min(16rem,calc(100vw-1.5rem))] pt-2 ${accountOpen ? 'block' : 'hidden'} lg:group-hover:block`}>
              <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl py-3 border border-slate-800 text-white animate-fadeIn">
                <div className="px-4 py-2.5 border-b border-slate-800">
                  <p className="text-sm font-black text-white truncate">{displayName}</p>
                  {displayEmail && <p className="text-xs text-slate-400 truncate">{displayEmail}</p>}
                  <span className="mt-1.5 inline-block text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    Chưa kích hoạt gói
                  </span>
                </div>

                <div className="py-1">
                  <Link
                    to="/home"
                    className="flex items-center px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 00-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Trang chủ AnhDuy Sport
                  </Link>

                  <Link
                    to="/ho-so"
                    className="flex items-center px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Hồ sơ cá nhân
                  </Link>

                  <button
                    type="button"
                    onClick={onLogout}
                    className="w-full flex items-center px-4 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors text-left cursor-pointer border-t border-slate-800/60 mt-1"
                  >
                    <svg className="w-4 h-4 mr-2.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Đăng xuất
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE NAV BAR */}
      <nav className="grid grid-cols-4 border-t border-slate-800 bg-slate-950 lg:hidden">
        {[
          { label: 'Trang chủ', to: '/home' },
          { label: 'Khám phá', to: '/hoc-vien-kham-pha' },
          { label: 'Khóa học', to: '/dang-ky-khoa-hoc-kham-pha' },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`px-1 py-2.5 text-center text-[11px] font-bold ${
              location.pathname === item.to ? 'text-[#e31b23]' : 'text-slate-300'
            }`}
          >
            {item.label}
          </Link>
        ))}
        <button type="button" onClick={onLogout} className="px-1 py-2.5 text-center text-[11px] font-bold text-slate-300">
          Thoát
        </button>
      </nav>
    </header>
  );
}