import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStudentShell } from '../components/workspace/studentShell';
import MemberSchedule from '../components/member/MemberSchedule';
import MembershipCard from '../components/member/MembershipCard';
import MemberClassList from '../components/member/MemberClassList';
import MemberSupportRequests from '../components/member/MemberSupportRequests';
import {
  getMyClassRegistrations,
  getMemberProfile,
  getMemberMembership,
  getConsultationContact,
  confirmMembershipRenewal,
  getMySupportRequests,
  getPendingCheckouts,
} from '../api/managementApi';
import { cardClass, sectionTitle, sectionSub, labelClass, btnPrimary, btnDark } from '../components/member/memberUi';

const formatCountdown = (ms) => {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

const SIDEBAR_ITEMS = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'classes', label: 'Lớp của tôi' },
  { key: 'schedule', label: 'Lịch học' },
  { key: 'support', label: 'Đơn hỗ trợ' },
  { key: 'history', label: 'Lịch sử thanh toán', href: '/hoc-vien/lich-su-thanh-toan' },
];

const REGISTER_TAB = { key: 'register', label: 'Đăng ký khóa học', href: '/dang-ky-khoa-hoc' };
const COURSE_PLAN_TAB = { key: 'course-plan', label: 'Bài tập lớp', href: '/hoc-vien/bai-tap-lop' };
const PERSONAL_AI_TAB = { key: 'personal-ai', label: 'Gợi ý tập', href: '/hoc-vien/giao-an-ai' };
const MEMBER_ONLY_TABS = new Set(['schedule', 'support']);
const SPY_OFFSET = 120; // lớn hơn scroll-mt-24 (96px) để mục vừa cuộn tới được tính là đang xem

export default function HocVienDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState('overview');
  const spyLockUntil = useRef(0);
  const [loading, setLoading] = useState(true);
  const [myClasses, setMyClasses] = useState([]);
  const [pendingCheckouts, setPendingCheckouts] = useState([]);
  const [now, setNow] = useState(() => Date.now());
  const [membershipData, setMembershipData] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [contactData, setContactData] = useState(null);

  const [supportRequests, setSupportRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notice, setNotice] = useState({ type: '', msg: '' });

  const memberUserId = user?.id || user?.userId;

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

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const classes = await getMyClassRegistrations().catch(() => []);
      if (Array.isArray(classes)) setMyClasses(classes);

      await loadPayments();

      setLoadingRequests(true);
      const requests = await getMySupportRequests().catch(() => []);
      if (Array.isArray(requests)) setSupportRequests(requests);
      setLoadingRequests(false);

      if (memberUserId) {
        const contact = await getConsultationContact(memberUserId).catch(() => null);
        if (contact) setContactData(contact);

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

  // TỰ ĐỘNG CHUYỂN HƯỚNG SANG LEADING PAGE NẾU CHƯA CÓ GÓI VÀ CHƯA ĐĂNG KÝ LỚP
  useEffect(() => {
    if (!loading) {
      const currentMembership = membershipData?.currentMembership;
      const hasActiveMembership = Boolean(currentMembership);
      const hasEnrolledClasses = myClasses.length > 0;

      if (!hasActiveMembership && !hasEnrolledClasses) {
        navigate('/hoc-vien-kham-pha', { replace: true });
      }
    }
  }, [loading, membershipData, myClasses.length, navigate]);

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

  useEffect(() => {
    const paymentId = searchParams.get('paymentId');
    if (paymentId && memberUserId) {
      handleConfirmPayment(paymentId);
    }
  }, [searchParams, memberUserId]);

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

  const displayName = profileData?.fullName || user?.fullName || user?.userName || 'Học viên';
  const displayEmail = profileData?.email || user?.email || 'Chưa cập nhật';
  const displayPhone = profileData?.phone || user?.phone || 'Chưa cập nhật';
  const currentMembership = membershipData?.currentMembership;
  const livePendingCheckouts = pendingCheckouts.filter((item) => item.deadline > now);

  const sidebarItems = useMemo(() => {
    if (loading) {
      return SIDEBAR_ITEMS.flatMap((item) => {
        if (item.key === 'overview') return [item, PERSONAL_AI_TAB];
        return item.key === 'history' ? [item] : [];
      });
    }
    const enrolled = myClasses.length > 0;
    const items = enrolled
      ? [...SIDEBAR_ITEMS]
      : SIDEBAR_ITEMS.flatMap((item) => {
          if (item.key === 'classes') return [PERSONAL_AI_TAB, REGISTER_TAB];
          if (MEMBER_ONLY_TABS.has(item.key)) return [];
          return [item];
        });
    if (enrolled) {
      const classIndex = items.findIndex((item) => item.key === 'classes');
      items.splice(classIndex === -1 ? 1 : classIndex + 1, 0, COURSE_PLAN_TAB, PERSONAL_AI_TAB, REGISTER_TAB);
    }
    return items;
  }, [loading, myClasses.length]);

  const selectTab = (key) => {
    const item = sidebarItems.find((entry) => entry.key === key);
    if (item?.href) {
      navigate(item.href);
      return;
    }
    spyLockUntil.current = Date.now() + 900;
    setActiveTab(key);
    window.history.replaceState(null, '', `#${key}`);
    document.getElementById(key)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      if (Date.now() < spyLockUntil.current) return;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      const spyItems = sidebarItems.filter((item) => !item.href);
      let current = spyItems[0].key;
      for (const item of spyItems) {
        const element = document.getElementById(item.key);
        if (element && element.getBoundingClientRect().top <= SPY_OFFSET) current = item.key;
      }
      setActiveTab(atBottom ? spyItems[spyItems.length - 1].key : current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [sidebarItems]);

  useEffect(() => {
    const key = searchParams.get('tab') || window.location.hash.replace('#', '');
    if (!sidebarItems.some((item) => item.key === key && !item.href)) return undefined;
    spyLockUntil.current = Date.now() + 600;
    setActiveTab(key);
    document.getElementById(key)?.scrollIntoView({ block: 'start' });
    return undefined;
  }, [sidebarItems, searchParams]);

  const currentItem = sidebarItems.find((item) => item.key === activeTab);

  useStudentShell(
    {
      activeId: activeTab,
      onSelect: selectTab,
      breadcrumb: [{ label: 'Học viên' }, { label: currentItem?.label || 'Tổng quan' }],
    },
    [sidebarItems, activeTab],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm font-semibold text-slate-500">
        Đang tải dữ liệu...
      </div>
    );
  }

  return (
    <>
        {isProcessing && <p className="text-sm font-semibold text-slate-500">Đang xác nhận thanh toán...</p>}
        {notice.msg && (
          <div
            className={`mt-4 flex items-center justify-between rounded-2xl border px-6 py-4 text-sm font-bold ${
              notice.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            <span>{notice.msg}</span>
            <button type="button" aria-label="Đóng thông báo" onClick={() => setNotice({ type: '', msg: '' })} className="font-bold text-sm">
              ✕
            </button>
          </div>
        )}

        <div className="mt-6 space-y-8 mb-12">
          {/* MỤC TỔNG QUAN */}
          <div id="overview" className="scroll-mt-24 space-y-8">
            {/* BANNER XIN CHÀO */}
            <section className={cardClass}>
              <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-black text-balance text-slate-900 sm:text-3xl">
                      Xin chào, {displayName}
                    </h1>
                    <p className={sectionSub}>
                      {loading || myClasses.length > 0
                        ? 'Quản lý gói tập hội viên, lớp học thể thao và các đơn yêu cầu hỗ trợ của bạn.'
                        : 'Bạn chưa mua khóa học. Hãy đăng ký một lớp huấn luyện để xem lịch học và gửi đơn hỗ trợ.'}
                    </p>
                  </div>

                  <Link to="/ho-so" className={`${btnDark} self-start md:self-auto`}>
                    Chỉnh sửa hồ sơ
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                    <span className={`${labelClass} mb-1`}>Email đăng ký</span>
                    <span className="text-sm font-bold text-slate-800 truncate block">{displayEmail}</span>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                    <span className={`${labelClass} mb-1`}>Số điện thoại</span>
                    <span className="text-sm font-bold text-slate-800 block">{displayPhone}</span>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                    <span className={`${labelClass} mb-1`}>Trạng thái hội viên</span>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-0.5 rounded-full border ${
                        currentMembership
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : 'text-slate-600 bg-slate-100 border-slate-200'
                      }`}
                    >
                      <span className={`size-1.5 rounded-full ${currentMembership ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                      {currentMembership ? 'Đang kích hoạt' : 'Chưa có gói tập'}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* GÓI HỘI VIÊN ĐANG SỬ DỤNG */}
            <MembershipCard
              currentMembership={currentMembership}
              membershipData={membershipData}
              displayName={displayName}
            />

            {/* GỢI Ý TẬP CÁ NHÂN */}
            <section className={cardClass}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className={sectionTitle}>Gợi ý tập cá nhân</h2>
                  <p className={sectionSub}>
                    {currentMembership
                      ? 'Nhập chỉ số và mục tiêu để AI đề xuất lịch tập riêng. Không phải bài tập của lớp.'
                      : 'Gợi ý tập cần gói hội viên đang hiệu lực. Gói có khi đăng ký khóa học.'}
                  </p>
                </div>
                {currentMembership ? (
                  <Link to="/hoc-vien/giao-an-ai" className={`${btnPrimary} self-start`}>
                    Mở gợi ý tập
                  </Link>
                ) : (
                  <Link to="/dang-ky-khoa-hoc" className={`${btnPrimary} self-start`}>
                    Đăng ký khóa học
                  </Link>
                )}
              </div>
            </section>

            {/* ĐƠN ĐANG CHỜ THANH TOÁN */}
            {livePendingCheckouts.length > 0 && (
              <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-xs sm:p-8">
                <h2 className={sectionTitle}>Đơn đang chờ thanh toán</h2>
                <p className={`${sectionSub} mb-4`}>
                  Mỗi đơn chỉ giữ 3 phút. Quá thời gian chưa thanh toán thì đơn tự hủy và bạn cần đăng ký lại.
                </p>
                <div className="space-y-3">
                  {livePendingCheckouts.map((item) => (
                    <div
                      key={item.paymentId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-4 border border-amber-200"
                    >
                      <div className="text-sm space-y-0.5">
                        <p className="font-black text-slate-900">
                          {item.kind === 'class'
                            ? `Đăng ký lớp ${item.className || ''}${item.packageName ? ` + Gói ${item.packageName}` : ''}`
                            : `Mua gói ${item.packageName || ''}`}
                        </p>
                        <p className="font-mono text-slate-500">#{item.invoiceCode}</p>
                        <p className="font-bold text-emerald-600">{item.amount?.toLocaleString('vi-VN')}đ</p>
                        <p className="font-bold text-amber-700">Còn {formatCountdown(item.deadline - now)}</p>
                      </div>
                      <Link to="/dang-ky-khoa-hoc" className={btnPrimary}>
                        Tiếp tục thanh toán →
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* MỤC LỚP HỌC */}
          {!loading && myClasses.length > 0 && (
            <div id="classes" className="scroll-mt-24 space-y-8">
              <MemberClassList loading={loading} myClasses={myClasses} />
            </div>
          )}

          {/* MỤC LỊCH HỌC */}
          {!loading && myClasses.length > 0 && (
            <div id="schedule" className="scroll-mt-24">
              <MemberSchedule />
            </div>
          )}

          {/* MỤC ĐƠN HỖ TRỢ */}
          {!loading && myClasses.length > 0 && (
            <div id="support" className="scroll-mt-24 space-y-8">
              <MemberSupportRequests loadingRequests={loadingRequests} supportRequests={supportRequests} />
            </div>
          )}

        </div>
    </>
  );
}