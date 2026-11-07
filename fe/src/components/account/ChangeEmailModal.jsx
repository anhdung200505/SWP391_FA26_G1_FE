import React, { useState, useEffect } from 'react';

export default function ChangeEmailModal({ memberUserId, currentEmail, onClose, onSuccess, sendEmailOtp, confirmEmailOtp }) {
  const [step, setStep] = useState(1); // 1: Nhập email & password, 2: Nhập OTP
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0); // Đếm ngược 60s đệm gửi lại OTP

  // Xử lý đếm ngược gửi lại OTP
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // Bước 1: Yêu cầu gửi OTP
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');

    if (newEmail.trim().toLowerCase() === currentEmail.trim().toLowerCase()) {
      setError('Email mới phải khác email hiện tại.');
      return;
    }

    setLoading(true);
    try {
      await sendEmailOtp(memberUserId, { newEmail, currentPassword });
      setStep(2);
      setCountdown(60); // Khóa nút gửi lại trong 60s
    } catch (err) {
      setError(err.message || 'Gửi mã OTP thất bại.');
    } finally {
      setLoading(false);
    }
  };

  // Bước 2: Xác nhận OTP
  const handleConfirmOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (otpCode.length !== 6) {
      setError('Mã OTP gồm 6 chữ số.');
      return;
    }

    setLoading(true);
    try {
      const res = await confirmEmailOtp(memberUserId, otpCode);
      onSuccess(res?.profile?.email || newEmail, res?.message || 'Đổi email thành công!');
      onClose();
    } catch (err) {
      setError(err.message || 'Xác nhận OTP thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-gray-900">
            {step === 1 ? 'Thay đổi Email' : 'Xác thực OTP'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-xl"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-[#e31b23] border border-red-200">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Email mới
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="nhap.email.moi@example.com"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-[#e31b23]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Mật khẩu hiện tại
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Xác nhận mật khẩu của bạn"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-[#e31b23]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#e31b23] hover:bg-[#b1131a] disabled:bg-gray-300"
              >
                {loading ? 'Đang gửi mã...' : 'Gửi mã OTP'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleConfirmOtp} className="space-y-4">
            <p className="text-xs text-gray-600">
              Mã OTP 6 số đã được gửi tới <strong>{newEmail}</strong>. Mã có hiệu lực trong 3 phút.
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Mã xác thực OTP
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-center text-lg font-bold tracking-widest outline-none focus:border-[#e31b23]"
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                disabled={countdown > 0 || loading}
                onClick={handleRequestOtp}
                className="font-bold text-[#e31b23] hover:underline disabled:text-gray-400 disabled:no-underline"
              >
                {countdown > 0 ? `Gửi lại mã sau (${countdown}s)` : 'Gửi lại mã OTP'}
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200"
              >
                Quay lại
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#e31b23] hover:bg-[#b1131a] disabled:bg-gray-300"
              >
                {loading ? 'Đang xác thực...' : 'Xác nhận'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}