// Class dùng chung cho các khối trang học viên để giữ một ngôn ngữ thiết kế.
export const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e31b23]';

export const cardClass = 'rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8';
export const cardHeadClass = 'mb-6 border-b border-slate-100 pb-4';
export const sectionTitle = 'text-lg font-black text-balance text-slate-900';
export const sectionSub = 'mt-1 text-sm text-pretty text-slate-500';
export const labelClass = 'block text-xs font-bold uppercase tracking-wide text-slate-500';

const btnBase = `inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-bold shadow-md transition-colors cursor-pointer ${focusRing}`;
export const btnPrimary = `${btnBase} bg-[#e31b23] text-white hover:bg-[#c4131a]`;
export const btnDark = `${btnBase} bg-[#12141d] text-white hover:bg-[#e31b23]`;
export const linkAccent = `text-sm font-bold text-[#e31b23] hover:underline ${focusRing}`;

export const emptyBox =
  'rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-8 text-center text-sm text-slate-500';
export const spinnerClass = 'inline-block size-8 animate-spin rounded-full border-4 border-[#e31b23] border-t-transparent';
