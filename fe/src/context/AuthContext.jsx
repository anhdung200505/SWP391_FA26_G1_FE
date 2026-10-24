import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  confirmRegisterOtp as confirmRegisterOtpRequest,
  loginMember as loginMemberRequest,
  loginStaff as loginStaffRequest,
  registerGuest as registerRequest,
  sendRegisterOtp as sendRegisterOtpRequest,
  setUnauthorizedHandler,
} from '../api/managementApi';
import { resetProfileNoticeSession } from '../auth/profileNotice';
import { clearSession, readSession, writeSession } from '../auth/session';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readSession());

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
      setSession(null);
    });
  }, []);

  const store = (result) => {
    if (!result || !result.token) return null;
    const next = { token: result.token, user: result.user };
    writeSession(next);
    setSession(next);
    const role = result.user.roleId || result.user.role;
    if (role === 'RECEPTIONIST' || role === 'COACH') resetProfileNoticeSession(result.user.id);
    return next.user;
  };

  // Đăng nhập chung (tự chọn cổng 'member' hoặc 'staff')
  const login = async (email, password, portal = 'member') => {
    const result = portal === 'staff' || portal === 'management'
      ? await loginStaffRequest(email, password, portal)
      : await loginMemberRequest(email, password, portal);
    return store(result);
  };

  // Đăng nhập riêng cho Học viên
  const loginAsMember = async (email, password) => {
    const result = await loginMemberRequest(email, password);
    return store(result);
  };

  // Đăng nhập riêng cho Quản trị / Lễ tân
  const loginAsStaff = async (email, password) => {
    const result = await loginStaffRequest(email, password);
    return store(result);
  };

  // Đăng ký trực tiếp
  const register = async (payload) => {
    const result = await registerRequest(payload);
    return store(result);
  };

  // Gửi mã OTP Đăng ký
  const sendOtp = async (payload) => {
    return await sendRegisterOtpRequest(payload);
  };

  // Xác nhận OTP Đăng ký (Hỗ trợ cả Object { email, code } và 2 tham số rời email, code)
  const confirmOtp = async (emailOrPayload, codeParam) => {
    let email = emailOrPayload;
    let code = codeParam;

    if (typeof emailOrPayload === 'object' && emailOrPayload !== null) {
      email = emailOrPayload.email;
      code = emailOrPayload.code;
    }

    const result = await confirmRegisterOtpRequest(email, code);
    return store(result);
  };

  const applySession = (token, user) => {
    const next = { token, user };
    writeSession(next);
    setSession(next);
  };

  // Cập nhật một phần thông tin người dùng đang đăng nhập (vd. ảnh đại diện, họ tên) để Header đổi ngay
  const updateUser = useCallback((patch) => {
    setSession((current) => {
      if (!current?.user) return current;
      const next = { ...current, user: { ...current.user, ...patch } };
      writeSession(next);
      return next;
    });
  }, []);

  const logout = () => {
    clearSession();
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        token: session?.token ?? null,
        login,
        loginAsMember,
        loginAsStaff,
        register,
        sendOtp,
        confirmOtp,
        applySession,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook dùng chung với AuthProvider
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được dùng trong AuthProvider');
  }
  return context;
}