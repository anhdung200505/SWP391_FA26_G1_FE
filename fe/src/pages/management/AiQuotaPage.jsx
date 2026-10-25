import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAiTokenUsage, updatePackageAiQuota } from '../../api/managementApi';
import ManagementShell from '../../components/management/ManagementShell';

const fieldClass =
  'mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium outline-none ring-[#e31b23] focus:ring-2 tabular-nums';

function formatCount(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

function parseWhole(value) {
  const trimmed = String(value).trim();
  if (!/^\d+$/.test(trimmed)) return NaN;
  return Number(trimmed);
}

export default function AiQuotaPage() {
  const [report, setReport] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [savingId, setSavingId] = useState('');
  const [rowErrors, setRowErrors] = useState({});
  const [notice, setNotice] = useState('');

  useEffect(() => {
    document.title = 'Hạn mức AI · AnhDuy Sport';
  }, []);

  useEffect(() => {
    let ignore = false;
    getAiTokenUsage()
      .then((data) => {
        if (ignore) return;
        setReport(data);
        setDrafts(
          Object.fromEntries(
            (data.packages || []).map((item) => [
              item.packageId,
              {
                regenerationLimit: String(item.regenerationLimit ?? 0),
                tokenLimit: String(item.tokenLimit ?? 0),
              },
            ]),
          ),
        );
        setLoadError('');
      })
      .catch((error) => {
        if (!ignore) setLoadError(error.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const updateDraft = (packageId, field, value) => {
    setDrafts((current) => ({
      ...current,
      [packageId]: { ...current[packageId], [field]: value },
    }));
  };

  const save = async (packageId) => {
    const draft = drafts[packageId] || {};
    const regenerationLimit = parseWhole(draft.regenerationLimit);
    const tokenLimit = parseWhole(draft.tokenLimit);
    if (Number.isNaN(regenerationLimit) || regenerationLimit < 0 || Number.isNaN(tokenLimit) || tokenLimit < 0) {
      setRowErrors((current) => ({
        ...current,
        [packageId]: 'Nhập số lượt và số token là số nguyên từ 0 trở lên.',
      }));
      return;
    }

    setSavingId(packageId);
    setNotice('');
    setRowErrors((current) => ({ ...current, [packageId]: '' }));
    try {
      const result = await updatePackageAiQuota(packageId, { regenerationLimit, tokenLimit });
      setNotice(result.message || 'Đã cập nhật hạn mức của gói.');
      setReloadKey((key) => key + 1);
    } catch (error) {
      setRowErrors((current) => ({ ...current, [packageId]: error.message }));
    } finally {
      setSavingId('');
    }
  };

  const packages = report?.packages || [];
  const members = report?.members || [];

  return (
    <ManagementShell
      breadcrumb={[
        { label: 'Bảng điều khiển', to: '/quan-ly' },
        { label: 'Hạn mức AI' },
      ]}
    >
      <section className="relative overflow-hidden rounded-3xl bg-[#12141d] px-6 py-8 text-white sm:px-8">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] bg-[#e31b23] sm:block"
          style={{ clipPath: 'polygon(22% 0, 100% 0, 100% 100%, 0 100%)' }}
        />
        <div className="relative max-w-xl">
          <span className="inline-block bg-[#e31b23] px-3 py-1 text-[11px] font-black uppercase text-white -skew-x-12">
            <span className="inline-block skew-x-12">AI quota</span>
          </span>
          <h1 className="mt-4 text-3xl font-black uppercase italic leading-none text-balance sm:text-5xl">
            Hạn mức AI
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-pretty text-white/75 sm:text-base">
            Xem token đã dùng và sửa số lượt tạo lại, hạn mức token của từng gói. Học viên đang dùng gói đó nhận số mới ngay.
          </p>
        </div>
      </section>

      {notice && (
        <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {notice}
        </p>
      )}

      {loading && !report && (
        <div className="mt-6 space-y-3" aria-busy="true" aria-label="Đang tải hạn mức AI">
          <div className="h-40 rounded-3xl bg-gray-200" />
          <div className="h-56 rounded-3xl bg-gray-200" />
        </div>
      )}

      {!loading && loadError && !report && (
        <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-semibold text-[#b1131a]">{loadError}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setReloadKey((key) => key + 1);
            }}
            className="mt-4 rounded-xl bg-[#e31b23] px-4 py-2.5 text-sm font-bold text-white"
          >
            Tải lại
          </button>
        </div>
      )}

      {report && (
        <>
          <p className="mt-5 text-sm font-bold text-gray-700 tabular-nums">
            Tổng token đã dùng: {formatCount(report.totalTokensUsed)}
          </p>

          <section className="mt-4">
            <h2 className="text-lg font-black text-balance">Hạn mức theo gói</h2>
            {packages.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-10 text-center">
                <p className="font-bold">Chưa có gói hội viên</p>
                <Link to="/quan-ly/goi/moi" className="mt-3 inline-flex text-sm font-bold text-[#e31b23]">
                  Tạo gói hội viên
                </Link>
              </div>
            ) : (
              <div className="mt-3 grid gap-3">
                {packages.map((item) => {
                  const draft = drafts[item.packageId] || {
                    regenerationLimit: String(item.regenerationLimit ?? 0),
                    tokenLimit: String(item.tokenLimit ?? 0),
                  };
                  return (
                    <article key={item.packageId} className="rounded-2xl border border-gray-200 bg-white p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-gray-400">{item.packageCode}</p>
                          <h3 className="text-lg font-black text-balance">{item.packageName}</h3>
                          <p className="mt-1 text-sm text-gray-600 tabular-nums">
                            {formatCount(item.activeMembers)} học viên đang dùng
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-bold text-gray-700">
                          Lượt tạo lại giáo án
                          <input
                            value={draft.regenerationLimit}
                            onChange={(event) => updateDraft(item.packageId, 'regenerationLimit', event.target.value)}
                            inputMode="numeric"
                            className={fieldClass}
                          />
                        </label>
                        <label className="block text-sm font-bold text-gray-700">
                          Hạn mức token
                          <input
                            value={draft.tokenLimit}
                            onChange={(event) => updateDraft(item.packageId, 'tokenLimit', event.target.value)}
                            inputMode="numeric"
                            className={fieldClass}
                          />
                        </label>
                      </div>
                      {rowErrors[item.packageId] && (
                        <p className="mt-3 text-sm font-semibold text-[#b1131a]">{rowErrors[item.packageId]}</p>
                      )}
                      <button
                        type="button"
                        disabled={Boolean(savingId)}
                        onClick={() => save(item.packageId)}
                        className="mt-4 rounded-xl bg-[#e31b23] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        {savingId === item.packageId ? 'Đang lưu...' : 'Lưu hạn mức'}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-black text-balance">Học viên đang dùng gói</h2>
            {members.length === 0 ? (
              <p className="mt-3 text-sm text-pretty text-gray-600">
                Chưa có học viên nào đang dùng gói. Hạn mức phía trên vẫn áp dụng khi có hội viên mới.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-2xl border border-gray-200 bg-white">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-gray-100 text-xs font-bold text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Học viên</th>
                      <th className="px-4 py-3">Gói</th>
                      <th className="px-4 py-3">Lượt tạo lại</th>
                      <th className="px-4 py-3">Token kỳ này</th>
                      <th className="px-4 py-3">Tổng token</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {members.map((member) => (
                      <tr key={member.memberUserId}>
                        <td className="px-4 py-3 font-bold text-gray-900">{member.memberName}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {member.packageName}
                          <span className="mt-0.5 block text-xs text-gray-400">{member.packageCode}</span>
                        </td>
                        <td className="px-4 py-3 font-bold tabular-nums">
                          {formatCount(member.regenerationsUsed)} / {formatCount(member.regenerationLimit)}
                        </td>
                        <td className="px-4 py-3 font-bold tabular-nums">
                          {formatCount(member.periodTokensUsed)} / {formatCount(member.tokenLimit)}
                        </td>
                        <td className="px-4 py-3 tabular-nums">{formatCount(member.tokensUsed)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </ManagementShell>
  );
}
