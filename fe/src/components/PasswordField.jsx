import { useState } from 'react';

export default function PasswordField({ label, value, onChange, autoComplete, hint, placeholder }) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block">
      {label && (
        <span className="block text-xs font-extrabold uppercase tracking-wider text-gray-300 mb-1">
          {label}
        </span>
      )}
      <span className="relative mt-1 block">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder || '••••••••'}
          className="w-full rounded-xl bg-[#0d0f17] border border-gray-700/80 px-4 py-2.5 pr-11 text-sm font-medium text-white placeholder-gray-500 outline-none focus:border-[#e31b23] focus:ring-1 focus:ring-[#e31b23] transition-all"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-400 hover:text-[#e31b23] transition-colors"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </span>
      {hint && <span className="mt-1.5 block text-xs font-semibold text-gray-400">{hint}</span>}
    </label>
  );
}

function EyeIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" strokeWidth="1.8" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 3l18 18" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10.6 6.2A10.7 10.7 0 0 1 12 6c6.5 0 10 6 10 6a18.4 18.4 0 0 1-4.1 4.8" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M6.1 6.7C3.5 8.6 2 12 2 12s3.5 7 10 7c1.6 0 3-.3 4.3-.9" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}