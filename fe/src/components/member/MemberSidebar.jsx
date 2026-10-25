// Sidebar trái của portal học viên. Màn hẹp thì thành thanh cuộn ngang phía trên nội dung.
export default function MemberSidebar({ items, active, onSelect }) {
  return (
    <aside className="lg:w-60 shrink-0">
      <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible bg-white rounded-3xl border border-slate-200 shadow-xs p-3 lg:sticky lg:top-24">
        {items.map((item) => {
          const isActive = item.key === active;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className={`flex items-center gap-3 whitespace-nowrap rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-wide text-left transition-colors cursor-pointer ${
                isActive ? 'bg-[#e31b23] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
