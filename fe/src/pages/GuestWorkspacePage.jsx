import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import { guestTabs, registrationOnlyMessage } from '../auth/destination';
import { useAuth } from '../context/AuthContext';
import { formatFee } from '../data/accountManagement';
import { getCenters, getClassDetail, getClasses, getSports, payRegistration } from '../api/managementApi';

const methods = [
  { id: 'transfer', label: 'Chuyển khoản' },
  { id: 'card', label: 'Thẻ' },
  { id: 'cash', label: 'Tiền mặt' },
];

export default function GuestWorkspacePage() {
  const { user, applySession } = useAuth();
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const tab = guestTabs.some((item) => item.id === requested) ? requested : 'center';
  const current = guestTabs.find((item) => item.id === tab);

  const [centers, setCenters] = useState([]);
  const [sports, setSports] = useState([]);
  const [classes, setClasses] = useState([]);
  const [detail, setDetail] = useState(null);
  const [centerId, setCenterId] = useState('');
  const [sportId, setSportId] = useState('');
  const [groupStudy, setGroupStudy] = useState(null);
  const [classId, setClassId] = useState('');
  const [slotId, setSlotId] = useState('');
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const openTab = (id) => setParams({ tab: id });

  useEffect(() => {
    document.title = 'Đăng ký lớp · AnhDuy Sport';
  }, []);

  useEffect(() => {
    let active = true;
    getCenters()
      .then((rows) => {
        if (active) setCenters(rows);
      })
      .catch((requestError) => {
        if (active) setLoadError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!centerId) return undefined;
    let active = true;
    getSports(centerId)
      .then((rows) => {
        if (active) setSports(rows);
      })
      .catch((requestError) => {
        if (active) setLoadError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, [centerId]);

  useEffect(() => {
    if (!centerId || !sportId) return undefined;
    let active = true;
    getClasses(centerId, sportId)
      .then((rows) => {
        if (active) setClasses(rows);
      })
      .catch((requestError) => {
        if (active) setLoadError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, [centerId, sportId]);

  useEffect(() => {
    if (!classId) return undefined;
    let active = true;
    getClassDetail(classId)
      .then((row) => {
        if (active) setDetail(row);
      })
      .catch((requestError) => {
        if (active) setLoadError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, [classId]);

  if (!user) {
    return <Navigate to="/dang-nhap" replace />;
  }

  if (user.roleId !== 'MEMBER') {
    return <Navigate to="/home" replace />;
  }

  const selectedClass = classes.find((item) => item.id === classId) ?? null;
  const paid = user.hasPaid === true || receipt?.user?.hasPaid === true;

  const chooseCenter = (id) => {
    setCenterId(id);
    setSportId('');
    setClasses([]);
    setClassId('');
    setSlotId('');
    setDetail(null);
    setError('');
    openTab('subject');
  };

  const chooseSport = (item) => {
    setSportId(item.id);
    setClassId('');
    setSlotId('');
    setDetail(null);
    setError('');
    openTab('group');
  };

  const chooseGroup = (value) => {
    setGroupStudy(value);
    setClassId('');
    setSlotId('');
    setDetail(null);
    setError('');
    openTab('schedule');
  };

  const chooseClass = (item, nextSlotId = '') => {
    setClassId(item.id);
    setSlotId(nextSlotId);
    setError('');
    openTab('tuition');
  };

  const pay = async () => {
    if (saving) return;
    setError('');
    if (!classId || !fullName.trim() || !phone.trim()) {
      setError('Chọn lớp, rồi nhập họ tên và số điện thoại trước khi thanh toán.');
      return;
    }
    if (!groupStudy && !slotId) {
      setError('Hãy chọn giờ học và huấn luyện viên.');
      return;
    }

    setSaving(true);
    try {
      const result = await payRegistration({
        classId,
        slotId: groupStudy ? null : slotId,
        groupStudy: Boolean(groupStudy),
        fullName: fullName.trim(),
        phone: phone.trim(),
        paymentMethod,
      });
      if (result.token && result.user) applySession(result.token, result.user);
      setReceipt(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      <Header forceWhite />
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-28">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e31b23]">Học viên</p>
        <h1 className="mt-2 text-3xl font-black text-gray-900">Đăng ký lớp thể thao</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          {paid
            ? 'Thanh toán đã xong. Bạn dùng được các thao tác còn lại của học viên.'
            : registrationOnlyMessage}
        </p>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {guestTabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openTab(item.id)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold ${
                tab === item.id ? 'bg-[#e31b23] text-white' : 'bg-white text-gray-700 ring-1 ring-gray-200'
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>

        <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">{current.diagram}</p>
          <h2 className="mt-1 text-xl font-black">{current.title}</h2>
          {loadError && <p className="mt-3 text-sm font-semibold text-[#b1131a]">{loadError}</p>}

          {tab === 'center' && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {centers.map((center) => (
                <button
                  key={center.id}
                  type="button"
                  onClick={() => chooseCenter(center.id)}
                  className={`rounded-2xl border p-4 text-left ${
                    centerId === center.id ? 'border-[#e31b23] bg-red-50' : 'border-gray-200'
                  }`}
                >
                  <p className="font-black">{center.name}</p>
                  <p className="mt-1 text-sm text-gray-500">{center.address}</p>
                </button>
              ))}
            </div>
          )}

          {tab === 'subject' && (
            <ChoiceList
              empty={centerId ? 'Trung tâm chưa có môn đang mở.' : 'Hãy chọn trung tâm trước.'}
              items={centerId ? sports : []}
              selectedId={sportId}
              onSelect={chooseSport}
              title={(item) => item.name}
              detail={(item) => `${item.openClassCount} lớp đang mở`}
            />
          )}

          {tab === 'group' && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => chooseGroup(true)}
                className={`rounded-2xl border p-4 text-left ${groupStudy === true ? 'border-[#e31b23] bg-red-50' : 'border-gray-200'}`}
              >
                <p className="font-black">Có, học nhóm</p>
                <p className="mt-1 text-sm text-gray-500">Xem các lớp sắp mở và chọn lớp phù hợp.</p>
              </button>
              <button
                type="button"
                onClick={() => chooseGroup(false)}
                className={`rounded-2xl border p-4 text-left ${groupStudy === false ? 'border-[#e31b23] bg-red-50' : 'border-gray-200'}`}
              >
                <p className="font-black">Không, học theo giờ</p>
                <p className="mt-1 text-sm text-gray-500">Chọn giờ học và huấn luyện viên.</p>
              </button>
            </div>
          )}

          {tab === 'schedule' && groupStudy === null && (
            <p className="mt-4 text-sm text-gray-600">Hãy chọn có học nhóm hay không.</p>
          )}

          {tab === 'schedule' && groupStudy === true && (
            <ChoiceList
              empty={sportId ? 'Chưa có lớp phù hợp.' : 'Hãy chọn môn trước.'}
              items={sportId ? classes : []}
              selectedId={classId}
              onSelect={(item) => chooseClass(item)}
              title={(item) => item.name}
              detail={(item) => `${item.coachName} · ${item.roomName} · ${formatFee(item.tuition)}`}
            />
          )}

          {tab === 'schedule' && groupStudy === false && (
            <div className="mt-4 space-y-3">
              {!sportId && <p className="text-sm text-gray-600">Hãy chọn môn trước.</p>}
              {sportId && classes.length === 0 && <p className="text-sm text-gray-600">Chưa có giờ học.</p>}
              {classes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={!item.nextSlot}
                  onClick={() => chooseClass(item, item.nextSlot?.id ?? '')}
                  className={`block w-full rounded-2xl border p-4 text-left disabled:opacity-50 ${
                    classId === item.id ? 'border-[#e31b23] bg-red-50' : 'border-gray-200'
                  }`}
                >
                  <p className="font-black">{item.nextSlot ? formatWhen(item.nextSlot) : 'Chưa có buổi sắp tới'}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {item.coachName} · {item.name}
                  </p>
                </button>
              ))}
            </div>
          )}

          {tab === 'tuition' && (
            <div className="mt-4">
              {!selectedClass && <p className="text-sm text-gray-600">Hãy chọn lớp hoặc giờ học trước.</p>}
              {selectedClass && (
                <div className="rounded-2xl bg-[#12141d] p-5 text-white">
                  <p className="text-sm text-white/70">{detail?.courseName || selectedClass.courseName}</p>
                  <p className="mt-1 text-2xl font-black">{selectedClass.name}</p>
                  <p className="mt-3 text-3xl font-black text-[#e31b23]">{formatFee(detail?.tuition ?? selectedClass.tuition)}</p>
                  <p className="mt-2 text-sm text-white/70">
                    Huấn luyện viên {selectedClass.coachName} · {selectedClass.roomName}
                  </p>
                  <button
                    type="button"
                    onClick={() => openTab('info')}
                    className="mt-5 rounded-xl bg-[#e31b23] px-4 py-2.5 text-sm font-bold text-white"
                  >
                    Nhập thông tin khách
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'info' && (
            <form
              className="mt-4 max-w-lg space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                openTab('payment');
              }}
            >
              <label className="block">
                <span className="text-sm font-bold text-gray-700">Họ tên</span>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#e31b23]"
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-gray-700">Email</span>
                <input
                  value={user.email}
                  readOnly
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-gray-700">Số điện thoại</span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#e31b23]"
                />
              </label>
              <button type="submit" className="rounded-xl bg-[#e31b23] px-4 py-2.5 text-sm font-bold text-white">
                Sang thanh toán
              </button>
            </form>
          )}

          {tab === 'payment' && (
            <div className="mt-4 max-w-lg">
              {receipt?.success ? (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-emerald-50 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">Receive Thank-you Message</p>
                    <p className="mt-1 font-black text-emerald-950">{receipt.thankYou}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">Receive Customer Commitment</p>
                    <p className="mt-1 text-sm leading-6 text-gray-700">{receipt.commitment}</p>
                    {receipt.invoiceCode && (
                      <p className="mt-2 text-xs font-bold text-gray-400">Hóa đơn {receipt.invoiceCode}</p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    {selectedClass
                      ? `${selectedClass.name} · ${formatFee(detail?.tuition ?? selectedClass.tuition)}`
                      : 'Chưa chọn lớp để thanh toán.'}
                  </p>
                  <div className="mt-4 grid gap-2">
                    {methods.map((method) => (
                      <label
                        key={method.id}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 ${
                          paymentMethod === method.id ? 'border-[#e31b23] bg-red-50' : 'border-gray-200'
                        }`}
                      >
                        <span className="font-bold">{method.label}</span>
                        <input
                          type="radio"
                          name="payment-method"
                          checked={paymentMethod === method.id}
                          onChange={() => setPaymentMethod(method.id)}
                          className="accent-[#e31b23]"
                        />
                      </label>
                    ))}
                  </div>
                  {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-[#e31b23]">{error}</p>}
                  <button
                    type="button"
                    onClick={pay}
                    disabled={saving || !selectedClass}
                    className="mt-4 rounded-xl bg-[#e31b23] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {saving ? 'Đang thanh toán...' : 'Thanh toán'}
                  </button>
                </>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ChoiceList({ items, selectedId, onSelect, title, detail, empty }) {
  if (items.length === 0) {
    return <p className="mt-4 text-sm text-gray-600">{empty}</p>;
  }

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item)}
          className={`rounded-2xl border p-4 text-left ${
            selectedId === item.id ? 'border-[#e31b23] bg-red-50' : 'border-gray-200'
          }`}
        >
          <p className="font-black">{title(item)}</p>
          <p className="mt-1 text-sm text-gray-500">{detail(item)}</p>
        </button>
      ))}
    </div>
  );
}

function formatWhen(slot) {
  const [year, month, day] = String(slot.date).split('-');
  const start = String(slot.startTime).slice(0, 5);
  const end = String(slot.endTime).slice(0, 5);
  return `${day}/${month}/${year} · ${start}–${end}`;
}
