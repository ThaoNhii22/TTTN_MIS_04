import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ForbiddenPage({ requiredRoles = [] }) {
  const navigate = useNavigate();
  const { role, user, logout } = useAuth();

  const getRoleName = (r) => {
    switch (r) {
      case 'admin':
        return 'Quản trị viên';
      case 'organizer':
        return 'Ban tổ chức';
      case 'participant':
      default:
        return 'Người tham gia';
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="forbidden-container">
      <div className="forbidden-card">
        <div className="forbidden-code-badge">403</div>
        <h1 className="forbidden-title">Quyền truy cập bị từ chối</h1>

        <p className="forbidden-description">
          Tài khoản của bạn hiện tại không có đủ quyền hạn để truy cập vào trang hoặc chức năng này.
        </p>

        <div className="forbidden-role-box">
          <p>
            Tài khoản hiện tại: <strong>{user?.full_name || 'Người dùng'}</strong> ({user?.email})
          </p>
          <p>
            Vai trò của bạn: <span className="role-badge role-badge--participant">{getRoleName(role)}</span>
          </p>
          {requiredRoles.length > 0 && (
            <p style={{ marginTop: '8px', fontSize: '12px', color: '#886255' }}>
              Yêu cầu quyền: {requiredRoles.map((r) => getRoleName(r)).join(' hoặc ')}
            </p>
          )}
        </div>

        <div className="forbidden-actions">
          <Link to="/" className="home-page__primary-button">
            Về Trang chủ
          </Link>
          <Link to="/workshops" className="btn-secondary">
            Xem danh sách Workshop
          </Link>
          <button
            type="button"
            className="btn-danger-outline"
            onClick={handleLogout}
          >
            Đổi tài khoản khác
          </button>
        </div>
      </div>
    </div>
  );
}

export default ForbiddenPage;
