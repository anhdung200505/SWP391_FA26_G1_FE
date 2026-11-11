// Chọn lớp dạng thẻ thay cho <select>: lớp chọn được đứng trước, lớp bị chặn gom xuống dưới với nhãn màu theo lý do
// (đã đăng ký, trùng khóa, trùng lịch) để không nhầm. blocked: Map classId -> lý do từ GET /class-registrations/blocked.
const BLOCK_KINDS = {
  registered: { label: 'Đã đăng ký', badge: 'bg-emerald-600 text-white', card: 'border-emerald-200 bg-emerald-50/70', text: 'text-emerald-800' },
  course: { label: 'Trùng khóa', badge: 'bg-amber-500 text-white', card: 'border-amber-200 bg-amber-50/70', text: 'text-amber-800' },
  schedule: { label: 'Trùng lịch', badge: 'bg-[#e31b23] text-white', card: 'border-red-200 bg-red-50/70', text: 'text-red-700' },
  other: { label: 'Không chọn được', badge: 'bg-slate-500 text-white', card: 'border-slate-200 bg-slate-50', text: 'text-slate-600' },
};

function blockKind(reason) {
  const text = String(reason || '').toLowerCase();
  if (text.includes('đã đăng ký') || text.includes('đã ghi danh')) return BLOCK_KINDS.registered;
  if (text.includes('cùng khóa')) return BLOCK_KINDS.course;
  if (text.includes('trùng lịch')) return BLOCK_KINDS.schedule;
  return BLOCK_KINDS.other;
}

export default function ClassPickList({ classes, blocked, selectedId, onSelect, loading, scheduleLines }) {
  if (loading) {
    return <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-400">Đang tải lớp...</p>;
  }

  if (classes.length === 0) {
    return <p className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-xs font-semibold text-slate-500">Chưa có lớp mở cho môn này.</p>;
  }

  const open = classes.filter((item) => !blocked.has(String(item.id)));
  const closed = classes.filter((item) => blocked.has(String(item.id)));

  return (
    <div className="space-y-2">
      {open.length === 0 && (
        <p className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-3 py-3 text-xs font-semibold text-amber-900">
          Không còn lớp nào của môn này đăng ký được (đã đăng ký, trùng khóa hoặc trùng lịch). Hãy chọn môn khác.
        </p>
      )}

      <div role="radiogroup" className="space-y-2">
        {open.map((item) => {
          const active = String(item.id) === String(selectedId);
          const lines = scheduleLines(item);
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(item)}
              className={`flex w-full items-start gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-colors cursor-pointer ${
                active ? 'border-[#e31b23] bg-red-50/60' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
                  active ? 'border-[#e31b23]' : 'border-slate-300'
                }`}
              >
                {active && <span className="size-2 rounded-full bg-[#e31b23]" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-slate-900">{item.name}</span>
                {lines.length > 0 && (
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    {lines.map((line) => (
                      <span key={line} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold tabular-nums text-slate-700">
                        {line}
                      </span>
                    ))}
                  </span>
                )}
              </span>
              {active && <span className="shrink-0 rounded-full bg-[#e31b23] px-2 py-0.5 text-[10px] font-black uppercase text-white">Đang chọn</span>}
            </button>
          );
        })}
      </div>

      {closed.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Không đăng ký được</p>
          {closed.map((item) => {
            const reason = blocked.get(String(item.id));
            const kind = blockKind(reason);
            const lines = scheduleLines(item);
            return (
              <div key={item.id} aria-disabled="true" className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 opacity-90 ${kind.card}`}>
                <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${kind.badge}`}>{kind.label}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-500 line-through decoration-slate-300">{item.name}</span>
                  {lines.length > 0 && <span className="mt-0.5 block text-[11px] font-semibold tabular-nums text-slate-500">{lines.join(' · ')}</span>}
                  <span className={`mt-1 block text-xs font-semibold ${kind.text}`}>{reason}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
