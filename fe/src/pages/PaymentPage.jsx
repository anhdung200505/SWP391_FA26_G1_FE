import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Header from '../components/Header';
import Footer from '../components/Footer';
import {
  createPayOsPayment,
  getCenters,
  getClasses,
  getPayment,
  getSports,
  saveRegistrationDraft,
} from '../api/paymentApi';

const steps = [
  ['center', 'Trung tâm'],
  ['sport', 'Môn'],
  ['mode', 'Hình thức'],
  ['class', 'Lớp / giờ'],
  ['tuition', 'Học phí'],
  ['customer', 'Thông tin'],
  ['confirm', 'Xác nhận'],
  ['pay', 'Thanh toán'],
];

function formatVnd(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

function formatSlot(slot) {
  if (!slot) return 'Chưa có buổi sắp tới';
  return `${slot.date} ${String(slot.startTime).slice(0, 5)}–${String(slot.endTime).slice(0, 5)}`;
}

export default function PaymentPage() {
  const [step, setStep] = useState('center');
  const [centers, setCenters] = useState([]);
  const [sports, setSports] = useState([]);
  const [classes, setClasses] = useState([]);
  const [center, setCenter] = useState(null);
  const [sport, setSport] = useState(null);
  const [groupStudy, setGroupStudy] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [customer, setCustomer] = useState({ fullName: '', phone: '', email: '' });
  const [payment, setPayment] = useState(null);
  const [qrImage, setQrImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Đăng ký lớp - AnhDuy Sport';
    let ignore = false;
    getCenters()
      .then((items) => {
        if (!ignore) setCenters(items);
      })
      .catch((loadError) => {
        if (!ignore) setError(loadError.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  async function chooseCenter(item) {
    setError('');
    setCenter(item);
    setSport(null);
    setSelectedClass(null);
    setLoading(true);
    try {
      setSports(await getSports(item.id));
      setStep('sport');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  async function chooseSport(item) {
    setError('');
    setSport(item);
    setSelectedClass(null);
    setStep('mode');
  }

  async function chooseMode(isGroup) {
    setError('');
    setGroupStudy(isGroup);
    setLoading(true);
    try {
      setClasses(await getClasses(center.id, sport.id));
      setStep('class');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  function chooseClass(item) {
    setSelectedClass(item);
    setStep('tuition');
  }

  function updateCustomer(field, value) {
    setCustomer((current) => ({ ...current, [field]: value }));
  }

  useEffect(() => {
    if (!payment?.qrCode) {
      setQrImage('');
      return undefined;
    }
    let ignore = false;
    QRCode.toDataURL(payment.qrCode, { width: 280, margin: 1 })
      .then((url) => {
        if (!ignore) setQrImage(url);
      })
      .catch(() => {
        if (!ignore) setError('Không vẽ được mã QR.');
      });
    return () => {
      ignore = true;
    };
  }, [payment?.qrCode]);

  useEffect(() => {
    if (!payment?.paymentId || payment.status === 'paid') return undefined;
    const timer = window.setInterval(() => {
      getPayment(payment.paymentId)
        .then((next) => {
          setPayment((current) => ({ ...current, ...next, qrCode: next.qrCode || current?.qrCode }));
        })
        .catch(() => {});
    }, 4000);
    return () => window.clearInterval(timer);
  }, [payment?.paymentId, payment?.status]);

  async function pay() {
    setError('');
    setPaying(true);
    saveRegistrationDraft({
      centerName: center.name,
      sportName: sport.name,
      groupStudy,
      classId: selectedClass.id,
      className: selectedClass.name,
      coachName: selectedClass.coachName,
      slotLabel: formatSlot(selectedClass.nextSlot),
      tuition: selectedClass.tuition,
      customer,
    });
    try {
      const created = await createPayOsPayment({
        classId: selectedClass.id,
        fullName: customer.fullName,
        phone: customer.phone,
        email: customer.email,
      });
      if (!created.qrCode) throw new Error('payOS không trả mã QR.');
      setPayment(created);
      setStep('pay');
    } catch (payError) {
      setError(payError.message);
    } finally {
      setPaying(false);
    }
  }

  const stepIndex = steps.findIndex(([id]) => id === step);

  return (
    <div className="min-h-screen bg-[#12141d] text-white font-sans">
      <Header forceWhite />
      <main className="mx-auto max-w-5xl px-6 pb-20 pt-28">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#e31b23]">Đăng ký lớp</p>
        <h1 className="mt-2 text-4xl font-black uppercase">Sports Class Registration</h1>
        <ol className="mt-6 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide">
          {steps.map(([id, label], index) => (
            <li key={id} className={index <= stepIndex ? 'text-white' : 'text-white/35'}>
              {index + 1}. {label}
            </li>
          ))}
        </ol>

        {error && (
          <p className="mt-6 border border-[#e31b23] bg-[#e31b23]/15 px-4 py-3 text-sm">{error}</p>
        )}

        {step !== 'center' && (
          <button
            type="button"
            onClick={() => setStep(steps[Math.max(stepIndex - 1, 0)][0])}
            className="mt-6 text-sm font-bold text-white/70"
          >
            Quay lại
          </button>
        )}

        {loading && <p className="mt-8 text-sm text-white/60">Đang tải...</p>}

        {!loading && step === 'center' && (
          <section className="mt-8 grid gap-4 sm:grid-cols-2">
            {centers.map((item) => (
              <button key={item.id} type="button" onClick={() => chooseCenter(item)} className="border border-white/10 bg-[#1b1e2a] p-5 text-left">
                <p className="text-xs font-bold uppercase text-[#e31b23]">Chọn trung tâm</p>
                <h2 className="mt-1 text-xl font-black">{item.name}</h2>
                <p className="mt-2 text-sm text-white/60">{item.address}</p>
              </button>
            ))}
          </section>
        )}

        {!loading && step === 'sport' && (
          <section className="mt-8 grid gap-3 sm:grid-cols-2">
            {sports.map((item) => (
              <button key={item.id} type="button" onClick={() => chooseSport(item)} className="border border-white/10 bg-[#1b1e2a] p-5 text-left">
                <h2 className="text-lg font-black">{item.name}</h2>
                <p className="mt-1 text-sm text-white/60">{item.openClassCount} lớp đang mở</p>
              </button>
            ))}
          </section>
        )}

        {step === 'mode' && (
          <section className="mt-8 grid gap-4 sm:grid-cols-2">
            <button type="button" onClick={() => chooseMode(true)} className="border border-white/10 bg-[#1b1e2a] p-5 text-left">
              <p className="text-xs font-bold uppercase text-[#e31b23]">Học theo lớp</p>
              <h2 className="mt-2 text-xl font-black">Xem các lớp sắp khai giảng</h2>
            </button>
            <button type="button" onClick={() => chooseMode(false)} className="border border-white/10 bg-[#1b1e2a] p-5 text-left">
              <p className="text-xs font-bold uppercase text-[#e31b23]">Chọn giờ và HLV</p>
              <h2 className="mt-2 text-xl font-black">Chọn buổi học và huấn luyện viên</h2>
            </button>
          </section>
        )}

        {!loading && step === 'class' && (
          <section className="mt-8 grid gap-4">
            <h2 className="text-lg font-black">{groupStudy ? 'Lớp phù hợp' : 'Giờ học và huấn luyện viên'}</h2>
            {classes.length === 0 && <p className="text-sm text-white/60">Môn này chưa có lớp đang mở.</p>}
            {classes.map((item) => (
              <button key={item.id} type="button" onClick={() => chooseClass(item)} className="border border-white/10 bg-[#1b1e2a] p-5 text-left">
                <p className="text-xs font-bold uppercase text-[#e31b23]">{groupStudy ? item.sportName : item.coachName}</p>
                <h3 className="mt-1 text-lg font-black">{groupStudy ? item.name : formatSlot(item.nextSlot)}</h3>
                <p className="mt-1 text-sm text-white/60">
                  {groupStudy ? `${item.coachName} · ${formatSlot(item.nextSlot)}` : item.name}
                  {' · '}
                  {item.roomName}
                  {item.availableSeats != null ? ` · còn ${item.availableSeats} chỗ` : ''}
                </p>
              </button>
            ))}
          </section>
        )}

        {step === 'tuition' && selectedClass && (
          <section className="mt-8 max-w-xl border border-white/10 bg-[#1b1e2a] p-6">
            <p className="text-xs font-bold uppercase text-[#e31b23]">Học phí</p>
            <h2 className="mt-2 text-2xl font-black">{selectedClass.name}</h2>
            <p className="mt-2 text-sm text-white/70">
              {selectedClass.coachName} · {formatSlot(selectedClass.nextSlot)} · {selectedClass.roomName}
            </p>
            <p className="mt-4 text-3xl font-black">{formatVnd(selectedClass.tuition)}</p>
            <p className="mt-2 text-sm text-white/60">Mã QR payOS thu 10.000đ để thử chuyển khoản thật.</p>
            <button type="button" onClick={() => setStep('customer')} className="mt-6 bg-[#e31b23] px-4 py-3 text-xs font-black uppercase tracking-wider">
              Nhập thông tin học viên
            </button>
          </section>
        )}

        {step === 'customer' && (
          <form
            className="mt-8 grid max-w-xl gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              setStep('confirm');
            }}
          >
            <label className="text-sm font-bold">
              Họ tên
              <input required value={customer.fullName} onChange={(event) => updateCustomer('fullName', event.target.value)} className="mt-2 block w-full border border-white/15 bg-[#1b1e2a] px-3 py-3 outline-none" />
            </label>
            <label className="text-sm font-bold">
              Số điện thoại
              <input required value={customer.phone} onChange={(event) => updateCustomer('phone', event.target.value)} className="mt-2 block w-full border border-white/15 bg-[#1b1e2a] px-3 py-3 outline-none" />
            </label>
            <label className="text-sm font-bold">
              Email
              <input required type="email" value={customer.email} onChange={(event) => updateCustomer('email', event.target.value)} className="mt-2 block w-full border border-white/15 bg-[#1b1e2a] px-3 py-3 outline-none" />
            </label>
            <button type="submit" className="bg-[#e31b23] px-4 py-3 text-xs font-black uppercase tracking-wider">
              Xem lại thông tin
            </button>
          </form>
        )}

        {step === 'confirm' && selectedClass && (
          <section className="mt-8 max-w-xl border border-white/10 bg-[#1b1e2a] p-6">
            <p className="text-xs font-bold uppercase text-[#e31b23]">Xác nhận thông tin</p>
            <h2 className="mt-2 text-2xl font-black">{selectedClass.name}</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4 border-b border-white/10 py-2">
                <dt className="text-white/60">Trung tâm</dt>
                <dd className="text-right font-bold">{center?.name}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/10 py-2">
                <dt className="text-white/60">Môn</dt>
                <dd className="text-right font-bold">{sport?.name}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/10 py-2">
                <dt className="text-white/60">Hình thức</dt>
                <dd className="text-right font-bold">{groupStudy ? 'Học theo lớp' : 'Chọn giờ và HLV'}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/10 py-2">
                <dt className="text-white/60">Huấn luyện viên</dt>
                <dd className="text-right font-bold">{selectedClass.coachName}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/10 py-2">
                <dt className="text-white/60">Buổi học</dt>
                <dd className="text-right font-bold">{formatSlot(selectedClass.nextSlot)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/10 py-2">
                <dt className="text-white/60">Học viên</dt>
                <dd className="text-right font-bold">{customer.fullName}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/10 py-2">
                <dt className="text-white/60">Điện thoại</dt>
                <dd className="text-right font-bold">{customer.phone}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/10 py-2">
                <dt className="text-white/60">Email</dt>
                <dd className="text-right font-bold">{customer.email}</dd>
              </div>
              <div className="flex justify-between gap-4 py-2">
                <dt className="text-white/60">Thanh toán QR</dt>
                <dd className="text-right font-bold">10.000đ</dd>
              </div>
            </dl>
            <p className="mt-2 text-sm text-white/60">Học phí niêm yết {formatVnd(selectedClass.tuition)}. Mã QR hiện ngay trên trang này.</p>
            <button type="button" onClick={pay} disabled={paying} className="mt-6 bg-[#e31b23] px-4 py-3 text-xs font-black uppercase tracking-wider disabled:opacity-60">
              {paying ? 'Đang tạo mã QR...' : 'Xác nhận và thanh toán'}
            </button>
          </section>
        )}

        {step === 'pay' && selectedClass && (
          <section className="mt-8 max-w-xl border border-white/10 bg-[#1b1e2a] p-6">
            {payment?.status === 'paid' ? (
              <>
                <p className="text-xs font-bold uppercase text-[#e31b23]">Hoàn tất</p>
                <h2 className="mt-2 text-2xl font-black">Cảm ơn bạn</h2>
                <p className="mt-4 text-sm text-white/80">
                  AnhDuy Sport xác nhận giữ chỗ sau khi thanh toán thành công. Học viên tham gia đúng lớp, giờ và huấn luyện viên đã chọn.
                </p>
                <p className="mt-3 text-sm text-white/70">
                  {selectedClass.name} · {selectedClass.coachName} · {formatSlot(selectedClass.nextSlot)}
                </p>
                {payment.invoiceCode && (
                  <p className="mt-3 text-sm font-bold">Hóa đơn điện tử {payment.invoiceCode}</p>
                )}
              </>
            ) : (
              <>
                <p className="text-xs font-bold uppercase text-[#e31b23]">Thanh toán</p>
                <h2 className="mt-2 text-2xl font-black">Quét mã QR</h2>
                <p className="mt-3 text-sm text-white/70">
                  {customer.fullName} · {selectedClass.name}
                </p>
                <p className="mt-4 text-3xl font-black">10.000đ</p>
                <div className="mt-5 flex justify-center bg-white p-4">
                  {qrImage ? (
                    <img src={qrImage} alt="Mã QR thanh toán" width="280" height="280" />
                  ) : (
                    <p className="py-16 text-sm text-gray-500">Đang tạo mã QR...</p>
                  )}
                </div>
                <p className="mt-4 text-sm text-white/60">
                  Mở app ngân hàng và quét mã ngay trên trang này. Sau khi chuyển khoản, trang tự chuyển sang lời cảm ơn.
                </p>
              </>
            )}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
