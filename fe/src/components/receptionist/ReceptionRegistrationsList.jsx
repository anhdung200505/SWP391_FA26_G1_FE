import React, { useState, useEffect } from 'react';
import { getReceptionRegistrations } from '../../api/receptionClassRegistrationApi';

const PAYMENT_STATUS = {
  pending: { label: 'Chờ thanh toán', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  paid: { label: 'Đã thanh toán', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  failed: { label: 'Thất bại', className: 'bg-red-50 text-red-600 border-red-200' },
  cancel: { label: 'Đã hủy', className: 'bg-slate-100 text-slate-500 border-slate-200' },
  expired: { label: 'Hết hạn', className: 'bg-slate-100 text-slate-500 border-slate-200' },
  refunded: { label: 'Đã hoàn tiền', className: 'bg-blue-50 text-blue-700 border-blue-200' },
};

const METHOD = {
  payos: 'PayOS',
  chuyen_khoan: 'Chuyển khoản',
  tien_mat: 'Tiền mặt',
  cash: 'Tiền mặt',
  transfer: 'Chuyển khoản',
  card: 'Thẻ',
};

function enrollmentBadge(item) {
  const enrollment = item.enrollmentStatus;
  const payment = item.payment?.status;
  if (enrollment === 'enrolled' || enrollment === 'completed') {
    return { label: 'Đã ghi danh', className: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
  }
  if (enrollment === 'cancelled') {
    return { label: 'Đã ra khỏi lớp', className: 'bg-slate-100 text-slate-500 border-slate-200' };
  }
  if (payment === 'pending') {
    return { label: 'Chờ thanh toán', className: 'bg-amber-50 text-amber-700 border-amber-200' };
  }
  if (payment === 'paid') {
    return { label: 'Đã thanh toán, chưa vào lớp', className: 'bg-amber-50 text-amber-700 border-amber-200' };
  }
  return { label: 'Chưa ghi danh', className: 'bg-slate-100 text-slate-500 border-slate-200' };
}

export default function ReceptionRegistrationsList() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Bộ lọc
  const [scope, setScope] = useState('mine'); // 'mine' | 'all'
  const [search, setSearch] = useState('');
  const [sportId, setSportId] = useState('');
  const [classId, setClassId] = useState('');

  const fetchRegistrations = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        scope,
        ...(search ? { search: search.trim() } : {}),
        ...(sportId ? { sportId: sportId.trim() } : {}),
        ...(classId ? { classId: classId.trim() } : {}),
      };
      const data = await getReceptionRegistrations(params);
      setRegistrations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách đăng ký lớp.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [scope]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRegistrations();
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* CỤM TÌM KIẾM VÀ LỌC */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* SCOPE LỌC */}
        <div className="flex gap-2">
          <button
            onClick={() => setScope('mine')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              scope === 'mine' ? 'bg-[#e31b23] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            👤 Tôi đã đăng ký (scope=mine)
          </button>
          <button
            onClick={() => setScope('all')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              scope === 'all' ? 'bg-[#e31b23] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🌐 Tất cả học viên (scope=all)
          </button>
        </div>

        {/* TÌM KIẾM */}
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Tìm tên, email, SĐT, mã HĐ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-[#e31b23] w-full sm:w-56"
          />
          <input
            type="text"
            placeholder="Sport ID..."
            value={sportId}
            onChange={(e) => setSportId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-[#e31b23] w-28"
          />
          <input
            type="text"
            placeholder="Class ID..."
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-[#e31b23] w-28"
          />
          <button
            type="submit"
            className="bg-slate-900 hover:bg-[#e31b23] text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
          >
            Lọc
          </button>
        </form>
      </div>

      {/* HIỂN THỊ LỖI */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold">
          ⚠️ {error}
        </div>
      )}

      {/* BẢNG DANH SÁCH HỌC VIÊN ĐĂNG KÝ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#e31b23] border-t-transparent mb-2"></div>
            <p className="text-xs font-bold text-slate-400">Đang tải danh sách học viên đăng ký lớp...</p>
          </div>
        ) : registrations.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-xs font-bold text-slate-400">Không tìm thấy bản ghi đăng ký lớp nào.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="p-4">Học viên</th>
                  <th className="p-4">Lớp học / Môn</th>
                  <th className="p-4">Đơn thanh toán</th>
                  <th className="p-4">Đăng ký bởi</th>
                  <th className="p-4">Xếp lớp bởi</th>
                  <th className="p-4 text-right">Trạng thái ghi danh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {registrations.map((item, idx) => {
                  const badge = enrollmentBadge(item);
                  return (
                  <tr key={item.payment?.paymentId || idx} className="hover:bg-slate-50/80 transition-colors">
                    {/* HỌC VIÊN */}
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{item.member?.fullName}</div>
                      <div className="text-[11px] text-slate-400">{item.member?.email}</div>
                      <div className="text-[11px] font-semibold text-slate-600">📞 {item.member?.phone}</div>
                    </td>

                    {/* LỚP HỌC */}
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{item.class?.name || 'Chưa tên'}</div>
                      <div className="text-[10px] text-slate-500">
                        {item.class?.sportName} • {item.class?.courseName}
                      </div>
                      <div className="text-[10px] text-slate-400">HLV: {item.class?.coachName || 'N/A'}</div>
                    </td>

                    {/* ĐƠN THANH TOÁN */}
                    <td className="p-4">
                      <div className="font-mono font-bold text-slate-900">{item.payment?.invoiceCode}</div>
                      <div className="font-bold text-slate-800">
                        {item.payment?.amount?.toLocaleString('vi-VN')} VNĐ
                      </div>
                      <span className={`mt-1 inline-block border text-[9px] px-1.5 py-0.5 rounded font-bold ${PAYMENT_STATUS[item.payment?.status]?.className || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {PAYMENT_STATUS[item.payment?.status]?.label || item.payment?.status || 'Chưa có đơn'}
                      </span>
                      {item.payment?.method && (
                        <div className="mt-1 text-[10px] text-slate-400">
                          {METHOD[item.payment.method] || item.payment.method}
                        </div>
                      )}
                    </td>

                    {/* ĐĂNG KÝ BỞI */}
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{item.registeredBy?.fullName || 'Tự đăng ký'}</div>
                      <div className="text-[10px] text-slate-400">{item.registeredBy?.role || 'SYSTEM'}</div>
                    </td>

                    {/* XẾP LỚP BỞI */}
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{item.classAssignedBy?.label || item.classAssignedBy?.source}</div>
                      <div className="text-[10px] text-slate-400">{item.classAssignedBy?.fullName || 'Hệ thống tự động'}</div>
                    </td>

                    {/* TRẠNG THÁI GHI DANH */}
                    <td className="p-4 text-right">
                      <span className={`inline-block border text-[10px] font-black px-2.5 py-1 rounded-full ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}