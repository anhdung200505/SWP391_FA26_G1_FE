import { useState } from 'react';
import { changePassword } from '../../api/managementApi';
import PasswordField from '../PasswordField';

// Khớp với PasswordHasher.EnsureAcceptable ở backend.
const SPECIAL_CHARS = /[@#!]/;

function passwordRules(currentPassword, newPassword, confirmPassword) {
  return [
    { id: 'length', label: 'Dài từ 6 đến 100 ký tự', ok: newPassword.length >= 6 && newPassword.length <= 100 },
    { id: 'special', label: 'Có ít nhất một ký tự đặc biệt: @, # hoặc !', ok: SPECIAL_CHARS.test(newPassword) },
    { id: 'different', label: 'Khác mật khẩu hiện tại', ok: newPassword.length > 0 && newPassword !== currentPassword },
    { id: 'match', label: 'Nhập lại mật khẩu mới trùng khớp', ok: confirmPassword.length > 0 && confirmPassword === newPassword },
  ];
}

// Form đổi mật khẩu dùng chung cho học viên, lễ tân, huấn luyện viên và quản trị.
export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const rules = passwordRules(currentPassword, newPassword, confirmPassword);
  const allValid = currentPassword.length > 0 && rules.every((rule) => rule.ok);
  const touched = newPassword.length > 0 || confirmPassword.length > 0;

  const submit = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });
    const failed = rules.find((rule) => !rule.ok);
    if (!currentPassword) {
      setMessage({ type: 'error', text: 'Vui lòng nhập mật khẩu hiện tại.' });
      return;
    }
    if (failed) {
      setMessage({ type: 'error', text: `Mật khẩu mới chưa đạt: ${failed.label.toLowerCase()}.` });
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
    <form onSubmit={submit} className="space-y-4">
      <PasswordField
        variant="light"
        label="Mật khẩu hiện tại"
        autoComplete="current-password"
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs font-black uppercase tracking-wider text-amber-800">Lưu ý khi đặt mật khẩu mới</p>
        <ul className="mt-2 space-y-1">
          {rules.map((rule) => {
            const state = !touched ? 'idle' : rule.ok ? 'ok' : 'bad';
            return (
              <li
                key={rule.id}
                className={`flex items-center gap-2 text-xs font-semibold ${
                  state === 'ok' ? 'text-emerald-700' : state === 'bad' ? 'text-[#b1131a]' : 'text-amber-900'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                    state === 'ok'
                      ? 'bg-emerald-600 text-white'
                      : state === 'bad'
                        ? 'bg-[#e31b23] text-white'
                        : 'border border-amber-400 text-amber-700'
                  }`}
                >
                  {state === 'ok' ? '✓' : state === 'bad' ? '✕' : '•'}
                </span>
                {rule.label}
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[11px] font-medium text-amber-800">Ví dụ hợp lệ: AnhDuy@2026</p>
      </div>

      {message.text && (
        <p
          role={message.type === 'error' ? 'alert' : 'status'}
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-[#b1131a]'
          }`}
        >
          {message.text}
        </p>
      )}
      <button
        type="submit"
        disabled={saving || !allValid}
        className="rounded-xl bg-[#e31b23] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#b1131a] disabled:bg-gray-300 cursor-pointer disabled:cursor-not-allowed"
      >
        {saving ? 'Đang lưu...' : 'Đổi mật khẩu'}
      </button>
    </form>
  );
}
