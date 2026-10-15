import { getRole } from '../../data/accountManagement';

const ROLE_STYLES = {
  ADMIN: 'bg-red-50 text-[#b1131a] ring-[#e31b23]/30',
  RECEPTIONIST: 'bg-sky-50 text-sky-800 ring-sky-200',
  COACH: 'bg-amber-50 text-amber-800 ring-amber-200',
  MEMBER: 'bg-slate-100 text-slate-700 ring-slate-200',
};

export function RoleBadge({ roleId, label }) {
  const role = getRole(roleId);
  const style = ROLE_STYLES[roleId] || ROLE_STYLES.MEMBER;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${style}`}>
      {label || role?.label || 'Chưa gán'}
    </span>
  );
}

export function StatusBadge({ status }) {
  const active = status === 'active';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${
        active
          ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
          : 'bg-stone-100 text-stone-600 ring-stone-200'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-stone-400'}`} />
      {active ? 'Đang hoạt động' : 'Ngưng hoạt động'}
    </span>
  );
}

const FLOW_STEPS = [
  'Bảng điều khiển',
  'Danh sách tài khoản',
  'Chọn tài khoản',
  'Vai trò hoặc trạng thái',
  'Hệ thống ghi nhận',
];

export function FlowTrail({ step, steps = FLOW_STEPS }) {
  return (
    <ol className="flex flex-wrap gap-2">
      {steps.map((label, index) => {
        const done = index < step;
        const current = index === step;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
                current
                  ? 'bg-[#e31b23] text-white'
                  : done
                    ? 'bg-[#12141d] text-white'
                    : 'bg-white text-gray-400 ring-1 ring-gray-200'
              }`}
            >
              <span className="tabular-nums">{index + 1}</span>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function DiagramCaption({ children }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">{children}</p>
  );
}
