import React, { useState } from 'react';
import {
  handleSupportRequest,
  updateEnrollmentConsultation,
  readSupportRequestType,
} from '../../api/receptionistSupportApi';

// Hàm parse lấy số tuổi từ chuỗi description (nếu item.age rỗng hoặc bằng 0)
function parseAgeFromDescription(description, defaultAge = 18) {
  if (!description) return defaultAge;
  const match = String(description).match(/Độ tuổi:\s*(\d+)/i);
  if (match && match[1]) {
    const parsed = parseInt(match[1], 10);
    if (parsed >= 1 && parsed <= 99) return parsed;
  }
  return defaultAge;
}

export default function ReceptionistTable({ loading, filteredList, activeTab, onRefresh }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalType, setModalType] = useState(''); // 'handle_service' | 'handle_enrollment' | 'view'
  const [action, setAction] = useState('resolve'); // 'resolve' | 'escalate'
  const [category, setCategory] = useState('account_issue');
  const [note, setNote] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const openModal = (item, type, defaultAction = 'resolve') => {
    setSelectedItem(item);
    setModalType(type);
    setAction(defaultAction);
    setCategory('account_issue');
    setNote('');
    setResolutionNote(item.resolutionNote || '');
    setErrorMsg('');
  };

  const closeModal = () => {
    setSelectedItem(null);
    setModalType('');
  };

  // Xử lý submit đơn của học viên (API /handle)
  const handleSubmitService = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    if (!note.trim() || note.trim().length < 5) {
      setErrorMsg('Vui lòng nhập ghi chú kết quả xử lý rõ ràng (tối thiểu 5 ký tự).');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      await handleSupportRequest(selectedItem.id, {
        action,
        note: note.trim(),
        category: action === 'escalate' ? undefined : category,
      });

      selectedItem.status = action === 'escalate' ? 'pending_manager' : 'resolved';
      selectedItem.resolutionNote = note.trim();

      closeModal();
      if (onRefresh) await onRefresh();
    } catch (err) {
      setErrorMsg(err.message || 'Xử lý thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  // Xử lý giải quyết đơn tư vấn ghi danh
  const handleSubmitEnrollment = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    if (!resolutionNote.trim() || resolutionNote.trim().length < 5) {
      setErrorMsg('Vui lòng nhập nội dung tư vấn đầy đủ và rõ ràng (tối thiểu 5 ký tự).');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      // Lấy tuổi chuẩn trong khoảng 1-99 để không bị API chặn Validation
      const rawDescription = selectedItem.description || selectedItem.note || '';
      let validAge = Number(selectedItem.age);
      if (!validAge || validAge < 1 || validAge > 99) {
        validAge = parseAgeFromDescription(rawDescription, 18);
      }

      await updateEnrollmentConsultation(selectedItem.id, {
        title: selectedItem.title || 'Đăng ký tham quan cơ sở vật chất',
        fullName: selectedItem.memberName || selectedItem.fullName || 'Khách hàng',
        phone: selectedItem.phone || selectedItem.memberPhone || '',
        email: selectedItem.memberEmail || selectedItem.email || '',
        sports: selectedItem.sports || 'Tham quan cơ sở vật chất',
        age: validAge,
        note: rawDescription,
        resolutionNote: resolutionNote.trim(),
      });

      selectedItem.status = 'resolved';
      selectedItem.resolutionNote = resolutionNote.trim();

      closeModal();
      if (onRefresh) await onRefresh();
    } catch (err) {
      setErrorMsg(err.message || 'Cập nhật thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#e31b23] border-t-transparent mb-2"></div>
        <p className="text-xs font-bold text-slate-400">Đang tải danh sách đơn...</p>
      </div>
    );
  }

  if (!filteredList || filteredList.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-xs font-bold text-slate-400">Không tìm thấy đơn nào phù hợp.</p>
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
            <th className="p-4 min-w-[280px]">Nội dung yêu cầu</th>
            <th className="p-4">Trạng thái</th>
            <th className="p-4 text-right">Thao tác xử lý</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
          {filteredList.map((item) => {
            const isResolved = item.status === 'resolved' || item.status === 'RESOLVED';
            const isEscalated = item.status === 'pending_manager' || item.status === 'escalated';
            const requestType = readSupportRequestType(item.classificationReason);
            const content = item.description || item.note || 'Không có nội dung';

            return (
              <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="p-4 align-top">
                  <div className="font-bold text-slate-900">
                    {item.memberName || item.fullName || 'Khách hàng'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {item.memberEmail || item.email || 'N/A'}
                  </div>
                  {(item.phone || item.memberPhone) && (
                    <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
                      📞 {item.phone || item.memberPhone}
                    </div>
                  )}
                </td>

                <td className="p-4 align-top">
                  <div className="font-bold text-slate-800">{item.title || 'Yêu cầu hỗ trợ'}</div>
                  {requestType && (
                    <span className="inline-block bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-bold px-2 py-0.5 rounded mt-1">
                      Loại: {requestType}
                    </span>
                  )}
                  {item.receptionistCategory && (
                    <span className="inline-block bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded mt-1 ml-1">
                      {item.receptionistCategory}
                    </span>
                  )}
                  <div className="text-[10px] text-slate-400 mt-1">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : ''}
                  </div>
                </td>

                <td className="p-4 align-top">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 text-slate-700 font-medium text-xs whitespace-pre-line leading-relaxed break-words">
                    {content}
                  </div>
                  {item.resolutionNote && (
                    <div className="mt-1.5 text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-100 whitespace-pre-line leading-relaxed">
                      <strong>Kết quả tư vấn:</strong> {item.resolutionNote}
                    </div>
                  )}
                </td>

                <td className="p-4 align-top">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                      isResolved
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : isEscalated
                        ? 'bg-sky-50 text-sky-700 border-sky-200'
                        : 'bg-amber-50 text-amber-600 border-amber-200'
                    }`}
                  >
                    {isResolved ? '✓ Đã xử lý' : isEscalated ? '↑ Đã chuyển quản lý' : '⏳ Chờ xử lý'}
                  </span>
                </td>

                <td className="p-4 text-right whitespace-nowrap align-top">
                  {isResolved || isEscalated ? (
                    <button
                      onClick={() => openModal(item, 'view')}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] px-3 py-1.5 rounded-lg cursor-pointer"
                    >
                      Xem kết quả
                    </button>
                  ) : activeTab === 'enrollment' ? (
                    <div className="flex justify-end">
                      <button
                        onClick={() => openModal(item, 'handle_enrollment')}
                        className="bg-slate-900 hover:bg-[#e31b23] text-white font-bold text-[11px] px-3 py-1.5 rounded-lg cursor-pointer"
                      >
                        ✓ Giải quyết tư vấn
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => openModal(item, 'handle_service', 'resolve')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer"
                      >
                        ✓ Giải quyết
                      </button>
                      <button
                        onClick={() => openModal(item, 'handle_service', 'escalate')}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer"
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

      {/* MODAL THAO TÁC */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 border-b pb-2">
              {modalType === 'view' && '📌 Chi tiết yêu cầu'}
              {modalType === 'handle_service' && 'Xử lý đơn hỗ trợ học viên'}
              {modalType === 'handle_enrollment' && 'Giải quyết đơn tư vấn ghi danh'}
            </h3>

            <div className="text-xs space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <p><strong>Khách / Học viên:</strong> {selectedItem.memberName || selectedItem.fullName || 'Khách hàng'}</p>
              <p><strong>Email / SĐT:</strong> {selectedItem.memberEmail || selectedItem.email || 'N/A'} | {selectedItem.phone || selectedItem.memberPhone || 'N/A'}</p>
              <p><strong>Tiêu đề:</strong> {selectedItem.title}</p>
              <div className="bg-white p-2 rounded border border-slate-200 text-slate-700 font-medium whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
                {selectedItem.description || selectedItem.note || 'Không có nội dung'}
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold">
                ⚠️ {errorMsg}
              </div>
            )}

            {modalType === 'handle_service' && (
              <form onSubmit={handleSubmitService} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Hành động
                  </label>
                  <select
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-semibold"
                  >
                    <option value="resolve">✓ Giải quyết (Lưu kết quả)</option>
                    <option value="escalate">⬆️ Chuyển lên Quản trị trung tâm</option>
                  </select>
                </div>

                {action !== 'escalate' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Danh mục hỗ trợ
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-semibold"
                    >
                      <option value="account_issue">Sự cố tài khoản (account_issue)</option>
                      <option value="consultation">Tư vấn thông tin (consultation)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    {action === 'escalate' ? 'Lý do chuyển cấp' : 'Ghi chú kết quả xử lý'}
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Nhập nội dung phản hồi hoặc lý do cụ thể..."
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-medium"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={closeModal} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs">
                    Hủy
                  </button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#e31b23] text-white font-bold rounded-lg text-xs">
                    {submitting ? 'Đang gửi...' : 'Xác nhận xử lý'}
                  </button>
                </div>
              </form>
            )}

            {modalType === 'handle_enrollment' && (
              <form onSubmit={handleSubmitEnrollment} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    KẾT QUẢ TƯ VẤN <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="Nhập chi tiết nội dung đã gọi điện tư vấn cho khách hàng..."
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-medium"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={closeModal} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs">
                    Hủy
                  </button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#e31b23] text-white font-bold rounded-lg text-xs">
                    {submitting ? 'Đang lưu...' : 'Lưu dữ liệu'}
                  </button>
                </div>
              </form>
            )}

            {modalType === 'view' && (
              <div className="pt-2 text-right">
                <button type="button" onClick={closeModal} className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg text-xs">
                  Đóng
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}