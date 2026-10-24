import React from 'react';

export default function ReceptionistModals({
  selectedItem,
  modalType,
  closeModal,
  enrollForm,
  setEnrollForm,
  handleUpdateEnrollment,
  selectedCategory,
  setSelectedCategory,
  handleClassify,
  actionNote,
  setActionNote,
  handleResolveMember,
  handleResolveAccount,
  handleProvideConsultation,
  handleEscalate,
  submitting,
}) {
  if (!selectedItem || !modalType) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-fadeIn">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-900 uppercase">
            {modalType === 'edit_enrollment' && 'CẬP NHẬT ĐƠN TƯ VẤN KHÁCH HÀNG'}
            {modalType === 'classify' && 'PHÂN LOẠI YÊU CẦU HỌC VIÊN'}
            {modalType === 'resolve_member' && 'LƯU KẾT QUẢ XỬ LÝ ĐƠN HỖ TRỢ'}
            {modalType === 'resolve_account' && 'XỬ LÝ SỰ CỐ TÀI KHOẢN & GỬI EMAIL'}
            {modalType === 'provide_consultation' && 'CUNG CẤP TƯ VẤN & GỬI EMAIL'}
            {modalType === 'escalate' && 'CHUYỂN ĐƠN LÊN QUẢN TRỊ TRUNG TÂM'}
            {modalType === 'view_result' && 'KẾT QUẢ XỬ LÝ ĐƠN'}
          </h3>
          <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 font-bold text-base p-1 cursor-pointer">
            ✕
          </button>
        </div>

        {/* 1. EDIT ENROLLMENT CONSULTATION */}
        {modalType === 'edit_enrollment' && (
          <form onSubmit={handleUpdateEnrollment} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Họ tên khách hàng</label>
              <input
                type="text"
                value={enrollForm.fullName}
                onChange={(e) => setEnrollForm({ ...enrollForm, fullName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Số điện thoại</label>
                <input
                  type="text"
                  value={enrollForm.phone}
                  onChange={(e) => setEnrollForm({ ...enrollForm, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={enrollForm.email}
                  onChange={(e) => setEnrollForm({ ...enrollForm, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Môn học quan tâm</label>
              <input
                type="text"
                value={enrollForm.sports}
                onChange={(e) => setEnrollForm({ ...enrollForm, sports: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Ghi chú kết quả tư vấn *</label>
              <textarea
                rows={3}
                required
                placeholder="Nhập nội dung đã tư vấn cho khách hàng..."
                value={enrollForm.resolutionNote}
                onChange={(e) => setEnrollForm({ ...enrollForm, resolutionNote: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !enrollForm.resolutionNote.trim()}
              className="w-full bg-[#e31b23] hover:bg-[#c4131a] text-white font-black uppercase text-xs py-3 rounded-xl shadow cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'ĐANG LƯU...' : 'LƯU & ĐÁNH DẤU HOÀN TẤT'}
            </button>
          </form>
        )}

        {/* 2. CLASSIFY SUPPORT REQUEST */}
        {modalType === 'classify' && (
          <form onSubmit={handleClassify} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Danh mục phân loại *</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none font-bold text-slate-800"
              >
                <option value="account_issue">account_issue (Sự cố tài khoản)</option>
                <option value="consultation">consultation (Cần tư vấn hỗ trợ)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-slate-900 hover:bg-[#e31b23] text-white font-black uppercase text-xs py-3 rounded-xl cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'ĐANG LƯU...' : 'XÁC NHẬN PHÂN LOẠI'}
            </button>
          </form>
        )}

        {/* 3. RESOLVE MEMBER SUPPORT */}
        {modalType === 'resolve_member' && (
          <form onSubmit={handleResolveMember} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Ghi chú kết quả xử lý *</label>
              <textarea
                rows={4}
                required
                placeholder="Lưu kết quả giải quyết đơn..."
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !actionNote.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs py-3 rounded-xl shadow cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'ĐANG LƯU...' : 'LƯU KẾT QUẢ'}
            </button>
          </form>
        )}

        {/* 4. RESOLVE ACCOUNT ISSUE */}
        {modalType === 'resolve_account' && (
          <form onSubmit={handleResolveAccount} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Ghi chú giải quyết tài khoản *</label>
              <textarea
                rows={4}
                required
                placeholder="Nội dung xử lý tài khoản (Sẽ tự động gửi Email cho học viên)..."
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !actionNote.trim()}
              className="w-full bg-sky-600 hover:bg-sky-700 text-white font-black uppercase text-xs py-3 rounded-xl shadow cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'ĐANG XỬ LÝ...' : 'XỬ LÝ & GỬI EMAIL THÔNG BÁO'}
            </button>
          </form>
        )}

        {/* 5. PROVIDE CONSULTATION */}
        {modalType === 'provide_consultation' && (
          <form onSubmit={handleProvideConsultation} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nội dung tư vấn *</label>
              <textarea
                rows={4}
                required
                placeholder="Nội dung giải đáp tư vấn (Sẽ tự động gửi Email cho học viên)..."
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !actionNote.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-xs py-3 rounded-xl shadow cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'ĐANG GỬI...' : 'GỬI TƯ VẤN & EMAIL THÔNG BÁO'}
            </button>
          </form>
        )}

        {/* 6. ESCALATE TO ADMIN */}
        {modalType === 'escalate' && (
          <form onSubmit={handleEscalate} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Lý do vượt thẩm quyền lễ tân *</label>
              <textarea
                rows={4}
                required
                placeholder="Nhập rõ lý do chuyển lên Quản trị trung tâm..."
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !actionNote.trim()}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black uppercase text-xs py-3 rounded-xl shadow cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'ĐANG GỬI...' : 'XÁC NHẬN CHUYỂN QUẢN TRỊ'}
            </button>
          </form>
        )}

        {/* 7. VIEW RESULT */}
        {modalType === 'view_result' && (
          <div className="space-y-3 text-xs">
            <div>
              <span className="font-bold text-slate-400 block text-[10px]">Tiêu đề đơn:</span>
              <p className="font-extrabold text-slate-900">{selectedItem.title}</p>
            </div>
            <div>
              <span className="font-bold text-slate-400 block text-[10px]">Thời gian xử lý:</span>
              <p className="font-semibold text-slate-700">
                {selectedItem.resolvedAt ? new Date(selectedItem.resolvedAt).toLocaleString('vi-VN') : 'N/A'}
              </p>
            </div>
            <div>
              <span className="font-bold text-slate-400 block text-[10px]">Ghi chú kết quả (Resolution Note):</span>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mt-1 whitespace-pre-line text-slate-800 font-medium">
                {selectedItem.resolutionNote || 'Không có nội dung ghi chú.'}
              </div>
            </div>
            <button
              type="button"
              onClick={closeModal}
              className="w-full bg-slate-900 text-white font-black uppercase text-xs py-3 rounded-xl cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
}