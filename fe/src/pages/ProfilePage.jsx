import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { 
  getMemberProfile, 
  updateMemberProfile, 
  getMySupportRequests, 
  sendEmailOtp,
  confirmEmailOtp 
} from '../api/managementApi';
import { confirmProfileNotice } from '../auth/profileNotice';
import { useHasClassRegistration } from '../components/workspace/studentNav';
import ChangePasswordDialog from '../components/account/ChangePasswordDialog';
import ChangeEmailModal from '../components/account/ChangeEmailModal';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const hasClass = useHasClassRegistration((user?.roleId || user?.role) === 'MEMBER');
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'Nam',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [requests, setRequests] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  // Mở từ trang khác (đang cuộn giữa trang) thì vẫn bắt đầu từ đầu hồ sơ.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    document.title = 'Hồ sơ cá nhân · AnhDuy Sport';
    if (user?.id) {
      getMemberProfile(user.id)
        .then((data) => {
          setProfile({
            fullName: data.fullName || '',
            email: data.email || '',
            phone: data.phone || '',
            dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split('T')[0] : '',
            gender: data.gender || 'Nam',
          });
          setAvatarUrl(data.avatarUrl || '');
          if ((data.avatarUrl || '') !== (user.avatarUrl || '')) updateUser({ avatarUrl: data.avatarUrl || null });
        })
        .catch((err) => setMessage({ type: 'error', text: err.message }))
        .finally(() => setLoading(false));
      if ((user.roleId || user.role) === 'MEMBER') {
        getMySupportRequests()
          .then((items) => setRequests(Array.isArray(items) ? items : []))
          .catch(() => setRequests([]));
      }
    }
  }, [user, updateUser]);

  useEffect(() => () => {
    if (avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) {
      setMessage({ type: 'error', text: 'Chỉ nhận ảnh JPG, PNG, WebP hoặc GIF.' });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setMessage({ type: 'error', text: 'Ảnh đại diện tối đa 2 MB.' });
      return;
    }

    const preview = URL.createObjectURL(file);
    setAvatarPreview((current) => {
      if (current.startsWith('blob:')) URL.revokeObjectURL(current);
      return preview;
    });
    setAvatarFile(file);
    setMessage({ type: '', text: '' });
  };

  const avatarInitial = (profile.fullName || user?.fullName || 'U').trim().charAt(0).toUpperCase();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // Loại bỏ email khỏi payload cập nhật chung thông tin cá nhân
      const { email, ...updateData } = profile;
      const res = await updateMemberProfile(user.id, updateData, avatarFile);
      setMessage({ type: 'success', text: res.message || 'Cập nhật thông tin thành công!' });
      if (res?.profile) {
        setAvatarUrl(res.profile.avatarUrl || '');
        setAvatarFile(null);
        setAvatarPreview('');
        updateUser({
          fullName: res.profile.fullName,
          phone: res.profile.phone,
          avatarUrl: res.profile.avatarUrl || null,
        });
      }
      const role = user?.roleId || user?.role;
      if (role === 'RECEPTIONIST' || role === 'COACH') confirmProfileNotice(user.id);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Cập nhật thất bại.' });
    } finally {
      setSaving(false);
    }
  };

  // Handler khi đổi email qua OTP thành công
  const handleEmailChangeSuccess = (newEmail, successMsg) => {
    setProfile((prev) => ({ ...prev, email: newEmail }));
    updateUser({ email: newEmail });
    setMessage({ type: 'success', text: successMsg });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header forceWhite={true} />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-24 sm:px-6">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-10">
          {((user?.roleId || user?.role) === 'MEMBER') && (
            <div className="mb-6 flex flex-wrap gap-2">
              <Link
                to="/hoc-vien-dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-[#e31b23] bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg"
              >
                Về khóa học của tôi
              </Link>
              {hasClass && (
                <Link
                  to="/hoc-vien/giao-an-ai"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-[#e31b23] bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg"
                >
                  Giáo án AI
                </Link>
              )}
            </div>
          )}
          {((user?.roleId || user?.role) === 'COACH') && (
            <Link
              to="/hlv/lop-hoc"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-[#e31b23] bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg mb-6"
            >
              Về lớp của tôi
            </Link>
          )}
          {((user?.roleId || user?.role) === 'RECEPTIONIST') && (
            <Link
              to="/le-tan"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-[#e31b23] bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg mb-6"
            >
              Về trang lễ tân
            </Link>
          )}
          {((user?.roleId || user?.role) === 'ADMIN') && (
            <Link
              to="/quan-ly"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-[#e31b23] bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg mb-6"
            >
              Về trang quản trị
            </Link>
          )}
          <h1 className="text-2xl font-black text-gray-900 mb-2">Hồ sơ cá nhân</h1>
          <p className="text-sm text-gray-500 mb-8">Quản lý thông tin tài khoản của bạn</p>

          {message.text && (
            <div
              className={`p-4 rounded-xl text-sm font-bold mb-6 ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-[#e31b23] border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {loading ? (
            <p className="text-sm font-bold text-gray-500">Đang tải thông tin...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ẢNH ĐẠI DIỆN & MẬT KHẨU */}
              <div className="flex flex-wrap items-center gap-5">
                <div className="relative w-24 h-24 rounded-full overflow-hidden bg-[#e31b23] text-white flex items-center justify-center text-3xl font-black shadow-md border-4 border-white ring-1 ring-gray-200">
                  {(avatarPreview || avatarUrl) ? (
                    <img src={avatarPreview || avatarUrl} alt="Ảnh đại diện" className="w-full h-full object-cover" />
                  ) : (
                    avatarInitial
                  )}
                  {saving && avatarFile && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="h-7 w-7 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      className={`inline-block px-5 py-2.5 rounded-xl text-xs font-bold uppercase transition-colors ${
                        saving
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-900 text-white hover:bg-gray-700 cursor-pointer'
                      }`}
                    >
                      {avatarPreview || avatarUrl ? 'Đổi ảnh đại diện' : 'Tải ảnh đại diện'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        disabled={saving}
                        onChange={handleAvatarChange}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setPasswordOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold uppercase text-gray-700 hover:border-[#e31b23] hover:text-[#e31b23] cursor-pointer"
                    >
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="5" y="11" width="14" height="10" rx="2" strokeWidth="2" />
                        <path strokeLinecap="round" strokeWidth="2" d="M8 11V7a4 4 0 0 1 8 0v4" />
                      </svg>
                      Đổi mật khẩu
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2">
                    {avatarFile
                      ? 'Ảnh mới sẽ lưu cùng hồ sơ khi bấm Lưu thay đổi. JPG, PNG, WebP hoặc GIF, tối đa 2 MB.'
                      : 'JPG, PNG, WebP hoặc GIF, tối đa 2 MB. Ảnh lưu cùng lúc với thông tin hồ sơ.'}
                  </p>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Họ và tên
                  </label>
                  <input
                    type="text"
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium outline-none focus:border-[#e31b23] focus:ring-1 focus:ring-[#e31b23]"
                    required
                  />
                </div>

                {/* EMAIL CONTROL */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Email
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm font-medium text-gray-600 outline-none cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={() => setEmailModalOpen(true)}
                      className="px-4 py-3 rounded-xl border border-gray-200 text-xs font-bold uppercase text-gray-700 hover:border-[#e31b23] hover:text-[#e31b23] whitespace-nowrap bg-white"
                    >
                      Đổi email
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium outline-none focus:border-[#e31b23] focus:ring-1 focus:ring-[#e31b23]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Ngày sinh
                  </label>
                  <input
                    type="date"
                    value={profile.dateOfBirth}
                    onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium outline-none focus:border-[#e31b23] focus:ring-1 focus:ring-[#e31b23]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Giới tính
                  </label>
                  <select
                    value={profile.gender}
                    onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium outline-none focus:border-[#e31b23] focus:ring-1 focus:ring-[#e31b23]"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#e31b23] text-white font-bold text-sm rounded-xl hover:bg-[#b1131a] transition-colors disabled:bg-gray-300"
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          )}

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

          {((user?.roleId || user?.role) === 'MEMBER') && (
            <section className="mt-10 border-t border-gray-100 pt-8">
              <h2 className="text-lg font-black text-gray-900">Kết quả yêu cầu của bạn</h2>
              <p className="mt-1 text-sm text-gray-500">Tư vấn ghi danh, kết quả lễ tân xử lý và quyết định của quản trị.</p>
              {requests.length === 0 ? (
                <p className="mt-4 text-sm font-semibold text-gray-500">Chưa có yêu cầu nào.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {requests.map((item) => (
                    <li key={item.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-black text-gray-900">{item.title}</p>
                        <span className="text-[11px] font-bold uppercase text-[#e31b23]">
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
                        <p className="mt-3 whitespace-pre-line rounded-xl bg-white px-3 py-2 text-sm font-semibold text-gray-800">
                          Kết quả xử lý: {item.resolutionNote}
                        </p>
                      ) : item.status === 'pending_manager' ? (
                        <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-gray-500">
                          Lễ tân đã chuyển đơn lên quản trị. Kết quả sẽ hiện khi quản trị xử lý xong.
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}