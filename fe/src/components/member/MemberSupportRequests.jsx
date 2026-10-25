import React from 'react';

const renderStatusBadge = (status) => {
  const statusUpper = status?.toUpperCase() || '';
  switch (statusUpper) {
    case 'RESOLVED':
    case 'APPROVED':
    case 'SUCCESS':
      return (
        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
          ✓ Đã xử lý
        </span>
      );
    case 'REJECTED':
    case 'CANCELLED':
      return (
        <span className="bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
          ✕ Từ chối
        </span>
      );
    case 'IN_PROGRESS':
    case 'PROCESSING':
      return (
        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
          ⚙️ Đang xử lý
        </span>
      );
    case 'PENDING':
    default:
      return (
        <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
          ⏳ Chờ tiếp nhận
        </span>
      );
  }
};

export default function MemberSupportRequests({ loadingRequests, supportRequests }) {
  return (
    <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <span className="inline-block bg-sky-50 text-sky-700 text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full mb-1">
            YÊU CẦU & KHIẾU NẠI
          </span>
          <h2 className="text-lg font-black text-slate-900 uppercase">
            TRẠNG THÁI ĐƠN HỖ TRỢ CỦA BẠN
          </h2>
        </div>
      </div>

      {loadingRequests ? (
        <div className="py-8 text-center">
          <div className="inline-block animate-spin rounded-full h-7 w-7 border-4 border-[#e31b23] border-t-transparent mb-2"></div>
          <p className="text-xs font-bold text-slate-400">Đang kiểm tra danh sách đơn hỗ trợ...</p>
        </div>
      ) : supportRequests.length > 0 ? (
        <div className="space-y-4">
          {supportRequests.map((req) => (
            <div
              key={req.id}
              className="bg-slate-50 hover:bg-slate-100/80 rounded-2xl p-5 border border-slate-200 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/60">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400 font-bold">#{req.id?.slice(-6)}</span>
                    {req.receptionistCategory || req.systemCategory ? (
                      <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                        {req.receptionistCategory || req.systemCategory}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="text-sm font-black text-slate-900 mt-1">{req.title}</h3>
                </div>
                <div>{renderStatusBadge(req.status)}</div>
              </div>

              <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200/80 italic">
                "{req.description}"
              </p>

              {(req.decision || req.resolutionNote) && (
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between text-emerald-800 font-black">
                    <span>📌 Kết quả xử lý từ Trung Tâm:</span>
                    {req.assigneeName && (
                      <span className="text-[11px] font-normal text-emerald-700">HLV/Người xử lý: {req.assigneeName}</span>
                    )}
                  </div>
                  {req.decision && (
                    <p className="font-bold text-emerald-900">Quyết định: {req.decision}</p>
                  )}
                  {req.resolutionNote && (
                    <p className="text-slate-700">{req.resolutionNote}</p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-1">
                <span>Tạo ngày: {req.createdAt ? new Date(req.createdAt).toLocaleString('vi-VN') : 'N/A'}</span>
                {req.resolvedAt && (
                  <span>Hoàn tất: {new Date(req.resolvedAt).toLocaleString('vi-VN')}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-6 text-center text-xs text-slate-400 font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          Bạn chưa gửi yêu cầu hỗ trợ hoặc khiếu nại nào.
        </div>
      )}
    </section>
  );
}