import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  createPackage as createPackageRequest,
  createStaffAccount as createStaffAccountRequest,
  getDashboard,
  updateAccountStatus as updateAccountStatusRequest,
  updatePackageSetting as updatePackageSettingRequest,
  updateUserRole as updateUserRoleRequest,
} from '../api/managementApi';

const AccountManagementContext = createContext(null);

const emptyState = { users: [], packages: [], logs: [], roles: [] };

export function AccountManagementProvider({ children }) {
  const { user } = useAuth();
  const [state, setState] = useState(emptyState);
  const [loading, setLoading] = useState(user?.roleId === 'ADMIN');
  const [error, setError] = useState('');

  const applyDashboard = (dashboard) => {
    setState({
      users: dashboard.users ?? [],
      packages: dashboard.packages ?? [],
      logs: dashboard.logs ?? [],
      roles: dashboard.roles ?? [],
    });
    setError('');
  };

  useEffect(() => {
    if (!user || user.roleId !== 'ADMIN') return undefined;
    let active = true;
    getDashboard()
      .then((dashboard) => {
        if (active) applyDashboard(dashboard);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const createStaffAccount = async (payload) => {
    const result = await createStaffAccountRequest(payload);
    setState((current) => ({
      ...current,
      users: [...current.users, result.user].sort((left, right) => Number(left.id) - Number(right.id)),
      logs: [result.log, ...current.logs],
    }));
    return result.user;
  };

  const updateUserRole = async (userId, roleId) => {
    const result = await updateUserRoleRequest(userId, roleId);
    setState((current) => ({
      ...current,
      users: current.users.map((user) => (user.id === userId ? result.user : user)),
      logs: [result.log, ...current.logs],
    }));
    return result.log;
  };

  const updateAccountStatus = async (userId, status) => {
    const result = await updateAccountStatusRequest(userId, status);
    setState((current) => ({
      ...current,
      users: current.users.map((user) => (user.id === userId ? result.user : user)),
      logs: [result.log, ...current.logs],
    }));
    return result.log;
  };

  const createPackage = async (payload) => {
    const result = await createPackageRequest(payload);
    setState((current) => ({
      ...current,
      packages: [...current.packages, result.package].sort((left, right) => left.code.localeCompare(right.code)),
      logs: [result.log, ...current.logs],
    }));
    return result.log;
  };

  const updatePackageSetting = async (packageId, payload) => {
    const result = await updatePackageSettingRequest(packageId, payload);
    setState((current) => ({
      ...current,
      packages: current.packages.map((item) => (item.id === packageId ? result.package : item)),
      logs: [result.log, ...current.logs],
    }));
    return result.log;
  };

  return (
    <AccountManagementContext.Provider
      value={{
        users: state.users,
        packages: state.packages,
        logs: state.logs,
        roles: state.roles,
        loading,
        error,
        createStaffAccount,
        updateUserRole,
        updateAccountStatus,
        createPackage,
        updatePackageSetting,
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
