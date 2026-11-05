import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStudentShell } from '../components/workspace/studentShell';
import { useHasClassRegistration } from '../components/workspace/studentNav';
import {
  getClassDetail,
  getClasses,
  getSports,
  registerClass,
  getBlockedClasses,
  getClassRegistrationStatus,
  getPackages,
  cancelPayment,
  confirmMembershipRenewal,
  createMembershipRenewal,
  getPendingCheckouts,
  getMemberMembership,
} from '../api/managementApi';
import { formatFee } from '../data/accountManagement';
import PrivateRegistrationForm from '../components/private/PrivateRegistrationForm';

// Đơn chờ thanh toán chỉ giữ 3 phút (khớp với backend), quá hạn thì hủy và quay lại form đăng ký.
const PAYMENT_TIMEOUT_SECONDS = 180;
const PAID_REDIRECT_SECONDS = 5;
const MY_COURSES_PATH = '/hoc-vien-dashboard';

const TYPE_OPTIONS = [
  {
    value: 'group',
    title: 'Học nhóm',
    description: 'Đăng ký vào lớp có sẵn, thanh toán ngay.',
    icon: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M21 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
  {
    value: 'private',
    title: 'Học 1-1',
    description: 'Chọn lịch và HLV riêng, chờ quản lý duyệt rồi mới thanh toán.',
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
      </>
    ),
  },
];

const formatCountdown = (seconds) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

const fieldClass =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none ring-[#e31b23] focus:ring-2';
const primaryButtonClass =
  'rounded-xl bg-[#e31b23] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300';

export default function ClassRegistrationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Lấy ID từ URL Query Param hoặc State
  const initialClassId = searchParams.get('classId') || location.state?.classId;
  const initialPackageId = searchParams.get('packageId') || location.state?.packageId;
  // Hình thức học: group (lớp nhóm) hoặc private (1-1). Chưa chọn thì hiện hai lựa chọn; mở từ một lớp cụ thể thì vào thẳng lớp nhóm.
  const [type, setType] = useState(() => {
    const requested = searchParams.get('type');
    if (requested === 'group' || requested === 'private') return requested;
    return initialClassId || initialPackageId ? 'group' : '';
  });
  // Bấm lại menu "Đăng ký khóa học" (URL không còn ?type) thì về màn chọn hình thức.
  const typeParam = searchParams.get('type');
  useEffect(() => {
    if (typeParam === 'group' || typeParam === 'private') setType(typeParam);
    else if (!initialClassId && !initialPackageId) setType('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeParam]);

  // State danh sách
  const [sportsList, setSportsList] = useState([]);
  const [classList, setClassList] = useState([]);
  // Lớp học viên đã ghi danh: không cho chọn lại (backend cũng chặn trùng lớp, trùng khóa và trùng lịch).
  const [blockedClasses, setBlockedClasses] = useState(() => new Map());
  const [packages, setPackages] = useState([]);

  // Tài khoản mới: lớp tự chọn, bắt buộc mua hội viên mới dùng cơ sở vật chất.
  // Đã có lớp: đăng ký lớp tiếp, gói hội viên là lựa chọn thêm.
  const renewOnly = searchParams.get('mode') === 'renew';
  const hasClass = useHasClassRegistration(Boolean(user?.id) && !renewOnly);
  const membershipOptional = hasClass === true && !renewOnly;
  // Đã có lớp thì vào thẳng phần chọn lớp, không còn ô tick.
  const [includeClass, setIncludeClass] = useState(() => Boolean(initialClassId) || searchParams.get('type') === 'group' || searchParams.get('type') === 'private');
  const withClass = membershipOptional || includeClass;
  const [skipMembership, setSkipMembership] = useState(true);

  // State lựa chọn
  const [selectedSportId, setSelectedSportId] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [pickedPackage, setSelectedPackage] = useState(null);

  // Gói cao nhất học viên đang có: khóa các gói rẻ hơn.
  const [ownedPackageId, setOwnedPackageId] = useState(null);
  const ownedPackage = packages.find((pkg) => String(pkg.id) === String(ownedPackageId)) || null;
  const isPackageLocked = (pkg) => !!ownedPackage && (pkg?.fee || 0) < (ownedPackage.fee || 0);
  const selectedPackage = membershipOptional && skipMembership
    ? null
    : pickedPackage && isPackageLocked(pickedPackage)
      ? ownedPackage
      : pickedPackage;

  const [loading, setLoading] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form Thông tin cá nhân
  const [fullName, setFullName] = useState(user?.fullName || user?.userName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Nam');

  // Kết quả & Thanh toán từ Server
  const [registrationResult, setRegistrationResult] = useState(null);
  const [paymentStatusData, setPaymentStatusData] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [redirectLeft, setRedirectLeft] = useState(PAID_REDIRECT_SECONDS);
  const [membershipAfterPay, setMembershipAfterPay] = useState(null);

  // 1. Fetch danh sách Gói hội viên, Thông tin Lớp học ban đầu & Danh sách Bộ môn
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError('');

        // 1.1 Fetch danh sách Gói hội viên
        const pkgs = await getPackages().catch(() => []);
        if (Array.isArray(pkgs)) {
          setPackages(pkgs);
          const bronze = pkgs.find((p) => p.code === 'PKG-001' || p.name?.toLowerCase().includes('đồng'));
          if (initialPackageId) {
            const foundPkg = pkgs.find((p) => p.id === initialPackageId || p.code === initialPackageId);
            if (foundPkg) setSelectedPackage(foundPkg);
            else if (bronze) setSelectedPackage(bronze);
          } else if (bronze) {
            setSelectedPackage(bronze);
          } else if (pkgs.length > 0) {
            setSelectedPackage(pkgs[0]);
          }
        }

        // 1.2 Fetch thông tin lớp chi tiết nếu có initialClassId
        if (initialClassId) {
          const classDetail = await getClassDetail(initialClassId);
          setSelectedClass(classDetail);
          if (classDetail?.sportId) {
            setSelectedSportId(classDetail.sportId);
          }
        }

        // 1.3 Fetch danh sách Bộ môn
        const sportsData = await getSports('1').catch(() => []);
        if (Array.isArray(sportsData) && sportsData.length > 0) {
          setSportsList(sportsData);
          setSelectedSportId((prevSportId) => prevSportId || sportsData[0].id);
        }
      } catch (err) {
        setError(err.message || 'Không thể tải thông tin đăng ký.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [initialClassId, initialPackageId]);

  // 2. Tự động tải danh sách Lớp học MỖI KHI selectedSportId THAY ĐỔI và BẬT TICK KÈM LỚP
  useEffect(() => {
    if (!selectedSportId || !withClass || (!renewOnly && type !== 'group')) return;

    async function loadClassesForSport() {
      try {
        setLoadingClasses(true);
        const [classesData, blocks] = await Promise.all([
          getClasses('1', selectedSportId),
          user?.id ? getBlockedClasses().catch(() => []) : Promise.resolve([]),
        ]);
        const blocked = new Map(
          (Array.isArray(blocks) ? blocks : []).map((item) => [String(item.classId), item.reason]),
        );
        setBlockedClasses(blocked);
        const unique = Array.isArray(classesData)
          ? classesData.filter((item, index, list) => list.findIndex((other) => String(other.id) === String(item.id)) === index)
          : [];
        if (unique.length > 0) {
          setClassList(unique);
          const open = unique.find((cls) => !blocked.has(String(cls.id)));
          if (!selectedClass || selectedClass.sportId !== selectedSportId || blocked.has(String(selectedClass.id))) {
            setSelectedClass(open || null);
          }
        } else {
          setClassList([]);
          setSelectedClass(null);
        }
      } catch (err) {
        console.error('Lỗi tải danh sách lớp:', err);
        setClassList([]);
        setSelectedClass(null);
      } finally {
        setLoadingClasses(false);
      }
    }

    loadClassesForSport();
  }, [selectedSportId, withClass, type, renewOnly]);

  const handleSportChange = (sportId) => {
    setSelectedSportId(sportId);
  };

  useEffect(() => {
    if (user) {
      if (!fullName) setFullName(user.fullName || user.userName || '');
      if (!phone) setPhone(user.phone || '');
    }
  }, [user]);

  // Polling kiểm tra trạng thái thanh toán từ API
  useEffect(() => {
    if (!registrationResult?.paymentId) return;

    const checkStatus = async () => {
      try {
        const status =
          registrationResult.kind === 'membership'
            ? await confirmMembershipRenewal(user?.id, registrationResult.paymentId)
            : await getClassRegistrationStatus(registrationResult.paymentId);
        setPaymentStatusData(status);
      } catch {
        // Ignored
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [registrationResult, user?.id]);

  useEffect(() => {
    if (hasClass) setSkipMembership(true);
  }, [hasClass]);

  // Gói cao nhất đang có để khóa các gói thấp hơn
  useEffect(() => {
    if (!user?.id) return undefined;

    let active = true;
    getMemberMembership(user.id)
      .then((res) => {
        if (active) setOwnedPackageId(res?.highestPackageId || null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user?.id]);

  // Khôi phục đơn chưa thanh toán nếu có
  useEffect(() => {
    if (!user?.id) return undefined;

    let active = true;
    const restorePending = async () => {
      const pending = await getPendingCheckouts().catch(() => []);
      const latest = Array.isArray(pending) ? pending[0] : null;
      if (!active || !latest) return;
      setRegistrationResult((current) =>
        current || {
          ...latest,
          packageName: latest.packageName || (latest.kind === 'class' ? 'Hạng Đồng (tặng kèm lớp)' : null),
          isExisting: true,
          deadline: Date.now() + latest.expiresInSeconds * 1000,
        }
      );
      setNow(Date.now());
    };
    restorePending();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const qrImage = registrationResult?.payosQrImage || '';
  const isPaid = paymentStatusData?.paymentStatus === 'paid' || paymentStatusData?.paymentStatus === 'success';
  const secondsLeft = registrationResult?.deadline
    ? Math.max(0, Math.ceil((registrationResult.deadline - now) / 1000))
    : 0;

  // Đếm ngược giữ đơn
  useEffect(() => {
    if (!registrationResult?.deadline || isPaid) return undefined;

    const result = registrationResult;
    const tick = setInterval(async () => {
      const current = Date.now();
      setNow(current);
      if (current < result.deadline) return;

      clearInterval(tick);
      try {
        const status =
          result.kind === 'membership'
            ? await confirmMembershipRenewal(user?.id, result.paymentId)
            : await getClassRegistrationStatus(result.paymentId);
        if (status?.paymentStatus === 'paid') {
          setPaymentStatusData(status);
          return;
        }
      } catch {
        // Ignored
      }

      await cancelPayment(result.paymentId).catch(() => {});
      setRegistrationResult(null);
      setPaymentStatusData(null);
      setError(`Hết ${PAYMENT_TIMEOUT_SECONDS / 60} phút giữ đơn nên đơn đã bị hủy. Vui lòng bấm đăng ký lại.`);
    }, 1000);
    return () => clearInterval(tick);
  }, [registrationResult, isPaid, user?.id]);

  // Tự chuyển trang khi thanh toán xong
  useEffect(() => {
    if (!isPaid) return undefined;
    let active = true;
    if (user?.id) {
      getMemberMembership(user.id)
        .then((res) => {
          if (!active || !res) return;
          setMembershipAfterPay({
            planName: res.currentMembership?.planName || '',
            endDate: res.membershipEndDate || res.currentMembership?.endDate || '',
          });
        })
        .catch(() => {});
    }

    const until = Date.now() + PAID_REDIRECT_SECONDS * 1000;
    const tick = setInterval(() => {
      const left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setRedirectLeft(left);
      if (left === 0) {
        clearInterval(tick);
        navigate(MY_COURSES_PATH);
      }
    }, 250);
    return () => {
      active = false;
      clearInterval(tick);
    };
  }, [isPaid, navigate, user?.id]);

  const isBronzePackage = (pkg) =>
    !!pkg && (pkg.name?.toLowerCase().includes('đồng') || pkg.code === 'PKG-001');

  const calculatePackagePrice = (pkg) => {
    if (!pkg) return 0;
    if (!withClass) return pkg.fee || 0;
    if (isBronzePackage(pkg)) return ownedPackage ? pkg.fee || 0 : 0;
    const percent = Number(pkg.upgradeDiscountPercent) || 0;
    if (percent <= 0) return pkg.fee || 0;
    return Math.round(((pkg.fee || 0) * (100 - percent)) / 100);
  };

  const packageFeeNow = () => (membershipOptional && skipMembership ? 0 : calculatePackagePrice(selectedPackage));

  const calculateTotalFee = () => {
    const packageFee = packageFeeNow();
    const classTuition = withClass ? selectedClass?.tuition || 0 : 0;
    return packageFee + classTuition;
  };

  // Submit Đăng ký
  const handleSubmitRegistration = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');

    if (!(membershipOptional && skipMembership) && !selectedPackage?.id) {
      setError('Vui lòng chọn một gói hội viên.');
      return;
    }

    if (withClass && type === 'private') return;

    if (withClass && !selectedClass?.id) {
      setError('Vui lòng chọn lớp học huấn luyện.');
      return;
    }

    if (withClass && blockedClasses.has(String(selectedClass.id))) {
      setError(blockedClasses.get(String(selectedClass.id)));
      return;
    }

    // Nếu chỉ mua gói hội viên
    if (!withClass) {
      setSubmitting(true);
      try {
        const res = await createMembershipRenewal(user?.id, selectedPackage.id);
        setRegistrationResult({
          ...res,
          kind: 'membership',
          packageName: res.planName,
          payosQrImage: res.qrImage,
          paymentUrl: res.checkoutUrl,
          deadline: Date.now() + (res.expiresInSeconds ?? PAYMENT_TIMEOUT_SECONDS) * 1000,
        });
        setNow(Date.now());
      } catch (err) {
        setError(err.message || 'Không tạo được đơn gia hạn. Vui lòng thử lại.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Đăng ký cả gói + lớp học
    if (!fullName.trim() || !phone.trim()) {
      setError('Vui lòng điền đầy đủ họ và tên và số điện thoại.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        sportId: selectedSportId || sportsList[0]?.id || '1',
        classId: selectedClass.id,
        ...(selectedClass?.nextSlot?.id ? { slotId: selectedClass.nextSlot.id } : {}),
        ...(membershipOptional && skipMembership
          ? { renewMembership: false }
          : {
              ...(ownedPackage ? { renewMembership: true } : {}),
              ...(selectedPackage?.id && !(isBronzePackage(selectedPackage) && !ownedPackage)
                ? { membershipPackageId: selectedPackage.id }
                : {}),
            }),
        fullName: fullName.trim(),
        phone: phone.trim(),
        ...(dateOfBirth ? { dateOfBirth } : {}),
        gender,
      };

      const res = await registerClass(payload);
      setRegistrationResult({
        ...res,
        deadline: Date.now() + (res.expiresInSeconds ?? PAYMENT_TIMEOUT_SECONDS) * 1000,
      });
      setNow(Date.now());
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAndRetry = async () => {
    if (registrationResult?.paymentId && typeof cancelPayment === 'function') {
      try {
        await cancelPayment(registrationResult.paymentId).catch(() => {});
      } catch {
        // Ignored
      }
    }
    setRegistrationResult(null);
    setPaymentStatusData(null);
  };

  const pageTitle = renewOnly ? 'Gia hạn gói hội viên' : 'Đăng ký hội viên';
  const packageSummaryName = membershipOptional && skipMembership
      ? 'Không gia hạn'
      : !selectedPackage
      ? 'Chưa chọn'
      : withClass && isBronzePackage(selectedPackage)
        ? `${selectedPackage.name} (bắt buộc, tặng kèm)`
        : selectedPackage.name;

  useStudentShell({ breadcrumb: [{ label: 'Học viên', to: MY_COURSES_PATH }, { label: pageTitle }] }, [pageTitle]);
  useEffect(() => {
    document.title = `${pageTitle} · AnhDuy Sport`;
  }, [pageTitle]);

  return (
    <>
      <h1 className="text-2xl font-black text-balance">{pageTitle}</h1>
      <p className="mt-2 max-w-2xl text-sm text-pretty text-slate-500">
        {renewOnly
          ? 'Chọn gói để gia hạn hoặc nâng hạng. Bước này không đăng ký lớp.'
          : membershipOptional
            ? 'Bạn đã có lớp. Đăng ký lớp tiếp theo chỉ đóng học phí. Tích gia hạn gói nếu muốn gia hạn hoặc nâng hạng, kèm lớp vẫn được giảm giá.'
            : 'Tài khoản chưa có lớp. Đăng ký lớp là tự chọn, nhưng phải mua hội viên thì mới dùng được cơ sở vật chất. Kèm lớp thì Hạng Đồng được tặng.'}
      </p>

      {loading || (!renewOnly && hasClass === null) ? (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8" aria-busy="true">
          <p className="text-sm font-semibold text-slate-500">Đang tải lớp và gói hội viên...</p>
        </div>
      ) : registrationResult ? (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-xl font-black text-balance">
            {isPaid ? 'Đã thanh toán' : registrationResult.isExisting ? 'Đơn đang chờ thanh toán' : 'Đơn đã tạo'}
          </h2>
          <p className="mt-2 text-sm text-pretty text-slate-600">
            {isPaid
              ? 'Thanh toán đã được ghi nhận.'
              : 'Quét mã hoặc mở trang thanh toán. Trang tự cập nhật khi thanh toán xong.'}
          </p>
          {isPaid && membershipAfterPay?.endDate && (
            <p className="mt-3 text-sm font-semibold text-slate-800">
              Gói {membershipAfterPay.planName || 'hội viên'} có hiệu lực đến hết{' '}
              {new Date(membershipAfterPay.endDate).toLocaleDateString('vi-VN')}.
            </p>
          )}
          {isPaid && (
            <p className="mt-2 text-sm text-slate-600">
              Chuyển về trang học viên sau <span className="font-bold text-emerald-700">{redirectLeft}</span> giây.
            </p>
          )}

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Mã hóa đơn</dt>
                <dd className="font-bold text-[#b1131a]">{registrationResult.invoiceCode || registrationResult.paymentId}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Gói hội viên</dt>
                <dd className="font-bold">
                  {registrationResult.packageName ||
                    registrationResult.membershipPackage?.name ||
                    packageSummaryName}
                </dd>
              </div>
              {(registrationResult.className || (withClass && selectedClass)) && (
                <div>
                  <dt className="text-slate-500">Lớp</dt>
                  <dd className="font-bold">{registrationResult.className || selectedClass?.name}</dd>
                </div>
              )}
              <div>
                <dt className="text-slate-500">Số tiền</dt>
                <dd className="text-lg font-black">
                  {formatFee(registrationResult.amount !== undefined ? registrationResult.amount : calculateTotalFee())}
                </dd>
              </div>
            </dl>

            <div className="flex flex-col items-center text-center">
              {isPaid ? (
                <p className="text-sm font-semibold text-emerald-700">Thanh toán thành công.</p>
              ) : qrImage ? (
                <>
                  <img src={qrImage} alt="Mã VietQR payOS" className="h-52 w-52 rounded-xl border border-slate-200 bg-white object-contain p-2" />
                  <p className="mt-2 text-sm text-slate-600">Quét mã bằng ứng dụng ngân hàng.</p>
                  <p className={`mt-1 text-sm font-bold ${secondsLeft <= 30 ? 'text-[#b1131a]' : 'text-amber-700'}`}>
                    Mã hết hạn sau {formatCountdown(secondsLeft)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-600">Chưa tạo được mã QR. Thanh toán tại quầy với mã hóa đơn bên cạnh.</p>
              )}
              {!isPaid && registrationResult.paymentUrl && (
                <a href={registrationResult.paymentUrl} target="_blank" rel="noreferrer" className="mt-3 text-sm font-bold text-[#e31b23]">
                  Mở trang thanh toán
                </a>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {registrationResult.isExisting && !isPaid && (
              <button type="button" onClick={handleCancelAndRetry} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800">
                Hủy đơn và chọn lại
              </button>
            )}
            <button type="button" onClick={() => navigate(MY_COURSES_PATH)} className={primaryButtonClass}>
              {isPaid ? 'Về trang học viên' : 'Về trang học viên'}
            </button>
          </div>
        </section>
      ) : withClass && type === 'private' ? (
        <div className="mt-6">
          {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
          <button type="button" onClick={() => { setType(''); if (!membershipOptional) setIncludeClass(false); }} className="mb-4 cursor-pointer text-sm font-bold text-slate-500 hover:text-[#e31b23]">
            {membershipOptional ? '← Chọn hình thức khác' : '← Chỉ đăng ký hội viên'}
          </button>
          <PrivateRegistrationForm
            user={user}
            membershipOptional={membershipOptional}
            onPaymentCreated={(res) => {
              setRegistrationResult(res);
              setNow(Date.now());
            }}
          />
        </div>
      ) : (
        <form onSubmit={handleSubmitRegistration} className="mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            {!renewOnly && !membershipOptional && (
              <label className="flex cursor-pointer items-start gap-3 rounded-3xl border border-slate-200 bg-white p-5">
                <input
                  type="checkbox"
                  checked={includeClass}
                  onChange={(event) => {
                    setIncludeClass(event.target.checked);
                    if (!event.target.checked) setType('');
                  }}
                  className="mt-1 accent-[#e31b23]"
                />
                <span>
                  <span className="block text-sm font-black text-slate-900">Đăng ký kèm lớp</span>
                  <span className="mt-1 block text-sm text-slate-500">
                    Tự chọn. Có huấn luyện viên dạy. Không chọn thì chỉ mua hội viên để dùng cơ sở vật chất. Kèm lớp thì Hạng Đồng được tặng.
                  </span>
                </span>
              </label>
            )}
            {withClass && !type && (
              <div className="grid gap-4 sm:grid-cols-2">
                {TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setType(option.value)}
                    className="group flex cursor-pointer flex-col rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-xs transition-colors hover:border-[#e31b23]"
                  >
                    <span className="block text-lg font-black text-slate-900">{option.title}</span>
                    <span className="mt-1 block text-sm text-pretty text-slate-500">{option.description}</span>
                  </button>
                ))}
              </div>
            )}
            {withClass && type === 'group' && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-black">Lớp học</h2>
                  <button type="button" onClick={() => setType('')} className="text-xs font-bold text-slate-500 hover:text-[#e31b23]">Đổi hình thức</button>
                </div>
                <p className="mt-1 text-sm text-slate-500">Chọn môn và lớp muốn đăng ký.</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-bold text-slate-700">
                    Bộ môn
                    <select value={selectedSportId} onChange={(event) => handleSportChange(event.target.value)} className={fieldClass}>
                      {sportsList.map((sport) => (
                        <option key={sport.id} value={sport.id}>{sport.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-bold text-slate-700">
                    Lớp
                    <select
                      value={selectedClass?.id || ''}
                      disabled={loadingClasses || classList.length === 0}
                      onChange={(event) => {
                        const next = classList.find((item) => item.id === event.target.value);
                        if (next) setSelectedClass(next);
                      }}
                      className={fieldClass}
                    >
                      {loadingClasses ? (
                        <option value="">Đang tải lớp...</option>
                      ) : classList.length > 0 ? (
                        <>
                          {!selectedClass && <option value="">Không còn lớp không bị trùng</option>}
                          {classList.map((item) => {
                            const reason = blockedClasses.get(String(item.id));
                            return (
                              <option key={item.id} value={item.id} disabled={Boolean(reason)}>
                                {item.name} ({formatFee(item.tuition)}){reason ? ` · ${reason}` : ''}
                              </option>
                            );
                          })}
                        </>
                      ) : (
                        <option value="">Chưa có lớp mở cho môn này</option>
                      )}
                    </select>
                  </label>
                </div>
                {selectedClass ? (
                  <dl className="mt-4 grid gap-2 rounded-2xl bg-[#f4f5f7] p-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">Lớp</dt>
                      <dd className="font-bold">{selectedClass.name}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Huấn luyện viên</dt>
                      <dd className="font-semibold">{selectedClass.coachName || 'Đang cập nhật'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Thời gian</dt>
                      <dd className="font-semibold">{selectedClass.startDate} – {selectedClass.endDate}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Học phí</dt>
                      <dd className="font-black text-[#b1131a]">{formatFee(selectedClass.tuition)}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">
                    {classList.length > 0
                      ? 'Các lớp của môn này trùng lớp đã đăng ký, cùng khóa hoặc trùng lịch.'
                      : 'Môn này chưa có lớp đang mở.'}
                  </p>
                )}
              </section>
            )}

            {membershipOptional && (
              <label className="flex cursor-pointer items-start gap-3 rounded-3xl border border-slate-200 bg-white p-5">
                <input
                  type="checkbox"
                  checked={!skipMembership}
                  onChange={(event) => setSkipMembership(!event.target.checked)}
                  className="mt-1 accent-[#e31b23]"
                />
                <span>
                  <span className="block text-sm font-black text-slate-900">Gia hạn gói</span>
                  <span className="mt-1 block text-sm text-slate-500">
                    Tích để gia hạn hoặc nâng hạng, kèm lớp vẫn được giảm giá. Không tích thì chỉ đóng học phí lớp.
                  </span>
                </span>
              </label>
            )}

            {(!membershipOptional || !skipMembership) && (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-black">{membershipOptional ? 'Gia hạn gói hội viên' : 'Gói hội viên'}</h2>
              <p className="mt-1 text-sm text-pretty text-slate-500">
                {renewOnly
                  ? 'Gia hạn đúng gói đang có, hoặc nâng lên hạng cao hơn.'
                  : membershipOptional
                  ? 'Gia hạn đúng gói đang có, hoặc nâng lên hạng cao hơn. Kèm lớp vẫn được giảm giá.'
                  : withClass
                    ? 'Bắt buộc mua hội viên mới dùng được. Kèm lớp thì Hạng Đồng được tặng, Hạng Bạc hoặc Hạng Vàng được giảm giá.'
                    : 'Bắt buộc mua hội viên mới dùng được cơ sở vật chất. Chưa kèm lớp nên đóng đủ phí gói.'}
              </p>
              {ownedPackage && (
                <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                  Bạn đang có {ownedPackage.name} nên chỉ gia hạn {ownedPackage.name} hoặc nâng lên hạng cao hơn.
                </p>
              )}
              <div className="mt-4 space-y-3">
                {packages.map((pkg) => {
                  const isSelected = !(membershipOptional && skipMembership) && selectedPackage?.id === pkg.id;
                  const isLocked = isPackageLocked(pkg);
                  const price = calculatePackagePrice(pkg);
                  return (
                    <label
                      key={pkg.id}
                      className={`block rounded-2xl border p-4 ${
                        isLocked
                          ? 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-60'
                          : isSelected
                            ? 'cursor-pointer border-[#e31b23] bg-red-50/50'
                            : 'cursor-pointer border-slate-200 bg-white'
                      }`}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="package_select"
                            checked={isSelected}
                            disabled={isLocked}
                            onChange={() => {
                              if (isLocked) return;
                              setSkipMembership(false);
                              setSelectedPackage(pkg);
                            }}
                            className="mt-1 accent-[#e31b23]"
                          />
                          <span>
                            <span className="block text-sm font-black text-slate-900">
                              {pkg.name}
                              {isLocked ? ' · thấp hơn gói đang có' : ''}
                            </span>
                            <span className="mt-0.5 block text-sm text-slate-500">Thời hạn {pkg.validityMonths || 1} tháng</span>
                            {withClass && isBronzePackage(pkg) && !ownedPackage && (
                              <span className="mt-1 block text-sm font-semibold text-emerald-700">
                                Tặng khi đăng ký kèm lớp, không tính thêm phí.
                              </span>
                            )}
                            {withClass && !isBronzePackage(pkg) && !isLocked && (
                              <span className="mt-1 block text-sm text-slate-500">
                                {ownedPackage ? 'Gia hạn hoặc nâng hạng kèm lớp, vẫn được giảm giá.' : 'Nâng hạng thay cho Hạng Đồng tặng kèm.'}
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="shrink-0 text-right text-sm font-black">
                          {withClass && isBronzePackage(pkg) && !ownedPackage ? (
                            <span className="text-emerald-700">0đ</span>
                          ) : withClass && Number(pkg.upgradeDiscountPercent) > 0 ? (
                            <span>
                              <span className="block text-[#b1131a]">{formatFee(price)}</span>
                              <span className="block text-xs font-semibold text-slate-400 line-through">{formatFee(pkg.fee)}</span>
                              <span className="block text-xs font-semibold text-emerald-700">Giảm {pkg.upgradeDiscountPercent}%</span>
                            </span>
                          ) : (
                            formatFee(pkg.fee)
                          )}
                        </span>
                      </span>
                      {Array.isArray(pkg.benefits) && pkg.benefits.length > 0 && (
                        <ul className="mt-3 list-disc space-y-1 pl-9 text-sm text-slate-600">
                          {pkg.benefits.map((benefit) => (
                            <li key={benefit}>{benefit}</li>
                          ))}
                        </ul>
                      )}
                    </label>
                  );
                })}
              </div>
            </section>
            )}

            {withClass && type === 'group' && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
                <h2 className="text-lg font-black">Thông tin học viên</h2>
                <p className="mt-1 text-sm text-slate-500">Dùng để ghi trên hóa đơn.</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-bold text-slate-700 sm:col-span-2">
                    Họ và tên
                    <input value={fullName} onChange={(event) => setFullName(event.target.value)} className={fieldClass} placeholder="Nguyễn Văn A" />
                  </label>
                  <label className="block text-sm font-bold text-slate-700">
                    Số điện thoại
                    <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" className={fieldClass} placeholder="0901234567" />
                  </label>
                  <label className="block text-sm font-bold text-slate-700">
                    Ngày sinh
                    <input type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} className={fieldClass} />
                  </label>
                  <label className="block text-sm font-bold text-slate-700">
                    Giới tính
                    <select value={gender} onChange={(event) => setGender(event.target.value)} className={fieldClass}>
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </label>
                </div>
              </section>
            )}
          </div>

          <aside className="rounded-3xl border border-slate-200 bg-white p-5 lg:sticky lg:top-4">
            <h2 className="text-lg font-black">Tóm tắt</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-600">Gói hội viên</dt>
                <dd className="text-right font-bold">{packageSummaryName}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-600">Phí gói</dt>
                <dd className="font-bold">
                  {formatFee(packageFeeNow())}
                </dd>
              </div>
              {withClass && selectedClass && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-slate-600">Học phí {selectedClass.name}</dt>
                  <dd className="font-bold">{formatFee(selectedClass.tuition || 0)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-3 border-t border-slate-100 pt-3">
                <dt className="font-black text-slate-900">Tổng thanh toán</dt>
                <dd className="text-xl font-black text-[#b1131a]">{formatFee(calculateTotalFee())}</dd>
              </div>
            </dl>
            {error && <p className="mt-4 text-sm font-semibold text-[#b1131a]">{error}</p>}
            <button
              type="submit"
              disabled={submitting || (withClass && (type !== 'group' || !selectedClass)) || (!(membershipOptional && skipMembership) && !selectedPackage)}
              className={`${primaryButtonClass} mt-4 w-full`}
            >
              {submitting ? 'Đang tạo đơn...' : 'Tạo mã thanh toán'}
            </button>
            <p className="mt-3 text-sm text-slate-500">Thanh toán qua VietQR / payOS.</p>
          </aside>
        </form>
      )}
    </>
  );
}

