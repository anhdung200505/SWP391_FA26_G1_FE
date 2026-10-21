import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { getClassDetail, registerClass, getClassRegistrationStatus } from '../api/managementApi';
import { formatFee } from '../data/accountManagement';

export default function ClassRegistrationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const classId = searchParams.get('classId') || location.state?.classId;

  const [classDetail, setClassDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Nam');

  const [registrationResult, setRegistrationResult] = useState(null);
  const [paymentStatusData, setPaymentStatusData] = useState(null);

  // Fetch thông tin lớp học
  useEffect(() => {
    if (!classId) {
      setError('Không tìm thấy thông tin lớp học.');
      setLoading(false);
      return;
    }

    async function fetchDetail() {
      try {
        setLoading(true);
        const data = await getClassDetail(classId);
        setClassDetail(data);
      } catch (err) {
        setError(err.message || 'Không thể tải thông tin lớp học.');
      } finally {
        setLoading(false);
      }
    }

    fetchDetail();
  }, [classId]);

  useEffect(() => {
    if (user) {
      if (!fullName) setFullName(user.fullName || user.userName || '');
      if (!phone) setPhone(user.phone || '');
    }
  }, [user]);

  // Kiểm tra trạng thái thanh toán định kỳ nếu đã tạo hóa đơn
  useEffect(() => {
    if (!registrationResult?.paymentId) return;

    const checkStatus = async () => {
      try {
        const status = await getClassRegistrationStatus(registrationResult.paymentId);
        setPaymentStatusData(status);
      } catch {
        // Ignored
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000); // Polling mỗi 5s
    return () => clearInterval(interval);
  }, [registrationResult]);

  // Submit Form Đăng ký
  const handleSubmitRegistration = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');

    if (!fullName.trim() || !phone.trim()) {
      setError('Vui lòng nhập đầy đủ Họ tên và Số điện thoại.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        classId,
        fullName: fullName.trim(),
        phone: phone.trim(),
        ...(dateOfBirth ? { dateOfBirth } : {}),
        gender,
      };

      // Gọi API POST /api/class-registrations
      const res = await registerClass(classId, payload);
      setRegistrationResult(res);

      if (res.paymentUrl) {
        window.location.href = res.paymentUrl;
      }
    } catch (err) {
      setError(err.message || 'Đăng ký lớp học không thành công.');
    } finally {
      setSubmitting(false);
    }
  };

  // Render Mã VietQR chuẩn PayOS dựa trên Mã hóa đơn
  const renderPayOSVietQR = (amount, invoiceCode) => {
    // Thông tin tài khoản đăng ký PayOS của trung tâm
    const bankBin = '970422'; // Ngân hàng MBBank
    const accountNo = '0391234567';
    const accountName = 'ANHDUY SPORT';
    const description = `${invoiceCode}`;

    return `https://img.vietqr.io/image/${bankBin}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
      description
    )}&accountName=${encodeURIComponent(accountName)}`;
  };

  const isPaid = paymentStatusData?.paymentStatus === 'paid' || paymentStatusData?.paymentStatus === 'success';

  return (
    <div className="relative w-full min-h-screen font-sans bg-[#0d0f17] text-white select-none overflow-x-hidden flex flex-col justify-between">
      <Header forceWhite />

      <main className="pt-32 pb-20 px-6 sm:px-12 lg:px-16 max-w-5xl mx-auto w-full flex-1">
        <div className="mb-8">
          <span className="text-xs font-black uppercase tracking-widest text-[#e31b23] bg-[#e31b23]/10 px-3.5 py-1 rounded-sm border border-[#e31b23]/30 mb-2 inline-block">
            XÁC NHẬN ĐĂNG KÝ & THANH TOÁN VIETQR / PAYOS
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
            ĐĂNG KÝ <span className="text-[#e31b23]">LỚP HỌC</span>
          </h1>
        </div>

        {loading ? (
          <div className="py-20 text-center text-gray-400 font-bold">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-[#e31b23] border-t-transparent mb-4"></div>
            <p>Đang tải thông tin lớp học...</p>
          </div>
        ) : error && !classDetail ? (
          <div className="bg-[#181d2a] p-8 rounded-3xl border border-red-800 text-center shadow-xl">
            <p className="text-red-400 font-bold mb-4">⚠️ {error}</p>
            <button
              onClick={() => navigate('/khoa-hoc')}
              className="bg-[#e31b23] text-white text-xs font-black uppercase px-6 py-3 rounded-xl hover:bg-[#c4131a] transition-all cursor-pointer"
            >
              ← Quay lại danh sách khóa học
            </button>
          </div>
        ) : registrationResult ? (
          /* HIỂN THỊ KẾT QUẢ ĐĂNG KÝ & MÃ VIETQR THANH TOÁN PAYOS */
          <div className="bg-[#181d2a] rounded-3xl p-8 sm:p-10 border border-gray-800 shadow-2xl">
            <div className="text-center mb-8">
              <span
                className={`inline-flex items-center justify-center w-14 h-14 rounded-full text-2xl font-black mb-3 border ${
                  isPaid
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                }`}
              >
                {isPaid ? '✓' : '⏳'}
              </span>

              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase">
                {isPaid
                  ? 'THANH TOÁN THÀNH CÔNG!'
                  : registrationResult.isExisting
                  ? 'ĐƠN ĐĂNG KÝ ĐÃ TỒN TẠI'
                  : 'TẠO ĐƠN ĐĂNG KÝ THÀNH CÔNG!'}
              </h2>

              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                {isPaid
                  ? 'Cảm ơn bạn đã đăng ký khóa học tại AnhDuy Sport!'
                  : 'Quét mã VietQR bằng App Ngân hàng để hoàn tất thanh toán tự động via PayOS.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-[#0d0f17] p-6 sm:p-8 rounded-2xl border border-gray-800">
              {/* CHI TIẾT HÓA ĐƠN */}
              <div className="space-y-3.5 border-b md:border-b-0 md:border-r border-gray-800 pb-6 md:pb-0 md:pr-6">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase block">Mã hóa đơn</span>
                  <span className="text-lg font-mono font-black text-[#e31b23]">
                    #{registrationResult.invoiceCode || registrationResult.paymentId}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase block">Lớp học</span>
                  <span className="text-base font-black text-white">
                    {registrationResult.className || classDetail?.name}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase block">Số tiền cần thanh toán</span>
                  <span className="text-2xl font-black text-emerald-400">
                    {formatFee(registrationResult.amount || classDetail?.tuition)}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase block">Trạng thái thanh toán</span>
                  {isPaid ? (
                    <span className="inline-block bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 text-xs font-bold px-3 py-1 rounded-md mt-1">
                      ✓ Đã thanh toán (Paid)
                    </span>
                  ) : (
                    <span className="inline-block bg-amber-950/80 text-amber-400 border border-amber-800/80 text-xs font-bold px-3 py-1 rounded-md mt-1">
                      ⏳ Đang chờ chuyển khoản (Pending)
                    </span>
                  )}
                </div>
              </div>

              {/* KHỐI QR PAYOS / VIETQR */}
              <div className="flex flex-col items-center justify-center text-center">
                {isPaid ? (
                  <div className="py-8 text-center">
                    <span className="text-5xl block mb-2">🎉</span>
                    <p className="text-emerald-400 font-black text-lg">ĐÃ XÁC NHẬN THANH TOÁN</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {paymentStatusData?.message || 'Hệ thống đã ghi nhận lịch học của bạn!'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="p-3 bg-white rounded-2xl shadow-xl mb-3">
                      <img
                        src={renderPayOSVietQR(
                          registrationResult.amount || classDetail?.tuition,
                          registrationResult.invoiceCode
                        )}
                        alt="VietQR PayOS"
                        className="w-56 h-56 object-contain"
                      />
                    </div>
                    <p className="text-[11px] font-bold text-gray-300">
                      Mở App Ngân hàng bất kỳ & Quét mã VietQR
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Nội dung chuyển khoản chuẩn: <br />
                      <span className="text-[#e31b23] font-mono font-bold bg-[#e31b23]/10 px-2 py-0.5 rounded border border-[#e31b23]/30 inline-block mt-0.5">
                        {registrationResult.invoiceCode}
                      </span>
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-4 justify-center">
              <button
                onClick={() => navigate('/hoc-vien-dashboard')}
                className="bg-[#e31b23] hover:bg-[#c4131a] text-white font-black text-xs uppercase tracking-wider px-8 py-3.5 rounded-xl shadow-lg transition-all cursor-pointer"
              >
                Về trang cá nhân học viên →
              </button>
            </div>
          </div>
        ) : (
          /* FORM XÁC NHẬN THÔNG TIN BƯỚC 1 */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 bg-[#181d2a] rounded-3xl p-6 sm:p-8 border border-gray-800 shadow-xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#e31b23] bg-[#e31b23]/10 px-3 py-1 rounded-md border border-[#e31b23]/30 mb-3 inline-block">
                  {classDetail?.level || 'MỌI CẤP ĐỘ'}
                </span>

                <h2 className="text-2xl font-black text-white mb-4">{classDetail?.name}</h2>

                <div className="space-y-3 bg-[#0d0f17] p-4 rounded-2xl border border-gray-800/80 mb-6 text-xs">
                  <div className="flex justify-between border-b border-gray-800/60 pb-2">
                    <span className="text-gray-400 font-bold">Bộ môn:</span>
                    <span className="text-white font-bold">{classDetail?.sportName}</span>
                  </div>

                  <div className="flex justify-between border-b border-gray-800/60 pb-2">
                    <span className="text-gray-400 font-bold">HLV Phụ trách:</span>
                    <span className="text-white font-bold">{classDetail?.coachName || 'Đang cập nhật'}</span>
                  </div>

                  <div className="flex justify-between border-b border-gray-800/60 pb-2">
                    <span className="text-gray-400 font-bold">Địa điểm:</span>
                    <span className="text-gray-200 font-medium">{classDetail?.roomName || 'Sân thi đấu'}</span>
                  </div>

                  <div className="flex justify-between border-b border-gray-800/60 pb-2">
                    <span className="text-gray-400 font-bold">Thời gian học:</span>
                    <span className="text-gray-200 font-medium">
                      {classDetail?.startDate} ~ {classDetail?.endDate}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400 font-bold">Số chỗ còn trống:</span>
                    <span className="text-emerald-400 font-bold">
                      {classDetail?.availableSeats}/{classDetail?.capacity} chỗ
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-800 flex items-baseline justify-between">
                <span className="text-xs font-bold text-gray-400">Học phí:</span>
                <span className="text-2xl font-black text-[#e31b23]">
                  {formatFee(classDetail?.tuition)}
                </span>
              </div>
            </div>

            <div className="lg:col-span-7 bg-[#181d2a] rounded-3xl p-6 sm:p-8 border border-gray-800 shadow-xl">
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
                1. XÁC NHẬN THÔNG TIN CÁ NHÂN
              </h3>
              <p className="text-xs text-gray-400 mb-6">
                Vui lòng kiểm tra lại thông tin hồ sơ của bạn trước khi tiến hành tạo hóa đơn đăng ký.
              </p>

              <form onSubmit={handleSubmitRegistration} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase text-gray-300 mb-1">
                    Họ và tên học viên *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="vd: Nguyễn Văn A"
                    className="w-full rounded-xl bg-[#0d0f17] border border-gray-700/80 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-[#e31b23] transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold uppercase text-gray-300 mb-1">
                      Số điện thoại liên hệ *
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0901234567"
                      className="w-full rounded-xl bg-[#0d0f17] border border-gray-700/80 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-[#e31b23] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold uppercase text-gray-300 mb-1">
                      Ngày sinh
                    </label>
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full rounded-xl bg-[#0d0f17] border border-gray-700/80 px-4 py-3 text-sm text-white outline-none focus:border-[#e31b23] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase text-gray-300 mb-1">
                    Giới tính
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full rounded-xl bg-[#0d0f17] border border-gray-700/80 px-4 py-3 text-sm text-white outline-none focus:border-[#e31b23] transition-all"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                {error && (
                  <div className="rounded-xl bg-red-950/60 border border-red-800/80 px-4 py-3 text-xs font-semibold text-red-300">
                    ⚠️ {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-[#e31b23] hover:bg-[#c4131a] px-4 py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-red-900/40 cursor-pointer disabled:opacity-60 transition-all transform active:scale-[0.99] mt-2"
                >
                  {submitting ? 'Đang tạo đơn...' : 'Xác nhận Đăng ký & Lấy mã VietQR PayOS →'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}