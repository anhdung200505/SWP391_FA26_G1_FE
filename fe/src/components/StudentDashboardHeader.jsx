import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import NotificationBell from './NotificationBell';
import { useAuth } from '../context/AuthContext';

export default function StudentDashboardHeader({ activeId, onSelect, items = [] }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/dang-nhap', { replace: true });
  };

  const displayName = user?.fullName || user?.userName || 'Học viên';
  const displayEmail = user?.email || '';

  const getInitial = (name) => {
    if (!name) return 'H';
    return name.charAt(0).toUpperCase();
  };

  return (
    <header
      className={`sticky top-0 left-0 w-full z-50 transition-all duration-300 ease-in-out bg-white ${
        isScrolled ? 'shadow-md py-2' : 'border-b border-gray-100 py-2.5'
      }`}
    >
      <div className="w-full px-4 sm:px-6 md:px-8 mx-auto flex items-center justify-between gap-3 md:gap-4">
        {/* LOGO CHỦ ĐẠO */}
        <Link to="/home" className="flex min-w-0 items-center space-x-2 cursor-pointer group shrink select-none">
          <img
            src={logoImg}
            alt="AnhDuy Sport Logo"
            className="h-8 md:h-10 w-auto object-contain transition-all duration-300 filter drop-shadow-md"
          />
          <div className="hidden min-[400px]:flex flex-col select-none">
            <div className="flex items-center font-black italic tracking-wider text-lg md:text-xl uppercase transition-colors">
              <span className="text-gray-900 group-hover:text-red-600 transition-colors">
                AnhDuy
              </span>
              <span className="text-[#e31b23] ml-1 drop-shadow-xs">
                Sport
              </span>
            </div>
            <span className="text-[8px] md:text-[9px] font-extrabold text-gray-500 uppercase tracking-widest -mt-1">
              Portal Học Viên
            </span>
          </div>
        </Link>

        {/* MENU ĐIỀU HƯỚNG CÓ HỖ TRỢ DROPDOWN CHO NHÓM "HỌC TẬP" */}
        <nav className="hidden lg:flex items-center space-x-1 min-w-0 flex-1 justify-center overflow-x-visible py-1">
          {items.map((item) => {
            // Trường hợp mục có danh sách con (ví dụ: nhóm "Học tập")
            if (item.children && Array.isArray(item.children)) {
              const isChildActive = item.children.some((child) => {
                const [childPath] = child.to ? child.to.split('#') : ['', ''];
                return location.pathname === childPath;
              });

              return (
                <div key={item.id} className="relative group shrink-0">
                  <button
                    type="button"
                    className={`relative overflow-hidden px-3 xl:px-4 py-2 text-[11px] xl:text-xs font-bold tracking-wide transition-colors duration-300 whitespace-nowrap flex items-center gap-1 select-none uppercase ${
                      isChildActive ? 'bg-[#e31b23] text-white shadow-xs' : 'text-gray-800 hover:text-white'
                    }`}
                  >
                    {!isChildActive && (
                      <span className="absolute inset-0 bg-[#e31b23] transition-transform duration-300 ease-out origin-left -z-10 scale-x-0 group-hover:scale-x-100" />
                    )}
                    <span className="relative z-10">{item.label}</span>
                    <svg className="w-3 h-3 transition-transform duration-200 group-hover:rotate-180 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* DROPDOWN MENU CON */}
                  <div className="absolute top-full left-0 hidden group-hover:block pt-1.5 w-48 z-50 animate-fadeIn">
                    <div className="bg-white rounded-xl shadow-xl py-2 border border-gray-100 text-gray-900">
                      {item.children.map((child) => (
                        <Link
                          key={child.id}
                          to={child.to}
                          className="block px-4 py-2 text-xs font-bold text-gray-700 hover:bg-red-50 hover:text-[#e31b23] uppercase transition-colors"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            // Trường hợp mục bình thường
            const [itemPath] = item.to ? item.to.split('#') : ['', ''];
            const isCurrentPage = item.to && !item.to.includes('#') && location.pathname === itemPath;
            const isAnchorActive = activeId && item.id === activeId;
            const isActive = isCurrentPage || isAnchorActive;

            const content = (
              <>
                {!isActive && (
                  <span className="absolute inset-0 bg-[#e31b23] transition-transform duration-300 ease-out origin-left -z-10 scale-x-0 group-hover:scale-x-100" />
                )}
                <span className="relative z-10">{item.label}</span>
              </>
            );

            const itemClasses = `relative overflow-hidden px-2.5 xl:px-3.5 py-2 text-[11px] xl:text-xs font-bold tracking-wide transition-colors duration-300 whitespace-nowrap block cursor-pointer select-none uppercase shrink-0 ${
              isActive
                ? 'bg-[#e31b23] text-white shadow-xs'
                : 'text-gray-800 hover:text-white'
            }`;

            return (
              <div key={item.id} className="relative group shrink-0">
                {item.to && !isAnchorActive ? (
                  <Link to={item.to} className={itemClasses}>
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelect?.(item.id)}
                    className={itemClasses}
                  >
                    {content}
                  </button>
                )}
              </div>
            );
          })}
        </nav>

        {/* KHU VỰC THÔNG BÁO & AVATAR USER */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center border border-gray-300 text-gray-800 lg:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
            onClick={() => {
              setAccountOpen(false);
              setMenuOpen((open) => !open);
            }}
          >
            {menuOpen ? (
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeWidth="2.5" d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeWidth="2.5" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
          <NotificationBell light={false} />

          <div className="relative group">
            <button
              type="button"
              className="flex items-center focus:outline-none cursor-pointer p-0.5"
              aria-expanded={accountOpen}
              aria-label="Tài khoản"
              onClick={() => {
                setMenuOpen(false);
                setAccountOpen((open) => !open);
              }}
            >
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-full overflow-hidden bg-[#e31b23] text-white flex items-center justify-center font-bold text-sm shadow-md ring-2 ring-gray-200 transition-all duration-300 group-hover:scale-105 group-hover:ring-[#e31b23]">
                {user?.avatarUrl && /^(\/|https?:)/.test(user.avatarUrl) ? (
                  <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  getInitial(displayName)
                )}
              </div>
            </button>

            {/* DROPDOWN AVATAR HOVER */}
            <div className={`absolute right-0 top-full z-50 w-[min(16rem,calc(100vw-1rem))] pt-2 ${accountOpen ? 'block' : 'hidden'} lg:group-hover:block`}>
              <div className="bg-white rounded-xl shadow-2xl py-3 border border-gray-100 text-gray-900 animate-fadeIn">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-black text-gray-900 truncate">{displayName}</p>
                  {displayEmail && <p className="text-xs text-gray-500 truncate">{displayEmail}</p>}
                </div>

                <div className="py-1">
                  <Link
                    to="/ho-so"
                    className="flex items-center px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-[#e31b23] transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Hồ sơ cá nhân
                  </Link>

                  <Link
                    to="/home"
                    className="flex items-center px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-[#e31b23] transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 00-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Trang chủ AnhDuy Sport
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 text-left cursor-pointer border-t border-gray-100 mt-1"
                  >
                    <svg className="w-4 h-4 mr-2.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {menuOpen && (
        <nav className="lg:hidden max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-gray-100 bg-white pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {items.map((item) => {
            if (item.children) {
              return (
                <div key={item.id}>
                  <p className="px-4 pb-1 pt-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{item.label}</p>
                  {item.children.map((child) => {
                    const [childPath] = child.to ? child.to.split('#') : [''];
                    const active = location.pathname === childPath;
                    return (
                      <Link
                        key={child.id}
                        to={child.to}
                        className={`block px-6 py-3 text-sm font-bold uppercase ${active ? 'bg-[#e31b23] text-white' : 'text-gray-800'}`}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              );
            }
            const [itemPath] = item.to ? item.to.split('#') : [''];
            const active = (item.to && location.pathname === itemPath) || activeId === item.id;
            const className = `block w-full px-4 py-3 text-left text-sm font-bold uppercase ${active ? 'bg-[#e31b23] text-white' : 'text-gray-800'}`;
            if (item.to) {
              return (
                <Link key={item.id} to={item.to} className={className}>
                  {item.label}
                </Link>
              );
            }
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect?.(item.id);
                  setMenuOpen(false);
                }}
                className={className}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
}