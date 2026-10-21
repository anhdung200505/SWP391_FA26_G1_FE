import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RequireAuth({ children, allowedRoles }) {
  const { user } = useAuth();
  const location = useLocation();

  // 1. Chưa đăng nhập -> Đá về trang Đăng nhập
  if (!user) {
    return <Navigate to="/dang-nhap" replace state={{ from: location.pathname }} />;
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