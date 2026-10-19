import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';

const courseCategories = [
  { name: 'Tất cả', path: '/khoa-hoc' },
  { name: 'Bóng rổ', path: '/khoa-hoc' },
  { name: 'Bơi lội', path: '/khoa-hoc' },
  { name: 'Golf 3D', path: '/khoa-hoc' },
  { name: 'Quần vợt', path: '/khoa-hoc' },
  { name: 'Bóng bàn', path: '/khoa-hoc' },
  { name: 'Cầu lông', path: '/khoa-hoc' },
  { name: 'Taekwondo', path: '/khoa-hoc' },
  { name: 'Bóng đá', path: '/khoa-hoc' },
];

const navItems = [
  { name: 'TRANG CHỦ', path: '/home' },
  { name: 'VỀ CHÚNG TÔI', path: '#', hasDropdown: false },
  { name: 'KHÓA HỌC', path: '/khoa-hoc', hasDropdown: true },
  { name: 'THANH TOÁN', path: '/thanh-toan' },
  { name: 'HUẤN LUYỆN VIÊN', path: '/hlv' },
  { name: 'CƠ SỞ VẬT CHẤT', path: '/co-so-vat-chat' },
  { name: 'TUYỂN SINH', path: '/thanh-toan' },
  { name: 'ĐĂNG NHẬP', path: '/dang-nhap' },
];

export default function Header({ forceWhite = false }) {
  const [isHeaderTransparent, setIsHeaderTransparent] = useState(!forceWhite);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (forceWhite) {
      setIsHeaderTransparent(false);
      return;
    }

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const coursesElem = document.getElementById('courses-section');
      const coachesElem = document.getElementById('coaches-section');

      const isInside = (elem) => {
        if (!elem) return false;
        const rect = elem.getBoundingClientRect();
        return rect.top <= 100 && rect.bottom >= 100;
      };

      if (scrollY <= 50 || isInside(coursesElem) || isInside(coachesElem)) {
        setIsHeaderTransparent(true);
      } else {
        setIsHeaderTransparent(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [forceWhite]);

  // Xử lý click điều hướng
  const handleNavClick = (e, path) => {
    if (path === '/home' || path === '/co-so-vat-chat' || path === '/khoa-hoc') {
      e.preventDefault();
      window.location.href = path; // Hard reload cho đường dẫn cố định
    } else if (path.startsWith('#')) {
      e.preventDefault();
      if (location.pathname !== '/home') {
        window.location.href = `/home${path}`;
      } else {
        const elem = document.querySelector(path);
        if (elem) elem.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (path.startsWith('/')) {
      e.preventDefault();
      navigate(path);
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ease-in-out ${
        isHeaderTransparent
          ? 'bg-transparent py-4 text-white'
          : 'bg-white shadow-md py-3 text-gray-800'
      }`}
    >
      <div className="flex items-center justify-between w-full px-6 md:px-12 mx-auto">
        {/* LOGO */}
        <a
          href="/home"
          onClick={(e) => handleNavClick(e, '/home')}
          className="flex items-center space-x-2.5 cursor-pointer group shrink-0"
        >
          <img
            src={logoImg}
            alt="AnhDuy Sport Logo"
            className={`w-auto object-contain transition-all duration-300 filter drop-shadow-lg ${
              isHeaderTransparent ? 'h-12 md:h-14' : 'h-10 md:h-12'
            }`}
          />
          <div className="flex items-center font-black italic tracking-wider text-xl md:text-2xl uppercase transition-colors duration-300 select-none">
            <span
              className={`transition-colors duration-300 ${
                isHeaderTransparent ? 'text-white drop-shadow-md' : 'text-gray-900'
              }`}
            >
              AnhDuy
            </span>
            <span className="text-[#e31b23] ml-1.5 drop-shadow-md">
              Sport
            </span>
          </div>
        </a>

        {/* MENU ĐIỀU HƯỚNG */}
        <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2">
          {navItems.map((item, index) => {
            const path = item.name === 'ĐĂNG NHẬP' && user?.roleId === 'ADMIN' ? '/quan-ly' : item.path;
            const isActive = location.pathname === path;

            return (
              <div key={index} className="relative group">
                <a
                  href={path}
                  onClick={(e) => handleNavClick(e, path)}
                  className={`relative overflow-hidden px-3.5 py-2 text-xs xl:text-sm font-bold tracking-wider transition-colors duration-300 whitespace-nowrap block cursor-pointer select-none ${
                    isActive
                      ? 'bg-[#e31b23] text-white shadow-md'
                      : isHeaderTransparent
                      ? 'text-white/90 hover:text-white'
                      : 'text-gray-800 hover:text-white'
                  }`}
                >
                  {!isActive && (
                    <span className="absolute inset-0 bg-[#e31b23] transition-transform duration-300 ease-out origin-left -z-10 scale-x-0 group-hover:scale-x-100"></span>
                  )}

                  <span className="relative z-10 flex items-center gap-1">
                    {item.name}
                    {item.hasDropdown && (
                      <svg
                        className="w-3 h-3 transition-transform duration-200 group-hover:rotate-180"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.5"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    )}
                  </span>
                </a>

                {/* DROPDOWN KHÓA HỌC */}
                {item.hasDropdown && item.name === 'KHÓA HỌC' && (
                  <div className="absolute top-full left-0 hidden group-hover:block pt-2 w-[340px] z-50">
                    <div className="bg-white rounded-md shadow-2xl p-5 border border-gray-100 text-gray-900 animate-fadeIn">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        {courseCategories.map((cat, cIdx) => (
                          <a
                            key={cIdx}
                            href={cat.path}
                            onClick={(e) => handleNavClick(e, cat.path)}
                            className="text-xs sm:text-sm font-semibold text-gray-700 hover:text-[#e31b23] hover:translate-x-1 transition-all duration-200 cursor-pointer block"
                          >
                            {cat.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </header>
  );
}