import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ allowedRoles = null }) {
  const location = useLocation();
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="state-card state-card--loading" style={{ margin: '80px auto', textAlign: 'center' }}>
        <div className="state-card__spinner" />
        <h2 style={{ marginTop: '16px', fontSize: '18px', color: '#6d4336' }}>Đang xác thực tài khoản...</h2>
      </div>
    );
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
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;