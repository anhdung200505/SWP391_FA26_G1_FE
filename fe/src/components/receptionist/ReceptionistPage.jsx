import React, { useState, useEffect } from 'react';
import {
  getEnrollmentConsultations,
  getServiceSupportRequests,
  classifySupportRequest,
  resolveAccountIssue,
  provideConsultation,
  escalateSupportRequest,
  updateEnrollmentConsultation
} from '../api/receptionistSupportApi';

export default function ReceptionistSupportManagement() {
  const [enrollments, setEnrollments] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Lấy danh sách khi load trang
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [enrollData, serviceData] = await Promise.all([
          getEnrollmentConsultations().catch(() => []),
          getServiceSupportRequests().catch(() => []),
        ]);
        setEnrollments(enrollData);
        setServiceRequests(serviceData);
      } catch (err) {
        alert(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Ví dụ hàm Lễ tân xử lý Sự cố tài khoản
  const handleResolveAccount = async (requestId) => {
    const note = prompt('Nhập ghi chú giải quyết sự cố tài khoản gửi cho học viên:');
    if (!note) return;

    try {
      await resolveAccountIssue(requestId, note);
      alert('Đã giải quyết sự cố tài khoản và gửi email cho học viên thành công!');
      // Reload lại danh sách...
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <h1 className="text-xl font-bold mb-4">QUẢN LÝ YÊU CẦU HỖ TRỢ & TƯ VẤN (LỄ TÂN)</h1>
      {/* Render UI các Tab và Danh sách đơn ở đây */}
    </div>
  );
}