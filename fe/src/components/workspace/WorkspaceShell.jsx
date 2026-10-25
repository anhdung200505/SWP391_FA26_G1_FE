import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import logoImg from '../../assets/logo.png';
import { useAuth } from '../../context/AuthContext';

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e31b23]';

function itemClass(isActive) {
  return `flex w-full items-center rounded-lg border-l-2 px-3 py-2.5 text-left text-sm font-semibold ${focusRing} ${
    isActive
      ? 'border-[#e31b23] bg-white/10 text-white'
      : 'border-transparent text-white/70 hover:bg-white/5 hover:text-white'
  }`;
}

export default function WorkspaceShell({
  role,
  homeTo,
  items,
  activeId,
  onSelect,
  breadcrumb = [],
  headerExtra = null,
  children,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const here = `${location.pathname}${location.search}`;
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(here);

  const signOut = () => {
    logout();
    navigate('/dang-nhap', { replace: true });
  };

  if (menuPath !== here) {
    setMenuPath(here);
    setMenuOpen(false);
  }

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const rail = (
    <Sidebar
      role={role}
      homeTo={homeTo}
      items={items}
      activeId={activeId}
      onSelect={(id) => {
        setMenuOpen(false);
        onSelect?.(id);
      }}
      user={user}
      onLogout={signOut}
    />
  );

  return (
    <div className="min-h-dvh bg-[#f4f5f7] text-gray-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-[#12141d] text-white lg:flex">
        {rail}
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
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#12141d] text-white lg:hidden ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {rail}
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className={`inline-flex size-10 items-center justify-center rounded-lg border border-gray-200 lg:hidden ${focusRing}`}
              onClick={() => setMenuOpen(true)}
              aria-label="Mở menu"
            >
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeWidth="2" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <nav aria-label="Đường dẫn" className="truncate text-sm text-gray-500">
              {breadcrumb.map((item, index) => (
                <span key={`${item.label}-${index}`}>
                  {index > 0 && <span className="mx-2 text-gray-300">/</span>}
                  {item.to ? (
                    <Link to={item.to} className={`font-semibold text-gray-600 hover:text-[#e31b23] ${focusRing}`}>
                      {item.label}
                    </Link>
                  ) : (
                    <span className="font-bold text-gray-900">{item.label}</span>
                  )}
                </span>
              ))}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            {headerExtra}
            <Link to="/home" className={`text-sm font-semibold text-gray-600 hover:text-[#e31b23] ${focusRing}`}>
              Về trang chủ
            </Link>
          </div>
        </header>
        <main className="w-full px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function Sidebar({ role, homeTo, items, activeId, onSelect, user, onLogout }) {
  return (
    <div className="flex h-full flex-col pb-[env(safe-area-inset-bottom)]">
      <Link to={homeTo} className="flex items-center gap-3 px-5 py-5">
        <img src={logoImg} alt="AnhDuy Sport" className="h-11 w-auto object-contain" />
        <span className="leading-tight">
          <span className="block text-lg font-black italic">
            AnhDuy <span className="text-[#e31b23]">Sport</span>
          </span>
          <span className="text-sm text-pretty text-white/60">{role}</span>
        </span>
      </Link>

      <nav aria-label={role} className="space-y-1 px-3">
        {items.map((item) =>
          item.to ? (
            <NavLink key={item.id} to={item.to} end={item.end} className={({ isActive }) => itemClass(isActive)}>
              {item.label}
            </NavLink>
          ) : (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={itemClass(item.id === activeId)}
            >
              {item.label}
            </button>
          ),
        )}
      </nav>

      <div className="mt-auto border-t border-white/10 p-4">
        <div className="rounded-xl bg-white/5 px-3 py-3">
          <p className="truncate text-sm font-semibold">{user?.fullName || user?.userName || 'Tài khoản'}</p>
          <p className="mt-1 truncate text-xs text-white/50">{user?.email}</p>
          <Link
            to="/ho-so"
            className={`mt-3 block w-full rounded-lg bg-white/10 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-white/20 ${focusRing}`}
          >
            Hồ sơ & đổi mật khẩu
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className={`mt-3 w-full rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 ${focusRing}`}
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}
