import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  CURRENT_MANAGER,
  SEED_LOGS,
  SEED_USERS,
  getRole,
  getStatusMeta,
} from '../data/accountManagement';

const STORAGE_KEY = 'anhduy.accountManagement.v1';
const AccountManagementContext = createContext(null);

function cloneSeed() {
  return {
    users: SEED_USERS.map((user) => ({ ...user })),
    logs: SEED_LOGS.map((log) => ({ ...log, email: log.email ? { ...log.email } : null })),
  };
}

function readStoredState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.users) || !Array.isArray(parsed.logs)) return null;
    const usersOk = parsed.users.every(
      (user) => user && user.id && user.fullName && user.roleId && user.status && user.email,
    );
    if (!usersOk) return null;
    return parsed;
  } catch {
    return null;
  }
}

function buildStatusEmail(user, nextStatus) {
  const opened = nextStatus === 'active';
  return {
    to: user.email,
    subject: opened
      ? '[AnhDuy Sport] Tài khoản của bạn đã được kích hoạt'
      : '[AnhDuy Sport] Tài khoản của bạn đã bị vô hiệu hóa',
    body: opened
      ? `Xin chào ${user.fullName}, quản lý trung tâm đã kích hoạt lại tài khoản ${user.email}. Bạn có thể đăng nhập và đặt lịch tập.`
      : `Xin chào ${user.fullName}, quản lý trung tâm đã vô hiệu hóa tài khoản ${user.email}. Bạn sẽ không đăng nhập được cho đến khi tài khoản được mở lại. Nếu cần hỗ trợ, hãy liên hệ lễ tân AnhDuy Sport.`,
  };
}

export function AccountManagementProvider({ children }) {
  const [state, setState] = useState(() => readStoredState() ?? cloneSeed());
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const updateUserRole = (userId, roleId) => {
    const current = stateRef.current;
    const user = current.users.find((item) => item.id === userId);
    const nextRole = getRole(roleId);
    const previousRole = getRole(user?.roleId);
    if (!user || !nextRole || !previousRole || user.roleId === roleId) return null;

    const log = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      type: 'role',
      actor: CURRENT_MANAGER.name,
      userId: user.id,
      userName: user.fullName,
      summary: `Đổi vai trò của ${user.fullName}`,
      detail: `${previousRole.label} → ${nextRole.label}`,
      email: null,
    };

    const next = {
      users: current.users.map((item) => (item.id === userId ? { ...item, roleId } : item)),
      logs: [log, ...current.logs],
    };
    stateRef.current = next;
    setState(next);
    return log;
  };

  const updateAccountStatus = (userId, nextStatus) => {
    const current = stateRef.current;
    const user = current.users.find((item) => item.id === userId);
    if (!user || (nextStatus !== 'active' && nextStatus !== 'inactive') || user.status === nextStatus) {
      return null;
    }

    const previous = getStatusMeta(user.status);
    const next = getStatusMeta(nextStatus);
    const email = buildStatusEmail(user, nextStatus);
    const verb = nextStatus === 'active' ? 'Kích hoạt' : 'Vô hiệu hóa';
    const log = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      type: 'status',
      actor: CURRENT_MANAGER.name,
      userId: user.id,
      userName: user.fullName,
      summary: `${verb} tài khoản ${user.fullName}`,
      detail: `${previous.label} → ${next.label}`,
      email,
    };

    const nextState = {
      users: current.users.map((item) => (item.id === userId ? { ...item, status: nextStatus } : item)),
      logs: [log, ...current.logs],
    };
    stateRef.current = nextState;
    setState(nextState);
    return log;
  };

  const resetData = () => {
    const next = cloneSeed();
    stateRef.current = next;
    setState(next);
  };

  return (
    <AccountManagementContext.Provider
      value={{
        users: state.users,
        logs: state.logs,
        updateUserRole,
        updateAccountStatus,
        resetData,
      }}
    >
      {children}
    </AccountManagementContext.Provider>
  );
}

// Hook đi cùng provider nên file này cố ý xuất cả hai.
// eslint-disable-next-line react-refresh/only-export-components
export function useAccountManagement() {
  const context = useContext(AccountManagementContext);
  if (!context) {
    throw new Error('useAccountManagement phải được dùng trong AccountManagementProvider');
  }
  return context;
}
