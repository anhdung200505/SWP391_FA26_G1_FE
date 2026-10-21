import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getMyClassRegistrations,
  getMemberProfile,
} from '../api/managementApi';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function HocVienDashboardPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [myClasses, setMyClasses] = useState([]);
  const [membershipData, setMembershipData] = useState(null);
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);

        // 1. Gọi API GET /api/class-registrations/mine lấy danh sách lớp đã đăng ký
        const classes = await getMyClassRegistrations().catch(() => []);
        if (Array.isArray(classes)) setMyClasses(classes);

        // 2. Lấy thông tin Membership & Profile chi tiết nếu có ID học viên
        const memberUserId = user?.id || user?.userId;
        if (memberUserId) {
          // Gọi API GET /api/members/{memberUserId}/membership
          try {
            const token = localStorage.getItem('token') || '';
            const res = await fetch(`/api/members/${memberUserId}/membership`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            if (res.ok) {
              const data = await res.json();
              setMembershipData(data);
            }
          } catch (e) {
            console.error('Lỗi tải thông tin membership:', e);
          }

          // Gọi API lấy hồ sơ cá nhân
          const prof = await getMemberProfile(memberUserId).catch(() => null);
          if (prof) setProfileData(prof);
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu Dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user]);

  // Thông tin hiển thị học viên
  const displayName = profileData?.fullName || user?.fullName || user?.userName || 'Học viên';
  const displayEmail = profileData?.email || user?.email || 'Chưa cập nhật';
  const displayPhone = profileData?.phone || user?.phone || 'Chưa cập nhật';
  const currentMembership = membershipData?.currentMembership;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col justify-between">
      {/* 1. HEADER CHUNG CỦA WEBSITE */}
      <Header />

      {/* 2. NỘI DUNG CHÍNH (TRANG NỀN TRẮNG SÁNG MODERN) */}
      <main className="flex-1 pb-16">
        
        {/* BANNER XIN CHÀO & TỔNG QUAN HỌC VIÊN */}
        <section className="bg-white border-b border-slate-200 py-8 shadow-xs">
          <div className="max-w-6xl mx-auto px-4 sm:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="inline-block bg-[#e31b23]/10 text-[#e31b23] text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full mb-2">
                  TRANG CÁ NHÂN HỌC VIÊN
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase">
                  XIN CHÀO, <span className="text-[#e31b23]">{displayName}</span>!
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Chào mừng bạn đến với trung tâm quản lý học tập thể thao AnhDuy Sport Center.
                </p>
              </div>

              {/* NÚT DIRECT SANG TRANG HỒ SƠ ĐỂ CHỈNH SỬA THÔNG TIN CÁ NHÂN */}
              <Link
                to="/ho-so"
                className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-[#e31b23] text-white text-xs font-bold px-5 py-3 rounded-xl shadow-md transition-all duration-200 active:scale-95 cursor-pointer self-start md:self-auto"
              >
                <span>⚙️ Chỉnh sửa hồ sơ</span>
              </Link>
            </div>

            {/* CÁC THẺ THÔNG TIN TÓM TẮT TÀI KHOẢN */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                  EMAIL ĐĂNG KÝ
                </span>
                <span className="text-xs font-bold text-slate-800 truncate block">
                  {displayEmail}
                </span>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                  SỐ ĐIỆN THOẠI
                </span>
                <span className="text-xs font-bold text-slate-800 block">
                  {displayPhone}
                </span>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                  TRẠNG THÁI TÀI KHOẢN
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Đã kích hoạt
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* THÔNG TIN CHI TIẾT LỚP HỌC & GÓI TẬP */}
        <div className="max-w-6xl mx-auto px-4 sm:px-8 mt-8 space-y-8">
          
          {/* GÓI HỘI VIÊN ĐANG SỬ DỤNG (MEMBERSHIP CARD) */}
          {currentMembership && (
            <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-[#e31b23]/20 rounded-full blur-2xl"></div>
              
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <span className="inline-block bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-2">
                    GÓI TẬP HIỆN TẠI
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
                </div>
              </div>
            </section>
          )}

          {/* DANH SÁCH KHÓA HỌC & LỚP ĐÃ ĐĂNG KÝ */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-900 uppercase">
                  KHÓA HỌC & LỚP ĐÃ GHI DANH
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Danh sách các khóa học thể thao bạn đang tham gia
                </p>
              </div>

              <Link
                to="/tuyen-sinh"
                className="text-xs font-extrabold text-[#e31b23] hover:underline"
              >
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
                        <span className="text-slate-400 font-medium">Địa điểm / Phòng:</span>
                        <span className="font-bold text-slate-800">{cls.roomName || cls.centerName || 'Sân tập'}</span>
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
              /* MÀN HÌNH MẶC ĐỊNH KHI CHƯA ĐĂNG KÝ LỚP NÀO */
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
                  className="inline-block bg-[#e31b23] hover:bg-[#c4131a] text-white font-black text-xs uppercase px-8 py-3.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  KHÁM PHÁ CÁC KHÓA HỌC →
                </Link>
              </div>
            )}
          </section>

        </div>
      </main>

      {/* 3. FOOTER CHUNG CỦA WEBSITE */}
      <Footer />
    </div>
  );
}