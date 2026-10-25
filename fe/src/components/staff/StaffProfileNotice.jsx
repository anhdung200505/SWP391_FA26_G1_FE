import { useState } from 'react';
import { Link } from 'react-router-dom';
import { confirmProfileNotice, dismissProfileNoticeForSession, isProfileNoticeHidden } from '../../auth/profileNotice';

export default function StaffProfileNotice({ userId }) {
  const [hidden, setHidden] = useState(() => isProfileNoticeHidden(userId));
  if (hidden || !userId) return null;

  return (
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-semibold text-amber-950">
        Hồ sơ chưa được đối chiếu. Hãy mở trang thông tin để chỉnh tên, email và số điện thoại cho trùng với thông tin của bạn.
      </p>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Link
          to="/ho-so"
          className="inline-flex rounded-xl bg-[#e31b23] px-3.5 py-2 text-xs font-bold text-white"
        >
          Mở hồ sơ cá nhân
        </Link>
        <button
          type="button"
          onClick={() => {
            confirmProfileNotice(userId);
            setHidden(true);
          }}
          className="rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-amber-950"
        >
          Thông tin đã khớp
        </button>
        <button
          type="button"
          onClick={() => {
            dismissProfileNoticeForSession(userId);
            setHidden(true);
          }}
          className="rounded-xl px-3.5 py-2 text-xs font-bold text-amber-800"
        >
          Để sau
        </button>
      </div>
    </div>
  );
}
