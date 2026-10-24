import { useState } from 'react';
import { Link } from 'react-router-dom';
import { changePassword } from '../../api/managementApi';
import PasswordField from '../PasswordField';

function validatePassword(password) {
  if (password.length < 6 || password.length > 100) return 'Mật khẩu cần từ 6 đến 100 ký tự.';
  if (!/[@#!]/.test(password)) return 'Mật khẩu phải có ít nhất một ký tự @, # hoặc !.';
  return '';
}

export default function StaffAccountSettings() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const submit = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setMessage({ type: 'error', text: passwordError });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu nhập lại không khớp.' });
      return;
    }

    setSaving(true);
    try {
      const result = await changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage({ type: 'success', text: result?.message || 'Đổi mật khẩu thành công.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Đổi mật khẩu thất bại.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8">
      <h2 className="text-lg font-black text-gray-900">Cài đặt tài khoản</h2>
      <p className="mt-1 text-sm text-gray-500">Đổi mật khẩu đăng nhập. Tên, email và số điện thoại sửa ở hồ sơ cá nhân.</p>
      <Link to="/ho-so" className="mt-3 inline-flex text-sm font-bold text-[#e31b23]">
        Mở hồ sơ cá nhân
      </Link>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <PasswordField
          variant="light"
          label="Mật khẩu hiện tại"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          required
        />
        <PasswordField
          variant="light"
          label="Mật khẩu mới"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          required
        />
        <PasswordField
          variant="light"
          label="Nhập lại mật khẩu mới"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
        <p className="text-xs font-medium text-gray-500">Từ 6 ký tự, có ít nhất một ký tự @, # hoặc !, và khác mật khẩu hiện tại.</p>
        {message.text && (
          <p
            className={`rounded-xl px-3 py-2 text-sm font-semibold ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-[#b1131a]'
            }`}
          >
            {message.text}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[#e31b23] px-4 py-2.5 text-sm font-bold text-white disabled:bg-gray-300"
        >
          {saving ? 'Đang lưu...' : 'Đổi mật khẩu'}
        </button>
      </form>
    </section>
  );
}
