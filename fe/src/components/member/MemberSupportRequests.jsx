import React from 'react';
import { cardClass, cardHeadClass, sectionTitle, sectionSub, emptyBox, spinnerClass } from './memberUi';

const badgeBase = 'rounded-full border px-2.5 py-1 text-xs font-black whitespace-nowrap';

const STATUS_BADGES = {
  done: { label: 'Đã xử lý', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Từ chối', className: 'bg-red-50 text-red-700 border-red-200' },
  progress: { label: 'Đang xử lý', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  pending: { label: 'Chờ tiếp nhận', className: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const STATUS_KEY = {
  RESOLVED: 'done',
  APPROVED: 'done',
  SUCCESS: 'done',
  REJECTED: 'rejected',
  CANCELLED: 'rejected',
  IN_PROGRESS: 'progress',
  PROCESSING: 'progress',
};

const renderStatusBadge = (status) => {
  const badge = STATUS_BADGES[STATUS_KEY[status?.toUpperCase() || ''] || 'pending'];
  return <span className={`${badgeBase} ${badge.className}`}>{badge.label}</span>;
};

export default function MemberSupportRequests({ loadingRequests, supportRequests }) {
  return (
    <section className={`${cardClass} space-y-6`}>
      <div className={`${cardHeadClass} !mb-0`}>
        <h2 className={sectionTitle}>Trạng thái đơn hỗ trợ của bạn</h2>
        <p className={sectionSub}>Yêu cầu và khiếu nại bạn đã gửi tới trung tâm</p>
      </div>

      {loadingRequests ? (
        <div className="py-8 text-center">
          <div className={`${spinnerClass} mb-2`}></div>
          <p className="text-sm font-bold text-slate-500">Đang kiểm tra danh sách đơn hỗ trợ...</p>
        </div>
      ) : supportRequests.length > 0 ? (
        <div className="space-y-4">
          {supportRequests.map((req) => (
            <div
              key={req.id}
              className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 transition-colors hover:bg-slate-100/80"
            >
              <div className="flex flex-col justify-between gap-2 border-b border-slate-200/60 pb-3 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500">#{req.id?.slice(-6)}</span>
                    {req.receptionistCategory || req.systemCategory ? (
                      <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700">
                        {req.receptionistCategory || req.systemCategory}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-1 text-base font-black text-slate-900">{req.title}</h3>
                </div>
                <div>{renderStatusBadge(req.status)}</div>
              </div>

              <p className="rounded-xl border border-slate-200/80 bg-white p-3 text-sm italic text-slate-600">
                "{req.description}"
              </p>

              {(req.decision || req.resolutionNote) && (
                <div className="space-y-1 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-1 font-black text-emerald-800">
                    <span>Kết quả xử lý từ trung tâm</span>
                    {req.assigneeName && (
                      <span className="text-xs font-normal text-emerald-700">Người xử lý: {req.assigneeName}</span>
                    )}
                  </div>
                  {req.decision && <p className="font-bold text-emerald-900">Quyết định: {req.decision}</p>}
                  {req.resolutionNote && <p className="text-slate-700">{req.resolutionNote}</p>}
                </div>
              )}

              <div className="flex items-center justify-between pt-1 text-xs font-medium text-slate-500 tabular-nums">
                <span>Tạo ngày: {req.createdAt ? new Date(req.createdAt).toLocaleString('vi-VN') : 'N/A'}</span>
                {req.resolvedAt && <span>Hoàn tất: {new Date(req.resolvedAt).toLocaleString('vi-VN')}</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={emptyBox}>Bạn chưa gửi yêu cầu hỗ trợ hoặc khiếu nại nào.</div>
      )}
    </section>
  );
}
