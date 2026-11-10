import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAiTokenUsage } from '../../api/managementApi';
import {
  estimateTokenCost,
  formatEstimatedVnd,
  GEMINI_MODEL,
  INPUT_USD_PER_MILLION,
  loadUsdVndRate,
  OUTPUT_USD_PER_MILLION,
} from './aiTokenCost';

function formatCount(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

function usedShare(used, limit) {
  const total = Number(limit) || 0;
  if (total <= 0) return 0;
  return Math.min(100, Math.round((Number(used) || 0) * 100 / total));
}

function monthLabel(year, month) {
  const label = new Date(year, month - 1, 1).toLocaleDateString('vi-VN', { month: 'short' });
  return label.replace('.', '');
}

function foldName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/gi, 'd')
    .toLocaleLowerCase('vi');
}

function TokenMonthChart({ months, caption }) {
  const rows = Array.isArray(months) ? months : [];
  const max = Math.max(1, ...rows.map((item) => Number(item.tokensUsed) || 0));
  const monthTokens = rows.reduce((sum, item) => sum + (Number(item.tokensUsed) || 0), 0);
  return (
    <figure className="border-b border-gray-100 px-5 py-5 sm:px-6">
      <figcaption className="text-sm font-bold text-balance text-slate-900">{caption}</figcaption>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-pretty text-gray-500">Chưa có số token theo tháng.</p>
      ) : (
        <>
          <div className="mt-4 flex h-44 items-end gap-2" aria-hidden="true">
            {rows.map((item) => {
              const used = Number(item.tokensUsed) || 0;
              const height = Math.round((used / max) * 100);
              return (
                <div key={`${item.year}-${item.month}`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <span className="text-xs tabular-nums text-gray-500">{used > 0 ? formatCount(used) : ''}</span>
                  <div className="flex h-28 w-full items-end rounded-t bg-gray-100">
                    <div className="w-full rounded-t bg-[#e31b23]" style={{ height: `${Math.max(height, used > 0 ? 4 : 0)}%` }} />
                  </div>
                  <span className="truncate text-xs text-gray-500">{monthLabel(item.year, item.month)}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-pretty text-gray-500 tabular-nums">
            12 tháng trên biểu đồ: {formatCount(monthTokens)} token.
          </p>
          <table className="sr-only">
            <caption>{caption}</caption>
            <thead>
              <tr>
                <th>Tháng</th>
                <th>Token</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={`${item.year}-${item.month}-text`}>
                  <td>{monthLabel(item.year, item.month)} {item.year}</td>
                  <td>{formatCount(item.tokensUsed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </figure>
  );
}

function MemberCost({ tokens, rate }) {
  return <span className="font-semibold">{formatEstimatedVnd(estimateTokenCost(tokens, rate))}</span>;
}

function MoneyMonthChart({ months, caption, vndPerUsd }) {
  const rows = Array.isArray(months) ? months : [];
  const costs = rows.map((item) => estimateTokenCost(item.tokensUsed, vndPerUsd));
  const max = Math.max(1, ...costs.map((item) => Number(item.vndEstimate) || 0));
  const total = costs.reduce((sum, item) => sum + (Number(item.vndEstimate) || 0), 0);
  const totalLabel = formatEstimatedVnd({ vndEstimate: vndPerUsd == null ? null : total });
  return (
    <figure className="px-5 py-5 sm:px-6">
      <figcaption className="text-sm font-bold text-balance text-slate-900">{caption}</figcaption>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-pretty text-gray-500">Chưa có chi phí theo tháng.</p>
      ) : (
        <>
          <div className="mt-4 flex h-44 items-end gap-2" aria-hidden="true">
            {rows.map((item, index) => {
              const amount = Number(costs[index].vndEstimate) || 0;
              const height = Math.round((amount / max) * 100);
              return (
                <div key={`${item.year}-${item.month}-vnd`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <span className="max-w-full truncate text-[10px] tabular-nums text-gray-500">
                    {amount > 0 ? Math.round(amount).toLocaleString('vi-VN') : ''}
                  </span>
                  <div className="flex h-28 w-full items-end rounded-t bg-gray-100">
                    <div className="w-full rounded-t bg-[#12141d]" style={{ height: `${Math.max(height, amount > 0 ? 4 : 0)}%` }} />
                  </div>
                  <span className="truncate text-xs text-gray-500">{monthLabel(item.year, item.month)}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-pretty text-gray-500 tabular-nums">
            12 tháng trên biểu đồ: {totalLabel}. Mỗi cột là mức giữa giá đầu vào và giá đầu ra, đã quy sang đồng.
          </p>
          <table className="sr-only">
            <caption>{caption}</caption>
            <thead>
              <tr>
                <th>Tháng</th>
                <th>Chi phí ước tính</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item, index) => (
                <tr key={`${item.year}-${item.month}-vnd-text`}>
                  <td>{monthLabel(item.year, item.month)} {item.year}</td>
                  <td>{formatEstimatedVnd(costs[index])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </figure>
  );
}

function MemberRows({ members, vndPerUsd }) {
  if (members.length === 0) {
    return <p className="mt-4 text-sm text-pretty text-gray-500">Không có học viên khớp với tên này.</p>;
  }
  return (
    <div className="mt-4 max-h-96 overflow-auto">
      <table className="w-full min-w-[52rem] text-left text-sm">
        <thead className="sticky top-0 bg-white">
          <tr className="border-b border-gray-100 text-gray-500">
            <th className="py-2 pr-3 font-medium">Học viên</th>
            <th className="py-2 pr-3 font-medium">Gói</th>
            <th className="py-2 pr-3 font-medium">Lượt tạo lại</th>
            <th className="py-2 pr-3 font-medium">Token kỳ hội viên</th>
            <th className="py-2 pr-3 font-medium">Tổng token</th>
            <th className="py-2 font-medium">Chi phí ước tính</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.memberUserId} className="border-b border-gray-100 last:border-b-0">
              <td className="py-2.5 pr-3 font-semibold text-slate-900">{member.memberName}</td>
              <td className="py-2.5 pr-3 text-slate-700">
                {member.packageName || 'Chưa có gói'}
                {member.packageCode && <div className="text-xs text-gray-400">{member.packageCode}</div>}
              </td>
              <td className="py-2.5 pr-3 tabular-nums text-slate-900">
                {formatCount(member.regenerationsUsed)}
                <span className="text-gray-400"> / {formatCount(member.regenerationLimit)}</span>
              </td>
              <td className="py-2.5 pr-3 tabular-nums text-slate-900">
                {formatCount(member.periodTokensUsed)}
                <span className="text-gray-400"> / {formatCount(member.tokenLimit)}</span>
              </td>
              <td className="py-2.5 pr-3 font-semibold tabular-nums text-slate-900">{formatCount(member.tokensUsed)}</td>
              <td className="py-2.5 tabular-nums text-slate-900">
                <MemberCost tokens={member.tokensUsed} rate={vndPerUsd} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SelectedMember({ member, vndPerUsd }) {
  const share = usedShare(member.periodTokensUsed, member.tokenLimit);
  return (
    <dl className="mt-4 grid gap-4 sm:grid-cols-4">
      <div>
        <dt className="text-sm text-gray-500">Gói</dt>
        <dd className="mt-1 font-semibold text-slate-900">{member.packageName || 'Chưa có gói'}</dd>
        {member.packageCode && <dd className="text-xs text-gray-400">{member.packageCode}</dd>}
      </div>
      <div>
        <dt className="text-sm text-gray-500">Lượt tạo lại</dt>
        <dd className="mt-1 font-semibold tabular-nums text-slate-900">
          {formatCount(member.regenerationsUsed)}
          <span className="font-medium text-gray-400"> / {formatCount(member.regenerationLimit)}</span>
        </dd>
      </div>
      <div>
        <dt className="text-sm text-gray-500">Token kỳ hội viên</dt>
        <dd className="mt-1 font-semibold tabular-nums text-slate-900">
          {formatCount(member.periodTokensUsed)}
          <span className="font-medium text-gray-400"> / {formatCount(member.tokenLimit)}</span>
        </dd>
        <div
          role="meter"
          aria-label={`Token kỳ hội viên của ${member.memberName}`}
          aria-valuemin={0}
          aria-valuemax={member.tokenLimit || 0}
          aria-valuenow={member.periodTokensUsed || 0}
          className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-gray-100"
        >
          <div className="h-full bg-[#e31b23]" style={{ width: `${share}%` }} />
        </div>
      </div>
      <div>
        <dt className="text-sm text-gray-500">Tổng token</dt>
        <dd className="mt-1 text-lg font-black tabular-nums text-slate-900">{formatCount(member.tokensUsed)}</dd>
        <dd className="mt-1 text-sm font-semibold tabular-nums text-slate-700">
          <MemberCost tokens={member.tokensUsed} rate={vndPerUsd} />
        </dd>
      </div>
    </dl>
  );
}

function TokenCostPanel({ lifetimeTokens, monthTokens, subject, vndPerUsd, rateFallback }) {
  const lifetime = estimateTokenCost(lifetimeTokens, vndPerUsd);
  const month = estimateTokenCost(monthTokens, vndPerUsd);
  const rateLabel = vndPerUsd == null
    ? 'Đang lấy tỷ giá sang đồng.'
    : rateFallback
      ? `Chưa lấy được tỷ giá mới, tạm tính 1 USD = ${formatCount(Math.round(vndPerUsd))} ₫.`
      : `Tỷ giá tham chiếu hôm nay: 1 USD = ${formatCount(Math.round(vndPerUsd))} ₫.`;
  const who = subject ? ` của ${subject}` : '';
  return (
    <section className="border-b border-gray-100 px-5 py-5 sm:px-6" aria-label="Quy đổi token ra tiền">
      <h3 className="text-sm font-black text-slate-900">Chi phí ước tính phải trả cho AI</h3>
      <p className="mt-1 max-w-3xl text-sm text-pretty text-gray-500">
        Số đồng là mức giữa giá đầu vào ({INPUT_USD_PER_MILLION.toLocaleString('vi-VN', { minimumFractionDigits: 2 })} USD) và giá đầu ra ({OUTPUT_USD_PER_MILLION.toLocaleString('vi-VN', { minimumFractionDigits: 2 })} USD) cho 1 triệu token của {GEMINI_MODEL}, gồm token suy luận. {rateLabel}
      </p>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-gray-50 px-4 py-3">
          <dt className="text-sm text-gray-500">Tổng chi phí{who}</dt>
          <dd className="mt-1 text-xl font-black tabular-nums text-slate-900">{formatEstimatedVnd(lifetime)}</dd>
        </div>
        <div className="rounded-2xl bg-gray-50 px-4 py-3">
          <dt className="text-sm text-gray-500">Chi phí tháng này{who}</dt>
          <dd className="mt-1 text-xl font-black tabular-nums text-slate-900">{formatEstimatedVnd(month)}</dd>
        </div>
      </dl>
    </section>
  );
}

function CoachTokenPanel({ report, vndPerUsd, rateFallback }) {
  const coaches = report?.coaches || [];
  const [selectedId, setSelectedId] = useState('');
  const selected = coaches.find((item) => String(item.coachUserId) === String(selectedId)) || null;
  const chartMonths = selected?.months || report?.coachMonths || [];
  const generations = coaches.reduce((sum, item) => sum + (item.generations || 0), 0);
  const regenerations = coaches.reduce((sum, item) => sum + (item.regenerations || 0), 0);
  const total = selected ? selected.tokensUsed : report?.coachTotalTokensUsed || 0;
  return (
    <>
      <dl className="grid border-b border-gray-100 sm:grid-cols-3 sm:divide-x sm:divide-gray-100">
        <div className="px-5 py-4 sm:px-6">
          <dt className="text-sm text-gray-500">Tổng token của HLV</dt>
          <dd className="mt-1 text-2xl font-black tabular-nums text-slate-900">{formatCount(report?.coachTotalTokensUsed)}</dd>
        </div>
        <div className="border-t border-gray-100 px-5 py-4 sm:border-t-0 sm:px-6">
          <dt className="text-sm text-gray-500">Lượt sinh bài</dt>
          <dd className="mt-1 text-2xl font-black tabular-nums text-slate-900">{formatCount(generations)}</dd>
        </div>
        <div className="border-t border-gray-100 px-5 py-4 sm:border-t-0 sm:px-6">
          <dt className="text-sm text-gray-500">Lượt tạo lại</dt>
          <dd className="mt-1 text-2xl font-black tabular-nums text-slate-900">{formatCount(regenerations)}</dd>
        </div>
      </dl>

      <TokenCostPanel
        lifetimeTokens={total}
        monthTokens={Number(chartMonths[chartMonths.length - 1]?.tokensUsed) || 0}
        subject={selected ? selected.coachName : 'huấn luyện viên'}
        vndPerUsd={vndPerUsd}
        rateFallback={rateFallback}
      />

      {coaches.length === 0 ? (
        <div className="px-5 py-10 text-center sm:px-6">
          <p className="font-bold text-slate-900">Chưa có huấn luyện viên nào dùng AI</p>
          <p className="mt-1 text-sm text-pretty text-gray-500">
            Khi huấn luyện viên sinh hoặc tạo lại bài tập cho một buổi học, token sẽ hiện ở đây.
          </p>
        </div>
      ) : (
        <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
          <label className="block max-w-sm text-sm font-semibold text-gray-700" htmlFor="token-coach">
            Huấn luyện viên
            <select
              id="token-coach"
              value={selected ? selectedId : ''}
              onChange={(event) => setSelectedId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900"
            >
              <option value="">Tất cả huấn luyện viên</option>
              {coaches.map((item) => (
                <option key={item.coachUserId} value={item.coachUserId}>
                  {item.coachName}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-4 max-h-96 overflow-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="py-2 pr-3 font-medium">Huấn luyện viên</th>
                  <th className="py-2 pr-3 font-medium">Sinh bài</th>
                  <th className="py-2 pr-3 font-medium">Tạo lại</th>
                  <th className="py-2 pr-3 font-medium">Tổng token</th>
                  <th className="py-2 pr-3 font-medium">Chi phí ước tính</th>
                  <th className="py-2 font-medium">Lần cuối</th>
                </tr>
              </thead>
              <tbody>
                {(selected ? [selected] : coaches).map((item) => (
                  <tr key={item.coachUserId} className="border-b border-gray-100 last:border-b-0">
                    <td className="py-2.5 pr-3 font-semibold text-slate-900">{item.coachName}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{formatCount(item.generations)}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{formatCount(item.regenerations)}</td>
                    <td className="py-2.5 pr-3 font-semibold tabular-nums text-slate-900">{formatCount(item.tokensUsed)}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-slate-900">
                      <MemberCost tokens={item.tokensUsed} rate={vndPerUsd} />
                    </td>
                    <td className="py-2.5 text-gray-500 tabular-nums">
                      {item.lastUsedAt ? new Date(item.lastUsedAt).toLocaleDateString('vi-VN') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <TokenMonthChart months={chartMonths} caption={selected ? `Token của ${selected.coachName} theo tháng` : 'Tổng token của huấn luyện viên theo tháng'} />
      <MoneyMonthChart
        months={chartMonths}
        caption={selected ? `Chi phí của ${selected.coachName} theo tháng` : 'Chi phí ước tính của huấn luyện viên theo tháng'}
        vndPerUsd={vndPerUsd}
      />
    </>
  );
}

export default function MemberTokenUsageTable() {
  const [tab, setTab] = useState('members');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedId, setSelectedId] = useState('');
  const [nameQuery, setNameQuery] = useState('');
  const [vndPerUsd, setVndPerUsd] = useState(null);
  const [rateFallback, setRateFallback] = useState(false);

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

  useEffect(() => {
    let ignore = false;
    loadUsdVndRate().then((result) => {
      if (ignore) return;
      setVndPerUsd(result.rate);
      setRateFallback(result.fallback);
    });
    return () => {
      ignore = true;
    };
  }, []);

  const members = [...(report?.members || [])].sort(
    (left, right) => String(left.memberName || '').localeCompare(String(right.memberName || ''), 'vi'),
  );
  const selected = members.find((member) => String(member.memberUserId) === String(selectedId)) || null;
  const foldedQuery = foldName(nameQuery.trim());
  const matchedMembers = foldedQuery
    ? members.filter((member) => foldName(member.memberName).includes(foldedQuery))
    : members;
  const periodTokens = members.reduce((sum, member) => sum + (member.periodTokensUsed || 0), 0);
  const regenerations = members.reduce((sum, member) => sum + (member.regenerationsUsed || 0), 0);
  const chartMonths = selected?.months || report?.months || [];
  const chartCaption = selected
    ? `Token của ${selected.memberName} theo tháng`
    : 'Tổng token theo tháng';

  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-lg font-black text-balance text-slate-900">Tổng sử dụng token</h2>
          <p className="mt-1 text-sm text-pretty text-gray-500">
            Token AI của học viên (gợi ý tập cá nhân) và của huấn luyện viên (soạn bài từng buổi).
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

      <div role="tablist" aria-label="Đối tượng dùng AI" className="flex gap-2 border-b border-gray-100 px-5 py-3 sm:px-6">
        {[
          ['members', 'Học viên'],
          ['coaches', 'Huấn luyện viên'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
              tab === id ? 'bg-[#e31b23] text-white' : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {report && tab === 'coaches' && <CoachTokenPanel report={report} vndPerUsd={vndPerUsd} rateFallback={rateFallback} />}

      {report && tab === 'members' && (
        <>
          <dl className="grid border-b border-gray-100 sm:grid-cols-3 sm:divide-x sm:divide-gray-100">
            <div className="px-5 py-4 sm:px-6">
              <dt className="text-sm text-gray-500">Tổng token</dt>
              <dd className="mt-1 text-2xl font-black tabular-nums text-slate-900">{formatCount(report.totalTokensUsed)}</dd>
            </div>
            <div className="border-t border-gray-100 px-5 py-4 sm:border-t-0 sm:px-6">
              <dt className="text-sm text-gray-500">Token kỳ hội viên</dt>
              <dd className="mt-1 text-2xl font-black tabular-nums text-slate-900">{formatCount(periodTokens)}</dd>
            </div>
            <div className="border-t border-gray-100 px-5 py-4 sm:border-t-0 sm:px-6">
              <dt className="text-sm text-gray-500">Lượt tạo lại</dt>
              <dd className="mt-1 text-2xl font-black tabular-nums text-slate-900">{formatCount(regenerations)}</dd>
            </div>
          </dl>

          <TokenCostPanel
            lifetimeTokens={selected ? selected.tokensUsed : report.totalTokensUsed}
            monthTokens={Number(chartMonths[chartMonths.length - 1]?.tokensUsed) || 0}
            subject={selected ? selected.memberName : ''}
            vndPerUsd={vndPerUsd}
            rateFallback={rateFallback}
          />

          {members.length === 0 ? (
            <div className="px-5 py-10 text-center sm:px-6">
              <p className="font-bold text-slate-900">Chưa có học viên đang dùng gói</p>
              <p className="mt-1 text-sm text-pretty text-gray-500">
                Khi học viên có hội viên hiệu lực, chọn tên trong danh sách để xem token.
              </p>
              <Link to="/quan-ly/han-muc-ai" className="mt-4 inline-flex rounded-xl bg-[#e31b23] px-4 py-2.5 text-sm font-bold text-white">
                Mở hạn mức AI
              </Link>
            </div>
          ) : (
            <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
              <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
                <label className="block text-sm font-semibold text-gray-700" htmlFor="token-member">
                  Học viên
                  <select
                    id="token-member"
                    value={selected ? selectedId : ''}
                    onChange={(event) => setSelectedId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900"
                  >
                    <option value="">Tất cả học viên</option>
                    {matchedMembers.map((member) => (
                      <option key={member.memberUserId} value={member.memberUserId}>
                        {member.memberName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-semibold text-gray-700" htmlFor="token-member-search">
                  Tìm tên
                  <input
                    id="token-member-search"
                    type="search"
                    value={nameQuery}
                    placeholder="Nhập tên học viên"
                    onChange={(event) => {
                      const next = event.target.value;
                      setNameQuery(next);
                      if (selected && !foldName(selected.memberName).includes(foldName(next.trim()))) {
                        setSelectedId('');
                      }
                    }}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900"
                  />
                </label>
              </div>
              {selected ? <SelectedMember member={selected} vndPerUsd={vndPerUsd} /> : <MemberRows members={matchedMembers} vndPerUsd={vndPerUsd} />}
            </div>
          )}
          <TokenMonthChart months={chartMonths} caption={chartCaption} />
          <MoneyMonthChart
            months={chartMonths}
            caption={selected ? `Chi phí của ${selected.memberName} theo tháng` : 'Chi phí ước tính theo tháng'}
            vndPerUsd={vndPerUsd}
          />
        </>
      )}
    </section>
  );
}
