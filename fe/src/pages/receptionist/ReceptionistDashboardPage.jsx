import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logoImg from '../../assets/logo.png';
import ReceptionistPage from '../../components/receptionist/ReceptionistPage';

export default function ReceptionistDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('support'); // 'support' | 'registrations' | 'checkin' | 'members'
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    document.title = 'Lễ tân Dashboard · AnhDuy Sport';
  }, []);

  const handleLogout = () => {
    if (logout) logout();
    navigate('/dang-nhap');
  };

  return (
    <div className="flex h-screen bg-[#0d0f17] text-white font-sans overflow-hidden select-none">
      {/* SIDEBAR BÊN TRÁI */}
      <aside className="w-64 bg-[#141824] border-r border-gray-800 flex flex-col justify-between shrink-0">
        <div>
          {/* LOGO */}
          <div className="p-6 border-b border-gray-800 flex items-center gap-3">
            <img src={logoImg} alt="Logo" className="h-10 w-auto object-contain" />
            <div>
              <span className="text-lg font-black italic tracking-wider text-white uppercase block leading-none">
                AnhDuy <span className="text-[#e31b23]">Sport</span>
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60 inline-block mt-1">
                Lễ tân Portal
              </span>
            </div>
          </div>

          {/* MENU ĐIỀU HƯỚNG */}
          <nav className="p-4 space-y-1.5">
            <button
              onClick={() => setActiveTab('support')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'support'
                  ? 'bg-[#e31b23] text-white shadow-lg shadow-red-900/30'
                  : 'text-gray-400 hover:bg-[#1c2234] hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Hỗ trợ & Tư vấn
            </button>

            <button
              onClick={() => setActiveTab('registrations')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'registrations'
                  ? 'bg-[#e31b23] text-white shadow-lg shadow-red-900/30'
                  : 'text-gray-400 hover:bg-[#1c2234] hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Duyệt Đăng ký
            </button>

            <button
              onClick={() => setActiveTab('checkin')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'checkin'
                  ? 'bg-[#e31b23] text-white shadow-lg shadow-red-900/30'
                  : 'text-gray-400 hover:bg-[#1c2234] hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Check-in Học viên
            </button>

            <button
              onClick={() => setActiveTab('members')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'members'
                  ? 'bg-[#e31b23] text-white shadow-lg shadow-red-900/30'
                  : 'text-gray-400 hover:bg-[#1c2234] hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Tra cứu Học viên
            </button>
          </nav>
        </div>

        {/* PROFILE LỄ TÂN & NÚT ĐĂNG XUẤT */}
        <div className="p-4 border-t border-gray-800 bg-[#10131d]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-[#e31b23] text-white flex items-center justify-center font-black text-sm shrink-0">
              {user?.fullName?.charAt(0) || user?.userName?.charAt(0) || 'L'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-black text-white truncate">{user?.fullName || user?.userName || 'Lễ tân viên'}</p>
              <p className="text-[10px] text-gray-400 truncate">{user?.email || 'receptionist@anhduysport.vn'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 text-xs font-extrabold uppercase py-2 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* NỘI DUNG CHÍNH (MAIN CONTENT) */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#0d0f17]">
        {/* HEADER NỘI BỘ QUẢN LÝ */}
        <header className="h-16 border-b border-gray-800 bg-[#141824] px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-black uppercase text-white tracking-wide">
              {activeTab === 'support' && 'Quản lý Đơn Hỗ trợ & Tư vấn khách hàng'}
              {activeTab === 'registrations' && 'Quản lý Duyệt Đăng ký Lớp học'}
              {activeTab === 'checkin' && 'Điểm danh & Check-in Học viên'}
              {activeTab === 'members' && 'Danh sách & Tra cứu Hồ sơ Học viên'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-gray-400 bg-[#0d0f17] border border-gray-800 px-3 py-1.5 rounded-xl">
              Cơ sở: <strong className="text-white">AnhDuy Sport Center 1</strong>
            </span>
          </div>
        </header>

        {/* VIEW CHI TIẾT THEO TAB */}
        <main className="flex-1 overflow-y-auto bg-slate-50 text-slate-800">
          {activeTab === 'support' && <ReceptionistPage />}

          {activeTab === 'registrations' && (
            <div className="p-8 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-2">
                  Duyệt đăng ký khóa học
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Tính năng xem danh sách và xác nhận thanh toán/duyệt lớp cho học viên.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'checkin' && (
            <div className="p-8">
              <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center shadow-xs max-w-2xl mx-auto py-16">
                <span className="text-4xl block mb-3">📲</span>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">
                  CHECK-IN HỌC VIÊN
                </h3>
                <div className="flex gap-3 max-w-md mx-auto mt-6">
                  <input
                    type="text"
                    placeholder="Nhập mã học viên / SĐT..."
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#e31b23]"
                  />
                  <button className="bg-[#e31b23] hover:bg-[#c4131a] text-white font-black text-xs uppercase tracking-wider px-6 rounded-xl shadow cursor-pointer">
                    Check-in
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="p-8">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-2">
                  Hồ sơ học viên
                </h3>
                <p className="text-slate-500 text-xs font-medium">
                  Tính năng tra cứu thông tin chi tiết và lịch sử tham gia lớp học của hội viên.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}