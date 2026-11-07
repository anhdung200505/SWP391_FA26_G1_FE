import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { 
  getMemberProfile, 
  updateMemberProfile, 
  getMySupportRequests, 
  getMemberMembership,
  sendEmailOtp,
  confirmEmailOtp 
} from '../api/managementApi';
import { confirmProfileNotice } from '../auth/profileNotice';
import ChangePasswordDialog from '../components/account/ChangePasswordDialog';
import ChangeEmailModal from '../components/account/ChangeEmailModal';

import biaMauImg from '../assets/bia-mau.png';
import goldDragonImg from '../assets/membership/gold-dragon.jpg';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// CẤU HÌNH THEME CHO THẺ HỘI VIÊN TRÀN VIỀN (KHÔNG CHỨA NÚT BẤM)
const TIER_THEMES = {
  bronze: {
    label: 'Bronze Member',
    medal: '🥉',
    cardStyle: {
      background:
        'radial-gradient(120% 140% at 85% 0%, rgba(255,196,150,0.35) 0%, rgba(255,196,150,0) 45%), linear-gradient(135deg, #1a0d05 0%, #4e2810 35%, #8c4f26 55%, #3b1d0b 78%, #120803 100%)',
    },
    border: 'rgba(205,127,50,0.55)',
    titleGradient: 'linear-gradient(90deg, #ffe0c2 0%, #e39a5c 45%, #b8692f 100%)',
    accent: '#f3b07a',
    subText: 'rgba(255,226,200,0.75)',
  },
  silver: {
    label: 'Silver Member',
    medal: '🥈',
    cardStyle: {
      background:
        'repeating-linear-gradient(100deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 2px, transparent 2px, transparent 6px), radial-gradient(120% 140% at 85% 0%, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 45%), linear-gradient(135deg, #111418 0%, #3a4048 38%, #7d8590 56%, #2b3036 80%, #0c0e11 100%)',
    },
    border: 'rgba(209,213,219,0.55)',
    titleGradient: 'linear-gradient(90deg, #ffffff 0%, #d1d5db 45%, #8e959e 100%)',
    accent: '#e5e7eb',
    subText: 'rgba(229,231,235,0.75)',
  },
  gold: {
    label: 'Gold · Black Card',
    medal: '🥇',
    dragon: true,
    cardStyle: {
      background:
        'radial-gradient(90% 120% at 0% 0%, rgba(212,175,55,0.14) 0%, rgba(212,175,55,0) 50%), linear-gradient(135deg, #050505 0%, #111111 55%, #050505 100%)',
    },
    border: 'rgba(212,175,55,0.65)',
    titleGradient: 'linear-gradient(90deg, #fff4c2 0%, #e8c766 40%, #b8892a 100%)',
    accent: '#e8c766',
    subText: 'rgba(240,222,160,0.75)',
  },
};

const packageTier = (pkg, fallbackName = '') => {
  const name = (pkg?.name || fallbackName || '').toLowerCase();
  if (pkg?.code === 'PKG-003' || name.includes('vàng') || name.includes('gold')) return 'gold';
  if (pkg?.code === 'PKG-002' || name.includes('bạc') || name.includes('silver')) return 'silver';
  return 'bronze';
};

const planTitle = (name) => String(name || 'Gói Hội Viên').replace(/\s*\((tặng|ưu đãi) kèm lớp\)\s*$/i, '');
const formatDay = (iso) => (iso ? String(iso).split('-').reverse().join('/') : '—');

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const userRole = user?.roleId || user?.role;
  const isMember = userRole === 'MEMBER';
  const memberUserId = user?.id || user?.userId;

  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'Nam',
  });

  const [membershipData, setMembershipData] = useState(null);
  const [editProfile, setEditProfile] = useState({ ...profile });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [pageMessage, setPageMessage] = useState({ type: '', text: '' });
  const [modalMessage, setModalMessage] = useState({ type: '', text: '' });
  
  const [requests, setRequests] = useState([]);

  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    document.title = 'Hồ sơ cá nhân · AnhDuy Sport';
    if (memberUserId) {
      Promise.all([
        getMemberProfile(memberUserId).catch((err) => {
          setPageMessage({ type: 'error', text: err.message });
          return null;
        }),
        isMember ? getMemberMembership(memberUserId).catch(() => null) : Promise.resolve(null),
      ])
        .then(([data, memData]) => {
          if (data) {
            const loadedProfile = {
              fullName: data.fullName || '',
              email: data.email || '',
              phone: data.phone || '',
              dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split('T')[0] : '',
              gender: data.gender || 'Nam',
            };
            setProfile(loadedProfile);
            setAvatarUrl(data.avatarUrl || '');
            if ((data.avatarUrl || '') !== (user.avatarUrl || '')) {
              updateUser({ avatarUrl: data.avatarUrl || null });
            }
          }
          if (memData) {
            setMembershipData(memData);
          }
        })
        .finally(() => setLoading(false));

      if (isMember) {
        getMySupportRequests()
          .then((items) => setRequests(Array.isArray(items) ? items : []))
          .catch(() => setRequests([]));
      }
    }
  }, [user, updateUser, isMember, memberUserId]);

  useEffect(() => () => {
    if (avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  const handleOpenEditModal = () => {
    setEditProfile({ ...profile });
    setAvatarFile(null);
    setAvatarPreview('');
    setModalMessage({ type: '', text: '' });
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    if (avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(null);
    setAvatarPreview('');
    setModalMessage({ type: '', text: '' });
    setIsEditModalOpen(false);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) {
      setModalMessage({ type: 'error', text: 'Chỉ nhận ảnh JPG, PNG, WebP hoặc GIF.' });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setModalMessage({ type: 'error', text: 'Ảnh đại diện tối đa 2 MB.' });
      return;
    }

    const preview = URL.createObjectURL(file);
    setAvatarPreview((current) => {
      if (current.startsWith('blob:')) URL.revokeObjectURL(current);
      return preview;
    });
    setAvatarFile(file);
    setModalMessage({ type: '', text: '' });
  };

  const avatarInitial = (profile.fullName || user?.fullName || 'U').trim().charAt(0).toUpperCase();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setModalMessage({ type: '', text: '' });

    try {
      const { email, ...updateData } = editProfile;
      const res = await updateMemberProfile(user.id, updateData, avatarFile);
      
      const newProfileState = {
        ...profile,
        fullName: res?.profile?.fullName ?? editProfile.fullName,
        phone: res?.profile?.phone ?? editProfile.phone,
        dateOfBirth: editProfile.dateOfBirth,
        gender: editProfile.gender,
      };

      setProfile(newProfileState);

      if (res?.profile) {
        setAvatarUrl(res.profile.avatarUrl || '');
        updateUser({
          fullName: res.profile.fullName,
          phone: res.profile.phone,
          avatarUrl: res.profile.avatarUrl || null,
        });
      }

      if (userRole === 'RECEPTIONIST' || userRole === 'COACH') confirmProfileNotice(user.id);

      setPageMessage({ type: 'success', text: res.message || 'Cập nhật thông tin thành công!' });
      handleCloseEditModal();
    } catch (err) {
      setModalMessage({ type: 'error', text: err.message || 'Cập nhật thất bại.' });
    } finally {
      setSaving(false);
    }
  };

  const handleEmailChangeSuccess = (newEmail, successMsg) => {
    setProfile((prev) => ({ ...prev, email: newEmail }));
    updateUser({ email: newEmail });
    setPageMessage({ type: 'success', text: successMsg });
  };

  const formatDateVN = (dateStr) => {
    if (!dateStr) return 'Chưa cập nhật';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const displayName = profile.fullName || user?.fullName || 'Người dùng';
  const currentMembership = membershipData?.currentMembership;
  const hasMembership = isMember && Boolean(currentMembership);
  const cardTheme = hasMembership ? TIER_THEMES[packageTier(null, currentMembership?.planName)] : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header forceWhite={true} />

      {/* ẢNH BÌA TRÀN VIỀN: CHỈ CHỨA KHUNG THẺ HỘI VIÊN, KHÔNG CHỨA BẤT KỲ NÚT BẤM NÀO */}
      {hasMembership && cardTheme ? (
        <div 
          className="w-full relative overflow-hidden pt-28 pb-20 px-6 sm:px-12 border-b shadow-md text-white transition-all duration-300 min-h-[320px] sm:min-h-[380px] flex items-center"
          style={{ ...cardTheme.cardStyle, borderColor: cardTheme.border }}
        >
          {cardTheme.dragon && (
            <>
              <img
                src={goldDragonImg}
                alt=""
                className="pointer-events-none select-none absolute inset-y-0 right-0 h-full w-auto max-w-none opacity-90 mix-blend-screen"
              />
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: 'linear-gradient(90deg, #050505 0%, rgba(5,5,5,0.85) 30%, rgba(5,5,5,0) 65%)' }}
              ></div>
            </>
          )}

          <div
            className="pointer-events-none absolute -top-1/2 left-1/4 w-1/3 h-[200%] rotate-[20deg]"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }}
          ></div>

          <div className="max-w-5xl w-full mx-auto relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.25em] px-3 py-1 rounded-full border shadow-sm"
                  style={{ color: cardTheme.accent, borderColor: cardTheme.border, background: 'rgba(0,0,0,0.4)' }}
                >
                  {cardTheme.medal} {cardTheme.label}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: cardTheme.subText }}>
                  AnhDuy Sport Member
                </span>
              </div>

              <h2
                className="text-3xl sm:text-5xl font-black uppercase tracking-wide mt-1"
                style={{ backgroundImage: cardTheme.titleGradient, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}
              >
                {planTitle(currentMembership.planName)}
              </h2>
            </div>

            {/* THÔNG TIN HẠN SỬ DỤNG HỘI VIÊN */}
            <div
              className="rounded-2xl p-4 border backdrop-blur-md flex items-center gap-6 shrink-0 self-start md:self-auto"
              style={{ borderColor: cardTheme.border, background: 'rgba(0,0,0,0.4)' }}
            >
              <div>
                <span className="text-[10px] font-bold uppercase block" style={{ color: cardTheme.subText }}>Ngày bắt đầu</span>
                <span className="text-xs font-bold text-white whitespace-nowrap">{formatDay(currentMembership.startDate)}</span>
              </div>
              <div className="h-8 w-px" style={{ background: cardTheme.border }}></div>
              <div>
                <span className="text-[10px] font-bold uppercase block" style={{ color: cardTheme.subText }}>Hạn sử dụng đến</span>
                <span className="text-xs font-black whitespace-nowrap" style={{ color: cardTheme.accent }}>{formatDay(currentMembership.endDate)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* BÌA MẪU DÙNG BIA-MAU.PNG NẾU CHƯA CÓ GÓI HOẶC LÀ TÀI KHOẢN STAFF/ADMIN */
        <div className="w-full h-[320px] sm:h-[400px] relative overflow-hidden bg-gray-900 pt-16">
          <img 
            src={biaMauImg} 
            alt="Ảnh bìa" 
            className="w-full h-full object-cover object-center" 
          />
          <div className="absolute inset-0 bg-black/10"></div>
        </div>
      )}

      {/* NỘI DUNG CHÍNH NẰM ĐÈ LÊN MÉP DƯỚI BÌA */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pb-24 -mt-16 sm:-mt-24 relative z-10">

        {/* THÔNG BÁO MÀN HÌNH CHÍNH */}
        {pageMessage.text && (
          <div
            className={`p-4 rounded-2xl text-sm font-bold mb-6 flex items-center justify-between shadow-md ${
              pageMessage.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-[#e31b23] border border-red-200'
            }`}
          >
            <span>{pageMessage.text}</span>
            <button 
              onClick={() => setPageMessage({ type: '', text: '' })} 
              className="text-xs opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#e31b23] border-t-transparent mb-3"></div>
            <p className="text-sm font-bold text-gray-500">Đang tải hồ sơ...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* THẺ HỒ SƠ CHÍNH */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-10">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-6">
                <div className="flex items-end gap-5">
                  <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden bg-[#e31b23] text-white flex items-center justify-center text-4xl font-black border-4 border-white shadow-xl ring-1 ring-gray-100 shrink-0 -mt-20 sm:-mt-24">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Ảnh đại diện" className="w-full h-full object-cover" />
                    ) : (
                      avatarInitial
                    )}
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900">{displayName}</h1>
                    <p className="text-sm font-medium text-gray-500 mt-0.5">
                      Vai trò: <span className="font-bold text-[#e31b23] uppercase">{userRole || 'MEMBER'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleOpenEditModal}
                    className="inline-flex items-center gap-2 bg-[#e31b23] text-white hover:bg-[#b1131a] px-5 py-2.5 rounded-xl text-xs font-bold uppercase transition-all shadow-sm cursor-pointer"
                  >
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Chỉnh sửa thông tin
                  </button>
                  <button
                    type="button"
                    onClick={() => setPasswordOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold uppercase text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-all shadow-sm cursor-pointer"
                  >
                    <svg className="size-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="5" y="11" width="14" height="10" rx="2" strokeWidth="2" />
                      <path strokeLinecap="round" strokeWidth="2" d="M8 11V7a4 4 0 0 1 8 0v4" />
                    </svg>
                    Đổi mật khẩu
                  </button>
                </div>
              </div>
            </div>

            {/* BẢNG THÔNG TIN CÁ NHÂN */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-10">
              <h2 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                <svg className="size-5 text-[#e31b23]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Thông tin tài khoản
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Họ và tên
                  </span>
                  <p className="text-sm font-bold text-gray-900">{profile.fullName || '—'}</p>
                </div>

                <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 flex items-center justify-between gap-3">
                  <div>
                    <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Email
                    </span>
                    <p className="text-sm font-bold text-gray-900">{profile.email || '—'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmailModalOpen(true)}
                    className="px-3 py-1.5 text-xs font-bold text-[#e31b23] hover:bg-red-50 rounded-lg transition-colors border border-red-100 cursor-pointer"
                  >
                    Đổi email
                  </button>
                </div>

                <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Số điện thoại
                  </span>
                  <p className="text-sm font-bold text-gray-900">{profile.phone || 'Chưa cập nhật'}</p>
                </div>

                <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Ngày sinh
                  </span>
                  <p className="text-sm font-bold text-gray-900">{formatDateVN(profile.dateOfBirth)}</p>
                </div>

                <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 md:col-span-2">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Giới tính
                  </span>
                  <p className="text-sm font-bold text-gray-900">{profile.gender || 'Nam'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL POPUP CHỈNH SỬA VIA REACT PORTAL */}
        {isEditModalOpen && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden">
              
              {/* HEADER MODAL CỐ ĐỊNH */}
              <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-gray-100 shrink-0">
                <h3 className="text-xl font-black text-gray-900">Chỉnh sửa thông tin</h3>
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* THÂN MODAL */}
              <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-5">
                
                {/* THÔNG BÁO LỖI TRONG MODAL */}
                {modalMessage.text && (
                  <div
                    className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between ${
                      modalMessage.type === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-[#e31b23] border border-red-200'
                    }`}
                  >
                    <span>{modalMessage.text}</span>
                    <button 
                      onClick={() => setModalMessage({ type: '', text: '' })} 
                      className="opacity-60 hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <form id="editProfileForm" onSubmit={handleSubmit} className="space-y-5">
                  {/* UPLOAD AVATAR */}
                  <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden bg-[#e31b23] text-white flex items-center justify-center text-xl font-black shrink-0 border-2 border-white shadow">
                      {(avatarPreview || avatarUrl) ? (
                        <img src={avatarPreview || avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                      ) : (
                        avatarInitial
                      )}
                      {saving && avatarFile && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="inline-block px-4 py-2 rounded-xl text-xs font-bold bg-gray-900 text-white hover:bg-gray-700 cursor-pointer transition-colors shadow-sm">
                        {avatarPreview || avatarUrl ? 'Đổi ảnh đại diện' : 'Tải ảnh đại diện'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          disabled={saving}
                          onChange={handleAvatarChange}
                        />
                      </label>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Chấp nhận JPG, PNG, WebP, GIF (tối đa 2MB).
                      </p>
                    </div>
                  </div>

                  {/* Họ tên */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Họ và tên
                    </label>
                    <input
                      type="text"
                      value={editProfile.fullName}
                      onChange={(e) => setEditProfile({ ...editProfile, fullName: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium outline-none focus:border-[#e31b23] focus:ring-1 focus:ring-[#e31b23]"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Email <span className="text-gray-400 font-normal lowercase">(thay đổi bằng mã OTP bên ngoài)</span>
                    </label>
                    <input
                      type="email"
                      value={editProfile.email}
                      disabled
                      className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm font-medium text-gray-500 cursor-not-allowed"
                    />
                  </div>

                  {/* Số điện thoại */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Số điện thoại
                    </label>
                    <input
                      type="tel"
                      value={editProfile.phone}
                      onChange={(e) => setEditProfile({ ...editProfile, phone: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium outline-none focus:border-[#e31b23] focus:ring-1 focus:ring-[#e31b23]"
                    />
                  </div>

                  {/* Ngày sinh */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Ngày sinh
                    </label>
                    <input
                      type="date"
                      value={editProfile.dateOfBirth}
                      onChange={(e) => setEditProfile({ ...editProfile, dateOfBirth: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium outline-none focus:border-[#e31b23] focus:ring-1 focus:ring-[#e31b23]"
                    />
                  </div>

                  {/* Giới tính */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Giới tính
                    </label>
                    <select
                      value={editProfile.gender}
                      onChange={(e) => setEditProfile({ ...editProfile, gender: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium outline-none focus:border-[#e31b23] focus:ring-1 focus:ring-[#e31b23]"
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                </form>
              </div>

              {/* FOOTER CỐ ĐỊNH NÚT HỦY / LƯU */}
              <div className="px-6 sm:px-8 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  form="editProfileForm"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#e31b23] text-white font-bold text-xs rounded-xl hover:bg-[#b1131a] transition-colors disabled:bg-gray-300 shadow-sm cursor-pointer"
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>

            </div>
          </div>,
          document.body
        )}

        {/* DIALOG KHÁC */}
        {passwordOpen && <ChangePasswordDialog onClose={() => setPasswordOpen(false)} />}

        {emailModalOpen && (
          <ChangeEmailModal
            memberUserId={user.id}
            currentEmail={profile.email}
            onClose={() => setEmailModalOpen(false)}
            onSuccess={handleEmailChangeSuccess}
            sendEmailOtp={sendEmailOtp}
            confirmEmailOtp={confirmEmailOtp}
          />
        )}

        {/* DANH SÁCH YÊU CẦU HỖ TRỢ (DÀNH CHO MEMBER) */}
        {isMember && (
          <section className="mt-10 bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-gray-100">
            <h2 className="text-lg font-black text-gray-900">Kết quả yêu cầu của bạn</h2>
            <p className="mt-1 text-sm text-gray-500">Tư vấn ghi danh, kết quả lễ tân xử lý và quyết định của quản trị.</p>
            {requests.length === 0 ? (
              <p className="mt-4 text-sm font-semibold text-gray-400 italic">Chưa có yêu cầu nào.</p>
            ) : (
              <ul className="mt-6 space-y-3">
                {requests.map((item) => (
                  <li key={item.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-black text-gray-900">{item.title}</p>
                      <span className="text-[11px] font-bold uppercase text-[#e31b23] shrink-0 bg-red-50 px-2.5 py-1 rounded-lg border border-red-100">
                        {item.status === 'resolved' && item.decision === 'approved'
                          ? 'Quản trị đã chấp nhận'
                          : item.status === 'resolved' && item.decision === 'rejected'
                          ? 'Quản trị đã từ chối'
                          : item.status === 'resolved'
                          ? 'Đã xử lý'
                          : item.status === 'pending_manager'
                          ? 'Đang chờ quản trị'
                          : 'Đang chờ lễ tân'}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm text-gray-600">{item.description}</p>
                    {item.resolutionNote ? (
                      <p className="mt-3 whitespace-pre-line rounded-xl bg-white p-3 text-sm font-semibold text-gray-800 border border-gray-100 shadow-sm">
                        Kết quả xử lý: {item.resolutionNote}
                      </p>
                    ) : item.status === 'pending_manager' ? (
                      <p className="mt-3 rounded-xl bg-white p-3 text-sm font-semibold text-gray-500 border border-gray-100">
                        Lễ tân đã chuyển đơn lên quản trị. Kết quả sẽ hiện khi quản trị xử lý xong.
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}