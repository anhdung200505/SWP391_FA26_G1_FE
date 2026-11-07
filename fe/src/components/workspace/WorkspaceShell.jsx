import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import logoImg from '../../assets/logo.png';
import { useAuth } from '../../context/AuthContext';

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e31b23]';

// Hàm render từng mục Sidebar với hiệu ứng trượt đỏ tinh tế từ trái sang phải
function renderNavItemContent(label, isActive) {
  return (
    <span
      className={`relative overflow-hidden w-full px-4 py-2.5 text-xs font-bold tracking-wider transition-all duration-300 block cursor-pointer select-none uppercase ${
        isActive
          ? 'bg-[#e31b23] text-white shadow-sm border-l-4 border-white'
          : 'text-slate-300 hover:text-white border-l-4 border-transparent'
      }`}
    >
      {/* Hiệu ứng trượt phủ nền đỏ từ trái sang phải khi hover */}
      {!isActive && (
        <span className="absolute inset-0 bg-[#e31b23] transition-transform duration-300 ease-out origin-left -z-10 scale-x-0 group-hover:scale-x-100" />
      )}

      <span className="relative z-10 block truncate">{label}</span>
    </span>
  );
}

export default function WorkspaceShell({
  role,
  homeTo,
  items,
  activeId,
  onSelect,
  breadcrumb = [],
  headerExtra = null,
  footer = null,
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
    <div className="flex min-h-dvh bg-slate-100 text-slate-900">
      {/* SIDEBAR DESKTOP */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-slate-950 text-white lg:flex border-r border-slate-800 shadow-xl">
        {rail}
      </aside>

      {/* OVERLAY MOBILE */}
      {menuOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* SIDEBAR MOBILE */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 text-white shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {rail}
      </aside>

      {/* KHU VỰC NỘI DUNG CHÍNH + FOOTER */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 shadow-xs">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className={`inline-flex size-10 items-center justify-center rounded-none border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 lg:hidden ${focusRing}`}
              onClick={() => setMenuOpen(true)}
              aria-label="Mở menu"
            >
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeWidth="2" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <nav aria-label="Đường dẫn" className="truncate text-sm text-slate-500">
              {breadcrumb.map((item, index) => (
                <span key={`${item.label}-${index}`}>
                  {index > 0 && <span className="mx-2 text-slate-300">/</span>}
                  {item.to ? (
                    <Link to={item.to} className={`font-bold text-slate-700 hover:text-[#e31b23] uppercase text-xs tracking-wider transition-colors ${focusRing}`}>
                      {item.label}
                    </Link>
                  ) : (
                    <span className="font-extrabold text-slate-900 uppercase text-xs tracking-wider">{item.label}</span>
                  )}
                </span>
              ))}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            {headerExtra}
            <Link
              to="/home"
              className={`relative overflow-hidden px-4 py-2 text-xs font-bold tracking-wider transition-all duration-300 uppercase block cursor-pointer select-none border border-slate-300 text-slate-700 hover:text-white group ${focusRing}`}
            >
              <span className="absolute inset-0 bg-[#e31b23] transition-transform duration-300 ease-out origin-left -z-10 scale-x-0 group-hover:scale-x-100" />
              <span className="relative z-10">Về trang chủ</span>
            </Link>
          </div>
        </header>

        <main className="w-full flex-1 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8">
          {children}
        </main>
        {footer}
      </div>
    </div>
  );
}

// Group menu cấp 2 (nếu có)
function NavGroup({ item }) {
  const { pathname } = useLocation();
  const childActive = item.children.some((child) => pathname === child.to.split('#')[0]);
  const [manual, setManual] = useState(null);
  const expanded = manual && manual.for === childActive ? manual.value : childActive;
  const panelId = `nav-group-${item.id}`;

  return (
    <div className="w-full">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setManual({ for: childActive, value: !expanded })}
        className={`group relative flex w-full items-center justify-between overflow-hidden px-4 py-2.5 text-xs font-bold tracking-wider uppercase transition-colors ${focusRing} ${
          childActive ? 'bg-[#e31b23] text-white border-l-4 border-white' : 'text-slate-300 hover:text-white border-l-4 border-transparent'
        }`}
      >
        {!childActive && (
          <span className="absolute inset-0 bg-[#e31b23] transition-transform duration-300 ease-out origin-left -z-10 scale-x-0 group-hover:scale-x-100" />
        )}
        <span className="relative z-10">{item.label}</span>
        <svg
          className={`relative z-10 size-4 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
        </svg>
      </button>

      {expanded && (
        <div id={panelId} className="bg-slate-900/60 pl-2">
          {item.children.map((child) => (
            <NavLink key={child.id} to={child.to} end={child.end} className="group block">
              {({ isActive }) => renderNavItemContent(child.label, isActive)}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

// Item điều hướng
function NavItem({ item, activeId, onSelect }) {
  const { pathname } = useLocation();
  const [path, hash] = item.to ? item.to.split('#') : ['', ''];
  const spyHere = activeId !== undefined && pathname === path;

  if (item.to && !hash && !spyHere) {
    return (
      <NavLink to={item.to} end={item.end} className="group block">
        {({ isActive }) => renderNavItemContent(item.label, isActive)}
      </NavLink>
    );
  }

  const active = (spyHere && activeId === item.id) || item.id === activeId;
  return (
    <div className="group block w-full">
      <button
        type="button"
        aria-current={active ? 'page' : undefined}
        onClick={(event) => {
          if (item.to && spyHere && onSelect) {
            event.preventDefault();
          }
          onSelect?.(item.id);
        }}
        className="w-full text-left p-0 border-0 bg-transparent cursor-pointer"
      >
        {renderNavItemContent(item.label, active)}
      </button>
    </div>
  );
}

function Sidebar({ role, homeTo, items, activeId, onSelect, user, onLogout }) {
  const displayName = user?.fullName || user?.userName || 'Học viên';
  const displayEmail = user?.email || '';

  return (
    <div className="flex h-full flex-col pb-[env(safe-area-inset-bottom)] overflow-y-auto select-none">
      {/* HEADER LOGO */}
      <Link
        to={homeTo}
        className="flex items-center space-x-3 px-6 py-5 shrink-0 bg-slate-900 border-b border-slate-800/80 group"
      >
        <img
          src={logoImg}
          alt="AnhDuy Sport Logo"
          className="h-9 w-auto object-contain filter drop-shadow-md"
        />
        <div className="flex flex-col">
          <div className="flex items-center font-black italic tracking-wider text-lg uppercase">
            <span className="text-white group-hover:text-red-400 transition-colors">AnhDuy</span>
            <span className="text-[#e31b23] ml-1">Sport</span>
          </div>
          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest -mt-1">
            {role} Portal
          </span>
        </div>
      </Link>

      {/* DANH SÁCH MENU */}
      <nav aria-label={role} className="flex-1 space-y-1 py-4 px-2">
        {items.map((item) =>
          item.children ? (
            <NavGroup key={item.id} item={item} />
          ) : (
            <NavItem key={item.id} item={item} activeId={activeId} onSelect={onSelect} />
          )
        )}
      </nav>

      {/* FOOTER USER CARD */}
      <div className="mt-auto border-t border-slate-800/80 bg-slate-900/90 p-4 shrink-0">
        <div className="mb-3 px-1">
          <p className="truncate text-xs font-bold uppercase text-white tracking-wider">{displayName}</p>
          {displayEmail && <p className="truncate text-[11px] font-medium text-slate-400">{displayEmail}</p>}
        </div>

        <div className="space-y-2">
          <Link
            to="/ho-so"
            className={`relative overflow-hidden w-full block text-center py-2 text-xs font-bold uppercase tracking-wider text-slate-200 bg-slate-800/80 hover:text-white group transition-colors border border-slate-700/60 ${focusRing}`}
          >
            <span className="absolute inset-0 bg-slate-700 transition-transform duration-300 ease-out origin-left -z-10 scale-x-0 group-hover:scale-x-100" />
            <span className="relative z-10">Hồ sơ cá nhân</span>
          </Link>

          <button
            type="button"
            onClick={onLogout}
            className={`relative overflow-hidden w-full block text-center py-2 text-xs font-bold uppercase tracking-wider text-red-400 border border-red-900/40 hover:text-white group transition-colors ${focusRing}`}
          >
            <span className="absolute inset-0 bg-[#e31b23] transition-transform duration-300 ease-out origin-left -z-10 scale-x-0 group-hover:scale-x-100" />
            <span className="relative z-10">Đăng xuất</span>
          </button>
        </div>
      </div>
    </div>
  );
}