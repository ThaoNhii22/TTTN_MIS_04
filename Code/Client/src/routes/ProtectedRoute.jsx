import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ForbiddenPage from '../pages/ForbiddenPage';
import LoadingSpinner from '../components/LoadingSpinner';

function ProtectedRoute({ allowedRoles = null }) {
  const location = useLocation();
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner message="Đang xác thực tài khoản..." size="large" />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <ForbiddenPage requiredRoles={allowedRoles} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;