import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAiTokenUsage } from '../../api/managementApi';

function formatCount(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

function usedShare(used, limit) {
  const total = Number(limit) || 0;
  if (total <= 0) return 0;
  return Math.min(100, Math.round((Number(used) || 0) * 100 / total));
}

export default function MemberTokenUsageTable() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    getAiTokenUsage()
      .then((data) => {
        if (ignore) return;
        setReport(data);
        setError('');
      })
      .catch((loadError) => {
        if (!ignore) setError(loadError.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const members = [...(report?.members || [])].sort(
    (left, right) =>
      (right.tokensUsed || 0) - (left.tokensUsed || 0)
      || String(left.memberName || '').localeCompare(String(right.memberName || ''), 'vi'),
  );
  const periodTokens = members.reduce((sum, member) => sum + (member.periodTokensUsed || 0), 0);
  const regenerations = members.reduce((sum, member) => sum + (member.regenerationsUsed || 0), 0);

  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-lg font-black text-balance text-slate-900">Tổng sử dụng token</h2>
          <p className="mt-1 text-sm text-pretty text-gray-500">
            Token và lượt tạo lại của từng học viên đang có hội viên hiệu lực.
          </p>
        </div>
        <Link to="/quan-ly/han-muc-ai" className="text-sm font-bold text-[#e31b23]">
          Chỉnh hạn mức
        </Link>
      </div>

      {loading && !report && (
        <div className="space-y-3 p-5" aria-busy="true" aria-label="Đang tải token">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="h-16 rounded-2xl bg-gray-100" />
            <div className="h-16 rounded-2xl bg-gray-100" />
            <div className="h-16 rounded-2xl bg-gray-100" />
          </div>
          <div className="h-40 rounded-2xl bg-gray-100" />
        </div>
      )}

      {!loading && error && !report && (
        <div className="px-5 py-8 sm:px-6">
          <p className="text-sm font-semibold text-[#b1131a]">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setReloadKey((key) => key + 1);
            }}
            className="mt-3 rounded-xl bg-[#e31b23] px-4 py-2.5 text-sm font-bold text-white"
          >
            Tải lại
          </button>
        </div>
      )}

      {report && (
        <>
          <dl className="grid border-b border-gray-100 sm:grid-cols-3 sm:divide-x sm:divide-gray-100">
            <div className="px-5 py-4 sm:px-6">
              <dt className="text-sm text-gray-500">Tổng token</dt>
              <dd className="mt-1 text-2xl font-black tabular-nums text-slate-900">{formatCount(report.totalTokensUsed)}</dd>
            </div>
            <div className="border-t border-gray-100 px-5 py-4 sm:border-t-0 sm:px-6">
              <dt className="text-sm text-gray-500">Token kỳ này</dt>
              <dd className="mt-1 text-2xl font-black tabular-nums text-slate-900">{formatCount(periodTokens)}</dd>
            </div>
            <div className="border-t border-gray-100 px-5 py-4 sm:border-t-0 sm:px-6">
              <dt className="text-sm text-gray-500">Lượt tạo lại</dt>
              <dd className="mt-1 text-2xl font-black tabular-nums text-slate-900">{formatCount(regenerations)}</dd>
            </div>
          </dl>

          {members.length === 0 ? (
            <div className="px-5 py-10 text-center sm:px-6">
              <p className="font-bold text-slate-900">Chưa có học viên đang dùng gói</p>
              <p className="mt-1 text-sm text-pretty text-gray-500">
                Khi học viên có hội viên hiệu lực, mức dùng token hiện ở bảng này.
              </p>
              <Link to="/quan-ly/han-muc-ai" className="mt-4 inline-flex rounded-xl bg-[#e31b23] px-4 py-2.5 text-sm font-bold text-white">
                Mở hạn mức AI
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold text-gray-500">
                  <tr>
                    <th className="px-5 py-3 sm:px-6">Học viên</th>
                    <th className="px-4 py-3">Gói</th>
                    <th className="px-4 py-3">Lượt tạo lại</th>
                    <th className="px-4 py-3">Token kỳ này</th>
                    <th className="px-5 py-3 text-right sm:px-6">Tổng token</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {members.map((member) => {
                    const share = usedShare(member.periodTokensUsed, member.tokenLimit);
                    return (
                      <tr key={member.memberUserId}>
                        <td className="px-5 py-3.5 sm:px-6">
                          <p className="truncate font-bold text-slate-900">{member.memberName}</p>
                        </td>
                        <td className="px-4 py-3.5 text-gray-700">
                          <p className="truncate">{member.packageName}</p>
                          <p className="text-xs text-gray-400">{member.packageCode}</p>
                        </td>
                        <td className="px-4 py-3.5 font-bold tabular-nums text-slate-900">
                          {formatCount(member.regenerationsUsed)}
                          <span className="font-medium text-gray-400"> / {formatCount(member.regenerationLimit)}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-bold tabular-nums text-slate-900">
                            {formatCount(member.periodTokensUsed)}
                            <span className="font-medium text-gray-400"> / {formatCount(member.tokenLimit)}</span>
                          </p>
                          <div
                            role="meter"
                            aria-label={`Token kỳ này của ${member.memberName}`}
                            aria-valuemin={0}
                            aria-valuemax={member.tokenLimit || 0}
                            aria-valuenow={member.periodTokensUsed || 0}
                            className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-gray-100"
                          >
                            <div className="h-full bg-[#e31b23]" style={{ width: `${share}%` }} />
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right font-black tabular-nums text-slate-900 sm:px-6">
                          {formatCount(member.tokensUsed)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t border-gray-200 bg-slate-50 text-sm font-bold text-slate-900">
                  <tr>
                    <td className="px-5 py-3 sm:px-6" colSpan={2}>
                      Tổng {members.length} học viên
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatCount(regenerations)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatCount(periodTokens)}</td>
                    <td className="px-5 py-3 text-right tabular-nums sm:px-6">{formatCount(report.totalTokensUsed)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
