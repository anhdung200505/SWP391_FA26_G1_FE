import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import { getPayment } from '../api/paymentApi';

function formatVnd(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const orderCode = params.get('orderCode') || '';
  const gatewayStatus = params.get('status') || '';
  const cancelled = params.get('cancel') === 'true';
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Kết quả thanh toán - AnhDuy Sport';
    if (!orderCode) return;
    let ignore = false;
    getPayment(orderCode)
      .then((item) => {
        if (!ignore) setPayment(item);
      })
      .catch((loadError) => {
        if (!ignore) setError(loadError.message);
      });
    return () => {
      ignore = true;
    };
  }, [orderCode]);

  const paid = payment?.status === 'paid' || gatewayStatus === 'PAID';
  const title = cancelled ? 'Đã hủy thanh toán' : paid ? 'Thanh toán thành công' : 'Đang chờ xác nhận';

  return (
    <div className="min-h-screen bg-[#12141d] text-white font-sans">
      <Header forceWhite />
      <main className="mx-auto max-w-xl px-6 pb-20 pt-32">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#e31b23]">payOS</p>
        <h1 className="mt-2 text-4xl font-black uppercase">{title}</h1>
        {!orderCode && (
          <p className="mt-4 text-sm text-white/70">Chưa có mã đơn. Hãy tạo thanh toán từ trang học phí.</p>
        )}
        {error && <p className="mt-4 text-sm text-[#e31b23]">{error}</p>}
        {payment && (
          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between gap-4 border-b border-white/10 py-2">
              <dt className="text-white/60">Mã hóa đơn</dt>
              <dd className="font-bold">{payment.invoiceCode}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/10 py-2">
              <dt className="text-white/60">Số tiền</dt>
              <dd className="font-bold">{formatVnd(payment.amount)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/10 py-2">
              <dt className="text-white/60">Trạng thái hệ thống</dt>
              <dd className="font-bold">{payment.status}</dd>
            </div>
          </dl>
        )}
        {orderCode && payment?.status === 'pending' && (
          <p className="mt-4 text-sm text-white/60">
            Chưa thấy payOS xác nhận đơn này. Nếu vừa chuyển khoản, đợi vài giây rồi tải lại trang.
          </p>
        )}
        <Link to="/thanh-toan" className="mt-8 inline-block bg-[#e31b23] px-4 py-3 text-xs font-black uppercase tracking-wider">
          Quay lại học phí
        </Link>
      </main>
    </div>
  );
}
