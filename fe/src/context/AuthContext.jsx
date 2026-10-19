import { createContext, useContext, useEffect, useState } from 'react';
import { login as loginRequest, registerGuest as registerRequest, setUnauthorizedHandler } from '../api/managementApi';
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

  const login = async (email, password, portal) => {
    const result = await loginRequest(email, password, portal);
    return store(result);
  };

  const register = async (payload) => {
    const result = await registerRequest(payload);
    return store(result);
  };

  const store = (result) => {
    const next = { token: result.token, user: result.user };
    writeSession(next);
    setSession(next);
    return next.user;
  };

  const applySession = (token, user) => {
    const next = { token, user };
    writeSession(next);
    setSession(next);
  };

  const logout = () => {
    clearSession();
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, login, register, applySession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook đi cùng provider nên file này cố ý xuất cả hai.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được dùng trong AuthProvider');
  }
  return context;
}
