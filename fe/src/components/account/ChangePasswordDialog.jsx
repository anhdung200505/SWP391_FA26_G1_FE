import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import ChangePasswordForm from './ChangePasswordForm';

// Panel đổi mật khẩu mở từ trang hồ sơ. Render ra body để không lồng vào form hồ sơ.
export default function ChangePasswordDialog({ onClose }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
      <button type="button" aria-label="Đóng" className="absolute inset-0 bg-black/50 cursor-default" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="change-password-title" className="text-lg font-black text-gray-900">Đổi mật khẩu</h2>
            <p className="mt-1 text-sm text-pretty text-gray-500">Nhập mật khẩu hiện tại rồi đặt mật khẩu mới theo đúng các lưu ý bên dưới.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
          >
            ✕
          </button>
        </div>
        <ChangePasswordForm />
      </div>
    </div>,
    document.body,
  );
}
