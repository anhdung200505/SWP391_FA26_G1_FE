import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import logoImg from '../../assets/logo.png';
import { useAuth } from '../../context/AuthContext';

const links = [
  { to: '/quan-ly', label: 'Bảng điều khiển', end: true },
  { to: '/quan-ly/tai-khoan', label: 'Tài khoản người dùng', end: false },
  { to: '/quan-ly/goi', label: 'Gói hội viên', end: false },
];

function navClass(isActive) {
  return `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
    isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
  }`;
}

export default function ManagementShell({ breadcrumb = [], children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(location.pathname);

  const signOut = () => {
    logout();
    navigate('/dang-nhap', { replace: true });
  };

  if (menuPath !== location.pathname) {
    setMenuPath(location.pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-gray-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-[#12141d] text-white lg:flex">
        <SidebarContent user={user} onLogout={signOut} />
      </aside>

      {menuOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 transform bg-[#12141d] text-white transition-transform duration-200 lg:hidden ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent user={user} onLogout={signOut} />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Mở menu quản lý"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeWidth="2" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <nav aria-label="Đường dẫn" className="truncate text-sm text-gray-500">
              {breadcrumb.map((item, index) => (
                <span key={`${item.label}-${index}`}>
                  {index > 0 && <span className="mx-2 text-gray-300">/</span>}
                  {item.to ? (
                    <Link to={item.to} className="font-semibold text-gray-600 hover:text-[#e31b23]">
                      {item.label}
                    </Link>
                  ) : (
                    <span className="font-bold text-gray-900">{item.label}</span>
                  )}
                </span>
              ))}
            </nav>
          </div>
          <Link to="/home" className="shrink-0 text-sm font-bold text-gray-600 hover:text-[#e31b23]">
            Về trang chủ
          </Link>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({ user, onLogout }) {
  return (
    <div className="flex h-full flex-col">
      <Link to="/quan-ly" className="flex items-center gap-3 px-5 py-5">
        <img src={logoImg} alt="AnhDuy Sport" className="h-11 w-auto object-contain" />
        <span className="leading-tight">
          <span className="block text-lg font-black italic tracking-wide">
            AnhDuy <span className="text-[#e31b23]">Sport</span>
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">
            Quản lý trung tâm
          </span>
        </span>
      </Link>

      <div className="px-4">
        <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/35">
          Điều hướng
        </p>
        <nav className="space-y-1">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => navClass(isActive)}>
              <span className="h-1.5 w-1.5 rounded-full bg-[#e31b23]" />
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto border-t border-white/10 p-4">
        <div className="rounded-2xl bg-white/5 px-3 py-3">
          <p className="text-sm font-bold">{user?.fullName}</p>
          <p className="text-xs text-white/55">{user?.roleName}</p>
          <p className="mt-1 truncate text-xs text-white/40">{user?.email}</p>
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 w-full rounded-xl border border-white/15 px-3 py-2 text-sm font-bold text-white hover:bg-white/10"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}
