import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getMyClassRegistrations,
  getMemberProfile,
  getMemberMembership,
  getConsultationContact,
  createMembershipRenewal,
  confirmMembershipRenewal,
  getMySupportRequests,
  getPendingCheckouts,
} from '../api/managementApi';
import Header from '../components/Header';
import Footer from '../components/Footer';

const formatCountdown = (ms) => {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

// Nhãn trạng thái trong lịch sử gói: đơn chờ thanh toán / đã hủy không hiện như đã hoàn tất.
const historyStatus = (status) => {
  switch (status) {
    case 'pending':
      return { label: 'Chờ thanh toán', className: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'cancelled':
      return { label: 'Đã hủy', className: 'bg-slate-100 text-slate-500 border-slate-200' };
    case 'expired':
      return { label: 'Hết hạn', className: 'bg-slate-100 text-slate-500 border-slate-200' };
    case 'scheduled':
      return { label: 'Chờ kích hoạt', className: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'active':
      return { label: 'Đang dùng', className: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
    default:
      return { label: status || 'Hoàn tất', className: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
  }
};

export default function HocVienDashboardPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [myClasses, setMyClasses] = useState([]);
  const [pendingCheckouts, setPendingCheckouts] = useState([]);
  const [now, setNow] = useState(() => Date.now());
  const [membershipData, setMembershipData] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [contactData, setContactData] = useState(null);

  // State đơn hỗ trợ / yêu cầu xử lý
  const [supportRequests, setSupportRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Modal Thanh Toán & Gia Hạn Gói
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [checkoutInfo, setCheckoutInfo] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notice, setNotice] = useState({ type: '', msg: '' });

  const memberUserId = user?.id || user?.userId;

  // Đơn đang chờ thanh toán (kèm hạn chót tính theo giờ máy để đếm ngược) + lịch sử gói
  const loadPayments = useCallback(async () => {
    const [pending, memData] = await Promise.all([
      getPendingCheckouts().catch(() => []),
      memberUserId ? getMemberMembership(memberUserId).catch(() => null) : Promise.resolve(null),
    ]);
    const loadedAt = Date.now();
    setPendingCheckouts(
      (Array.isArray(pending) ? pending : []).map((item) => ({
        ...item,
        deadline: loadedAt + item.expiresInSeconds * 1000,
      }))
    );
    if (memData) setMembershipData(memData);
    setNow(loadedAt);
  }, [memberUserId]);

  // Tải dữ liệu chính của Học viên qua managementApi
  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 1. Lấy danh sách lớp học đã ghi danh
      const classes = await getMyClassRegistrations().catch(() => []);
      if (Array.isArray(classes)) setMyClasses(classes);

      // Đơn đang chờ thanh toán (còn trong 3 phút) và lịch sử gói hội viên
      await loadPayments();

      // 2. Lấy danh sách yêu cầu hỗ trợ của bản thân
      setLoadingRequests(true);
      const requests = await getMySupportRequests().catch(() => []);
      if (Array.isArray(requests)) setSupportRequests(requests);
      setLoadingRequests(false);

      if (memberUserId) {
        // 4. Lấy Hotline chăm sóc khách hàng
        const contact = await getConsultationContact(memberUserId).catch(() => null);
        if (contact) setContactData(contact);

        // 5. Lấy Hồ sơ cá nhân
        const prof = await getMemberProfile(memberUserId).catch(() => null);
        if (prof) setProfileData(prof);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu Dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  // Còn đơn đang chờ: đồng hồ chạy từng giây (đơn hết giờ tự biến mất / đổi nhãn),
  // và tải lại ngầm mỗi 10 giây để thấy ngay khi đã thanh toán trên điện thoại.
  const hasPendingCheckouts = pendingCheckouts.some((item) => item.deadline > now);
  useEffect(() => {
    if (!hasPendingCheckouts) return undefined;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const refresh = setInterval(() => loadPayments(), 10000);
    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, [hasPendingCheckouts, loadPayments]);

  // Xử lý khi PayOS redirect về (có paymentId)
  useEffect(() => {
    const paymentId = searchParams.get('paymentId');
    if (paymentId && memberUserId) {
      handleConfirmPayment(paymentId);
    }
  }, [searchParams, memberUserId]);

  // Gọi API xác nhận thanh toán PayOS
  const handleConfirmPayment = async (paymentId) => {
    try {
      setIsProcessing(true);
      const result = await confirmMembershipRenewal(memberUserId, paymentId);
      setNotice({
        type: 'success',
        msg: result.message || 'Xác nhận thanh toán thành công! Gói hội viên của bạn đã được cập nhật hạn mới.',
      });
      fetchDashboardData();
    } catch (e) {
      setNotice({ type: 'error', msg: e.message || 'Chưa nhận được xác nhận thanh toán từ PayOS.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Gọi API tạo Link/QR thanh toán Gia hạn
  const handleCreateRenewal = async (packageItem) => {
    try {
      setIsProcessing(true);
      setSelectedPackage(packageItem);
      const data = await createMembershipRenewal(memberUserId, packageItem.id);
      if (data && data.checkoutUrl) {
        setCheckoutInfo(data);
      } else {
        alert(data.message || 'Không thể tạo đơn gia hạn gói.');
      }
    } catch (e) {
      alert(e.message || 'Đã xảy ra lỗi kết nối thanh toán.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Badge hiển thị trạng thái đơn hỗ trợ
  const renderStatusBadge = (status) => {
    const statusUpper = status?.toUpperCase() || '';
    switch (statusUpper) {
      case 'RESOLVED':
      case 'APPROVED':
      case 'SUCCESS':
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
            ✓ Đã xử lý
          </span>
        );
      case 'REJECTED':
      case 'CANCELLED':
        return (
          <span className="bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
            ✕ Từ chối
          </span>
        );
      case 'IN_PROGRESS':
      case 'PROCESSING':
        return (
          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
            ⚙️ Đang xử lý
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
            ⏳ Chờ tiếp nhận
          </span>
        );
    }
  };

  const displayName = profileData?.fullName || user?.fullName || user?.userName || 'Học viên';
  const displayEmail = profileData?.email || user?.email || 'Chưa cập nhật';
  const displayPhone = profileData?.phone || user?.phone || 'Chưa cập nhật';
  const currentMembership = membershipData?.currentMembership;
  const historyList = membershipData?.history || [];
  // Gói cao nhất đang có (backend tính cả gói chờ kích hoạt): gia hạn gói này, chỉ nâng cấp lên gói đắt hơn.
  const packageList = membershipData?.packages || [];
  const highestPackage =
    packageList.find((pkg) => String(pkg.id) === String(membershipData?.highestPackageId)) ||
    packageList.find((pkg) => String(pkg.id) === String(currentMembership?.packageId)) ||
    null;
  const upgradePackages = highestPackage
    ? packageList.filter((pkg) => (pkg.fee || 0) > (highestPackage.fee || 0))
    : [];

  // Chỉ hiện đơn còn trong thời gian giữ; hết giờ thì tự biến mất.
  const livePendingCheckouts = pendingCheckouts.filter((item) => item.deadline > now);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col justify-between">
      <Header forceWhite />

      <main className="flex-1 pt-20 sm:pt-24 pb-16">
        {/* BANNER ALERTS */}
        {notice.msg && (
          <div
            className={`max-w-6xl mx-auto mt-4 px-6 py-4 rounded-2xl text-xs font-bold border shadow-sm flex items-center justify-between ${
              notice.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            <span>{notice.msg}</span>
            <button onClick={() => setNotice({ type: '', msg: '' })} className="font-bold text-sm cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* BANNER XIN CHÀO */}
        <section className="bg-white border-b border-slate-200 py-8 shadow-xs">
          <div className="max-w-6xl mx-auto px-4 sm:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="inline-block bg-[#e31b23]/10 text-[#e31b23] text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full mb-2">
                  PORTAL CÁ NHÂN HỌC VIÊN
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase">
                  XIN CHÀO, <span className="text-[#e31b23]">{displayName}</span>!
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Quản lý gói tập hội viên, lớp học thể thao và các đơn yêu cầu hỗ trợ của bạn.
                </p>
              </div>

              <Link
                to="/ho-so"
                className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-[#e31b23] text-white text-xs font-bold px-5 py-3 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer self-start md:self-auto"
              >
                <span>⚙️ Chỉnh sửa hồ sơ</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">EMAIL ĐĂNG KÝ</span>
                <span className="text-xs font-bold text-slate-800 truncate block">{displayEmail}</span>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">SỐ ĐIỆN THOẠI</span>
                <span className="text-xs font-bold text-slate-800 block">{displayPhone}</span>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">TRẠNG THÁI HỘI VIÊN</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {currentMembership ? 'Đang kích hoạt' : 'Chưa có gói tập'}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4 sm:px-8 mt-8 space-y-8">
          {/* GÓI HỘI VIÊN ĐANG SỬ DỤNG */}
          {currentMembership && (
            <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-[#e31b23]/20 rounded-full blur-3xl"></div>

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <span className="inline-block bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-2">
                    GÓI TẬP ĐANG SỬ DỤNG
                  </span>
                  <h2 className="text-2xl font-black text-white uppercase tracking-wide">
                    {currentMembership.planName || 'Gói Hội Viên'}
                  </h2>
                  <p className="text-xs text-slate-300 font-medium mt-1">
                    Mã hóa đơn: <span className="font-mono text-amber-400 font-bold">#{currentMembership.invoiceCode || 'N/A'}</span>
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-6">
                  <div>
                    <span className="text-[10px] font-bold text-slate-300 uppercase block">Ngày bắt đầu</span>
                    <span className="text-xs font-bold text-white">{currentMembership.startDate}</span>
                  </div>
                  <div className="h-8 w-px bg-white/20"></div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-300 uppercase block">Hạn sử dụng đến</span>
                    <span className="text-xs font-bold text-emerald-400">{currentMembership.endDate}</span>
                  </div>
                  {membershipData?.membershipEndDate && membershipData.membershipEndDate !== currentMembership.endDate && (
                    <>
                      <div className="h-8 w-px bg-white/20"></div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-300 uppercase block">Gồm gói chờ kích hoạt</span>
                        <span className="text-xs font-bold text-emerald-400">{membershipData.membershipEndDate}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* GIA HẠN (luôn có) / NÂNG CẤP (chỉ khi đang Đồng hoặc Bạc) */}
              {highestPackage && (
                <div className="relative z-10 mt-6 flex flex-wrap gap-3">
                  <Link
                    to={`/dang-ky-khoa-hoc?packageId=${highestPackage.id}`}
                    className="bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs uppercase px-5 py-2.5 rounded-xl shadow transition-all"
                  >
                    🔄 Gia hạn {highestPackage.name}
                  </Link>
                  {upgradePackages.map((pkg) => (
                    <Link
                      key={pkg.id}
                      to={`/dang-ky-khoa-hoc?packageId=${pkg.id}`}
                      className="bg-[#e31b23] hover:bg-[#c4131a] text-white font-bold text-xs uppercase px-5 py-2.5 rounded-xl shadow transition-all"
                    >
                      ⬆ Nâng cấp lên {pkg.name}
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ĐƠN ĐANG CHỜ THANH TOÁN */}
          {livePendingCheckouts.length > 0 && (
            <section className="bg-amber-50 rounded-3xl p-6 sm:p-8 border border-amber-200 shadow-xs">
              <h2 className="text-lg font-black text-slate-900 uppercase mb-1">ĐƠN ĐANG CHỜ THANH TOÁN</h2>
              <p className="text-xs text-slate-500 mb-4">
                Mỗi đơn chỉ giữ 3 phút. Quá thời gian chưa thanh toán thì đơn tự hủy và bạn cần đăng ký lại.
              </p>
              <div className="space-y-3">
                {livePendingCheckouts.map((item) => (
                  <div
                    key={item.paymentId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-4 border border-amber-200"
                  >
                    <div className="text-xs space-y-0.5">
                      <p className="font-black text-slate-900 text-sm">
                        {item.kind === 'class'
                          ? `Đăng ký lớp ${item.className || ''}${item.packageName ? ` + Gói ${item.packageName}` : ''}`
                          : `Mua gói ${item.packageName || ''}`}
                      </p>
                      <p className="font-mono text-slate-500">#{item.invoiceCode}</p>
                      <p className="font-bold text-emerald-600">{item.amount?.toLocaleString('vi-VN')}đ</p>
                      <p className="font-bold text-amber-700">Còn {formatCountdown(item.deadline - now)}</p>
                    </div>
                    <Link
                      to="/dang-ky-khoa-hoc"
                      className="text-center bg-[#e31b23] hover:bg-[#c4131a] text-white font-bold text-xs uppercase px-5 py-2.5 rounded-xl shadow transition-all"
                    >
                      Tiếp tục thanh toán →
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ======================================================== */}
          {/* BLOCK 1: KHÓA HỌC & LỚP ĐÃ GHI DANH */}
          {/* ======================================================== */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-900 uppercase">
                  KHÓA HỌC & LỚP ĐÃ GHI DANH
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Danh sách các lớp thể thao bạn đã đăng ký tham gia
                </p>
              </div>

              <Link to="/tuyen-sinh" className="text-xs font-extrabold text-[#e31b23] hover:underline">
                + Đăng ký khóa học mới
              </Link>
            </div>

            {loading ? (
              <div className="py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#e31b23] border-t-transparent mb-2"></div>
                <p className="text-xs font-bold text-slate-400">Đang tải danh sách lớp học...</p>
              </div>
            ) : myClasses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myClasses.map((cls, idx) => (
                  <div
                    key={cls.classId || idx}
                    className="bg-slate-50 hover:bg-slate-100/80 rounded-2xl p-5 border border-slate-200 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-black uppercase text-[#e31b23] bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-md">
                          {cls.sportName || 'Thể thao'}
                        </span>
                        <h3 className="text-base font-black text-slate-900 mt-1.5">
                          {cls.className || cls.courseName}
                        </h3>
                      </div>

                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 uppercase">
                        ✓ Đã ghi danh
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-200/60">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Cấp độ:</span>
                        <span className="font-bold text-slate-800">{cls.level || 'Cơ bản'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">HLV Phụ trách:</span>
                        <span className="font-bold text-slate-800">{cls.coachName || 'Đang cập nhật'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Thời gian học:</span>
                        <span className="font-bold text-slate-800">
                          {cls.startDate} ~ {cls.endDate}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 px-4 text-center max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 bg-red-50 text-[#e31b23] rounded-full flex items-center justify-center mx-auto text-2xl font-black">
                  🏋️
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase">
                    BẠN CHƯA ĐĂNG KÝ LỚP HỌC NÀO
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Hãy khám phá danh sách các khóa học thể thao đa dạng tại AnhDuy Sport để bắt đầu rèn luyện!
                  </p>
                </div>

                <Link
                  to="/tuyen-sinh"
                  className="inline-block bg-[#e31b23] hover:bg-[#c4131a] text-white font-black text-xs uppercase px-8 py-3.5 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  KHÁM PHÁ CÁC KHÓA HỌC →
                </Link>
              </div>
            )}
          </section>

          {/* ======================================================== */}
          {/* BLOCK 3: TRẠNG THÁI ĐƠN HỖ TRỢ CỦA BẠN */}
          {/* ======================================================== */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="inline-block bg-sky-50 text-sky-700 text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full mb-1">
                  YÊU CẦU & KHIẾU NẠI
                </span>
                <h2 className="text-lg font-black text-slate-900 uppercase">
                  TRẠNG THÁI ĐƠN HỖ TRỢ CỦA BẠN
                </h2>
              </div>
            </div>

            {loadingRequests ? (
              <div className="py-8 text-center">
                <div className="inline-block animate-spin rounded-full h-7 w-7 border-4 border-[#e31b23] border-t-transparent mb-2"></div>
                <p className="text-xs font-bold text-slate-400">Đang kiểm tra danh sách đơn hỗ trợ...</p>
              </div>
            ) : supportRequests.length > 0 ? (
              <div className="space-y-4">
                {supportRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-slate-50 hover:bg-slate-100/80 rounded-2xl p-5 border border-slate-200 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/60">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-400 font-bold">#{req.id?.slice(-6)}</span>
                          {req.receptionistCategory || req.systemCategory ? (
                            <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                              {req.receptionistCategory || req.systemCategory}
                            </span>
                          ) : null}
                        </div>
                        <h3 className="text-sm font-black text-slate-900 mt-1">{req.title}</h3>
                      </div>
                      <div>{renderStatusBadge(req.status)}</div>
                    </div>

                    <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200/80 italic">
                      "{req.description}"
                    </p>

                    {/* KẾT QUẢ XỬ LÝ (NẾU CÓ) */}
                    {(req.decision || req.resolutionNote) && (
                      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between text-emerald-800 font-black">
                          <span>📌 Kết quả xử lý từ Trung Tâm:</span>
                          {req.assigneeName && (
                            <span className="text-[11px] font-normal text-emerald-700">HLV/Người xử lý: {req.assigneeName}</span>
                          )}
                        </div>
                        {req.decision && (
                          <p className="font-bold text-emerald-900">Quyết định: {req.decision}</p>
                        )}
                        {req.resolutionNote && (
                          <p className="text-slate-700">{req.resolutionNote}</p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-1">
                      <span>Tạo ngày: {req.createdAt ? new Date(req.createdAt).toLocaleString('vi-VN') : 'N/A'}</span>
                      {req.resolvedAt && (
                        <span>Hoàn tất: {new Date(req.resolvedAt).toLocaleString('vi-VN')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400 font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                Bạn chưa gửi yêu cầu hỗ trợ hoặc khiếu nại nào.
              </div>
            )}
          </section>

          {/* LỊCH SỬ DÙNG GÓI */}
          {historyList.length > 0 && (
            <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
              <h2 className="text-lg font-black text-slate-900 uppercase mb-4">
                LỊCH SỬ DÙNG GÓI HỘI VIÊN
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="p-3">Gói tập</th>
                      <th className="p-3">Hóa đơn</th>
                      <th className="p-3">Tạo lúc</th>
                      <th className="p-3">Thời hạn</th>
                      <th className="p-3">Đã thanh toán</th>
                      <th className="p-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {historyList.map((hItem) => (
                      <tr key={hItem.id}>
                        <td className="p-3 font-bold text-slate-900">{hItem.planName}</td>
                        <td className="p-3 font-mono text-slate-500">#{hItem.invoiceCode}</td>
                        <td className="p-3 text-slate-600 whitespace-nowrap">
                          {hItem.createdAt ? new Date(hItem.createdAt).toLocaleString('vi-VN') : '—'}
                        </td>
                        <td className="p-3 text-slate-600">{hItem.startDate} ~ {hItem.endDate}</td>
                        <td className="p-3 font-bold text-emerald-600">{hItem.amountPaid?.toLocaleString('vi-VN')}đ</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${historyStatus(hItem.status).className}`}>
                            {historyStatus(hItem.status).label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

        </div>
      </main>

      <Footer />

      {/* MODAL POPUP THANH TOÁN PAYOS */}
      {checkoutInfo && selectedPackage && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-fadeIn text-center">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase">
                THANH TOÁN PAYOS GIA HẠN GÓI
              </h3>
              <button
                onClick={() => setCheckoutInfo(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-base p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase">Mã hóa đơn</span>
              <p className="text-base font-mono font-black text-[#e31b23]">
                #{checkoutInfo.invoiceCode}
              </p>
              <p className="text-xl font-black text-slate-900">
                {checkoutInfo.amount?.toLocaleString('vi-VN')} VNĐ
              </p>
            </div>

            {checkoutInfo.qrCode ? (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block">
                <img src={checkoutInfo.qrCode} alt="PayOS QR Code" className="w-48 h-48 mx-auto object-contain" />
                <p className="text-[11px] font-bold text-slate-500 mt-2">Mở app Ngân hàng / ví để Quét mã QR</p>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Vui lòng bấm nút bên dưới để chuyển hướng sang cổng thanh toán an toàn PayOS.
              </p>
            )}

            <div className="space-y-2 pt-2">
              <a
                href={checkoutInfo.checkoutUrl}
                target="_blank"
                rel="noreferrer"
                className="block w-full bg-[#e31b23] hover:bg-[#c4131a] text-white font-black uppercase text-xs py-3 rounded-xl shadow cursor-pointer"
              >
                Mở Cổng Thanh Toán PayOS →
              </a>

              <button
                onClick={() => handleConfirmPayment(checkoutInfo.paymentId)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2.5 rounded-xl cursor-pointer"
              >
                🔄 Tôi đã hoàn tất thanh toán
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}