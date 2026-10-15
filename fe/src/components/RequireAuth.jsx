import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RequireAuth({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/dang-nhap" replace state={{ from: location.pathname }} />;
  }

  if (user.roleId !== 'ADMIN') {
    return <Navigate to="/home" replace />;
  }

  return children;
}
