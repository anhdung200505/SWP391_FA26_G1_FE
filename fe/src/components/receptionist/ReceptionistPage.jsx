import React, { useState, useEffect } from 'react';
import {
  getEnrollmentConsultations,
  getServiceSupportRequests,
  updateEnrollmentConsultation,
  classifySupportRequest,
  resolveMemberSupport,
  resolveAccountIssue,
  provideConsultation,
  escalateSupportRequest,
  escalateEnrollmentConsultation,
} from '../../api/receptionistSupportApi';
import ReceptionistTable from './ReceptionistTable';
import ReceptionistModals from './ReceptionistModals';

function readEnrollmentLine(description, prefix) {
  const line = String(description || '')
    .split(/\r?\n/)
    .find((row) => row.startsWith(prefix));
  return line ? line.slice(prefix.length).trim() : '';
}

function enrollmentFormFrom(item) {
  const description = item.description || '';
  const ageText = readEnrollmentLine(description, 'Độ tuổi:');
  const sports = readEnrollmentLine(description, 'Môn:');
  return {
    title: item.title || 'Tư vấn ghi danh',
    fullName: readEnrollmentLine(description, 'Họ tên:') || item.memberName || '',
    phone: readEnrollmentLine(description, 'Số điện thoại:') || item.memberPhone || '',
    email: readEnrollmentLine(description, 'Email:') || item.memberEmail || '',
    sports: sports === 'Chưa chọn' ? '' : sports,
    age: /^\d+$/.test(ageText) ? ageText : '',
    note: readEnrollmentLine(description, 'Gói quan tâm:'),
    resolutionNote: item.resolutionNote || '',
  };
}

export default function ReceptionistPage() {
  const [activeTab, setActiveTab] = useState('enrollment');
  const [loading, setLoading] = useState(true);
  const [errorNotice, setErrorNotice] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  const [enrollments, setEnrollments] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [selectedItem, setSelectedItem] = useState(null);
  const [modalType, setModalType] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('consultation');
  const [submitting, setSubmitting] = useState(false);

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

  const showNotice = (msg, isErr = false) => {
    if (isErr) setErrorNotice(msg);
    else setSuccessNotice(msg);
    setTimeout(() => {
      setErrorNotice('');
      setSuccessNotice('');
    }, 3500);
  };

  const openActionModal = (item, type) => {
    setSelectedItem(item);
    setModalType(type);
    setActionNote('');
    setSelectedCategory('consultation');

    if (type === 'edit_enrollment') {
      setEnrollForm(enrollmentFormFrom(item));
    }
  };

  const closeModal = () => {
    setSelectedItem(null);
    setModalType('');
    setActionNote('');
  };

  const handleUpdateEnrollment = async (e) => {
    e.preventDefault();
    if (!selectedItem || !enrollForm.resolutionNote.trim()) return;
    setSubmitting(true);
    try {
      await updateEnrollmentConsultation(selectedItem.id, {
        ...enrollForm,
        age: enrollForm.age ? Number(enrollForm.age) : null,
      });
      showNotice('Cập nhật đơn tư vấn thành công!');
      closeModal();
      fetchData();
    } catch (err) {
      showNotice(err.message, true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClassify = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      await classifySupportRequest(selectedItem.id, selectedCategory);
      showNotice('Phân loại đơn thành công!');
      closeModal();
      fetchData();
    } catch (err) {
      showNotice(err.message, true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveMember = async (e) => {
    e.preventDefault();
    if (!selectedItem || !actionNote.trim()) return;
    setSubmitting(true);
    try {
      await resolveMemberSupport(selectedItem.id, actionNote.trim());
      showNotice('Lưu kết quả xử lý thành công!');
      closeModal();
      fetchData();
    } catch (err) {
      showNotice(err.message, true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveAccount = async (e) => {
    e.preventDefault();
    if (!selectedItem || !actionNote.trim()) return;
    setSubmitting(true);
    try {
      await resolveAccountIssue(selectedItem.id, actionNote.trim());
      showNotice('Đã xử lý sự cố tài khoản và gửi email thông báo!');
      closeModal();
      fetchData();
    } catch (err) {
      showNotice(err.message, true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleProvideConsultation = async (e) => {
    e.preventDefault();
    if (!selectedItem || !actionNote.trim()) return;
    setSubmitting(true);
    try {
      await provideConsultation(selectedItem.id, actionNote.trim());
      showNotice('Đã lưu nội dung tư vấn và gửi email cho học viên!');
      closeModal();
      fetchData();
    } catch (err) {
      showNotice(err.message, true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEscalate = async (e) => {
    e.preventDefault();
    if (!selectedItem || !actionNote.trim()) return;
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

  const handleEscalateEnrollment = async (e) => {
    e.preventDefault();
    if (!selectedItem || !actionNote.trim()) return;
    setSubmitting(true);
    try {
      await escalateEnrollmentConsultation(selectedItem.id, actionNote.trim());
      showNotice('Đã chuyển đơn tư vấn ghi danh lên quản lý trung tâm.');
      closeModal();
      fetchData();
    } catch (err) {
      showNotice(err.message, true);
    } finally {
      setSubmitting(false);
    }
  };

  const currentList = activeTab === 'enrollment' ? enrollments : serviceRequests;
  const filteredList = currentList.filter((item) => {
    const matchName =
      (item.memberName || item.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.memberEmail || item.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.title || '').toLowerCase().includes(searchTerm.toLowerCase());

    const isResolved = item.status === 'resolved' || item.status === 'RESOLVED';
    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'RESOLVED' && isResolved) ||
      (statusFilter === 'PENDING' && !isResolved);

    return matchName && matchStatus;
  });

  return (
    <div className="space-y-6 text-slate-800">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-black text-balance text-slate-900 sm:text-2xl">
              Hỗ trợ và tư vấn
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

        {/* ALERTS */}
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

        {/* TABS & BỘ LỌC TÌM KIẾM */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-2 border-b md:border-b-0 pb-2 md:pb-0 border-slate-100">
            <button
              type="button"
              onClick={() => setActiveTab('enrollment')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold tabular-nums ${
                activeTab === 'enrollment'
                  ? 'bg-[#12141d] text-white'
                  : 'border border-gray-200 bg-white text-gray-700'
              }`}
            >
              Tư vấn tuyển sinh ({enrollments.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('service')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold tabular-nums ${
                activeTab === 'service'
                  ? 'bg-[#12141d] text-white'
                  : 'border border-gray-200 bg-white text-gray-700'
              }`}
            >
              Hỗ trợ học viên ({serviceRequests.length})
            </button>
          </div>

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
              <option value="PENDING">Chờ xử lý</option>
              <option value="RESOLVED">Đã giải quyết</option>
            </select>
          </div>
        </div>

        {/* BẢNG DỮ LIỆU HIỂN THỊ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <ReceptionistTable
            loading={loading}
            filteredList={filteredList}
            activeTab={activeTab}
            openActionModal={openActionModal}
          />
        </div>

      {/* POPUP MODAL THAO TÁC */}
      <ReceptionistModals
        selectedItem={selectedItem}
        modalType={modalType}
        closeModal={closeModal}
        enrollForm={enrollForm}
        setEnrollForm={setEnrollForm}
        handleUpdateEnrollment={handleUpdateEnrollment}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        handleClassify={handleClassify}
        actionNote={actionNote}
        setActionNote={setActionNote}
        handleResolveMember={handleResolveMember}
        handleResolveAccount={handleResolveAccount}
        handleProvideConsultation={handleProvideConsultation}
        handleEscalate={handleEscalate}
        handleEscalateEnrollment={handleEscalateEnrollment}
        submitting={submitting}
      />
    </div>
  );
}