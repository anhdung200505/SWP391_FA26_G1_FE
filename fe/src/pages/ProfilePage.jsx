import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { getMemberProfile, updateMemberProfile } from '../api/managementApi';

export default function ProfilePage() {
  const { user } = useAuth();
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
        })
        .catch((err) => setMessage({ type: 'error', text: err.message }))
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await updateMemberProfile(user.id, profile);
      setMessage({ type: 'success', text: res.message || 'Cập nhật thông tin thành công!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Cập nhật thất bại.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header forceWhite={true} />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-24 sm:px-6">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-10">
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

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium outline-none focus:border-[#e31b23] focus:ring-1 focus:ring-[#e31b23]"
                    required
                  />
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
        </div>
      </main>

      <Footer />
    </div>
  );
}