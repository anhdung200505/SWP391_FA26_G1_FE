import React, { useState, useEffect } from 'react';
import {
  lookupMember,
  registerGuestAccount,
  createClassRegistrationForMember,
  confirmRegistrationPayment,
  getReceptionRegistrationStatus,
  cancelReceptionRegistration,
} from '../../api/receptionClassRegistrationApi';
import {
  getPackages,
  getSports,
  getClasses,
  getMemberMembership,
} from '../../api/managementApi';

const formatFee = (fee) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(fee || 0);

export default function ReceptionClassRegistration({ onRegistrationSuccess }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingStep2Data, setLoadingStep2Data] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ================= BƯỚC 1 STATE =================
  const [searchKeyword, setSearchKeyword] = useState('');
  const [foundMember, setFoundMember] = useState(null);
  const [isRegisteringGuest, setIsRegisteringGuest] = useState(false);
  const [guestForm, setGuestForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: 'DefaultPassword123@',
  });

  // ================= BƯỚC 2 STATE =================
  const [packages, setPackages] = useState([]);
  const [sportsList, setSportsList] = useState([]);
  const [classList, setClassList] = useState([]);

  const includeClass = true;
  const [selectedSportId, setSelectedSportId] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [pickedPackage, setSelectedPackage] = useState(null);

  // Gói cao nhất học viên đang có để khóa các gói rẻ hơn
  const [ownedPackageId, setOwnedPackageId] = useState(null);
  const ownedPackage = packages.find((pkg) => String(pkg.id) === String(ownedPackageId)) || null;
  const isPackageLocked = (pkg) => !!ownedPackage && (pkg?.fee || 0) < (ownedPackage.fee || 0);
  const selectedPackage = pickedPackage && isPackageLocked(pickedPackage) ? ownedPackage : pickedPackage;

  // Form Thông tin cá nhân học viên bổ sung
  const [dateOfBirth, setDateOfBirth] = useState('2000-01-01');
  const [gender, setGender] = useState('Nam');

  // ================= BƯỚC 3 STATE =================
  const [pendingOrder, setPendingOrder] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  const showErr = (msg) => {
    setError(msg);
    setTimeout(() => setError(''), 4000);
  };

  const showSucc = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

  // Load danh sách Gói, Bộ môn & Gói hiện tại của Học viên khi chuyển sang Bước 2
  useEffect(() => {
    if (step !== 2 || !foundMember?.id) return;

    async function fetchStep2Data() {
      try {
        setLoadingStep2Data(true);
        setError('');

        // 1. Fetch danh sách Gói hội viên
        const pkgs = await getPackages().catch(() => []);
        if (Array.isArray(pkgs)) {
          setPackages(pkgs);
          if (pkgs.length > 0) {
            const defaultPkg = pkgs.find((p) => p.name?.includes('Bạc')) || pkgs[0];
            setSelectedPackage(defaultPkg);
          }
        }

        // 2. Fetch danh sách Bộ môn
        const sportsData = await getSports('1').catch(() => []);
        if (Array.isArray(sportsData) && sportsData.length > 0) {
          setSportsList(sportsData);
          setSelectedSportId(sportsData[0].id);
        }

        // 3. Tải gói hội viên hiện có của member
        const memRes = await getMemberMembership(foundMember.id).catch(() => null);
        if (memRes?.highestPackageId) {
          setOwnedPackageId(memRes.highestPackageId);
        }
      } catch (err) {
        showErr(err.message || 'Không thể tải dữ liệu gói hội viên và lớp học.');
      } finally {
        setLoadingStep2Data(false);
      }
    }

    fetchStep2Data();
  }, [step, foundMember?.id]);

  // Tự động tải danh sách Lớp học mỗi khi selectedSportId thay đổi và bật tích includeClass
  useEffect(() => {
    if (!selectedSportId || !includeClass || step !== 2) return;

    async function loadClassesForSport() {
      try {
        setLoadingClasses(true);
        const classesData = await getClasses('1', selectedSportId);
        if (Array.isArray(classesData) && classesData.length > 0) {
          setClassList(classesData);
          setSelectedClass(classesData[0]);
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
  }, [selectedSportId, includeClass, step]);

  const isPaid = paymentStatus?.paymentStatus === 'paid' || paymentStatus?.paymentStatus === 'success';
  const qrImage = pendingOrder?.payosQrImage || '';
  const secondsLeft = pendingOrder?.deadline
    ? Math.max(0, Math.ceil((pendingOrder.deadline - now) / 1000))
    : 0;

  // Hỏi payOS vài giây một lần, giống màn thanh toán của học viên.
  useEffect(() => {
    if (step !== 3 || !pendingOrder?.paymentId || isPaid) return undefined;

    const checkStatus = async () => {
      try {
        const status = await getReceptionRegistrationStatus(pendingOrder.paymentId);
        setPaymentStatus(status);
        if (status?.paymentStatus === 'paid' || status?.paymentStatus === 'success') {
          setStep(4);
        }
      } catch {
        // Giữ màn QR, lần hỏi sau sẽ thử lại.
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [step, pendingOrder, isPaid]);

  // Hết giờ giữ đơn: hỏi lần cuối, chưa trả thì hủy và quay lại bước chọn lớp.
  useEffect(() => {
    if (step !== 3 || !pendingOrder?.deadline || isPaid) return undefined;

    const order = pendingOrder;
    const tick = setInterval(async () => {
      const current = Date.now();
      setNow(current);
      if (current < order.deadline) return;

      clearInterval(tick);
      try {
        const status = await getReceptionRegistrationStatus(order.paymentId);
        if (status?.paymentStatus === 'paid' || status?.paymentStatus === 'success') {
          setPaymentStatus(status);
          setStep(4);
          return;
        }
      } catch {
        // Không hỏi được thì vẫn hủy đơn.
      }

      await cancelReceptionRegistration(order.paymentId).catch(() => {});
      setPendingOrder(null);
      setPaymentStatus(null);
      setStep(2);
      showErr('Hết thời gian giữ đơn nên đơn đã bị hủy. Vui lòng tạo lại.');
    }, 1000);
    return () => clearInterval(tick);
  }, [step, pendingOrder, isPaid]);

  // Logic tính giá Gói hội viên: CHỈ CHIẾT KHẤU KHI CÓ TÍCH ĐĂNG KÝ KÈM LỚP
  const calculatePackagePrice = (pkg) => {
    if (!pkg) return 0;
    if (!includeClass) return pkg.fee || 0;

    const isBronze = pkg.name?.toLowerCase().includes('đồng') || pkg.code === 'PKG-001';
    const isSilver = pkg.name?.toLowerCase().includes('bạc') || pkg.code === 'PKG-002';

    if (isBronze) return 0;
    if (isSilver) return (pkg.fee || 0) * 0.5;
    if (pkg.upgradeDiscountPercent) {
      return (pkg.fee || 0) * ((100 - pkg.upgradeDiscountPercent) / 100);
    }
    return pkg.fee || 0;
  };

  // Tính tổng tiền thanh toán = Giá gói + Học phí lớp
  const calculateTotalFee = () => {
    const packageFee = calculatePackagePrice(selectedPackage);
    const classTuition = includeClass ? selectedClass?.tuition || 0 : 0;
    return packageFee + classTuition;
  };

  // 1. Tra cứu học viên
  const handleSearchMember = async (e) => {
    e.preventDefault();
    if (!searchKeyword.trim()) return showErr('Vui lòng nhập Email hoặc Số điện thoại (10 số).');

    setLoading(true);
    setFoundMember(null);
    setIsRegisteringGuest(false);
    try {
      const data = await lookupMember(searchKeyword.trim());
      if (data && data.id) {
        setFoundMember(data);
        showSucc('Đã tìm thấy thông tin học viên!');
      } else {
        setIsRegisteringGuest(true);
      }
    } catch (err) {
      setIsRegisteringGuest(true);
      setGuestForm((prev) => ({
        ...prev,
        email: searchKeyword.includes('@') ? searchKeyword : '',
        phone: !searchKeyword.includes('@') ? searchKeyword : '',
      }));
    } finally {
      setLoading(false);
    }
  };

  // 2. Tạo nhanh tài khoản Guest
  const handleCreateGuest = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await registerGuestAccount(guestForm);
      const newMember = res.user;
      setFoundMember(newMember);
      showSucc('Tạo tài khoản học viên mới thành công!');
      setStep(2);
    } catch (err) {
      showErr(err.message || 'Tạo tài khoản học viên thất bại.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Submit Tạo Đơn Giữ Chỗ (Sử dụng API Lễ tân)
  const handleCreatePendingRegistration = async (e) => {
    e.preventDefault();
    if (!selectedPackage?.id) return showErr('Vui lòng chọn một gói hội viên.');
    if (!selectedClass?.id) return showErr('Vui lòng chọn lớp học. Gói hội viên chỉ mua kèm khi đăng ký lớp.');

    const isBronze = selectedPackage.name?.toLowerCase().includes('đồng') || selectedPackage.code === 'PKG-001';

    setLoading(true);
    try {
      const payload = {
        ...(includeClass ? { sportId: selectedSportId || sportsList[0]?.id || '1' } : {}),
        ...(includeClass && selectedClass?.id ? { classId: selectedClass.id } : {}),
        ...(includeClass && selectedClass?.nextSlot?.id ? { slotId: selectedClass.nextSlot.id } : {}),
        ...(!isBronze && selectedPackage?.id ? { membershipPackageId: selectedPackage.id } : {}),
        fullName: foundMember.fullName,
        phone: foundMember.phone,
        ...(dateOfBirth ? { dateOfBirth } : {}),
        gender,
      };

      const res = await createClassRegistrationForMember(foundMember.id, payload);
      setPaymentStatus(null);
      setPendingOrder({
        ...res,
        deadline: Date.now() + (res.expiresInSeconds ?? 180) * 1000,
      });
      setNow(Date.now());
      setStep(3);
      showSucc('Đã tạo mã VietQR. Học viên quét mã để thanh toán.');
    } catch (err) {
      showErr(err.message || 'Đăng ký lớp thất bại.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Xác nhận thu tiền tại quầy
  const handleConfirmPaymentAtDesk = async () => {
    if (!pendingOrder?.paymentId) return;
    setLoading(true);
    try {
      await confirmRegistrationPayment(pendingOrder.paymentId, 'cash');
      showSucc('Đã thu tiền mặt. Học viên được ghi danh vào lớp.');
      setStep(4);
    } catch (err) {
      showErr(err.message || 'Xác nhận thanh toán thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const backToClassStep = async () => {
    if (pendingOrder?.paymentId && !isPaid) {
      await cancelReceptionRegistration(pendingOrder.paymentId).catch(() => {});
    }
    setPendingOrder(null);
    setPaymentStatus(null);
    setStep(2);
  };

  const handleReset = () => {
    setStep(1);
    setSearchKeyword('');
    setFoundMember(null);
    setIsRegisteringGuest(false);
    setPendingOrder(null);
    setPaymentStatus(null);
  };

  const formatCountdown = (seconds) =>
    `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
      {/* HEADER BƯỚC THAO TÁC */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#e31b23] bg-red-50 px-3 py-1 rounded-full">
            ĐĂNG KÝ TẠI QUẦY LỄ TÂN
          </span>
          <h2 className="text-xl font-black text-slate-900 uppercase mt-1">
            Đăng Ký Lớp Cho Học Viên & Guest
          </h2>
        </div>

        {/* TIẾN TRÌNH 4 BƯỚC */}
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className={`px-3 py-1 rounded-full ${step === 1 ? 'bg-[#e31b23] text-white' : 'bg-slate-100 text-slate-500'}`}>
            1. Học viên
          </span>
          <span>→</span>
          <span className={`px-3 py-1 rounded-full ${step === 2 ? 'bg-[#e31b23] text-white' : 'bg-slate-100 text-slate-500'}`}>
            2. Chọn Lớp
          </span>
          <span>→</span>
          <span className={`px-3 py-1 rounded-full ${step === 3 ? 'bg-[#e31b23] text-white' : 'bg-slate-100 text-slate-500'}`}>
            3. Thanh Toán
          </span>
          <span>→</span>
          <span className={`px-3 py-1 rounded-full ${step === 4 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
            4. Hoàn tất
          </span>
        </div>
      </div>

      {/* THÔNG BÁO LỖI / THÀNH CÔNG */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-bold animate-fadeIn">
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold animate-fadeIn">
          ✓ {success}
        </div>
      )}

      {/* ================= BƯỚC 1: TRA CỨU / ĐĂNG KÝ HỌC VIÊN ================= */}
      {step === 1 && (
        <div className="space-y-6">
          <form onSubmit={handleSearchMember} className="space-y-3">
            <label className="block text-xs font-bold text-slate-700">
              Tra cứu Học viên cũ (Nhập chính xác Email hoặc Số điện thoại 10 số):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="VD: 0901234567 hoặc hocvien@gmail.com"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-xs font-semibold outline-none focus:border-[#e31b23]"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-slate-900 hover:bg-[#e31b23] text-white font-black text-xs uppercase px-6 py-3 rounded-2xl transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? 'ĐANG TÌM...' : '🔍 TRA CỨU'}
              </button>
            </div>
          </form>

          {foundMember && (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase bg-emerald-200 text-emerald-800 px-2.5 py-0.5 rounded">
                  Đã tìm thấy thông tin
                </span>
                <span className="text-xs text-slate-500 font-mono">ID: {foundMember.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-800">
                <p><strong>Họ & Tên:</strong> {foundMember.fullName}</p>
                <p><strong>Số điện thoại:</strong> {foundMember.phone}</p>
                <p><strong>Email:</strong> {foundMember.email}</p>
                <p><strong>Trạng thái:</strong> {foundMember.status || 'Hoạt động'}</p>
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase py-3 rounded-xl cursor-pointer"
              >
                XÁC NHẬN CHỌN HỌC VIÊN NÀY & TIẾP TỤC →
              </button>
            </div>
          )}

          {isRegisteringGuest && !foundMember && (
            <form onSubmit={handleCreateGuest} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <div className="border-b pb-2">
                <h3 className="text-xs font-black text-slate-900 uppercase">
                  ➕ Đăng ký nhanh tài khoản cho Khách Mới (Guest)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Không tìm thấy dữ liệu học viên. Tạo nhanh tài khoản để ghi danh.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={guestForm.fullName}
                    onChange={(e) => setGuestForm({ ...guestForm, fullName: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số điện thoại *</label>
                  <input
                    type="text"
                    required
                    placeholder="0901234567"
                    value={guestForm.phone}
                    onChange={(e) => setGuestForm({ ...guestForm, phone: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="guest@gmail.com"
                    value={guestForm.email}
                    onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mật khẩu khởi tạo</label>
                  <input
                    type="text"
                    value={guestForm.password}
                    onChange={(e) => setGuestForm({ ...guestForm, password: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none font-mono text-slate-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#e31b23] hover:bg-[#c4131a] text-white font-black text-xs uppercase py-3 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? 'ĐANG ĐĂNG KÝ...' : 'TẠO TÀI KHOẢN & TIẾP TỤC ĐĂNG KÝ LỚP'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ================= BƯỚC 2: CHỌN LỚP & MEMBERSHIP ================= */}
      {step === 2 && (
        <div className="space-y-6">
          {/* MỤC HỌC VIÊN ĐƯỢC CHỌN */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-center text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">HỌC VIÊN ĐƯỢC CHỌN:</span>
              <strong className="text-sm font-black text-slate-900">{foundMember?.fullName}</strong> ({foundMember?.phone} - {foundMember?.email})
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-[#e31b23] hover:underline font-bold"
            >
              Đổi học viên
            </button>
          </div>

          {loadingStep2Data ? (
            <div className="py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#e31b23] border-t-transparent mb-2"></div>
              <p className="text-xs font-bold text-slate-500">Đang tải danh sách gói hội viên & lớp học...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* CỘT TRÁI: CÁC BƯỚC CHỌN */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. CHỌN GÓI HỘI VIÊN */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="text-sm font-black text-slate-900 uppercase">1. CHỌN GÓI HỘI VIÊN</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {ownedPackage && (
                      <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        Học viên đang có gói {ownedPackage.name} nên chỉ gia hạn {ownedPackage.name} hoặc nâng cấp lên hạng cao hơn.
                      </p>
                    )}
                    {packages.map((pkg) => {
                      const isSelected = selectedPackage?.id === pkg.id;
                      const isLocked = isPackageLocked(pkg);
                      const discountedPrice = calculatePackagePrice(pkg);
                      const isBronze = pkg.name?.toLowerCase().includes('đồng') || pkg.code === 'PKG-001';
                      const isSilver = pkg.name?.toLowerCase().includes('bạc') || pkg.code === 'PKG-002';

                      return (
                        <div
                          key={pkg.id}
                          onClick={() => {
                            if (!isLocked) setSelectedPackage(pkg);
                          }}
                          className={`p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                            isLocked
                              ? 'border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed'
                              : isSelected
                              ? 'border-[#e31b23] bg-red-50/40 shadow-xs cursor-pointer'
                              : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="package_select_reception"
                              checked={isSelected}
                              disabled={isLocked}
                              onChange={() => {}}
                              className="accent-[#e31b23] w-4 h-4 cursor-pointer"
                            />
                            <div>
                              <p className="text-sm font-black text-slate-900">
                                {pkg.name}
                                {isLocked && <span className="ml-2 text-[10px] font-bold text-slate-500">🔒 Thấp hơn gói đang có</span>}
                              </p>
                              <p className="text-[11px] text-slate-500 font-medium">
                                Thời hạn: {pkg.validityMonths || 1} tháng
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            {includeClass ? (
                              isBronze ? (
                                <span className="text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded">
                                  TẶNG MIỄN PHÍ (0đ)
                                </span>
                              ) : (
                                <div>
                                  <span className="text-xs font-black text-[#e31b23]">
                                    {formatFee(discountedPrice)}
                                  </span>
                                  <span className="text-[10px] text-slate-400 line-through block font-semibold">
                                    {formatFee(pkg.fee)}
                                  </span>
                                  <span className="text-[9px] font-bold text-emerald-600 block">
                                    {isSilver ? 'Giảm 50%' : `Giảm ${pkg.upgradeDiscountPercent}%`}
                                  </span>
                                </div>
                              )
                            ) : (
                              <span className="text-xs font-black text-slate-900">
                                {formatFee(pkg.fee)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. ĐĂNG KÝ KÈM LỚP HUẤN LUYỆN */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="text-sm font-black text-slate-900 uppercase">2. CHỌN LỚP HỌC</h3>
                  </div>

                  {includeClass ? (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-extrabold uppercase text-slate-600 mb-1">
                            Chọn bộ môn *
                          </label>
                          <select
                            value={selectedSportId}
                            onChange={(e) => setSelectedSportId(e.target.value)}
                            className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2.5 text-xs text-slate-800 font-bold outline-none focus:border-[#e31b23] cursor-pointer"
                          >
                            {sportsList.map((sp) => (
                              <option key={sp.id} value={sp.id}>
                                {sp.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-extrabold uppercase text-slate-600 mb-1">
                            Chọn lớp học *
                          </label>
                          <select
                            value={selectedClass?.id || ''}
                            disabled={loadingClasses || classList.length === 0}
                            onChange={(e) => {
                              const cls = classList.find((c) => c.id === e.target.value);
                              if (cls) setSelectedClass(cls);
                            }}
                            className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2.5 text-xs text-slate-800 font-bold outline-none focus:border-[#e31b23] cursor-pointer disabled:opacity-50"
                          >
                            {loadingClasses ? (
                              <option value="">Đang tải lớp...</option>
                            ) : classList.length > 0 ? (
                              classList.map((cls) => (
                                <option key={cls.id} value={cls.id}>
                                  {cls.name} ({formatFee(cls.tuition)})
                                </option>
                              ))
                            ) : (
                              <option value="">Chưa có lớp mở cho môn này</option>
                            )}
                          </select>
                        </div>
                      </div>

                      {selectedClass ? (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-bold">Lớp đang chọn:</span>
                            <span className="font-bold text-slate-900 text-sm">{selectedClass.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-bold">HLV Phụ trách:</span>
                            <span className="font-semibold text-slate-700">{selectedClass.coachName || 'Đang cập nhật'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-bold">Thời gian học:</span>
                            <span className="font-semibold text-slate-700">
                              {selectedClass.startDate} ~ {selectedClass.endDate}
                            </span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-slate-200">
                            <span className="text-slate-500 font-bold">Học phí lớp:</span>
                            <span className="font-black text-[#e31b23] text-sm">{formatFee(selectedClass.tuition)}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Hiện bộ môn này chưa có lớp nào mở đăng ký.</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      💡 Đánh dấu chọn nút trên nếu khách muốn đăng ký thêm lớp học huấn luyện để được hưởng **giảm giá gói hội viên**.
                    </p>
                  )}
                </div>

                {/* 3. BỔ SUNG THÔNG TIN HỌC VIÊN */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase">3. THÔNG TIN BỔ SUNG HỌC VIÊN</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase text-slate-600 mb-1">Ngày sinh</label>
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2.5 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase text-slate-600 mb-1">Giới tính</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2.5 font-semibold outline-none cursor-pointer"
                      >
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI: TÓM TẮT CHI PHÍ VÀ NÚT TẠO ĐƠN */}
              <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5 sticky top-6">
                <h3 className="text-sm font-black text-slate-900 uppercase pb-3 border-b border-slate-100">
                  Tóm tắt chi phí tại quầy
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Gói hội viên ({selectedPackage?.name || 'Chưa chọn'}):</span>
                    <span className="font-bold text-slate-800">
                      {formatFee(calculatePackagePrice(selectedPackage))}
                    </span>
                  </div>

                  {includeClass && selectedClass && (
                    <div className="flex justify-between text-slate-600">
                      <span>Học phí lớp ({selectedClass.name}):</span>
                      <span className="font-bold text-slate-800">
                        {formatFee(selectedClass.tuition || 0)}
                      </span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                    <span className="text-sm font-black text-slate-900 uppercase">TỔNG THANH TOÁN:</span>
                    <span className="text-2xl font-black text-[#e31b23]">
                      {formatFee(calculateTotalFee())}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCreatePendingRegistration}
                  disabled={loading || !selectedPackage}
                  className="w-full bg-[#e31b23] hover:bg-[#c4131a] text-white font-black text-xs uppercase tracking-wider py-4 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'ĐANG TẠO ĐƠN...' : 'XÁC NHẬN & TẠO MÃ VIETQR →'}
                </button>

                <p className="text-[10px] text-slate-400 text-center font-medium">
                  Học viên quét mã VietQR. Trang tự cập nhật khi thanh toán xong.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= BƯỚC 3: MÃ VIETQR, GIỐNG THANH TOÁN CỦA HỌC VIÊN ================= */}
      {step === 3 && pendingOrder && (
        <div className="space-y-6">
          <div className="text-center">
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-full text-2xl font-black mb-3 border bg-amber-50 text-amber-600 border-amber-200">
              ⏳
            </span>
            <h3 className="text-xl font-black text-slate-900 uppercase">
              {pendingOrder.isExisting ? 'Đơn đăng ký đã tồn tại' : 'Tạo đơn đăng ký thành công'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {pendingOrder.isExisting
                ? 'Học viên đang có một đơn chờ thanh toán cho lớp này.'
                : 'Quét mã VietQR bằng app ngân hàng để hoàn tất thanh toán.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <div className="space-y-3 border-b md:border-b-0 md:border-r border-slate-200 pb-6 md:pb-0 md:pr-6 text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase block">Mã hóa đơn</span>
                <span className="text-base font-mono font-black text-[#e31b23]">
                  #{pendingOrder.invoiceCode || pendingOrder.paymentId}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block">Học viên</span>
                <span className="text-sm font-bold text-slate-800">{foundMember?.fullName}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block">Gói hội viên</span>
                <span className="text-sm font-bold text-slate-800">
                  {pendingOrder.membershipPackage?.name || selectedPackage?.name || 'Hạng Đồng (tặng kèm lớp)'}
                </span>
              </div>
              {(pendingOrder.className || selectedClass?.name) && (
                <div>
                  <span className="text-slate-400 font-bold uppercase block">Khóa học đăng ký kèm</span>
                  <span className="text-xs font-semibold text-slate-700">
                    {pendingOrder.className || selectedClass?.name}
                  </span>
                </div>
              )}
              <div>
                <span className="text-slate-400 font-bold uppercase block">Số tiền cần thanh toán</span>
                <span className="text-xl font-black text-emerald-600">{formatFee(pendingOrder.amount)}</span>
              </div>
            </div>

            <div className="flex flex-col items-center text-center">
              {qrImage ? (
                <>
                  <div className="p-3 bg-white rounded-xl shadow-md border border-slate-200 mb-2">
                    <img src={qrImage} alt="Mã VietQR payOS" className="w-52 h-52 object-contain" />
                  </div>
                  <p className="text-[11px] font-bold text-slate-600">Quét mã VietQR bằng app ngân hàng</p>
                  <p className={`text-xs font-black mt-1 ${secondsLeft <= 30 ? 'text-[#e31b23]' : 'text-amber-600'}`}>
                    Mã hết hạn sau {formatCountdown(secondsLeft)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Trang tự cập nhật khi thanh toán xong.</p>
                </>
              ) : (
                <p className="text-xs font-semibold text-slate-500 max-w-xs">
                  Chưa tạo được mã QR payOS cho đơn này. Có thể thu tiền mặt tại quầy với mã hóa đơn bên cạnh.
                </p>
              )}
              {pendingOrder.paymentUrl && (
                <a
                  href={pendingOrder.paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 text-[11px] font-bold text-[#e31b23] hover:underline"
                >
                  Mở trang thanh toán payOS
                </a>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {!qrImage && (
              <button
                type="button"
                onClick={handleConfirmPaymentAtDesk}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase px-6 py-3 rounded-xl cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Đang xác nhận...' : 'Đã thu tiền mặt'}
              </button>
            )}
            <button
              type="button"
              onClick={backToClassStep}
              className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs uppercase px-6 py-3 rounded-xl cursor-pointer"
            >
              Quay lại chọn lớp
            </button>
          </div>
        </div>
      )}

      {/* ================= BƯỚC 4: KẾT QUẢ GHI DANH HOÀN TẤT ================= */}
      {step === 4 && (
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto font-black">
            ✓
          </div>
          <h3 className="text-lg font-black text-slate-900 uppercase">Ghi Danh Học Viên Thành Công!</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Học viên <strong>{foundMember?.fullName}</strong> đã được ghi danh lớp thành công và kích hoạt gói hội viên.
          </p>

          <div className="pt-4 flex justify-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="bg-[#e31b23] text-white font-black text-xs uppercase px-6 py-3 rounded-xl shadow cursor-pointer"
            >
              Đăng ký học viên tiếp theo
            </button>
            {onRegistrationSuccess && (
              <button
                type="button"
                onClick={onRegistrationSuccess}
                className="bg-slate-900 text-white font-black text-xs uppercase px-6 py-3 rounded-xl cursor-pointer"
              >
                Xem học viên đã ghi danh
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}