import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import logoImg from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import {
  getClassDetail,
  getClasses,
  getSports,
  registerClass,
  getClassRegistrationStatus,
  getPackages,
  cancelPayment,
  createMembershipRenewal,
  confirmMembershipRenewal,
} from '../api/managementApi';
import { formatFee } from '../data/accountManagement';

export default function ClassRegistrationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Lấy ID từ URL Query Param hoặc State
  const initialClassId = searchParams.get('classId') || location.state?.classId;
  const initialPackageId = searchParams.get('packageId') || location.state?.packageId;

  // State danh sách
  const [sportsList, setSportsList] = useState([]);
  const [classList, setClassList] = useState([]);
  const [packages, setPackages] = useState([]);

  // State Lớp học là KHÔNG BẮT BUỘC
  const [includeClass, setIncludeClass] = useState(!!initialClassId);

  // State lựa chọn
  const [selectedSportId, setSelectedSportId] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Toggle Accordion Form thông tin cá nhân
  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false);

  // Form Thông tin cá nhân
  const [fullName, setFullName] = useState(user?.fullName || user?.userName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Nam');

  // Kết quả & Thanh toán từ Server
  const [registrationResult, setRegistrationResult] = useState(null);
  const [paymentStatusData, setPaymentStatusData] = useState(null);
  const [qrState, setQrState] = useState({ code: '', url: '' });

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
          if (initialPackageId) {
            const foundPkg = pkgs.find((p) => p.id === initialPackageId || p.code === initialPackageId);
            if (foundPkg) setSelectedPackage(foundPkg);
          } else if (pkgs.length > 0) {
            const defaultPkg = pkgs.find((p) => p.name?.includes('Bạc')) || pkgs[0];
            setSelectedPackage(defaultPkg);
          }
        }

        // 1.2 Fetch thông tin lớp chi tiết nếu có initialClassId
        if (initialClassId) {
          setIncludeClass(true);
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
    if (!selectedSportId || !includeClass) return;

    async function loadClassesForSport() {
      try {
        setLoadingClasses(true);
        const classesData = await getClasses('1', selectedSportId);
        if (Array.isArray(classesData) && classesData.length > 0) {
          setClassList(classesData);
          if (!selectedClass || selectedClass.sportId !== selectedSportId) {
            setSelectedClass(classesData[0]);
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
  }, [selectedSportId, includeClass]);

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
        // Chỉ mua gói: hỏi API xác nhận gói (backend tự hỏi payOS, gọi lặp lại không cộng hạn hai lần)
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

  // Không tự vẽ QR từ số tài khoản: phải dùng đúng chuỗi VietQR payOS trả về (tài khoản nhận tiền của kênh payOS trung tâm)
  const payosQrCode = registrationResult?.payosQrCode || '';
  useEffect(() => {
    if (!payosQrCode) return undefined;

    let active = true;
    QRCode.toDataURL(payosQrCode, { width: 416, margin: 1 })
      .then((url) => {
        if (active) setQrState({ code: payosQrCode, url });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [payosQrCode]);
  const qrImage = payosQrCode && qrState.code === payosQrCode ? qrState.url : '';

  // Logic tính giá Gói hội viên: CHỈ CHIẾT KHẤU KHI CÓ TICK ĐĂNG KÝ KÈM LỚP
  const calculatePackagePrice = (pkg) => {
    if (!pkg) return 0;

    if (!includeClass) {
      return pkg.fee || 0;
    }

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

  // Submit Đăng ký
  const handleSubmitRegistration = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');

    if (!selectedPackage?.id) {
      setError('Vui lòng chọn một gói hội viên.');
      return;
    }

    if (includeClass && !selectedClass?.id) {
      setError('Vui lòng chọn lớp học huấn luyện hoặc bỏ tích chọn kèm lớp.');
      return;
    }

    if (!fullName.trim() || !phone.trim()) {
      setIsUserInfoOpen(true);
      setError('Vui lòng điền đầy đủ Họ và tên và Số điện thoại liên hệ.');
      return;
    }

    const isBronze = selectedPackage.name?.toLowerCase().includes('đồng') || selectedPackage.code === 'PKG-001';

    setSubmitting(true);
    try {
      // Chỉ mua gói (không kèm lớp): dùng API gia hạn gói, payOS trả link và mã QR theo giá gốc của gói
      if (!includeClass) {
        const res = await createMembershipRenewal(user?.id, selectedPackage.id);
        setRegistrationResult({
          kind: 'membership',
          paymentId: res.paymentId,
          invoiceCode: res.invoiceCode,
          amount: res.amount,
          status: res.paymentStatus,
          paymentUrl: res.checkoutUrl || '',
          payosQrCode: res.qrCode || '',
          isExisting: false,
        });
        return;
      }

      const payload = {
        ...(includeClass ? { sportId: selectedSportId || sportsList[0]?.id || '1' } : {}),
        ...(includeClass && selectedClass?.id ? { classId: selectedClass.id } : {}),
        ...(includeClass && selectedClass?.nextSlot?.id ? { slotId: selectedClass.nextSlot.id } : {}),
        ...(!isBronze && selectedPackage?.id ? { membershipPackageId: selectedPackage.id } : {}),
        fullName: fullName.trim(),
        phone: phone.trim(),
        ...(dateOfBirth ? { dateOfBirth } : {}),
        gender,
      };

      const res = await registerClass(payload);
      setRegistrationResult(res);
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  // Hủy đơn đăng ký cũ để tạo đơn mới
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

  const isPaid = paymentStatusData?.paymentStatus === 'paid' || paymentStatusData?.paymentStatus === 'success';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans select-none flex flex-col justify-between">
      {/* 1. THANH TIÊU ĐỀ STANDALONE */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <Link to="/home" className="flex items-center gap-2.5 group">
            <img src={logoImg} alt="AnhDuy Sport" className="h-9 w-auto object-contain" />
            <span className="text-xl font-black italic tracking-wider uppercase text-slate-900">
              AnhDuy <span className="text-[#e31b23]">Sport</span>
            </span>
          </Link>

          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#e31b23] bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-all cursor-pointer"
          >
            ← Quay lại
          </button>
        </div>
      </header>

      {/* 2. NỘI DUNG CHÍNH */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 flex-1">
        <div className="mb-6">
          <span className="inline-block bg-[#e31b23]/10 text-[#e31b23] text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded border border-[#e31b23]/20 mb-1">
            CỔNG THANH TOÁN AN TOÀN
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase">
            XÁC NHẬN ĐĂNG KÝ & THANH TOÁN
          </h1>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200">
            <div className="inline-block animate-spin rounded-full h-9 w-9 border-4 border-[#e31b23] border-t-transparent mb-3"></div>
            <p className="text-xs font-bold text-slate-500">Đang tải thông tin gói hội viên & khóa học...</p>
          </div>
        ) : registrationResult ? (
          /* MÀN HÌNH MÃ VIETQR / PAYOS TRẢ VỀ TỪ SERVER */
          <div className="bg-white rounded-2xl p-6 sm:p-10 border border-slate-200 shadow-sm">
            <div className="text-center mb-8">
              <span
                className={`inline-flex items-center justify-center w-14 h-14 rounded-full text-2xl font-black mb-3 border ${
                  isPaid
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : 'bg-amber-50 text-amber-600 border-amber-200'
                }`}
              >
                {isPaid ? '✓' : '⏳'}
              </span>

              <h2 className="text-2xl font-black text-slate-900 uppercase">
                {isPaid
                  ? 'THANH TOÁN THÀNH CÔNG!'
                  : registrationResult.isExisting
                  ? 'ĐƠN ĐĂNG KÝ ĐÃ TỒN TẠI'
                  : 'TẠO ĐƠN ĐĂNG KÝ THÀNH CÔNG!'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {isPaid
                  ? paymentStatusData?.message || 'Hệ thống đã ghi nhận dịch vụ của bạn!'
                  : registrationResult.isExisting
                  ? 'Bạn đang có một đơn hàng chờ thanh toán trước đó cho dịch vụ này.'
                  : 'Quét mã VietQR bằng App Ngân hàng bất kỳ để hoàn tất thanh toán.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="space-y-3 border-b md:border-b-0 md:border-r border-slate-200 pb-6 md:pb-0 md:pr-6 text-xs">
                <div>
                  <span className="text-slate-400 font-bold uppercase block">Mã hóa đơn</span>
                  <span className="text-base font-mono font-black text-[#e31b23]">
                    #{registrationResult.invoiceCode || registrationResult.paymentId}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 font-bold uppercase block">Gói hội viên</span>
                  <span className="text-sm font-bold text-slate-800">
                    Gói {selectedPackage?.name}
                  </span>
                </div>

                {includeClass && selectedClass && (
                  <div>
                    <span className="text-slate-400 font-bold uppercase block">Khóa học đăng ký kèm</span>
                    <span className="text-xs font-semibold text-slate-700">
                      {selectedClass.name}
                    </span>
                  </div>
                )}

                <div>
                  <span className="text-slate-400 font-bold uppercase block">Số tiền cần thanh toán</span>
                  <span className="text-xl font-black text-emerald-600">
                    {formatFee(registrationResult.amount !== undefined ? registrationResult.amount : calculateTotalFee())}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center text-center">
                {isPaid ? (
                  <div className="py-6">
                    <span className="text-5xl block mb-2">🎉</span>
                    <p className="text-sm font-black text-emerald-600">ĐÃ XÁC NHẬN THANH TOÁN</p>
                  </div>
                ) : qrImage ? (
                  <>
                    <div className="p-3 bg-white rounded-xl shadow-md border border-slate-200 mb-2">
                      <img src={qrImage} alt="Mã VietQR payOS" className="w-52 h-52 object-contain" />
                    </div>
                    <p className="text-[11px] font-bold text-slate-600">Quét mã VietQR bằng App Ngân Hàng</p>
                    <p className="text-[10px] text-slate-400 mt-1">Trang tự cập nhật khi thanh toán xong.</p>
                  </>
                ) : (
                  <p className="text-xs font-semibold text-slate-500 max-w-xs">
                    Chưa tạo được mã QR payOS cho đơn này. Vui lòng thanh toán tại quầy lễ tân với mã hóa đơn bên cạnh.
                  </p>
                )}
                {!isPaid && registrationResult.paymentUrl && (
                  <a
                    href={registrationResult.paymentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 text-[11px] font-bold text-[#e31b23] hover:underline"
                  >
                    Mở trang thanh toán payOS ↗
                  </a>
                )}
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              {registrationResult.isExisting && (
                <button
                  type="button"
                  onClick={handleCancelAndRetry}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs uppercase px-6 py-3 rounded-xl transition-all cursor-pointer"
                >
                  🔄 Chọn lại gói / Đơn khác
                </button>
              )}

              <button
                onClick={() => navigate('/hoc-vien-dashboard')}
                className="bg-[#e31b23] hover:bg-[#c4131a] text-white font-bold text-xs uppercase px-8 py-3 rounded-xl shadow transition-all cursor-pointer"
              >
                Trang cá nhân học viên →
              </button>
            </div>
          </div>
        ) : (
          /* FORM ĐĂNG KÝ VÀ CHỌN GÓI / LỚP */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* CỘT TRÁI */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* MỤC 1: CHỌN GÓI HỘI VIÊN */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-black text-slate-900 uppercase">1. CHỌN GÓI HỘI VIÊN</h3>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {packages.map((pkg) => {
                    const isSelected = selectedPackage?.id === pkg.id;
                    const discountedPrice = calculatePackagePrice(pkg);
                    const isBronze = pkg.name?.toLowerCase().includes('đồng') || pkg.code === 'PKG-001';
                    const isSilver = pkg.name?.toLowerCase().includes('bạc') || pkg.code === 'PKG-002';

                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPackage(pkg)}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'border-[#e31b23] bg-red-50/40 shadow-sm'
                            : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="package_select"
                            checked={isSelected}
                            onChange={() => {}}
                            className="accent-[#e31b23] w-4 h-4 cursor-pointer"
                          />
                          <div>
                            <p className="text-sm font-black text-slate-900">{pkg.name}</p>
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

              {/* MỤC 2: CHỌN KHÓA HỌC HUẤN LUYỆN */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-black text-slate-900 uppercase">2. ĐĂNG KÝ KÈM LỚP HUẤN LUYỆN</h3>
                  
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-[#e31b23] bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeClass}
                      onChange={(e) => setIncludeClass(e.target.checked)}
                      className="accent-[#e31b23] w-4 h-4 rounded cursor-pointer"
                    />
                    Đăng ký kèm lớp (Nhận Ưu Đãi Gói)
                  </label>
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
                          onChange={(e) => handleSportChange(e.target.value)}
                          className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2.5 text-xs text-slate-800 font-bold outline-none focus:border-[#e31b23] transition-all cursor-pointer"
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
                          className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2.5 text-xs text-slate-800 font-bold outline-none focus:border-[#e31b23] transition-all cursor-pointer disabled:opacity-50"
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
                    💡 Đánh dấu chọn nút trên nếu bạn muốn đăng ký thêm lớp học huấn luyện để được hưởng **giảm giá gói hội viên**.
                  </p>
                )}
              </div>

              {/* MỤC 3: ĐIỀN THÔNG TIN CÁ NHÂN */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsUserInfoOpen(!isUserInfoOpen)}
                  className="w-full p-5 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100/80 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-[#e31b23]/10 text-[#e31b23] flex items-center justify-center font-black text-xs">
                      👤
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase">3. THÔNG TIN HỌC VIÊN</h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {fullName && phone ? `${fullName} (${phone})` : 'Nhấn để kiểm tra/chỉnh sửa thông tin nhận hóa đơn'}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-slate-400">
                    {isUserInfoOpen ? '▲ Thu gọn' : '▼ Nhập thông tin'}
                  </span>
                </button>

                {isUserInfoOpen && (
                  <div className="p-6 border-t border-slate-100 space-y-4 animate-fadeIn">
                    <div>
                      <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1">
                        Họ và tên học viên *
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="vd: Nguyễn Văn A"
                        className="w-full rounded-xl bg-slate-50 border border-slate-300 px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-[#e31b23] transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1">
                          Số điện thoại liên hệ *
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="0901234567"
                          className="w-full rounded-xl bg-slate-50 border border-slate-300 px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-[#e31b23] transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1">
                          Ngày sinh
                        </label>
                        <input
                          type="date"
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          className="w-full rounded-xl bg-slate-50 border border-slate-300 px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-[#e31b23] transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1">
                        Giới tính
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full rounded-xl bg-slate-50 border border-slate-300 px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-[#e31b23] transition-all cursor-pointer"
                      >
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* CỘT PHẢI: TỔNG TIỀN VÀ NÚT THANH TOÁN */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5 sticky top-24">
              <h3 className="text-sm font-black text-slate-900 uppercase pb-3 border-b border-slate-100">
                Tóm tắt chi phí
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

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold">
                  ⚠️ {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmitRegistration}
                disabled={submitting || !selectedPackage}
                className="w-full bg-[#e31b23] hover:bg-[#c4131a] text-white font-black text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-98"
              >
                {submitting ? 'ĐANG TẠO ĐƠN...' : 'XÁC NHẬN & TẠO MÃ VIETQR →'}
              </button>

              <p className="text-[10px] text-slate-400 text-center font-medium">
                Giao dịch được bảo mật an toàn qua VietQR / PayOS
              </p>
            </div>

          </div>
        )}
      </main>

      {/* FOOTER NỀN TRẮNG */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400 font-medium">
        © 2026 AnhDuy Sport Center. All rights reserved.
      </footer>
    </div>
  );
}