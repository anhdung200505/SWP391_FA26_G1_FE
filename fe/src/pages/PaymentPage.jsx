import { useEffect, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { createPayOsPayment, getCenters, getClasses } from '../api/paymentApi';

const members = [
  { id: '11', name: 'Nguyễn Minh Khang' },
  { id: '12', name: 'Trần Gia Hân' },
];

function formatVnd(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

export default function PaymentPage() {
  const [classes, setClasses] = useState([]);
  const [memberId, setMemberId] = useState(members[0].id);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Thanh toán - AnhDuy Sport';
    let ignore = false;

    async function load() {
      try {
        const centers = await getCenters();
        const centerId = centers[0]?.id;
        if (!centerId) throw new Error('Chưa có trung tâm để lấy danh sách lớp.');
        const items = await getClasses(centerId);
        if (!ignore) setClasses(items);
      } catch (loadError) {
        if (!ignore) setError(loadError.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  async function pay(classId) {
    setError('');
    setPayingId(classId);
    try {
      const payment = await createPayOsPayment(memberId, classId);
      if (!payment.checkoutUrl) throw new Error('payOS không trả link thanh toán.');
      window.location.assign(payment.checkoutUrl);
    } catch (payError) {
      setError(payError.message);
      setPayingId('');
    }
  }

  return (
    <div className="min-h-screen bg-[#12141d] text-white font-sans">
      <Header forceWhite />
      <main className="mx-auto max-w-5xl px-6 pb-20 pt-28">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#e31b23]">payOS</p>
        <h1 className="mt-2 text-4xl font-black uppercase">Thanh toán học phí</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/70">
          Mỗi lần bấm thanh toán chỉ chuyển 10.000đ để thử. Khi chuyển khoản thành công, payOS đưa bạn về trang kết quả của website.
        </p>

        <label className="mt-8 block text-sm font-bold">
          Học viên
          <select
            value={memberId}
            onChange={(event) => setMemberId(event.target.value)}
            className="mt-2 block w-full max-w-sm border border-white/15 bg-[#1b1e2a] px-3 py-3 text-sm outline-none"
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>

        {error && (
          <p className="mt-6 border border-[#e31b23] bg-[#e31b23]/15 px-4 py-3 text-sm">{error}</p>
        )}

        {loading ? (
          <p className="mt-10 text-sm text-white/60">Đang tải danh sách lớp...</p>
        ) : (
          <div className="mt-8 grid gap-4">
            {classes.map((item) => (
              <article key={item.id} className="flex flex-col gap-4 border border-white/10 bg-[#1b1e2a] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#e31b23]">{item.sportName}</p>
                  <h2 className="mt-1 text-lg font-black">{item.name}</h2>
                  <p className="mt-1 text-sm text-white/60">
                    {item.coachName} · {item.roomName}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-lg font-black">10.000đ</p>
                    <p className="text-xs text-white/50">Học phí lớp {formatVnd(item.tuition)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => pay(item.id)}
                    disabled={payingId !== ''}
                    className="bg-[#e31b23] px-4 py-3 text-xs font-black uppercase tracking-wider text-white disabled:opacity-60"
                  >
                    {payingId === item.id ? 'Đang mở payOS...' : 'Thanh toán'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
