import { useCallback, useEffect, useState } from 'react';
import { getMyPayments } from '../../api/managementApi';
import { onDataChanged } from '../../api/dataChanged';
import { cardClass, cardHeadClass, sectionTitle, sectionSub, emptyBox, spinnerClass } from './memberUi';

const POLL_MS = 5000;

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
    const stop = onDataChanged(load);
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  // Đơn đang chờ thì hỏi lại vài giây một lần, và đúng lúc hết hạn 3 phút, để trạng thái đổi mà không cần F5.
  useEffect(() => {
    const pending = payments.filter((item) => item.status === 'pending');
    if (pending.length === 0) return undefined;
    const waits = pending.filter((item) => item.secondsLeft > 0).map((item) => item.secondsLeft);
    const expireTimer = waits.length > 0 ? setTimeout(load, (Math.min(...waits) + 1) * 1000) : undefined;
    const pollTimer = setInterval(load, POLL_MS);
    return () => {
      clearInterval(pollTimer);
      if (expireTimer) clearTimeout(expireTimer);
    };
  }, [payments, load]);

  return (
    <section className={cardClass}>
      <div className={cardHeadClass}>
        <h2 className={sectionTitle}>Lịch sử thanh toán</h2>
        <p className={sectionSub}>Mua khóa học, mua, gia hạn và nâng hạng gói hội viên</p>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}

      {loading ? (
        <div className="py-12 text-center">
          <div className={`${spinnerClass} mb-2`} />
          <p className="text-sm font-bold text-slate-500">Đang tải lịch sử thanh toán...</p>
        </div>
      ) : payments.length === 0 ? (
        <div className={emptyBox}>Bạn chưa có giao dịch thanh toán nào.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-xs">
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
                      <span className={`inline-block mt-1 border text-xs font-bold px-2 py-0.5 rounded ${kind.className}`}>{kind.label}</span>
                    </td>
                    <td className="p-3 font-mono text-slate-500">#{item.invoiceCode}</td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">
                      {formatDateTime(item.createdAt)}
                      {item.paidAt && <span className="block text-xs text-slate-500">Trả lúc {formatDateTime(item.paidAt)}</span>}
                    </td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{METHOD[item.paymentMethod] || item.paymentMethod}</td>
                    <td className="p-3 text-right font-bold text-emerald-600 whitespace-nowrap">{item.amount?.toLocaleString('vi-VN')}đ</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border whitespace-nowrap ${status.className}`}>{status.label}</span>
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
