import { useCallback, useEffect, useRef, useState } from 'react';
import { getStaffActivity } from '../../api/managementApi';
import { onDataChanged } from '../../api/dataChanged';
import { useAuth } from '../../context/AuthContext';
import {
  BellButton,
  BellItem,
  BellPanel,
  NotificationDetailModal,
  PanelMessage,
  PanelTab,
} from '../notifications/NotificationUi';
import { isInsideDetailModal } from '../notifications/notificationUtils';

const POLL_MS = 60000;

const TABS = [
  { id: '', label: 'Tất cả' },
  { id: 'RECEPTIONIST', label: 'Lễ tân' },
  { id: 'ADMIN', label: 'Quản trị' },
];

const ROLE_STYLES = {
  RECEPTIONIST: 'bg-sky-50 text-sky-700 border-sky-200',
  ADMIN: 'bg-red-50 text-[#e31b23] border-red-200',
};

// Mốc "đã xem" lưu trên trình duyệt theo từng tài khoản: id hoạt động lớn nhất lúc mở chuông lần trước.
const seenKey = (userId) => `anhduy.staffActivity.seen.${userId || 'guest'}`;

function RoleBadge({ item }) {
  return (
    <span
      className={`inline-block border text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
        ROLE_STYLES[item.actorRole] || 'bg-slate-100 text-slate-600 border-slate-200'
      }`}
    >
      {item.actorRoleLabel}
    </span>
  );
}

// Chuông "Hoạt động" cho quản trị và lễ tân: xem lễ tân, quản trị vừa làm gì (kể cả thao tác của chính mình).
// dark = true khi đặt trên header tối (portal lễ tân).
export default function StaffActivityBell({ dark = false }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('');
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [seenId, setSeenId] = useState(() => Number(localStorage.getItem(seenKey(user?.id))) || 0);
  // Mốc đã xem tại lúc mở chuông: các hoạt động sau mốc này vẫn được tô nổi bật khi đang mở.
  const [highlightAfter, setHighlightAfter] = useState(0);
  const rootRef = useRef(null);

  const refresh = useCallback(() => {
    getStaffActivity()
      .then((data) => {
        const rows = Array.isArray(data) ? data : [];
        setItems(rows);
        setError('');
        // Dựng lại database thì id đếm lại từ đầu: mốc cũ lớn hơn mọi id hiện có nên đặt lại về id lớn nhất.
        const maxId = rows.reduce((max, item) => Math.max(max, Number(item.id)), 0);
        setSeenId((current) => {
          if (current <= maxId) return current;
          localStorage.setItem(seenKey(user?.id), String(maxId));
          return maxId;
        });
      })
      .catch((err) => setError(err.message || 'Không tải được hoạt động.'));
  }, [user?.id]);

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

  const newCount = items.filter((item) => Number(item.id) > seenId).length;
  const visible = tab ? items.filter((item) => item.actorRole === tab) : items;

  // Mở chuông là đã xem: ghi mốc id lớn nhất hiện có, số trên nút về 0.
  const toggle = () => {
    if (!open) {
      const maxId = items.reduce((max, item) => Math.max(max, Number(item.id)), seenId);
      localStorage.setItem(seenKey(user?.id), String(maxId));
      setHighlightAfter(seenId);
      setSeenId(maxId);
      refresh();
    }
    setOpen((value) => !value);
  };

  const actorName = (item) => (item.actorUserId === user?.id ? 'Bạn' : item.actorName);

  return (
    <div className="relative" ref={rootRef}>
      <BellButton
        label="Hoạt động"
        ariaLabel="Hoạt động của lễ tân và quản trị"
        count={newCount}
        variant={dark ? 'dark' : 'default'}
        onClick={toggle}
      />

      {open && (
        <BellPanel
          title="Hoạt động lễ tân & quản trị"
          subtitle="Staff activity"
          action={
            <button type="button" onClick={refresh} className="text-[11px] font-bold text-[#e31b23] hover:underline cursor-pointer">
              Làm mới
            </button>
          }
          toolbar={TABS.map((item) => (
            <PanelTab key={item.id || 'all'} active={tab === item.id} onClick={() => setTab(item.id)}>
              {item.label}
            </PanelTab>
          ))}
        >
          {error && <PanelMessage tone="error">{error}</PanelMessage>}
          {!error && visible.length === 0 && <PanelMessage>Chưa có hoạt động nào.</PanelMessage>}
          {visible.map((item) => {
            const detail = {
              kicker: 'Hoạt động',
              badge: <RoleBadge item={item} />,
              heading: actorName(item),
              title: item.action,
              body: item.detail,
              time: item.createdAt,
            };
            return (
              <BellItem
                key={item.id}
                highlighted={Number(item.id) > highlightAfter}
                {...detail}
                onClick={() => setExpanded(detail)}
                onExpand={() => setExpanded(detail)}
              />
            );
          })}
        </BellPanel>
      )}

      <NotificationDetailModal item={expanded} onClose={() => setExpanded(null)} />
    </div>
  );
}
