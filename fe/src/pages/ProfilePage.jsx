import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { getMemberProfile, updateMemberProfile, getMySupportRequests } from '../api/managementApi';

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
  const [requests, setRequests] = useState([]);

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
      if ((user.roleId || user.role) === 'MEMBER') {
        getMySupportRequests()
          .then((items) => setRequests(Array.isArray(items) ? items : []))
          .catch(() => setRequests([]));
      }
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