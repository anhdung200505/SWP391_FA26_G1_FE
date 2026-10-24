import { createPortal } from 'react-dom';
import { formatFull, timeAgo } from './notificationUtils';

// Giao diện dùng chung cho mọi chuông thông báo (học viên, lễ tân, quản trị) để cùng một kiểu nút, panel và popup.

const BUTTON_VARIANTS = {
  default: 'bg-white border border-gray-200 text-gray-600 hover:text-[#e31b23]',
  dark: 'bg-[#0d0f17] border border-gray-800 text-gray-300 hover:text-white',
  light: 'border border-white/30 text-white hover:bg-white/10',
};

// variant: default (header trắng), dark (portal lễ tân), light (header trong suốt chữ trắng).
export function BellButton({ label, count, variant = 'default', onClick, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel || label}
      className={`relative inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
        BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.default
      }`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {label}
      {count > 0 && (
        <span className="min-w-5 h-5 px-1.5 inline-flex items-center justify-center rounded-full bg-[#e31b23] text-[10px] font-black text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

export function BellPanel({ title, subtitle, action, toolbar, children }) {
  return (
    <div className="absolute right-0 top-full pt-2 w-80 sm:w-[420px] z-50">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-100 text-gray-900 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
          <div>
            <p className="text-sm font-black text-gray-900">{title}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">{subtitle}</p>
          </div>
          {action}
        </div>
        {toolbar && <div className="flex gap-1.5 px-4 py-2.5 border-b border-gray-100 bg-slate-50">{toolbar}</div>}
        <div className="max-h-96 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function PanelTab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
        active ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

export function PanelMessage({ tone = 'muted', children }) {
  return (
    <p className={`px-4 text-xs font-bold ${tone === 'error' ? 'py-3 text-red-600' : 'py-10 text-center text-gray-400'}`}>{children}</p>
  );
}

// Một dòng thông báo: nội dung tối đa 2 dòng, nút ⤢ mở popup xem đầy đủ.
// badge, heading: dòng nhỏ phía trên (vai trò, người làm). onClick: bấm vào dòng (vd. đánh dấu đã đọc).
export function BellItem({ highlighted, badge, heading, title, body, time, onClick, onExpand }) {
  return (
    <div className={`group flex gap-3 px-4 py-3 border-b border-gray-50 transition-colors ${highlighted ? 'bg-red-50/60' : 'bg-white hover:bg-gray-50'}`}>
      <span className={`mt-1.5 shrink-0 w-2 h-2 rounded-full ${highlighted ? 'bg-[#e31b23]' : 'bg-transparent'}`} />
      <button type="button" onClick={onClick} className="min-w-0 flex-1 text-left cursor-pointer">
        {(badge || heading) && (
          <span className="flex flex-wrap items-center gap-1.5">
            {badge}
            {heading && <span className="text-xs font-black text-gray-900">{heading}</span>}
          </span>
        )}
        <span className={`block text-xs text-gray-900 ${badge || heading ? 'mt-1' : ''} ${highlighted ? 'font-black' : 'font-bold'}`}>{title}</span>
        {body && <span className="block mt-0.5 text-xs text-gray-600 leading-5 break-words line-clamp-2">{body}</span>}
        <span className="block mt-1 text-[10px] font-bold text-gray-400">
          🕒 {formatFull(time)} · {timeAgo(time)}
        </span>
      </button>
      <button
        type="button"
        onClick={onExpand}
        title="Xem đầy đủ"
        aria-label="Xem đầy đủ thông báo"
        className="shrink-0 self-start inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 hover:border-[#e31b23] hover:text-[#e31b23] transition-colors cursor-pointer"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
        </svg>
      </button>
    </div>
  );
}

// Popup lớn ở giữa màn hình để đọc hết nội dung. Gắn vào body vì header có backdrop-blur sẽ giữ phần tử fixed bên trong nó.
export function NotificationDetailModal({ item, onClose }) {
  if (!item) return null;
  return createPortal(
    <div
      data-notification-detail
      className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="min-w-0">
            <span className="inline-block bg-[#e31b23] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded -skew-x-12 mb-2">
              <span className="inline-block skew-x-12">{item.kicker || 'Thông báo'}</span>
            </span>
            {(item.badge || item.heading) && (
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                {item.badge}
                {item.heading && <span className="text-sm font-black text-slate-900">{item.heading}</span>}
              </div>
            )}
            <h3 className="text-lg font-black text-slate-900 break-words">{item.title}</h3>
            <p className="mt-1 text-xs font-bold text-slate-400">
              🕒 {formatFull(item.time)} · {timeAgo(item.time)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 font-bold text-lg p-1 cursor-pointer">
            ✕
          </button>
        </div>
        <p className="text-sm text-slate-700 leading-7 whitespace-pre-line break-words">{item.body || 'Không có nội dung chi tiết.'}</p>
        <div className="text-right">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-900 hover:bg-[#e31b23] text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
