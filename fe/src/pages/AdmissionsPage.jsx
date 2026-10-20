import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import arenaImg from '../assets/facilities/facility-arena-1024x683.webp';
import { createEnrollmentConsultation } from '../api/managementApi';

// DỮ LIỆU QUY TRÌNH 4 BƯỚC CHUẨN MẪU
const processSteps = [
  {
    stepNum: '01',
    title: 'CHỌN BỘ MÔN',
    desc: 'Khám phá danh sách 8 bộ môn tại AnhDuy Sport — từ bơi lội, bóng rổ, tennis đến bóng đá và taekwondo. Bạn có thể chọn một hoặc nhiều môn phù hợp với sở thích, độ tuổi và mục tiêu thể chất của mình.',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
      </svg>
    ),
  },
  {
    stepNum: '02',
    title: 'ĐĂNG KÝ TƯ VẤN',
    desc: 'Điền thông tin vào mẫu đăng ký tư vấn trực tuyến. Đội ngũ tư vấn viên sẽ liên hệ trong vòng 24 giờ để trao đổi về bộ môn bạn quan tâm, lịch học phù hợp và các gói huấn luyện hiện có.',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5z" />
      </svg>
    ),
  },
  {
    stepNum: '03',
    title: 'HỌC THỬ MIỄN PHÍ',
    desc: 'Tham gia buổi học thử miễn phí để trải nghiệm trực tiếp giáo viên, cơ sở vật chất và phương pháp huấn luyện. Đây cũng là cơ hội để HLV đánh giá trình độ và xây dựng lộ trình phù hợp riêng cho bạn.',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    ),
  },
  {
    stepNum: '04',
    title: 'CHÍNH THỨC GHI DANH',
    desc: 'Hoàn tất thủ tục ghi danh và thanh toán học phí để chính thức trở thành học viên AnhDuy Sport. Bạn sẽ nhận được lịch học, thông tin HLV phụ trách và sẵn sàng bắt đầu hành trình phát triển thể chất của mình!',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
      </svg>
    ),
  },
];

const sportsList = [
  'Bơi lội',
  'Bóng rổ',
  'Bóng đá',
  'Golf 3D',
  'Quần vợt',
  'Bóng bàn',
  'Cầu lông',
  'Taekwondo',
];

export default function AdmissionsPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPackageName, setModalPackageName] = useState('');

  // State Form Đăng Ký Tư Vấn
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedSport, setSelectedSport] = useState('Bơi lội');
  const [studentAge, setStudentAge] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    document.title = 'Tuyển sinh & Đăng ký - AnhDuy Sport';
    window.scrollTo(0, 0);
  }, []);

  const openModal = (packageName = '') => {
    setFormError('');
    setModalPackageName(packageName);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmitConsult = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!fullName.trim() || !phone.trim() || !email.trim()) {
      setFormError('Vui lòng nhập họ tên, số điện thoại và email.');
      return;
    }
    setSubmitting(true);
    try {
      await createEnrollmentConsultation({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        sports: selectedSport,
        age: studentAge ? Number(studentAge) : null,
        kind: 'dang-ky-tu-van',
        note: modalPackageName,
      });
      closeModal();
      setFullName('');
      setPhone('');
      setEmail('');
      setStudentAge('');
      setFormError('');
      window.alert('Đăng ký tư vấn đã được ghi nhận. Lễ tân sẽ liên hệ bạn.');
    } catch (requestError) {
      setFormError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen font-sans bg-[#0d0f17] text-white select-none overflow-x-hidden">
      {/* 1. HEADER NỀN TRẮNG CỐ ĐỊNH */}
      <Header forceWhite />

      {/* 2. HERO BANNER TUYỂN SINH (ĐÃ BỎ DẢI 4 NÚT) */}
      <section className="relative w-full min-h-[55vh] pt-32 pb-20 bg-[#0d0f17] overflow-hidden flex flex-col justify-center">
        <div className="absolute inset-0 z-0">
          <img
            src={arenaImg}
            alt="AnhDuy Sport Admissions"
            className="w-full h-full object-cover object-center filter brightness-[0.4] contrast-[1.1]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent"></div>
          {/* Lớp màu đỏ vát nghiêng góc phải banner */}
          <div
            className="absolute inset-y-0 right-0 w-full lg:w-[45%] bg-[#e31b23]/25 mix-blend-multiply pointer-events-none"
            style={{
              clipPath: window.innerWidth >= 1024 ? 'polygon(30% 0, 100% 0, 100% 100%, 0% 100%)' : 'none',
            }}
          ></div>
        </div>

        {/* TIÊU ĐỀ HERO BANNER */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 my-auto">
          <div className="mb-4">
            <span className="inline-block bg-[#e31b23] text-white font-black text-xs sm:text-sm px-4 py-1.5 uppercase tracking-widest shadow-lg transform -skew-x-6">
              <span className="inline-block transform skew-x-6">ANHDUY SPORT CENTER</span>
            </span>
          </div>

          <h1 className="text-5xl sm:text-7xl md:text-8xl font-black text-[#e31b23] uppercase tracking-tight leading-none drop-shadow-2xl mb-6">
            TUYỂN SINH
          </h1>

          <p className="max-w-2xl text-gray-200 text-sm sm:text-base md:text-lg font-semibold leading-relaxed drop-shadow-md border-l-4 border-[#e31b23] pl-4">
            Đăng ký tuyển sinh và bắt đầu hành trình phát triển thể chất toàn diện cùng AnhDuy Sport.
          </p>
        </div>
      </section>

      {/* 3. SECTION QUY TRÌNH TUYỂN SINH */}
      <section className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 py-16">
        <div className="mb-10">
          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
            QUY TRÌNH <span className="text-[#e31b23]">TUYỂN SINH</span>
          </h2>
          <div className="w-20 h-1 bg-[#e31b23] mt-3"></div>
        </div>

        {/* CỤM CHỌN BƯỚC */}
        <div className="border border-red-900/60 bg-[#121622] rounded-2xl p-6 mb-8 relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
            {processSteps.map((step, idx) => {
              const isSelected = activeStep === idx;
              return (
                <div key={idx} className="flex items-center w-full">
                  <button
                    onClick={() => setActiveStep(idx)}
                    className="flex flex-col items-center justify-center w-full cursor-pointer group focus:outline-none"
                  >
                    {/* KHỐI HÌNH BÌNH HÀNH VÁT NGHIÊNG ICON CÓ GLOW ĐỎ NỔI BẬT */}
                    <div
                      className={`w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center transition-all duration-300 transform -skew-x-12 mb-3 ${
                        isSelected
                          ? 'bg-[#e31b23] text-white shadow-[0_0_20px_rgba(227,27,35,0.8)] scale-110'
                          : 'bg-[#1e2433] text-gray-400 border border-gray-700/80 group-hover:border-[#e31b23]'
                      }`}
                    >
                      <div className="transform skew-x-12">{step.icon}</div>
                    </div>

                    <span
                      className={`text-xs font-black uppercase tracking-wider text-center transition-colors ${
                        isSelected ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'
                      }`}
                    >
                      {step.title}
                    </span>
                  </button>

                  {/* ĐƯỜNG NỐI NGANG GIỮA CÁC BƯỚC */}
                  {idx < processSteps.length - 1 && (
                    <div className="hidden md:block h-[1px] bg-gray-700/80 flex-1 mx-2"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* NỘI DUNG CHI TIẾT BƯỚC ĐANG CHỌN */}
        <div className="relative bg-[#151926] border border-gray-800 rounded-2xl p-8 md:p-12 shadow-2xl overflow-hidden min-h-[320px]">
          <div className="relative z-10">
            <h3 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight mb-4">
              {processSteps[activeStep].title}
            </h3>

            <p className="text-gray-300 text-sm md:text-base font-medium leading-relaxed max-w-3xl mb-10">
              {processSteps[activeStep].desc}
            </p>

            {/* TIẾN ĐỘ THỜI GIAN TUYỂN SINH */}
            <div className="mb-8 max-w-full">
              <div className="flex justify-between items-center text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
                <span>TIẾN ĐỘ TUYỂN SINH</span>
                <span>{activeStep + 1}/4</span>
              </div>
              <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#e31b23] transition-all duration-500"
                  style={{ width: `${((activeStep + 1) / 4) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* NÚT ĐIỀU HƯỚNG PREV / NEXT & NÚT ĐĂNG KÝ NGAY */}
            <div className="flex items-center gap-3">
              <button
                disabled={activeStep === 0}
                onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
                className="w-10 h-10 rounded-md bg-[#1e2433] hover:bg-[#283044] border border-gray-700/80 disabled:opacity-30 flex items-center justify-center font-black text-white transition-all cursor-pointer"
              >
                ‹
              </button>
              <button
                disabled={activeStep === 3}
                onClick={() => setActiveStep((prev) => Math.min(3, prev + 1))}
                className="w-10 h-10 rounded-md bg-[#1e2433] hover:bg-[#283044] border border-gray-700/80 disabled:opacity-30 flex items-center justify-center font-black text-white transition-all cursor-pointer"
              >
                ›
              </button>

              <button
                onClick={() => openModal('Tư vấn khóa học')}
                className="px-8 py-3 bg-[#e31b23] hover:bg-[#c4131a] text-white font-black text-xs uppercase tracking-wider transform -skew-x-12 transition-all cursor-pointer shadow-lg shadow-red-900/40 ml-auto"
              >
                <span className="inline-block transform skew-x-12">
                  ĐĂNG KÝ NGAY →
                </span>
              </button>
            </div>
          </div>

          {/* SỐ BƯỚC NỀN (01, 02, 03, 04) */}
          <div className="absolute right-4 bottom-0 text-[180px] font-black text-white/5 pointer-events-none select-none leading-none">
            {processSteps[activeStep].stepNum}
          </div>
        </div>
      </section>

      {/* 4. SECTION CÁC GÓI HUẤN LUYỆN */}
      <section className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 py-16 border-t border-gray-800">
        <div className="mb-12">
          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
            CÁC GÓI <span className="text-[#e31b23]">HUẤN LUYỆN</span>
          </h2>
          <div className="w-20 h-1 bg-[#e31b23] mt-3 mb-4"></div>
          <p className="text-sm font-semibold text-gray-400 max-w-3xl leading-relaxed">
            Các chương trình được dẫn dắt bởi đội ngũ HLV giàu kinh nghiệm, trong môi trường luyện tập hiện đại chuẩn quốc tế, giúp học viên phát huy tối đa tiềm năng và bản lĩnh thể thao.
          </p>
        </div>

        {/* 3 THẺ GÓI HUẤN LUYỆN */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          
          {/* THẺ 1: TẬP LUYỆN THEO NHÓM */}
          <div className="bg-[#151926] border border-gray-800/80 rounded-xl p-8 flex flex-col justify-between hover:border-gray-700 transition-all shadow-xl">
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-300 bg-[#1e2433] px-3 py-1 rounded-sm border border-gray-700/80">
                  GROUP TRAINING
                </span>
                <span className="text-gray-400">👥</span>
              </div>

              <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-3">
                TẬP LUYỆN THEO NHÓM
              </h3>
              <p className="text-xs font-medium text-gray-300 leading-relaxed mb-6">
                Khuyến khích tinh thần đồng đội và tạo cơ hội giao lưu, học hỏi giữa các học viên có cùng đam mê thể thao.
              </p>

              <div className="space-y-3 pt-4 border-t border-gray-800 text-xs">
                <div className="flex items-start gap-2.5 text-gray-200 font-bold">
                  <span className="w-5 h-5 rounded bg-gray-800 text-gray-300 flex items-center justify-center text-[10px] shrink-0">1</span>
                  Lớp học theo cấp độ, dễ hòa nhập với nhóm phù hợp
                </div>
                <div className="flex items-start gap-2.5 text-gray-200 font-bold">
                  <span className="w-5 h-5 rounded bg-gray-800 text-gray-300 flex items-center justify-center text-[10px] shrink-0">2</span>
                  Bài tập phối hợp giúp tăng phản xạ và tinh thần đồng đội
                </div>
                <div className="flex items-start gap-2.5 text-gray-200 font-bold">
                  <span className="w-5 h-5 rounded bg-gray-800 text-gray-300 flex items-center justify-center text-[10px] shrink-0">3</span>
                  Theo dõi tiến bộ định kỳ sau mỗi giai đoạn
                </div>
              </div>
            </div>

            <button
              onClick={() => openModal('Tập luyện theo nhóm')}
              className="mt-8 w-full py-3.5 bg-[#1e2433] hover:bg-[#e31b23] text-white font-black text-xs uppercase tracking-wider rounded-md border border-gray-700/80 hover:border-[#e31b23] transition-all cursor-pointer"
            >
              TÌM HIỂU THÊM →
            </button>
          </div>

          {/* THẺ 2: HUẤN LUYỆN RIÊNG 1:1 */}
          <div className="bg-[#21090d] border-2 border-[#e31b23] rounded-xl p-8 flex flex-col justify-between shadow-2xl relative">
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#e31b23] text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-sm shadow-lg">
              🔥 PHỔ BIẾN NHẤT
            </span>

            <div>
              <div className="flex justify-between items-center mb-4 mt-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#e31b23] bg-white px-3 py-1 rounded-sm">
                  PRIVATE COACHING
                </span>
                <span className="text-[#e31b23]">👤</span>
              </div>

              <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-3">
                HUẤN LUYỆN RIÊNG 1:1 / 2:1
              </h3>
              <p className="text-xs font-medium text-gray-200 leading-relaxed mb-6">
                Chương trình cá nhân hóa giúp học viên được hướng dẫn trực tiếp cùng HLV, tập trung tối đa vào kỹ thuật, thể lực và chiến thuật theo mục tiêu riêng.
              </p>

              <div className="space-y-3 pt-4 border-t border-red-900/40 text-xs">
                <div className="flex items-start gap-2.5 text-gray-100 font-bold">
                  <span className="w-5 h-5 rounded bg-[#e31b23] text-white flex items-center justify-center text-[10px] shrink-0">1</span>
                  Đánh giá kỹ thuật và thể lực trước khi xây dựng giáo án
                </div>
                <div className="flex items-start gap-2.5 text-gray-100 font-bold">
                  <span className="w-5 h-5 rounded bg-[#e31b23] text-white flex items-center justify-center text-[10px] shrink-0">2</span>
                  Lộ trình cá nhân hóa theo mục tiêu, độ tuổi và lịch sinh hoạt
                </div>
                <div className="flex items-start gap-2.5 text-gray-100 font-bold">
                  <span className="w-5 h-5 rounded bg-[#e31b23] text-white flex items-center justify-center text-[10px] shrink-0">3</span>
                  Phản hồi trực tiếp trong từng buổi để chỉnh lỗi nhanh
                </div>
              </div>
            </div>

            <button
              onClick={() => openModal('Huấn luyện riêng 1:1')}
              className="mt-8 w-full py-3.5 bg-[#e31b23] hover:bg-[#c4131a] text-white font-black text-xs uppercase tracking-wider rounded-md shadow-lg shadow-red-900/40 transition-all cursor-pointer"
            >
              TÌM HIỂU THÊM →
            </button>
          </div>

          {/* THẺ 3: HUẤN LUYỆN THI ĐẤU */}
          <div className="bg-[#151926] border border-gray-800/80 rounded-xl p-8 flex flex-col justify-between hover:border-gray-700 transition-all shadow-xl">
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-300 bg-[#1e2433] px-3 py-1 rounded-sm border border-gray-700/80">
                  ELITE COMPETITION
                </span>
                <span className="text-gray-400">🏆</span>
              </div>

              <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-3">
                HUẤN LUYỆN THI ĐẤU
              </h3>
              <p className="text-xs font-medium text-gray-300 leading-relaxed mb-6">
                Dành cho học viên có định hướng thi đấu chuyên nghiệp, chú trọng rèn luyện kỹ năng nâng cao, tâm lý thi đấu và chiến lược thực chiến.
              </p>

              <div className="space-y-3 pt-4 border-t border-gray-800 text-xs">
                <div className="flex items-start gap-2.5 text-gray-200 font-bold">
                  <span className="w-5 h-5 rounded bg-gray-800 text-gray-300 flex items-center justify-center text-[10px] shrink-0">1</span>
                  Giáo án nâng cao theo tiêu chuẩn thi đấu chuyên nghiệp
                </div>
                <div className="flex items-start gap-2.5 text-gray-200 font-bold">
                  <span className="w-5 h-5 rounded bg-gray-800 text-gray-300 flex items-center justify-center text-[10px] shrink-0">2</span>
                  Rèn chiến thuật, tâm lý và xử lý áp lực trận đấu
                </div>
                <div className="flex items-start gap-2.5 text-gray-200 font-bold">
                  <span className="w-5 h-5 rounded bg-gray-800 text-gray-300 flex items-center justify-center text-[10px] shrink-0">3</span>
                  Định hướng tham gia giải đấu và kiểm tra năng lực định kỳ
                </div>
              </div>
            </div>

            <button
              onClick={() => openModal('Huấn luyện thi đấu')}
              className="mt-8 w-full py-3.5 bg-[#1e2433] hover:bg-[#e31b23] text-white font-black text-xs uppercase tracking-wider rounded-md border border-gray-700/80 hover:border-[#e31b23] transition-all cursor-pointer"
            >
              TÌM HIỂU THÊM →
            </button>
          </div>

        </div>
      </section>

      {/* 5. POPUP MODAL ĐĂNG KÝ TƯ VẤN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="relative bg-white text-gray-900 rounded-lg p-6 sm:p-8 w-full max-w-md shadow-2xl">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 w-7 h-7 rounded-sm bg-[#e31b23] text-white font-bold text-xs flex items-center justify-center hover:bg-red-700 transition-colors cursor-pointer"
            >
              ✕
            </button>

            <h3 className="text-2xl font-black text-[#e31b23] uppercase tracking-tight text-center mb-1">
              ĐĂNG KÝ TƯ VẤN
            </h3>
            <p className="text-xs text-gray-600 text-center font-medium mb-6">
              Để lại thông tin, chúng tôi sẽ liên hệ bạn sớm nhất
              {modalPackageName && <span className="text-[#e31b23] font-bold block mt-0.5">({modalPackageName})</span>}
            </p>

            <form onSubmit={handleSubmitConsult} className="space-y-3.5">
              {formError && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-[#e31b23]">{formError}</p>
              )}
              <div>
                <input
                  type="text"
                  required
                  placeholder="Họ và tên *"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#e31b23] transition-all"
                />
              </div>

              <div>
                <input
                  type="tel"
                  required
                  placeholder="Số điện thoại *"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#e31b23] transition-all"
                />
              </div>

              <div>
                <input
                  type="email"
                  placeholder="Email *"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#e31b23] transition-all"
                />
              </div>

              <div>
                <select
                  value={selectedSport}
                  onChange={(e) => setSelectedSport(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#e31b23] transition-all cursor-pointer"
                >
                  {sportsList.map((sp, idx) => (
                    <option key={idx} value={sp} className="text-gray-900">
                      Chọn bộ môn quan tâm: {sp}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Độ tuổi học viên *"
                  value={studentAge}
                  onChange={(e) => setStudentAge(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#e31b23] transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-[#e31b23] hover:bg-[#c4131a] text-white font-black text-xs uppercase tracking-wider rounded-md shadow-md cursor-pointer disabled:opacity-50 transition-all mt-2"
              >
                {submitting ? 'ĐANG GỬI...' : 'GỬI ĐĂNG KÝ →'}
              </button>

              <p className="text-[10px] text-gray-400 text-center font-semibold pt-1">
                Thông tin của bạn được bảo mật hoàn toàn
              </p>
            </form>
          </div>
        </div>
      )}

      {/* 6. FOOTER */}
      <Footer />
    </div>
  );
}