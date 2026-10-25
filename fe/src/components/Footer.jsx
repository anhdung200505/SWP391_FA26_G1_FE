import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import { createEnrollmentConsultation, createSupportRequest } from '../api/managementApi';
import { useAuth } from '../context/AuthContext';

const sportsList = [
  'Bơi lội',
  'Bóng bàn',
  'Bóng chuyền',
  'Bóng đá',
  'Bóng rổ',
  'Cầu lông',
  'Cờ vua',
  'Golf 3D',
  'Kiếm thuật',
  'Nhảy hiện đại',
  'Quần vợt',
  'Taekwondo',
];

export default function Footer() {
  const { user } = useAuth();
  const location = useLocation();

  const isDashboardPage = location.pathname === '/hoc-vien-dashboard';

  // ------------ STATE CỦA FORM TƯ VẤN GHI DANH (GUEST FORM) ------------
  const [actionNotice, setActionNotice] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    selectedSports: [],
    age: '',
  });
  const [errors, setErrors] = useState({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSportsDropdownOpen, setIsSportsDropdownOpen] = useState(false);

  // ------------ STATE CỦA WIDGET HỖ TRỢ (MEMBER LOGGED IN) ------------
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [supportType, setSupportType] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [helpLoading, setHelpLoading] = useState(false);
  const [helpNotice, setHelpNotice] = useState({ type: '', msg: '' });

  // Lọc số điện thoại
  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      setFormData({ ...formData, phone: value });
      if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
    }
  };

  // Lọc độ tuổi học viên
  const handleAgeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 2) {
      setFormData({ ...formData, age: value });
      if (errors.age) setErrors((prev) => ({ ...prev, age: '' }));
    }
  };

  // Toggle chọn môn học
  const handleSportToggle = (sport) => {
    setFormData((prev) => {
      const exists = prev.selectedSports.includes(sport);
      return {
        ...prev,
        selectedSports: exists
          ? prev.selectedSports.filter((item) => item !== sport)
          : [...prev.selectedSports, sport],
      };
    });
  };

  // Submit Form Tư vấn ghi danh
  const handleSubmitEnrollment = async (e) => {
    e.preventDefault();
    setActionNotice('');
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ và tên';
    }

    const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
    if (!formData.phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!formData.age.toString().trim()) {
      newErrors.age = 'Vui lòng nhập độ tuổi';
    } else if (Number(formData.age) <= 0) {
      newErrors.age = 'Độ tuổi không hợp lệ';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSuccess(false);
      return;
    }

    setErrors({});
    setIsLoading(true);

    const payload = {
      fullName: formData.fullName.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      sports: formData.selectedSports.length > 0 ? formData.selectedSports.join(', ') : 'Chưa chọn',
      age: Number(formData.age),
      title: 'Tư vấn ghi danh',
      note: 'Khách gửi tư vấn ghi danh từ website',
    };

    try {
      const res = await createEnrollmentConsultation(payload);
      if (res && res.message) {
        setActionNotice(res.message);
      } else {
        setIsSuccess(true);
      }
    } catch (requestError) {
      setActionNotice(requestError.message || 'Gửi yêu cầu thất bại. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Form Tạo Yêu cầu Hỗ trợ Lễ tân (API POST /api/support-requests)
  const handleSubmitSupport = async (e) => {
    e.preventDefault();
    setHelpNotice({ type: '', msg: '' });

    if (!supportType.trim() || !subject.trim() || !content.trim()) {
      setHelpNotice({ type: 'error', msg: 'Vui lòng nhập loại yêu cầu, tiêu đề và nội dung cần hỗ trợ.' });
      return;
    }

    setHelpLoading(true);

    const supportPayload = {
      memberUserId: String(user?.id || user?.userId || '0'),
      requestType: supportType.trim(),
      subject: subject.trim(),
      content: content.trim(),
    };

    try {
      await createSupportRequest(supportPayload);

      setHelpNotice({
        type: 'success',
        msg: 'Đã gửi yêu cầu tới Lễ tân thành công! Chúng tôi sẽ phản hồi bạn sớm nhất.',
      });
      setSupportType('');
      setSubject('');
      setContent('');
      setTimeout(() => {
        setIsHelpOpen(false);
        setHelpNotice({ type: '', msg: '' });
      }, 2500);
    } catch (err) {
      setHelpNotice({ type: 'error', msg: err.message || 'Không thể gửi yêu cầu hỗ trợ.' });
    } finally {
      setHelpLoading(false);
    }
  };

  return (
    <>
      <footer id="footer-section" className="relative w-full bg-[#12151e] text-white font-sans select-none overflow-hidden">
        <div className="relative w-full min-h-[420px] flex flex-col lg:flex-row">
          {/* ================= 1. KHỐI BÊN TRÁI ================= */}
          <div
            className={`w-full ${
              user ? 'lg:w-full max-w-7xl mx-auto px-6 sm:px-12 py-12' : 'lg:w-[50%] xl:w-[48%] px-8 sm:px-12 md:px-16 lg:pl-16 lg:pr-8 py-10 md:py-14'
            } flex flex-col justify-between z-10`}
          >
            <div>
              <div className="flex items-center space-x-2.5 mb-5 cursor-pointer">
                <img
                  src={logoImg}
                  alt="AnhDuy Sport Logo"
                  className="h-10 md:h-12 w-auto object-contain filter drop-shadow-md"
                />
                <div className="flex items-center font-black italic tracking-wider text-xl md:text-2xl uppercase select-none">
                  <span className="text-white drop-shadow-md">AnhDuy</span>
                  <span className="text-[#e31b23] ml-1.5 drop-shadow-md">Sport</span>
                </div>
              </div>

              <div className="flex items-center space-x-2.5 mb-10">
                <a href="#" className="w-8 h-8 rounded-full bg-[#1d2230] hover:bg-[#e31b23] flex items-center justify-center transition-colors">
                  <svg className="w-3.5 h-3.5 fill-current text-white" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-[#1d2230] hover:bg-[#e31b23] flex items-center justify-center transition-colors">
                  <svg className="w-3.5 h-3.5 fill-current text-white" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-[#1d2230] hover:bg-[#e31b23] flex items-center justify-center transition-colors">
                  <svg className="w-3.5 h-3.5 fill-current text-white" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.68 6.34 6.34 0 0 0 9.34 22a6.33 6.33 0 0 0 6.33-6.33V9.05a8.16 8.16 0 0 0 4.69 1.48V7.08a4.85 4.85 0 0 1-.77-.39z"/></svg>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 text-xs sm:text-sm text-gray-300">
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-wider mb-3.5">
                  THÔNG TIN LIÊN HỆ
                </h4>
                <ul className="space-y-2.5">
                  <li className="flex items-start space-x-2">
                    <span className="text-[#e31b23] text-sm">📞</span>
                    <div>
                      <p className="font-bold text-white">(+84) 902 82 4820</p>
                      <p className="text-[11px] text-gray-400">(trong giờ hành chính)</p>
                    </div>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-[#e31b23] text-sm">✉️</span>
                    <a href="mailto:enquiry@anhduysport.edu.vn" className="hover:text-white transition-colors">
                      enquiry@anhduysport.edu.vn
                    </a>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-[#e31b23] text-sm mt-0.5">📍</span>
                    <span>Số 07, Đường 23, Phường Tân Mỹ, TP.HCM</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-wider mb-3.5">
                  LIÊN KẾT
                </h4>
                <ul className="space-y-1.5 text-xs sm:text-sm">
                  <li><a href="/home" className="hover:text-[#e31b23] transition-colors">Trang chủ</a></li>
                  <li><a href="#courses-section" className="hover:text-[#e31b23] transition-colors">Khóa học</a></li>
                  <li><a href="#facilities-section" className="hover:text-[#e31b23] transition-colors">Cơ sở vật chất</a></li>
                  <li><a href="#coaches-section" className="hover:text-[#e31b23] transition-colors">Liên hệ</a></li>
                  <li><a href="/tuyen-sinh" className="hover:text-[#e31b23] transition-colors">Đăng ký khóa học</a></li>
                </ul>
              </div>

              {user && (
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider mb-3.5">
                    HỌC VIÊN PORTAL
                  </h4>
                  <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                    Bạn đang đăng nhập với tư cách học viên <strong className="text-white">{user.fullName || user.userName}</strong>.
                  </p>
                  
                  {!isDashboardPage && (
                    <a
                      href="/hoc-vien-dashboard"
                      className="inline-block bg-[#e31b23] hover:bg-[#c4131a] text-white text-xs font-black uppercase px-4 py-2 rounded-lg shadow transition-all"
                    >
                      Vào Dashboard →
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ================= 2. KHỐI BÊN PHẢI: FORM TƯ VẤN GHI DANH (GUEST FORM) ================= */}
          {!user && (
            <div
              className="relative w-full lg:w-[50%] xl:w-[52%] bg-[#e31b23] px-6 sm:px-10 lg:pl-16 lg:pr-12 py-10 md:py-12 flex flex-col justify-center min-h-[500px]"
              style={{
                clipPath: window.innerWidth >= 1024 ? 'polygon(8% 0, 100% 0, 100% 100%, 0% 100%)' : 'none',
              }}
            >
              <div className="max-w-md mx-auto w-full">
                <h3 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight text-center mb-6 drop-shadow-md">
                  TƯ VẤN GHI DANH
                </h3>

                {isSuccess ? (
                  <div className="bg-[#eaf7f0] border-l-4 border-[#00b050] text-[#1e2022] p-5 flex flex-col items-center text-center shadow-xl rounded-sm my-auto transition-all duration-300">
                    <div className="w-12 h-12 rounded-full bg-[#00b050]/15 flex items-center justify-center mb-3">
                      <svg className="w-7 h-7 text-[#00b050]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h4 className="font-black text-[#008000] text-base sm:text-lg uppercase tracking-tight mb-1">
                      ĐĂNG KÝ THÀNH CÔNG!
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-700 font-medium leading-relaxed">
                      Thông tin của bạn đã được ghi nhận. Chúng tôi sẽ liên hệ trong thời gian sớm nhất.
                    </p>
                    <button
                      onClick={() => {
                        setIsSuccess(false);
                        setFormData({ fullName: '', phone: '', email: '', selectedSports: [], age: '' });
                      }}
                      className="mt-5 text-xs font-bold text-[#e31b23] underline hover:text-black transition-colors cursor-pointer"
                    >
                      Gửi đăng ký mới
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitEnrollment} noValidate className="space-y-1">
                    {actionNotice && (
                      <p className="mb-3 bg-white px-3 py-2 text-center text-xs font-bold text-red-600 rounded">{actionNotice}</p>
                    )}

                    {/* 1. Họ và tên */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Họ và tên *"
                        value={formData.fullName}
                        onChange={(e) => {
                          setFormData({ ...formData, fullName: e.target.value });
                          if (errors.fullName) setErrors({ ...errors, fullName: '' });
                        }}
                        className={`w-full bg-[#181d29] text-white placeholder-gray-300 px-4 py-3 rounded-none border-0 focus:ring-1 focus:ring-white focus:outline-none text-center font-semibold text-sm shadow-inner ${
                          errors.fullName ? 'ring-2 ring-yellow-300' : ''
                        }`}
                      />
                      <div className="h-4 flex items-center justify-center">
                        {errors.fullName && (
                          <p className="text-yellow-200 text-[11px] font-semibold">
                            ⚠️ {errors.fullName}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 2. Số điện thoại */}
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Số điện thoại *"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        className={`w-full bg-[#181d29] text-white placeholder-gray-300 px-4 py-3 rounded-none border-0 focus:ring-1 focus:ring-white focus:outline-none text-center font-semibold text-sm shadow-inner ${
                          errors.phone ? 'ring-2 ring-yellow-300' : ''
                        }`}
                      />
                      <div className="h-4 flex items-center justify-center">
                        {errors.phone && (
                          <p className="text-yellow-200 text-[11px] font-semibold">
                            ⚠️ {errors.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 3. Email */}
                    <div className="relative">
                      <input
                        type="email"
                        placeholder="Email *"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                        }}
                        className={`w-full bg-[#181d29] text-white placeholder-gray-300 px-4 py-3 rounded-none border-0 focus:ring-1 focus:ring-white focus:outline-none text-center font-semibold text-sm shadow-inner ${
                          errors.email ? 'ring-2 ring-yellow-300' : ''
                        }`}
                      />
                      <div className="h-4 flex items-center justify-center">
                        {errors.email && (
                          <p className="text-yellow-200 text-[11px] font-semibold">
                            ⚠️ {errors.email}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 4. Môn học */}
                    <div className="relative pb-4">
                      <button
                        type="button"
                        onClick={() => setIsSportsDropdownOpen(!isSportsDropdownOpen)}
                        className="w-full bg-[#181d29] text-white px-4 py-3 rounded-none border-0 focus:ring-1 focus:ring-white focus:outline-none flex items-center justify-between text-sm font-semibold shadow-inner cursor-pointer"
                      >
                        <span className="w-full text-center text-gray-300 truncate">
                          {formData.selectedSports.length > 0
                            ? `Đã chọn: ${formData.selectedSports.join(', ')}`
                            : 'Môn học'}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">{isSportsDropdownOpen ? '▲' : '▼'}</span>
                      </button>

                      {isSportsDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-[#151922] border border-gray-700 shadow-2xl z-50 max-h-56 overflow-y-auto p-2 space-y-1">
                          {sportsList.map((sport) => {
                            const isChecked = formData.selectedSports.includes(sport);
                            return (
                              <label
                                key={sport}
                                onClick={() => handleSportToggle(sport)}
                                className="flex items-center space-x-2.5 px-3 py-1.5 hover:bg-[#202736] rounded cursor-pointer text-xs text-gray-200 select-none"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  className="w-3.5 h-3.5 accent-[#e31b23] rounded cursor-pointer"
                                />
                                <span>{sport}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* 5. Độ tuổi học viên */}
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        placeholder="Độ tuổi học viên *"
                        value={formData.age}
                        onChange={handleAgeChange}
                        className={`w-full bg-[#181d29] text-white placeholder-gray-300 px-4 py-3 rounded-none border-0 focus:ring-1 focus:ring-white focus:outline-none text-center font-semibold text-sm shadow-inner ${
                          errors.age ? 'ring-2 ring-yellow-300' : ''
                        }`}
                      />
                      <div className="h-4 flex items-center justify-center">
                        {errors.age && (
                          <p className="text-yellow-200 text-[11px] font-semibold">
                            ⚠️ {errors.age}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* NÚT ĐĂNG KÝ NGAY */}
                    <div className="pt-2 flex justify-center">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className={`bg-white hover:bg-gray-100 text-[#e31b23] font-black text-sm md:text-base px-8 py-3 transform -skew-x-12 transition-all duration-200 shadow-xl flex items-center justify-center space-x-2 uppercase tracking-wider ${
                          isLoading ? 'opacity-80 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'
                        }`}
                      >
                        <span className="inline-block transform skew-x-12 flex items-center gap-2">
                          {isLoading ? 'Đang gửi...' : 'Đăng ký ngay'}
                        </span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </footer>

      {/* ================= 3. FLOATING HELP BUTTON & POPUP DÀNH CHO HỌC VIÊN ĐÃ ĐĂNG NHẬP ================= */}
      {user && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
          {/* POPUP YÊU CẦU HỖ TRỢ */}
          {isHelpOpen && (
            <div className="mb-4 w-80 sm:w-96 bg-[#181d2a] border border-gray-700 rounded-3xl p-6 shadow-2xl text-white animate-in fade-in slide-in-from-bottom-5 duration-200">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎧</span>
                  <h3 className="text-sm font-black uppercase text-white tracking-wider">
                    Gửi hỗ trợ Lễ tân
                  </h3>
                </div>
                <button
                  onClick={() => setIsHelpOpen(false)}
                  className="text-gray-400 hover:text-white font-bold text-lg p-1 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitSupport} className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-400 font-bold mb-1">Loại yêu cầu *</label>
                  <input
                    type="text"
                    value={supportType}
                    maxLength={80}
                    onChange={(e) => setSupportType(e.target.value)}
                    placeholder="Ví dụ: Đổi lịch học, sự cố tài khoản, học phí"
                    className="w-full bg-[#0d0f17] border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-500 outline-none focus:border-[#e31b23]"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 font-bold mb-1">Tiêu đề *</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="vd: Cần đổi thời gian lớp Bóng bàn"
                    className="w-full bg-[#0d0f17] border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-500 outline-none focus:border-[#e31b23]"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 font-bold mb-1">Nội dung chi tiết *</label>
                  <textarea
                    rows={3}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Mô tả cụ thể vấn đề bạn cần hỗ trợ..."
                    className="w-full bg-[#0d0f17] border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-500 outline-none focus:border-[#e31b23] resize-none"
                  />
                </div>

                {helpNotice.msg && (
                  <div
                    className={`p-2.5 rounded-xl border text-[11px] font-semibold ${
                      helpNotice.type === 'success'
                        ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                        : 'bg-red-950/80 border-red-800 text-red-300'
                    }`}
                  >
                    {helpNotice.msg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={helpLoading}
                  className="w-full bg-[#e31b23] hover:bg-[#c4131a] text-white font-black uppercase text-xs tracking-wider py-3 rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-60"
                >
                  {helpLoading ? 'Đang gửi...' : 'Gửi yêu cầu tới Lễ tân →'}
                </button>
              </form>
            </div>
          )}

          {/* NÚT TRỢ GIÚP FLOATING BUTTON */}
          <button
            type="button"
            onClick={() => setIsHelpOpen(!isHelpOpen)}
            className="group flex items-center gap-2.5 bg-[#e31b23] hover:bg-[#c4131a] text-white font-black text-xs uppercase tracking-wider px-5 py-3.5 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer border border-red-400/30"
          >
            <span className="text-lg">💬</span>
            <span>{isHelpOpen ? 'Đóng Trợ Giúp' : 'Trợ Giúp'}</span>
          </button>
        </div>
      )}
    </>
  );
}