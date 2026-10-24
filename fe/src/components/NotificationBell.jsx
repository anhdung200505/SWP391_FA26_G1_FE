import { useCallback, useEffect, useRef, useState } from 'react';
import { getMyNotifications, markAllNotificationsRead, markNotificationRead } from '../api/managementApi';

const POLL_MS = 60000;

function timeAgo(value) {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(value).toLocaleDateString('vi-VN');
}

// Chuông thông báo của học viên: chấm đỏ khi còn thông báo chưa đọc, bấm từng thông báo hoặc Đọc tất cả để tắt.
// light = true khi header trong suốt (chữ trắng).
export default function NotificationBell({ light = false }) {
  const [feed, setFeed] = useState({ unreadCount: 0, items: [] });
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const rootRef = useRef(null);

  const refresh = useCallback(() => {
    getMyNotifications()
      .then((data) => {
        setFeed(data);
        setError('');
      })
      .catch((err) => setError(err.message || 'Không tải được thông báo.'));
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const toggle = () => {
    if (!open) refresh();
    setOpen((value) => !value);
  };

  const readOne = async (item) => {
    if (item.isRead) return;
    setFeed((current) => ({
      unreadCount: Math.max(current.unreadCount - 1, 0),
      items: current.items.map((row) => (row.id === item.id ? { ...row, isRead: true } : row)),
    }));
    try {
      await markNotificationRead(item.id);
    } catch {
      refresh();
    }
  };

  const readAll = async () => {
    setFeed((current) => ({ unreadCount: 0, items: current.items.map((row) => ({ ...row, isRead: true })) }));
    try {
      await markAllNotificationsRead();
    } catch {
      refresh();
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={toggle}
        aria-label="Thông báo"
        className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer focus:outline-none ${
          light ? 'text-white hover:bg-white/15' : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {feed.unreadCount > 0 && (
          <span className="absolute top-2 right-2.5 block w-2.5 h-2.5 rounded-full bg-[#e31b23] ring-2 ring-white" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full pt-2 w-80 sm:w-96 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 text-gray-900 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-black text-gray-900">Thông báo</p>
              <button
                type="button"
                onClick={readAll}
                disabled={feed.unreadCount === 0}
                className="text-[11px] font-bold text-[#e31b23] hover:underline disabled:text-gray-300 disabled:no-underline cursor-pointer disabled:cursor-default"
              >
                Đọc tất cả
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {error && <p className="px-4 py-3 text-xs font-bold text-red-600">{error}</p>}
              {!error && feed.items.length === 0 && (
                <p className="px-4 py-10 text-center text-xs font-bold text-gray-400">Chưa có thông báo nào.</p>
              )}
              {feed.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => readOne(item)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 flex gap-3 transition-colors cursor-pointer ${
                    item.isRead ? 'bg-white hover:bg-gray-50' : 'bg-red-50/60 hover:bg-red-50'
                  }`}
                >
                  <span
                    className={`mt-1.5 shrink-0 w-2 h-2 rounded-full ${item.isRead ? 'bg-transparent' : 'bg-[#e31b23]'}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-xs text-gray-900 ${item.isRead ? 'font-semibold' : 'font-black'}`}>{item.title}</span>
                    <span className="block mt-0.5 text-xs text-gray-600 leading-5 break-words">{item.content}</span>
                    <span className="block mt-1 text-[10px] font-bold text-gray-400">{timeAgo(item.createdAt)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
