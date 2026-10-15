import { createContext, useContext, useEffect, useState } from 'react';
import { login as loginRequest, setUnauthorizedHandler } from '../api/managementApi';
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
    const next = { token: result.token, user: result.user };
    writeSession(next);
    setSession(next);
    return next.user;
  };

  const logout = () => {
    clearSession();
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, login, logout }}>
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
