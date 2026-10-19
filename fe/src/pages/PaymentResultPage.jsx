import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import { cancelPayment, createPayOsPayment, getPayment, readRegistrationDraft } from '../api/paymentApi';

function formatVnd(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const orderCode = params.get('orderCode') || '';
  const gatewayStatus = (params.get('status') || '').toUpperCase();
  const cancelled = params.get('cancel') === 'true' || gatewayStatus === 'CANCELLED';
  const draft = readRegistrationDraft();
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState('');
  const [repaying, setRepaying] = useState(false);

  useEffect(() => {
    document.title = 'Kết quả thanh toán - AnhDuy Sport';
    if (!orderCode) return;
    let ignore = false;
    const load = cancelled
      ? cancelPayment(orderCode).catch(() => getPayment(orderCode))
      : getPayment(orderCode);
    load
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

  const paid = !cancelled && (payment?.status === 'paid' || gatewayStatus === 'PAID');
  const failed = cancelled || payment?.status === 'failed' || payment?.status === 'cancel' || gatewayStatus === 'FAILED';

  async function repay() {
    if (!draft?.classId || !draft.customer) {
      window.location.assign('/thanh-toan');
      return;
    }
    setRepaying(true);
    setError('');
    try {
      const next = await createPayOsPayment({
        classId: draft.classId,
        fullName: draft.customer.fullName,
        phone: draft.customer.phone,
        email: draft.customer.email,
      });
      if (!next.checkoutUrl) throw new Error('payOS không trả mã QR.');
      window.location.assign(next.checkoutUrl);
    } catch (payError) {
      setError(payError.message);
      setRepaying(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#12141d] text-white font-sans">
      <Header forceWhite />
      <main className="mx-auto max-w-xl px-6 pb-20 pt-32">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#e31b23]">payOS</p>
        <h1 className="mt-2 text-4xl font-black uppercase">
          {paid ? 'Cảm ơn bạn' : failed ? 'Thanh toán chưa thành công' : 'Đang chờ xác nhận'}
        </h1>

        {paid && (
          <div className="mt-6 space-y-3 text-sm text-white/80">
            <p>AnhDuy Sport xác nhận giữ chỗ sau khi thanh toán thành công. Học viên tham gia đúng lớp, giờ và huấn luyện viên đã chọn.</p>
            {draft && (
              <p>
                {draft.className} · {draft.coachName} · {draft.slotLabel}
              </p>
            )}
          </div>
        )}

        {failed && (
          <p className="mt-6 text-sm text-white/80">
            Giao dịch không hoàn tất hoặc đã hủy. Bạn có thể quét lại mã QR, hoặc kết thúc đăng ký.
          </p>
        )}

        {!orderCode && !paid && (
          <p className="mt-6 text-sm text-white/70">Chưa có mã đơn. Hãy bắt đầu từ trang đăng ký.</p>
        )}
        {error && <p className="mt-4 text-sm text-[#e31b23]">{error}</p>}

        {payment && (
          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between gap-4 border-b border-white/10 py-2">
              <dt className="text-white/60">Hóa đơn điện tử</dt>
              <dd className="font-bold">{payment.invoiceCode}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/10 py-2">
              <dt className="text-white/60">Số tiền</dt>
              <dd className="font-bold">{formatVnd(payment.amount)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/10 py-2">
              <dt className="text-white/60">Trạng thái</dt>
              <dd className="font-bold">{payment.status}</dd>
            </div>
          </dl>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {failed && (
            <button type="button" onClick={repay} disabled={repaying} className="bg-[#e31b23] px-4 py-3 text-xs font-black uppercase tracking-wider disabled:opacity-60">
              {repaying ? 'Đang tạo lại mã...' : 'Thanh toán lại'}
            </button>
          )}
          <Link to="/home" className="border border-white/20 px-4 py-3 text-xs font-black uppercase tracking-wider">
            Kết thúc
          </Link>
        </div>
      </main>
    </div>
  );
}
