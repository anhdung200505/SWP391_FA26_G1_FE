import React, { useState, useEffect, useRef } from 'react';
import { registrationOnly, registrationOnlyMessage } from '../auth/destination';
import { useAuth } from '../context/AuthContext';

export default function FacilityTourSection({ formRef }) {
  const { user } = useAuth();
  const sectionRef = useRef(null);
  const [actionNotice, setActionNotice] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    date: '',
    groupSize: '10',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Observer cho hiệu ứng Fade-In-Up
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('opacity-100', 'translate-y-0');
          entry.target.classList.remove('opacity-0', 'translate-y-12');
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Lọc số điện thoại
  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      setFormData({ ...formData, phone: value });
      if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (registrationOnly(user)) {
      setActionNotice(registrationOnlyMessage);
      return;
    }
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

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
    }, 1500);
  };

  return (
    <section
      ref={sectionRef}
      className="opacity-0 translate-y-12 transition-all duration-700 ease-out relative w-full bg-white py-16 md:py-24 text-gray-900 font-sans select-none overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* TIÊU ĐỀ SECTION */}
        <div className="mb-10 md:mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 uppercase tracking-tight">
            KHÔNG GIAN <span className="text-[#e31b23]">TẬP LUYỆN & THI ĐẤU</span>
          </h2>
          <div className="w-20 h-1 bg-[#e31b23] mt-2 mb-4"></div>
          
          <p className="text-gray-600 text-xs sm:text-sm md:text-base font-medium leading-relaxed max-w-5xl">
            Mỗi khu vực tại AnhDuy Sport được tổ chức như một điểm chạm trải nghiệm: đủ tiêu chuẩn cho đào tạo hằng ngày, đủ linh hoạt cho giải đấu, sự kiện và chương trình thể thao quy mô lớn.
          </p>
        </div>

        {/* CARD BỐ CỤC 2 CỘT */}
        <div
          ref={formRef}
          className="w-full bg-[#12151e] shadow-2xl rounded-sm overflow-hidden flex flex-col lg:flex-row border border-gray-800/80 scroll-mt-28"
        >
          {/* CỘT TRÁI: ĐĂNG KÝ THAM QUAN */}
          <div className="w-full lg:w-[45%] p-6 sm:p-10 md:p-11 text-white flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-gray-800 relative">
            <div>
              <div className="inline-flex items-center space-x-2 bg-[#1b202e] border border-gray-700/60 px-3 py-1.5 rounded-sm mb-6">
                <svg className="w-4 h-4 text-[#e31b23]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-[11px] font-black tracking-widest text-gray-200 uppercase">
                  FACILITY TOUR
                </span>
              </div>

              <h3 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mb-3">
                ĐĂNG KÝ <span className="text-[#e31b23]">THAM QUAN</span>
              </h3>

              <p className="text-gray-300 text-xs sm:text-sm font-medium leading-relaxed mb-8">
                Lên lịch khảo sát trực tiếp với đội ngũ AnhDuy Sport để xem mặt bằng, kiểm tra luồng di chuyển và chọn khu vực phù hợp cho lớp học, giải đấu hoặc sự kiện.
              </p>

              <div className="space-y-3 mb-8">
                <div className="bg-[#181d2a] p-3 flex items-center space-x-3.5 rounded-sm">
                  <div className="w-10 h-10 rounded bg-[#e31b23] flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase block tracking-wider">
                      THỜI LƯỢNG
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-white">
                      45-60 phút
                    </span>
                  </div>
                </div>

                <div className="bg-[#181d2a] p-3 flex items-center space-x-3.5 rounded-sm">
                  <div className="w-10 h-10 rounded bg-[#e31b23] flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase block tracking-wider">
                      QUY MÔ GỢI Ý
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-white">
                      5-40 khách
                    </span>
                  </div>
                </div>

                <div className="bg-[#181d2a] p-3 flex items-center space-x-3.5 rounded-sm">
                  <div className="w-10 h-10 rounded bg-[#e31b23] flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase block tracking-wider">
                      ĐIỂM HẸN
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-white">
                      AnhDuy Sport
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-800 space-y-3.5">
                <div className="flex items-start space-x-3">
                  <div className="w-4 h-4 rounded-full border border-[#e31b23] flex items-center justify-center shrink-0 mt-0.5 text-[#e31b23]">
                    <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20">
                      <path d="M0 11l2-2 5 5L18 3l2 2L7 18z"/>
                    </svg>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-300 font-semibold leading-tight">
                    Khảo sát thực tế không gian tập luyện, thi đấu và tổ chức sự kiện.
                  </p>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-4 h-4 rounded-full border border-[#e31b23] flex items-center justify-center shrink-0 mt-0.5 text-[#e31b23]">
                    <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20">
                      <path d="M0 11l2-2 5 5L18 3l2 2L7 18z"/>
                    </svg>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-300 font-semibold leading-tight">
                    Tư vấn lựa chọn khu vực phù hợp theo quy mô đoàn, lớp học hoặc giải đấu.
                  </p>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-4 h-4 rounded-full border border-[#e31b23] flex items-center justify-center shrink-0 mt-0.5 text-[#e31b23]">
                    <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20">
                      <path d="M0 11l2-2 5 5L18 3l2 2L7 18z"/>
                    </svg>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-300 font-semibold leading-tight">
                    Nhận thông tin về cơ sở vật chất trực tiếp từ đội ngũ AnhDuy Sport.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: FORM CHỌN NGÀY PHÙ HỢP */}
          <div className="w-full lg:w-[55%] bg-white p-6 sm:p-10 md:p-11 flex flex-col justify-center">
            <div className="mb-6">
              <span className="text-[11px] font-black text-[#e31b23] uppercase tracking-widest block mb-1">
                GỬI THÔNG TIN LỊCH HẸN
              </span>
              <h4 className="text-2xl sm:text-3xl font-black text-gray-900 uppercase tracking-tight">
                CHỌN NGÀY PHÙ HỢP
              </h4>
            </div>

            {isSuccess ? (
              <div className="bg-[#eaf7f0] border-l-4 border-[#00b050] p-6 text-center my-auto rounded-sm">
                <div className="w-12 h-12 bg-[#00b050]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-[#00b050] text-xl font-bold">✓</span>
                </div>
                <h5 className="text-[#008000] font-black text-lg uppercase mb-1">
                  ĐĂNG KÝ THAM QUAN THÀNH CÔNG!
                </h5>
                <p className="text-xs sm:text-sm text-gray-700 font-medium leading-relaxed">
                  Chúng tôi đã tiếp nhận thông tin lịch hẹn và sẽ gọi xác nhận trong thời gian sớm nhất.
                </p>
                <button
                  onClick={() => {
                    setIsSuccess(false);
                    setFormData({ fullName: '', phone: '', email: '', date: '', groupSize: '10', notes: '' });
                  }}
                  className="mt-5 text-xs font-bold text-[#e31b23] underline hover:text-black cursor-pointer"
                >
                  Đăng ký lịch hẹn khác
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {actionNotice && (
                  <p className="rounded-sm bg-[#fff2f2] px-3 py-2 text-xs font-bold text-[#b1131a]">{actionNotice}</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black uppercase text-gray-700 mb-1">
                      HỌ VÀ TÊN <span className="text-[#e31b23]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full bg-[#f2f4f8] text-gray-900 placeholder-gray-400 px-4 py-3 text-sm font-medium border border-transparent focus:bg-white focus:border-gray-400 focus:outline-none"
                    />
                    {errors.fullName && (
                      <p className="text-[#e31b23] text-xs font-semibold mt-1">⚠️ {errors.fullName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase text-gray-700 mb-1">
                      SỐ ĐIỆN THOẠI <span className="text-[#e31b23]">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0902 824 820"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      className="w-full bg-[#f2f4f8] text-gray-900 placeholder-gray-400 px-4 py-3 text-sm font-medium border border-transparent focus:bg-white focus:border-gray-400 focus:outline-none"
                    />
                    {errors.phone && (
                      <p className="text-[#e31b23] text-xs font-semibold mt-1">⚠️ {errors.phone}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-gray-700 mb-1">
                    EMAIL
                  </label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#f2f4f8] text-gray-900 placeholder-gray-400 px-4 py-3 text-sm font-medium border border-transparent focus:bg-white focus:border-gray-400 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black uppercase text-gray-700 mb-1">
                      NGÀY DỰ KIẾN
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-[#f2f4f8] text-gray-800 px-4 py-3 text-sm font-medium border border-transparent focus:bg-white focus:border-gray-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase text-gray-700 mb-1">
                      SỐ LƯỢNG
                    </label>
                    <input
                      type="number"
                      placeholder="10"
                      value={formData.groupSize}
                      onChange={(e) => setFormData({ ...formData, groupSize: e.target.value })}
                      className="w-full bg-[#f2f4f8] text-gray-900 placeholder-gray-400 px-4 py-3 text-sm font-medium border border-transparent focus:bg-white focus:border-gray-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-gray-700 mb-1">
                    NHU CẦU THAM QUAN
                  </label>
                  <textarea
                    rows="3"
                    placeholder="Khu vực muốn xem, mục đích tham quan..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-[#f2f4f8] text-gray-900 placeholder-gray-400 px-4 py-3 text-sm font-medium border border-transparent focus:bg-white focus:border-gray-400 focus:outline-none resize-none"
                  ></textarea>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full bg-[#e31b23] hover:bg-red-700 text-white font-black text-sm md:text-base py-3.5 transform -skew-x-6 transition-all duration-200 shadow-xl cursor-pointer ${
                      isLoading ? 'opacity-80 cursor-not-allowed' : 'hover:scale-[1.01]'
                    }`}
                  >
                    <span className="transform skew-x-6 flex items-center justify-center space-x-2">
                      {isLoading ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span className="uppercase tracking-wider">Đang gửi thông tin...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 text-white fill-none stroke-current transform rotate-45 -mt-0.5 shrink-0" strokeWidth="2.2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          <span className="uppercase tracking-wider whitespace-nowrap">GỬI ĐĂNG KÝ THAM QUAN</span>
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}