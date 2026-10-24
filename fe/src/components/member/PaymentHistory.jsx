import { useCallback, useEffect, useState } from 'react';
import { getMyPayments } from '../../api/managementApi';

const STATUS = {
  paid: { label: 'Đã thanh toán', className: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  pending: { label: 'Chờ thanh toán', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  expired: { label: 'Hết hạn thanh toán', className: 'bg-slate-100 text-slate-500 border-slate-200' },
  failed: { label: 'Thất bại', className: 'bg-red-50 text-red-600 border-red-200' },
  refunded: { label: 'Đã hoàn tiền', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  cancel: { label: 'Đã hủy', className: 'bg-slate-100 text-slate-500 border-slate-200' },
};

const KIND = {
  class: { label: 'Khóa học', className: 'bg-red-50 text-[#e31b23] border-red-100' },
  membership: { label: 'Gói hội viên', className: 'bg-amber-50 text-amber-700 border-amber-100' },
};

const METHOD = { chuyen_khoan: 'Chuyển khoản', payos: 'PayOS', tien_mat: 'Tiền mặt' };

const formatDateTime = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '—');

// Lịch sử thanh toán của học viên: đăng ký khóa học, mua, gia hạn, nâng hạng gói hội viên.
export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    return getMyPayments()
      .then((data) => {
        setPayments(Array.isArray(data) ? data : []);
        setError('');
      })
      .catch((err) => setError(err.message || 'Không tải được lịch sử thanh toán.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Có đơn đang chờ thanh toán thì hẹn tải lại đúng lúc đơn gần nhất hết 3 phút, để trạng thái tự đổi sang Hết hạn mà không cần F5.
  useEffect(() => {
    const waits = payments.filter((item) => item.status === 'pending' && item.secondsLeft > 0).map((item) => item.secondsLeft);
    if (waits.length === 0) return undefined;
    const timer = setTimeout(load, (Math.min(...waits) + 1) * 1000);
    return () => clearTimeout(timer);
  }, [payments, load]);

  return (
    <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
      <div className="pb-4 mb-6 border-b border-slate-100">
        <h2 className="text-lg font-black text-slate-900 uppercase">LỊCH SỬ THANH TOÁN</h2>
        <p className="text-xs text-slate-400 font-medium mt-0.5">Mua khóa học, mua, gia hạn và nâng hạng gói hội viên</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold">⚠️ {error}</div>}

      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#e31b23] border-t-transparent mb-2" />
          <p className="text-xs font-bold text-slate-400">Đang tải lịch sử thanh toán...</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400 font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          Bạn chưa có giao dịch thanh toán nào.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="p-3">Nội dung</th>
                <th className="p-3">Hóa đơn</th>
                <th className="p-3">Ngày lập</th>
                <th className="p-3">Phương thức</th>
                <th className="p-3 text-right">Số tiền</th>
                <th className="p-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {payments.map((item) => {
                const status = STATUS[item.status] || { label: item.status, className: 'bg-slate-100 text-slate-500 border-slate-200' };
                const kind = KIND[item.kind] || KIND.membership;
                return (
                  <tr key={item.id}>
                    <td className="p-3 min-w-[200px]">
                      <p className="font-bold text-slate-900">{item.title}</p>
                      <span className={`inline-block mt-1 border text-[10px] font-bold px-2 py-0.5 rounded ${kind.className}`}>{kind.label}</span>
                    </td>
                    <td className="p-3 font-mono text-slate-500">#{item.invoiceCode}</td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">
                      {formatDateTime(item.createdAt)}
                      {item.paidAt && <span className="block text-[10px] text-slate-400">Trả lúc {formatDateTime(item.paidAt)}</span>}
                    </td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{METHOD[item.paymentMethod] || item.paymentMethod}</td>
                    <td className="p-3 text-right font-bold text-emerald-600 whitespace-nowrap">{item.amount?.toLocaleString('vi-VN')}đ</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${status.className}`}>{status.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
