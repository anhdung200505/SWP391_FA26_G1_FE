import { useEffect, useRef, useState } from 'react';
import { deleteCatalogSport, getCatalogSportDeleteCheck } from '../../api/managementApi';

// Hộp xác nhận xóa môn. Mở ra là gọi delete-check (chỉ đọc); lỗi từ BE hiện nguyên văn.
export default function DeleteSportDialog({ sport, onClose, onDeleted }) {
  const [check, setCheck] = useState(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    let ignore = false;
    getCatalogSportDeleteCheck(sport.id)
      .then((data) => {
        if (!ignore) setCheck(data);
      })
      .catch((requestError) => {
        if (!ignore) setError(requestError.message || 'Không kiểm tra được môn.');
      });
    return () => {
      ignore = true;
    };
  }, [sport.id]);

  const confirm = async () => {
    if (busy.current) return;
    busy.current = true;
    setDeleting(true);
    setError('');
    try {
      const result = await deleteCatalogSport(sport.id);
      onDeleted(result);
    } catch (requestError) {
      setError(requestError.message || 'Không xóa được môn.');
      busy.current = false;
      setDeleting(false);
    }
  };

  const coachNames = (check?.coachesWithoutSport || []).map((coach) => coach.fullName).join(', ');
  const blocked = check && !check.canDelete;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-sport-title">
      <div className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <h2 id="delete-sport-title" className="text-lg font-black text-slate-900">
          Xóa môn «{sport.name}»
        </h2>

        {!check && !error && (
          <p className="text-sm text-slate-500" aria-busy="true">
            Đang kiểm tra...
          </p>
        )}

        {blocked && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{check.blockReason}</p>}

        {check?.canDelete && (
          <>
            <p className="text-sm text-slate-700">
              Xóa môn «{sport.name}» sẽ xóa {check.courseCount} khóa học, gỡ {check.roomLinkCount} phòng và {check.coachLinkCount} HLV khỏi môn này. Phòng và HLV vẫn còn trong hệ thống. Không hoàn tác được.
            </p>
            {coachNames && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                HLV sẽ không còn môn nào: {coachNames} (cần gán môn mới ở trang tài khoản).
              </p>
            )}
          </>
        )}

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          {check?.canDelete ? (
            <>
              <button type="button" onClick={onClose} disabled={deleting} className="h-10 cursor-pointer rounded-xl bg-slate-100 px-5 text-sm font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-60">
                Hủy
              </button>
              <button type="button" onClick={confirm} disabled={deleting} className="h-10 cursor-pointer rounded-xl bg-[#e31b23] px-5 text-sm font-bold text-white hover:bg-[#b1131a] disabled:opacity-60">
                {deleting ? 'Đang xóa...' : 'Xóa môn'}
              </button>
            </>
          ) : (
            <button type="button" onClick={onClose} className="h-10 cursor-pointer rounded-xl bg-slate-100 px-5 text-sm font-bold text-slate-700 hover:bg-slate-200">
              Đóng
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
