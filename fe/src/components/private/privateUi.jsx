const STATUS = {
  pending: { label: 'Chờ duyệt', style: 'border-amber-200 bg-amber-50 text-amber-700' },
  approved: { label: 'Chờ thanh toán', style: 'border-sky-200 bg-sky-50 text-sky-700' },
  paid: { label: 'Đã thanh toán', style: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  rejected: { label: 'Bị từ chối', style: 'border-red-200 bg-red-50 text-red-700' },
  cancelled: { label: 'Đã hủy', style: 'border-slate-200 bg-slate-100 text-slate-600' },
  expired: { label: 'Hết hạn thanh toán', style: 'border-slate-200 bg-slate-100 text-slate-600' },
};

export function PrivateStatusBadge({ status }) {
  const info = STATUS[status] || { label: status, style: 'border-slate-200 bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${info.style}`}>
      {info.label}
    </span>
  );
}
