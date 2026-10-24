import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';

// Danh sách các khóa học kèm đường dẫn chi tiết chuẩn slug
const courseCategories = [
  { name: 'Tất cả', path: '/khoa-hoc' },
  { name: 'Bóng rổ', path: '/khoa-hoc/bong-ro' },
  { name: 'Bơi lội', path: '/khoa-hoc/boi-loi' },
  { name: 'Golf 3D', path: '/khoa-hoc/golf-3d' },
  { name: 'Quần vợt', path: '/khoa-hoc/quan-vot' },
  { name: 'Bóng bàn', path: '/khoa-hoc/bong-ban' },
  { name: 'Cầu lông', path: '/khoa-hoc/cau-long' },
  { name: 'Taekwondo', path: '/khoa-hoc/taekwondo' },
  { name: 'Bóng đá', path: '/khoa-hoc/bong-da' },
];

const navItems = [
  { name: 'TRANG CHỦ', path: '/home' },
  { name: 'VỀ CHÚNG TÔI', path: '#', hasDropdown: false },
  { name: 'KHÓA HỌC', path: '/khoa-hoc', hasDropdown: true },
  { name: 'HUẤN LUYỆN VIÊN', path: '/hlv' },
  { name: 'CƠ SỞ VẬT CHẤT', path: '/co-so-vat-chat' },
  { name: 'TUYỂN SINH', path: '/tuyen-sinh' },
];

export default function Header({ forceWhite = false }) {
  const [isHeaderTransparent, setIsHeaderTransparent] = useState(!forceWhite);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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
    if (path === '#' || path === '') {
      e.preventDefault();
      return;
    }

    e.preventDefault();

    if (
      path === '/home' ||
      path === '/co-so-vat-chat' ||
      path === '/hlv' ||
      path === '/tuyen-sinh' ||
      path.startsWith('/khoa-hoc')
    ) {
      navigate(path);
      window.scrollTo(0, 0);
    } else if (path.startsWith('#')) {
      if (location.pathname !== '/home') {
        navigate(`/home${path}`);
      } else {
        const elem = document.querySelector(path);
        if (elem) elem.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(path);
      window.scrollTo(0, 0);
    }
  };

  const handleLogout = () => {
    if (logout) logout();
    navigate('/dang-nhap');
  };

  const getInitial = (name) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  const userRole = user?.roleId || user?.role;

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
            const path = item.path;
            const isActive =
              location.pathname === path ||
              (path !== '/home' && path !== '#' && location.pathname.startsWith(path));

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
          {/* KHU VỰC ĐĂNG NHẬP / AVATAR HỒ SƠ */}
          {!user ? (
            <a
              href="/dang-nhap"
              onClick={(e) => handleNavClick(e, '/dang-nhap')}
              className={`relative overflow-hidden px-3.5 py-2 text-xs xl:text-sm font-bold tracking-wider transition-colors duration-300 whitespace-nowrap block cursor-pointer select-none ${
                location.pathname === '/dang-nhap'
                  ? 'bg-[#e31b23] text-white shadow-md'
                  : isHeaderTransparent
                  ? 'text-white/90 hover:text-white'
                  : 'text-gray-800 hover:text-white'
              }`}
            >
              <span className="absolute inset-0 bg-[#e31b23] transition-transform duration-300 ease-out origin-left -z-10 scale-x-0 group-hover:scale-x-100"></span>
              ĐĂNG NHẬP
            </a>
          ) : (
            <div className="relative group ml-2">
              <button
                type="button"
                className="flex items-center focus:outline-none cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-[#e31b23] text-white flex items-center justify-center font-bold text-base shadow-md ring-2 ring-white/80 transition-transform duration-200 group-hover:scale-105">
                  {/^(\/|https?:)/.test(user.avatarUrl || '') ? (
                    <img src={user.avatarUrl} alt="Ảnh đại diện" className="w-full h-full object-cover" />
                  ) : (
                    getInitial(user.fullName || user.userName || user.name)
                  )}
                </div>
              </button>

              {/* DROPDOWN AVATAR HOVER */}
              <div className="absolute right-0 top-full hidden group-hover:block pt-2 w-64 z-50">
                <div className="bg-white rounded-xl shadow-2xl py-3 border border-gray-100 text-gray-900 animate-fadeIn">
                  {/* Thông tin người dùng */}
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-black text-gray-900 truncate">
                      {user.fullName || user.userName || 'Học viên'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>

                  {/* Menu chức năng */}
                  <div className="py-1">
                    {/* KHÓA HỌC CỦA TÔI (CHO HỌC VIÊN / MEMBER) */}
                    {(userRole === 'MEMBER' || userRole === 'STUDENT' || !userRole) && (
                      <>
                        <Link
                          to="/hoc-vien-dashboard"
                          className="flex items-center px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-[#e31b23]"
                        >
                          <svg className="w-4 h-4 mr-2 text-[#e31b23]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                          </svg>
                          Khóa học của tôi
                        </Link>
                        <Link
                          to="/hoc-vien/giao-an-ai"
                          className="flex items-center px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-[#e31b23]"
                        >
                          <svg className="w-4 h-4 mr-2 text-[#e31b23]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          Giáo án AI
                        </Link>
                      </>
                    )}

                    {userRole === 'COACH' && (
                      <Link
                        to="/hlv/lich-su-tap"
                        className="flex items-center px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-[#e31b23]"
                      >
                        <svg className="w-4 h-4 mr-2 text-[#e31b23]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Lịch sử tập
                      </Link>
                    )}

                    {userRole === 'ADMIN' && (
                      <Link
                        to="/quan-ly"
                        className="flex items-center px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-[#e31b23]"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Trang quản lý (Admin)
                      </Link>
                    )}

                    <Link
                      to="/ho-so"
                      className="flex items-center px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-[#e31b23]"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Hồ sơ cá nhân
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 text-left cursor-pointer"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Đăng xuất
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}