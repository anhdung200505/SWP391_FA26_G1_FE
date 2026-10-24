import React from 'react';

export default function ReceptionistTable({
  loading,
  filteredList,
  activeTab,
  openActionModal,
}) {
  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#e31b23] border-t-transparent mb-2"></div>
        <p className="text-xs font-bold text-slate-400">Đang tải danh sách đơn...</p>
      </div>
    );
  }

  if (filteredList.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-xs font-bold text-slate-400">Không tìm thấy đơn hỗ trợ nào phù hợp.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
            <th className="p-4">Khách hàng / Học viên</th>
            <th className="p-4">Tiêu đề / Phân loại</th>
            <th className="p-4">Nội dung yêu cầu</th>
            <th className="p-4">Trạng thái</th>
            <th className="p-4 text-right">Thao tác xử lý API</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
          {filteredList.map((item) => {
            const isResolved = item.status === 'resolved' || item.status === 'RESOLVED';
            return (
              <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="p-4">
                  <div className="font-bold text-slate-900">
                    {item.memberName || item.fullName || 'Khách vãng lai'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {item.memberEmail || item.email || 'N/A'}
                  </div>
                  {(item.phone || item.memberPhone) && (
                    <div className="text-[11px] font-semibold text-slate-600">
                      📞 {item.phone || item.memberPhone}
                    </div>
                  )}
                </td>

                <td className="p-4">
                  <div className="font-bold text-slate-800">{item.title || 'Gửi yêu cầu'}</div>
                  {item.receptionistCategory && (
                    <span className="inline-block bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded mt-1">
                      {item.receptionistCategory}
                    </span>
                  )}
                  <div className="text-[10px] text-slate-400 mt-1">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : ''}
                  </div>
                </td>

                <td className="p-4 max-w-xs">
                  <p className="line-clamp-2 text-slate-600 italic">
                    "{item.description || item.note || 'Không có ghi chú'}"
                  </p>
                  {item.resolutionNote && (
                    <div className="mt-1 text-[11px] text-emerald-700 bg-emerald-50 p-1.5 rounded border border-emerald-100">
                      <strong>Kết quả:</strong> {item.resolutionNote}
                    </div>
                  )}
                </td>

                <td className="p-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                      isResolved
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : 'bg-amber-50 text-amber-600 border-amber-200'
                    }`}
                  >
                    {isResolved ? '✓ Đã xử lý' : '⏳ Chờ xử lý'}
                  </span>
                </td>

                <td className="p-4 text-right whitespace-nowrap">
                  {isResolved ? (
                    <button
                      onClick={() => openActionModal(item, 'view_result')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg cursor-pointer"
                    >
                      Xem kết quả
                    </button>
                  ) : activeTab === 'enrollment' ? (
                    <button
                      onClick={() => openActionModal(item, 'edit_enrollment')}
                      className="bg-slate-900 hover:bg-[#e31b23] text-white font-bold text-[11px] px-3 py-1.5 rounded-lg cursor-pointer"
                    >
                      ✏️ Cập nhật & Giải quyết
                    </button>
                  ) : (
                    <div className="flex justify-end gap-1.5 flex-wrap">
                      <button
                        onClick={() => openActionModal(item, 'classify')}
                        className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg cursor-pointer"
                      >
                        🏷️ Phân loại
                      </button>

                      <button
                        onClick={() => openActionModal(item, 'resolve_member')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg cursor-pointer"
                      >
                        ✓ Lưu kết quả
                      </button>

                      <button
                        onClick={() => openActionModal(item, 'resolve_account')}
                        className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg cursor-pointer"
                      >
                        🔑 Xử lý Tài khoản
                      </button>

                      <button
                        onClick={() => openActionModal(item, 'provide_consultation')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg cursor-pointer"
                      >
                        💬 Tư vấn
                      </button>

                      <button
                        onClick={() => openActionModal(item, 'escalate')}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg cursor-pointer"
                      >
                        ⬆️ Chuyển QTTT
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}