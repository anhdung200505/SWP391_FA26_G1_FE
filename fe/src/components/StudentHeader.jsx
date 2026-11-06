import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import NotificationBell from './NotificationBell';

export default function StudentHeader({ user, onLogout }) {
  const [isTransparent, setIsTransparent] = useState(true);
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
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ease-in-out ${
        isTransparent
          ? 'bg-gradient-to-b from-slate-950/90 via-slate-950/50 to-transparent py-4 text-white backdrop-blur-xs'
          : 'bg-slate-900/95 shadow-xl border-b border-slate-800/80 py-3 text-white backdrop-blur-md'
      }`}
    >
      <div className="flex items-center justify-between w-full px-6 md:px-12 mx-auto">
        {/* LOGO - DIRECT VỀ TRANG CHỦ HOME */}
        <Link
          to="/home"
          className="flex items-center space-x-2.5 group shrink-0"
        >
          <img
            src={logoImg}
            alt="AnhDuy Sport Logo"
            className={`w-auto object-contain transition-all duration-300 filter drop-shadow-lg ${
              isTransparent ? 'h-11 md:h-13' : 'h-10 md:h-11'
            }`}
          />
          <div className="flex flex-col select-none">
            <div className="flex items-center font-black italic tracking-wider text-xl md:text-2xl uppercase transition-colors">
              <span className="text-white drop-shadow-md group-hover:text-red-400 transition-colors">
                AnhDuy
              </span>
              <span className="text-[#e31b23] ml-1.5 drop-shadow-md">
                Sport
              </span>
            </div>
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest -mt-1">
              Portal Học Viên
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
        <div className="flex items-center gap-4">
          <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/60 hover:border-slate-500 transition-all shadow-md">
            <NotificationBell />
          </div>

          {/* AVATAR KÈM HỘP THÔNG TIN KHI RÊ CHUỘT */}
          <div className="relative group">
            <button
              type="button"
              className="flex items-center focus:outline-none cursor-pointer p-0.5"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#e31b23] to-red-700 text-white flex items-center justify-center font-black text-base shadow-lg ring-2 ring-white/20 transition-all duration-300 group-hover:scale-105 group-hover:ring-red-500">
                {user?.avatarUrl && /^(\/|https?:)/.test(user.avatarUrl) ? (
                  <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  getInitial(displayName)
                )}
              </div>
            </button>

            {/* DROPDOWN MENU KHI HOVER VÀO AVATAR */}
            <div className="absolute right-0 top-full hidden group-hover:block pt-3 w-64 z-50">
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
      <div className="lg:hidden flex items-center justify-around bg-slate-900/95 py-2.5 border-t border-slate-800 text-xs font-bold backdrop-blur-md">
        <Link to="/home" className="text-slate-300">🏠 Trang chủ</Link>
        <Link to="/hoc-vien-kham-pha" className="text-red-400 font-black">✨ Khám phá</Link>
        <Link to="/dang-ky-khoa-hoc-kham-pha" className="text-slate-300">📝 Khóa học</Link>
        <button onClick={onLogout} className="text-red-400">🚪 Thoát</button>
      </div>
    </header>
  );
}