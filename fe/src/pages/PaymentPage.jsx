import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import QRCode from 'qrcode';
import Header from '../components/Header';
import Footer from '../components/Footer';
import {
  cancelPayment,
  createPayOsPayment,
  getCenters,
  getClasses,
  getCoaches,
  getPayment,
  getSports,
  saveRegistrationDraft,
} from '../api/paymentApi';

function registrationSteps(oneOnOne) {
  return [
    ['sport', 'Môn'],
    ['mode', 'Hình thức'],
    ['time', 'Thời gian'],
    ['customer', 'Thông tin'],
    ...(oneOnOne ? [['coach', 'Huấn luyện viên']] : []),
    ['confirm', 'Xác nhận'],
    ['pay', 'Thanh toán'],
  ];
}

function formatVnd(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

const paymentWindowMs = 5 * 60 * 1000;

function formatClock(slot) {
  if (!slot) return '';
  return `${String(slot.startTime).slice(0, 5)}–${String(slot.endTime).slice(0, 5)}`;
}

function formatSchedule(item) {
  const clock = formatClock(item?.nextSlot);
  if (!item) return '';
  return clock ? `${item.name} · ${clock}` : item.name;
}

function customerFieldErrors(value) {
  const errors = {};
  if (value.fullName.trim().length < 2) errors.fullName = 'Nhập đầy đủ họ tên.';
  if (!/^0\d{9}$/.test(value.phone.trim())) errors.phone = 'Số điện thoại phải có 10 số và bắt đầu bằng 0.';
  const email = value.email.trim();
  if (!email.includes('@') || email.startsWith('@') || email.endsWith('@') || /\s/.test(email)) {
    errors.email = 'Email phải có ký tự @.';
  }
  return errors;
}

function formatCountdown(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function stepUrl(pathname, nextStep) {
  return nextStep === 'sport' ? pathname : `${pathname}?buoc=${nextStep}`;
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const canRegister = user?.roleId === 'MEMBER';
  const [searchParams] = useSearchParams();
  const step = searchParams.get('buoc') || 'sport';
  const stackRef = useRef(['sport']);
  const ignorePopRef = useRef(false);
  const previousStepRef = useRef('sport');
  const [sports, setSports] = useState([]);
  const [classes, setClasses] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [center, setCenter] = useState(null);
  const [sport, setSport] = useState(null);
  const [oneOnOne, setOneOnOne] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [timeLabel, setTimeLabel] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [customer, setCustomer] = useState({ fullName: '', phone: '', email: '' });
  const [payment, setPayment] = useState(null);
  const [qrImage, setQrImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [payDeadline, setPayDeadline] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(null);

  function goToStep(next) {
    stackRef.current = [...stackRef.current, next];
    navigate(stepUrl(location.pathname, next));
  }

  function returnToSport() {
    const stepsBack = Math.max(0, stackRef.current.length - 1);
    stackRef.current = ['sport'];
    if (stepsBack === 0) return;
    ignorePopRef.current = true;
    navigate(-stepsBack);
  }

  useEffect(() => {
    if (searchParams.get('buoc')) {
      navigate(location.pathname, { replace: true });
    }
    function onPop() {
      if (ignorePopRef.current) {
        ignorePopRef.current = false;
        return;
      }
      const next = new URLSearchParams(window.location.search).get('buoc') || 'sport';
      const stack = stackRef.current;
      if (stack.length > 1 && stack[stack.length - 2] === next) {
        stackRef.current = stack.slice(0, -1);
      } else if (stack[stack.length - 1] !== next) {
        stackRef.current = [...stack, next];
      }
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (user?.roleId !== 'MEMBER') return;
    setCustomer({
      fullName: user.fullName || '',
      phone: user.phone || '',
      email: user.email || '',
    });
  }, [user]);

  useEffect(() => {
    document.title = 'Đăng ký lớp - AnhDuy Sport';
    let ignore = false;
    getCenters()
      .then(async (items) => {
        if (ignore) return;
        const first = items[0];
        if (!first) return;
        setCenter(first);
        setSports(await getSports(first.id));
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

  function chooseSport(item) {
    if (!canRegister) {
      navigate('/dang-ky', { state: { from: '/thanh-toan' } });
      return;
    }
    setError('');
    setSport(item);
    setSelectedClass(null);
    setSelectedCoach(null);
    setTimeLabel('');
    goToStep('mode');
  }

  async function chooseMode(isOneOnOne) {
    setError('');
    setOneOnOne(isOneOnOne);
    setSelectedClass(null);
    setSelectedCoach(null);
    setLoading(true);
    try {
      setClasses(await getClasses(center.id, sport.id));
      goToStep('time');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  function chooseTime(item) {
    setSelectedClass(item);
    setSelectedCoach(null);
    setTimeLabel(formatSchedule(item));
    goToStep('customer');
  }

  async function continueFromCustomer(event) {
    event.preventDefault();
    const errors = customerFieldErrors(customer);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    if (!oneOnOne) {
      goToStep('confirm');
      return;
    }
    setError('');
    setLoading(true);
    try {
      setCoaches(await getCoaches(sport.id));
      goToStep('coach');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  function chooseCoach(coach) {
    setSelectedCoach(coach);
    const match = classes.find((item) => item.id === coach.classId);
    if (match) setSelectedClass(match);
    goToStep('confirm');
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
    const previous = previousStepRef.current;
    previousStepRef.current = step;
    if (previous !== 'pay' || step === 'pay') return undefined;
    if (!payment?.paymentId || payment.status === 'paid' || payment.status === 'cancel') return undefined;
    cancelPayment(payment.paymentId).catch(() => {});
    setPayment(null);
    setPayDeadline(null);
    setSecondsLeft(null);
  }, [step, payment]);

  useEffect(() => {
    if (!payment?.paymentId || payment.status === 'paid' || payment.status === 'cancel') return undefined;
    const timer = window.setInterval(() => {
      getPayment(payment.paymentId)
        .then((next) => {
          setPayment((current) => ({ ...current, ...next, qrCode: next.qrCode || current?.qrCode }));
          if (next.status === 'cancel') {
            setPayDeadline(null);
            setSecondsLeft(null);
            setError('Thanh toán đã hủy. Bạn được đưa về đăng ký lớp.');
            returnToSport();
          }
        })
        .catch(() => {});
    }, 4000);
    return () => window.clearInterval(timer);
  }, [payment?.paymentId, payment?.status]);

  useEffect(() => {
    if (step !== 'pay' || !payDeadline || payment?.status === 'paid' || payment?.status === 'cancel') return undefined;
    let expired = false;
    function tick() {
      const left = Math.max(0, Math.ceil((payDeadline - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left > 0 || expired) return;
      expired = true;
      if (payment?.paymentId && payment.status !== 'paid' && payment.status !== 'cancel') {
        cancelPayment(payment.paymentId).catch(() => {});
      }
      setPayment(null);
      setPayDeadline(null);
      setSecondsLeft(null);
      setSport(null);
      setSelectedClass(null);
      setSelectedCoach(null);
      setTimeLabel('');
      setCustomer({ fullName: '', phone: '', email: '' });
      setFieldErrors({});
      setError('Hết 5 phút thanh toán. Bạn được đưa về đăng ký lớp.');
      returnToSport();
    }
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [step, payDeadline, payment?.status]);

  async function pay() {
    setError('');
    setPaying(true);
    saveRegistrationDraft({
      centerName: center.name,
      sportName: sport.name,
      oneOnOne,
      classId: selectedClass.id,
      className: selectedClass.name,
      coachName: oneOnOne ? selectedCoach?.fullName : selectedClass.coachName,
      slotLabel: timeLabel,
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
      const url = await QRCode.toDataURL(created.qrCode, { width: 280, margin: 1 });
      setQrImage(url);
      setPayment(created);
      setPayDeadline(Date.now() + paymentWindowMs);
      goToStep('pay');
    } catch (payError) {
      setError(payError.message);
    } finally {
      setPaying(false);
    }
  }

  const steps = registrationSteps(oneOnOne);
  const coachName = oneOnOne ? selectedCoach?.fullName : selectedClass?.coachName;
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

        {canRegister && step !== 'sport' && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-6 text-sm font-bold text-white/70"
          >
            Quay lại
          </button>
        )}

        {loading && <p className="mt-8 text-sm text-white/60">Đang tải...</p>}

        {!loading && step === 'sport' && (
          <section className="mt-8">
            {!canRegister && (
              <div className="mb-6 border border-white/10 bg-[#1b1e2a] p-5">
                <p className="text-sm text-white/80">Chưa đăng nhập thì bạn chỉ xem được môn học. Đăng ký lớp cần tạo tài khoản.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={() => navigate('/dang-ky', { state: { from: '/thanh-toan' } })} className="bg-[#e31b23] px-4 py-3 text-xs font-black uppercase tracking-wider">
                    Tạo tài khoản
                  </button>
                  <button type="button" onClick={() => navigate('/dang-nhap', { state: { from: '/thanh-toan' } })} className="border border-white/20 px-4 py-3 text-xs font-black uppercase tracking-wider">
                    Đã có tài khoản
                  </button>
                </div>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
            {sports.map((item) => (
              <button key={item.id} type="button" onClick={() => chooseSport(item)} className="border border-white/10 bg-[#1b1e2a] p-5 text-left">
                <h2 className="text-lg font-black">{item.name}</h2>
                <p className="mt-1 text-sm text-white/60">{item.openClassCount} lớp đang mở</p>
              </button>
            ))}
            </div>
          </section>
        )}

        {canRegister && step === 'mode' && (
          <section className="mt-8 grid gap-4 sm:grid-cols-2">
            <button type="button" onClick={() => chooseMode(false)} className="border border-white/10 bg-[#1b1e2a] p-5 text-left">
              <p className="text-xs font-bold uppercase text-[#e31b23]">Học theo nhóm lớp</p>
              <h2 className="mt-2 text-xl font-black">Học cùng lớp và huấn luyện viên của khung giờ</h2>
            </button>
            <button type="button" onClick={() => chooseMode(true)} className="border border-white/10 bg-[#1b1e2a] p-5 text-left">
              <p className="text-xs font-bold uppercase text-[#e31b23]">Học 1-1</p>
              <h2 className="mt-2 text-xl font-black">1 học viên với 1 huấn luyện viên</h2>
            </button>
          </section>
        )}

        {canRegister && !loading && step === 'time' && (
          <section className="mt-8 grid gap-4">
            <h2 className="text-lg font-black">Chọn thời gian học {sport?.name}</h2>
            {classes.length === 0 && <p className="text-sm text-white/60">Môn này chưa có khung giờ.</p>}
            {classes.map((item) => (
              <button key={item.id} type="button" onClick={() => chooseTime(item)} className="border border-white/10 bg-[#1b1e2a] p-5 text-left">
                <p className="text-xs font-bold uppercase text-[#e31b23]">{formatClock(item.nextSlot) || 'Khung giờ'}</p>
                <h3 className="mt-1 text-lg font-black">{item.name}</h3>
                <p className="mt-1 text-sm text-white/60">
                  {item.roomName}
                  {!oneOnOne ? ` · HLV ${item.coachName}` : ''}
                  {item.availableSeats != null ? ` · còn ${item.availableSeats} chỗ` : ''}
                </p>
              </button>
            ))}
          </section>
        )}

        {canRegister && step === 'customer' && (
          <form className="mt-8 grid max-w-xl gap-4" onSubmit={continueFromCustomer}>
            <label className="text-sm font-bold">
              Họ tên
              <input value={customer.fullName} onChange={(event) => updateCustomer('fullName', event.target.value)} className="mt-2 block w-full border border-white/15 bg-[#1b1e2a] px-3 py-3 outline-none" />
              {fieldErrors.fullName && <span className="mt-1 block text-xs font-medium text-[#e31b23]">{fieldErrors.fullName}</span>}
            </label>
            <label className="text-sm font-bold">
              Số điện thoại
              <input inputMode="numeric" maxLength={10} value={customer.phone} onChange={(event) => updateCustomer('phone', event.target.value)} className="mt-2 block w-full border border-white/15 bg-[#1b1e2a] px-3 py-3 outline-none" />
              {fieldErrors.phone && <span className="mt-1 block text-xs font-medium text-[#e31b23]">{fieldErrors.phone}</span>}
            </label>
            <label className="text-sm font-bold">
              Email
              <input value={customer.email} onChange={(event) => updateCustomer('email', event.target.value)} className="mt-2 block w-full border border-white/15 bg-[#1b1e2a] px-3 py-3 outline-none" />
              {fieldErrors.email && <span className="mt-1 block text-xs font-medium text-[#e31b23]">{fieldErrors.email}</span>}
            </label>
            <button type="submit" className="bg-[#e31b23] px-4 py-3 text-xs font-black uppercase tracking-wider">
              {oneOnOne ? 'Chọn huấn luyện viên' : 'Xác nhận thông tin'}
            </button>
          </form>
        )}

        {canRegister && !loading && step === 'coach' && (
          <section className="mt-8 grid gap-4">
            <h2 className="text-lg font-black">Chọn huấn luyện viên môn {sport?.name}</h2>
            {coaches.length === 0 && <p className="text-sm text-white/60">Môn này chưa có huấn luyện viên.</p>}
            {coaches.map((coach) => (
              <button key={coach.id} type="button" onClick={() => chooseCoach(coach)} className="border border-white/10 bg-[#1b1e2a] p-5 text-left">
                <p className="text-xs font-bold uppercase text-[#e31b23]">Học 1-1</p>
                <h3 className="mt-1 text-lg font-black">{coach.fullName}</h3>
              </button>
            ))}
          </section>
        )}

        {canRegister && step === 'confirm' && selectedClass && (
          <section className="mt-8 max-w-xl border border-white/10 bg-[#1b1e2a] p-6">
            <p className="text-xs font-bold uppercase text-[#e31b23]">Xác nhận thông tin</p>
            <h2 className="mt-2 text-2xl font-black">{selectedClass.name}</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4 border-b border-white/10 py-2">
                <dt className="text-white/60">Môn</dt>
                <dd className="text-right font-bold">{sport?.name}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/10 py-2">
                <dt className="text-white/60">Hình thức</dt>
                <dd className="text-right font-bold">{oneOnOne ? 'Học 1-1' : 'Học theo nhóm lớp'}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/10 py-2">
                <dt className="text-white/60">Thời gian</dt>
                <dd className="text-right font-bold">{timeLabel}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/10 py-2">
                <dt className="text-white/60">Huấn luyện viên</dt>
                <dd className="text-right font-bold">{coachName}</dd>
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

        {canRegister && step === 'pay' && selectedClass && (
          <section className="mt-8 max-w-xl border border-white/10 bg-[#1b1e2a] p-6">
            {payment?.status === 'paid' ? (
              <>
                <p className="text-xs font-bold uppercase text-[#e31b23]">Hoàn tất</p>
                <h2 className="mt-2 text-2xl font-black">Cảm ơn bạn</h2>
                <p className="mt-4 text-sm text-white/80">
                  AnhDuy Sport xác nhận giữ chỗ sau khi thanh toán thành công. Học viên tham gia đúng lớp, giờ và huấn luyện viên đã chọn.
                </p>
                <p className="mt-3 text-sm text-white/70">
                  {timeLabel} · {coachName}
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
                <p className="mt-2 text-2xl font-black text-[#e31b23]">
                  Còn {formatCountdown(secondsLeft ?? Math.floor(paymentWindowMs / 1000))}
                </p>
                <div className="mt-5 flex justify-center bg-white p-4">
                  {qrImage ? (
                    <img src={qrImage} alt="Mã QR thanh toán" width="280" height="280" />
                  ) : (
                    <p className="py-16 text-sm text-gray-500">Đang tạo mã QR...</p>
                  )}
                </div>
                <p className="mt-4 text-sm text-white/60">
                  Mở app ngân hàng và quét mã ngay trên trang này. Sau khi chuyển khoản, trang tự chuyển sang lời cảm ơn. Hết 5 phút mà chưa thanh toán, trang đưa bạn về đăng ký lớp.
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
