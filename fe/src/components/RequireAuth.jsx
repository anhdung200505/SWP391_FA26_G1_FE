import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RequireAuth({ children, allowedRoles }) {
  const { user } = useAuth();
  const location = useLocation();

  // 1. Chưa đăng nhập -> Đá về trang Đăng nhập
  if (!user) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    const params = new URLSearchParams();
    params.set('next', next);
    return <Navigate to={`/dang-nhap?${params.toString()}`} replace />;
  }

  // 2. Nếu route có quy định danh sách Role được phép vào
  if (allowedRoles && allowedRoles.length > 0) {
    const currentRole = user.roleId || user.role;
    if (!allowedRoles.includes(currentRole)) {
      return <Navigate to="/home" replace />;
    }
  }

  return children;
}