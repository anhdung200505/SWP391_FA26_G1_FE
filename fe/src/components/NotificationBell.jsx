import { useCallback, useEffect, useRef, useState } from 'react';
import { getMyNotifications, markAllNotificationsRead, markNotificationRead } from '../api/managementApi';
import { onDataChanged } from '../api/dataChanged';
import {
  BellButton,
  BellItem,
  BellPanel,
  NotificationDetailModal,
  PanelMessage,
  PanelTab,
} from './notifications/NotificationUi';
import { isInsideDetailModal } from './notifications/notificationUtils';

const POLL_MS = 60000;

// Chuông thông báo của học viên (chỉ thông báo của chính mình), cùng giao diện với chuông Hoạt động của lễ tân và quản trị.
// Bấm một thông báo để đánh dấu đã đọc và xem đầy đủ. light = true khi header trong suốt (chữ trắng).
export default function NotificationBell({ light = false }) {
  const [feed, setFeed] = useState({ unreadCount: 0, items: [] });
  const [open, setOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);
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
    const stop = onDataChanged(refresh);
    return () => {
      clearInterval(timer);
      stop();
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target) && !isInsideDetailModal(event.target)) setOpen(false);
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

  const showDetail = (item) => {
    readOne(item);
    setExpanded({ kicker: 'Thông báo', title: item.title, body: item.content, time: item.createdAt });
  };

  const visible = unreadOnly ? feed.items.filter((item) => !item.isRead) : feed.items;

  return (
    <div className="relative" ref={rootRef}>
      <BellButton label="Thông báo" count={feed.unreadCount} variant={light ? 'light' : 'default'} onClick={toggle} />

      {open && (
        <BellPanel
          title="Thông báo của tôi"
          subtitle="My notifications"
          action={
            <button
              type="button"
              onClick={readAll}
              disabled={feed.unreadCount === 0}
              className="text-[11px] font-bold text-[#e31b23] hover:underline disabled:text-gray-300 disabled:no-underline cursor-pointer disabled:cursor-default"
            >
              Đọc tất cả
            </button>
          }
          toolbar={
            <>
              <PanelTab active={!unreadOnly} onClick={() => setUnreadOnly(false)}>
                Tất cả
              </PanelTab>
              <PanelTab active={unreadOnly} onClick={() => setUnreadOnly(true)}>
                Chưa đọc ({feed.unreadCount})
              </PanelTab>
            </>
          }
        >
          {error && <PanelMessage tone="error">{error}</PanelMessage>}
          {!error && visible.length === 0 && (
            <PanelMessage>{unreadOnly ? 'Không còn thông báo chưa đọc.' : 'Chưa có thông báo nào.'}</PanelMessage>
          )}
          {visible.map((item) => (
            <BellItem
              key={item.id}
              highlighted={!item.isRead}
              title={item.title}
              body={item.content}
              time={item.createdAt}
              onClick={() => showDetail(item)}
              onExpand={() => showDetail(item)}
            />
          ))}
        </BellPanel>
      )}

      <NotificationDetailModal item={expanded} onClose={() => setExpanded(null)} />
    </div>
  );
}
