import React, { useState, useEffect } from 'react';
import {
  getEnrollmentConsultations,
  getServiceSupportRequests,
  updateEnrollmentConsultation,
  escalateSupportRequest,
} from '../../api/receptionistSupportApi';

export default function ReceptionistPage() {
  const [activeTab, setActiveTab] = useState('enrollment'); // 'enrollment' | 'service'
  const [loading, setLoading] = useState(true);
  const [errorNotice, setErrorNotice] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Danh sách dữ liệu
  const [enrollments, setEnrollments] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);

  // Bộ lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal xử lý đơn
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalType, setModalType] = useState(''); // 'edit_enrollment' | 'escalate'
  const [actionNote, setActionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // State sửa đơn tư vấn
  const [enrollForm, setEnrollForm] = useState({
    title: '',
    fullName: '',
    phone: '',
    email: '',
    sports: '',
    age: '',
    note: '',
    resolutionNote: '',
  });

  // Tải dữ liệu từ API
  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorNotice('');
      const [enrollData, serviceData] = await Promise.all([
        getEnrollmentConsultations().catch(() => []),
        getServiceSupportRequests().catch(() => []),
      ]);
      setEnrollments(Array.isArray(enrollData) ? enrollData : []);
      setServiceRequests(Array.isArray(serviceData) ? serviceData : []);
    } catch (err) {
      setErrorNotice(err.message || 'Không thể tải danh sách đơn hỗ trợ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Thông báo tự tắt sau 3.5 giây
  const showNotice = (msg, isErr = false) => {
    if (isErr) setErrorNotice(msg);
    else setSuccessNotice(msg);
    setTimeout(() => {
      setErrorNotice('');
      setSuccessNotice('');
    }, 3500);
  };

  // Mở modal thao tác
  const openActionModal = (item, type) => {
    setSelectedItem(item);
    setModalType(type);
    setActionNote('');

    if (type === 'edit_enrollment') {
      setEnrollForm({
        title: item.title || '',
        fullName: item.memberName || item.fullName || '',
        phone: item.memberPhone || item.phone || '',
        email: item.memberEmail || item.email || '',
        sports: item.sports || '',
        age: item.age || '',
        note: item.description || item.note || '',
        resolutionNote: item.resolutionNote || '',
      });
    }
  };

  const closeModal = () => {
    setSelectedItem(null);
    setModalType('');
    setActionNote('');
  };

  // 1. Xử lý Cập nhật đơn tư vấn ghi danh
  const handleUpdateEnrollment = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      await updateEnrollmentConsultation(selectedItem.id, {
        ...enrollForm,
        age: enrollForm.age ? Number(enrollForm.age) : null,
      });
      showNotice('Cập nhật đơn tư vấn ghi danh thành công!');
      closeModal();
      fetchData();
    } catch (err) {
      showNotice(err.message, true);
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Chuyển cấp Quản trị Trung tâm
  const handleEscalate = async (e) => {
    e.preventDefault();
    if (!actionNote.trim()) return;
    setSubmitting(true);
    try {
      await escalateSupportRequest(selectedItem.id, actionNote.trim());
      showNotice('Đã chuyển đơn lên Quản trị trung tâm phê duyệt!');
      closeModal();
      fetchData();
    } catch (err) {
      showNotice(err.message, true);
    } finally {
      setSubmitting(false);
    }
  };

  // Lọc dữ liệu hiển thị
  const currentList = activeTab === 'enrollment' ? enrollments : serviceRequests;
  const filteredList = currentList.filter((item) => {
    const matchName =
      (item.memberName || item.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.memberEmail || item.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.title || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PENDING' && (item.status === 'PENDING' || !item.status)) ||
      item.status === statusFilter;

    return matchName && matchStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER TIÊU ĐỀ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <span className="inline-block bg-[#e31b23]/10 text-[#e31b23] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-1">
              PORTAL LỄ TÂN & CHĂM SÓC KHÁCH HÀNG
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase">
              QUẢN LÝ YÊU CẦU HỖ TRỢ & TƯ VẤN
            </h1>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer self-start sm:self-auto"
          >
            <span>🔄 Làm mới dữ liệu</span>
          </button>
        </div>

        {/* THÔNG BÁO ALERTS */}
        {errorNotice && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold animate-fadeIn">
            ⚠️ {errorNotice}
          </div>
        )}
        {successNotice && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold animate-fadeIn">
            ✓ {successNotice}
          </div>
        )}

        {/* CHUYỂN TAB VÀ BỘ LỌC TÌM KIẾM */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* NAVIGATION TABS */}
          <div className="flex gap-2 border-b md:border-b-0 pb-2 md:pb-0 border-slate-100">
            <button
              onClick={() => setActiveTab('enrollment')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'enrollment'
                  ? 'bg-[#e31b23] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              📞 Tư vấn ghi danh khách ({enrollments.length})
            </button>

            <button
              onClick={() => setActiveTab('service')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'service'
                  ? 'bg-[#e31b23] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              🎧 Hỗ trợ học viên ({serviceRequests.length})
            </button>
          </div>

          {/* SEARCH & STATUS FILTER */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              placeholder="Tìm theo tên, email, tiêu đề..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-[#e31b23]"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold outline-none focus:border-[#e31b23] cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Đang chờ xử lý</option>
              <option value="RESOLVED">Đã giải quyết</option>
              <option value="ESCALATED">Đã chuyển quản trị</option>
            </select>
          </div>
        </div>

        {/* DANH SÁCH BẢNG DỮ LIỆU */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-16 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#e31b23] border-t-transparent mb-2"></div>
              <p className="text-xs font-bold text-slate-400">Đang tải danh sách đơn...</p>
            </div>
          ) : filteredList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="p-4">Khách hàng / Học viên</th>
                    <th className="p-4">Tiêu đề / Môn học</th>
                    <th className="p-4">Nội dung yêu cầu</th>
                    <th className="p-4">Trạng thái</th>
                    <th className="p-4 text-right">Thao tác xử lý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* KHÁCH HÀNG */}
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

                      {/* TIÊU ĐỀ */}
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{item.title || 'Tư vấn ghi danh'}</div>
                        {item.sports && (
                          <span className="inline-block bg-red-50 text-[#e31b23] border border-red-100 text-[10px] font-bold px-2 py-0.5 rounded mt-1">
                            {item.sports}
                          </span>
                        )}
                        <div className="text-[10px] text-slate-400 mt-1">
                          {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : ''}
                        </div>
                      </td>

                      {/* NỘI DUNG YÊU CẦU */}
                      <td className="p-4 max-w-xs">
                        <p className="line-clamp-2 text-slate-600 italic">
                          "{item.description || item.note || 'Không có ghi chú'}"
                        </p>
                        {item.resolutionNote && (
                          <div className="mt-1 text-[11px] text-emerald-700 bg-emerald-50 p-1.5 rounded border border-emerald-100">
                            <strong>Ghi chú giải quyết:</strong> {item.resolutionNote}
                          </div>
                        )}
                      </td>

                      {/* TRẠNG THÁI */}
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                            item.status === 'RESOLVED' || item.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              : item.status === 'ESCALATED'
                              ? 'bg-amber-50 text-amber-600 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {item.status === 'RESOLVED' || item.status === 'APPROVED'
                            ? '✓ Đã hoàn tất'
                            : item.status === 'ESCALATED'
                            ? '⏳ Đã chuyển QTTT'
                            : '🔴 Đang chờ xử lý'}
                        </span>
                      </td>

                      {/* THAO TÁC */}
                      <td className="p-4 text-right whitespace-nowrap">
                        {activeTab === 'enrollment' ? (
                          <button
                            onClick={() => openActionModal(item, 'edit_enrollment')}
                            className="bg-slate-900 hover:bg-[#e31b23] text-white font-bold text-[11px] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            ✏️ Cập nhật & Giải quyết
                          </button>
                        ) : (
                          <button
                            onClick={() => openActionModal(item, 'escalate')}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            ⬆️ Chuyển QTTT
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className="text-xs font-bold text-slate-400">Không tìm thấy đơn hỗ trợ nào phù hợp.</p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL POPUPS THAO TÁC */}
      {/* ========================================================================= */}
      {selectedItem && modalType && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-fadeIn">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase">
                {modalType === 'edit_enrollment' ? 'CẬP NHẬT ĐƠN TƯ VẤN KHÁCH HÀNG' : 'CHUYỂN YÊU CẦU LÊN QUẢN TRỊ TRUNG TÂM'}
              </h3>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-700 font-bold text-base p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* FORM MODAL 1: EDIT ENROLLMENT */}
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
                  <label className="block font-bold text-slate-700 mb-1">Môn học đăng ký quan tâm</label>
                  <input
                    type="text"
                    value={enrollForm.sports}
                    onChange={(e) => setEnrollForm({ ...enrollForm, sports: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ghi chú giải quyết (Resolution Note)</label>
                  <textarea
                    rows={3}
                    placeholder="Nhập nội dung tư vấn/kết quả gọi điện cho khách..."
                    value={enrollForm.resolutionNote}
                    onChange={(e) => setEnrollForm({ ...enrollForm, resolutionNote: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#e31b23] hover:bg-[#c4131a] text-white font-black uppercase text-xs py-3 rounded-xl shadow cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'ĐANG LƯU...' : 'LƯU & ĐÁNH DẤU HOÀN TẤT'}
                </button>
              </form>
            )}

            {/* FORM MODAL 2: ESCALATE */}
            {modalType === 'escalate' && (
              <form onSubmit={handleEscalate} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lý do chuyển Quản trị *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Nhập rõ lý do vượt quá thẩm quyền của lễ tân..."
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !actionNote.trim()}
                  className="w-full bg-[#e31b23] hover:bg-[#c4131a] text-white font-black uppercase text-xs py-3 rounded-xl shadow cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'ĐANG GỬI...' : 'XÁC NHẬN CHUYỂN QTTT →'}
                </button>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}