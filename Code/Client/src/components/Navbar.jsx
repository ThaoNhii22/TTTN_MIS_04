import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const navigate = useNavigate();
  const { user, role, logout, isAuthenticated } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleLabel = (r) => {
    switch (r) {
      case 'admin':
        return { text: 'Quản trị viên', className: 'role-badge--admin' };
      case 'organizer':
        return { text: 'Ban tổ chức', className: 'role-badge--organizer' };
      case 'participant':
      default:
        return { text: 'Người tham gia', className: 'role-badge--participant' };
    }
  };

  const roleInfo = getRoleLabel(role);

  return (
    <header className="navbar">
      <div className="navbar__brand">
        <NavLink to="/">
          <span className="navbar__title">Workshop MIS</span>
        </NavLink>
      </div>

      <nav className="navbar__menu">
        <NavLink
          to="/"
          className={({ isActive }) =>
            isActive ? 'navbar__link active' : 'navbar__link'
          }
        >
          Trang chủ
        </NavLink>

        <NavLink
          to="/workshops"
          className={({ isActive }) =>
            isActive ? 'navbar__link active' : 'navbar__link'
          }
        >
          Workshop
        </NavLink>

        {/* Participant Links */}
        {role === 'participant' && (
          <>
            <NavLink
              to="/my-tickets"
              className={({ isActive }) =>
                isActive ? 'navbar__link active' : 'navbar__link'
              }
            >
              Vé của tôi
            </NavLink>
            <NavLink
              to="/waitlist"
              className={({ isActive }) =>
                isActive ? 'navbar__link active' : 'navbar__link'
              }
            >
              Waitlist
            </NavLink>
          </>
        )}

        {/* Organizer Links */}
        {role === 'organizer' && (
          <>
            <NavLink
              to="/organizer/workshops"
              className={({ isActive }) =>
                isActive ? 'navbar__link active' : 'navbar__link'
              }
            >
              Quản lý Workshop
            </NavLink>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                isActive ? 'navbar__link active' : 'navbar__link'
              }
            >
              Dashboard KPI
            </NavLink>
          </>
        )}

        {/* Admin Links */}
        {role === 'admin' && (
          <>
            <NavLink
              to="/admin/reviews"
              className={({ isActive }) =>
                isActive ? 'navbar__link active' : 'navbar__link'
              }
            >
              Xét duyệt
            </NavLink>
            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                isActive ? 'navbar__link active' : 'navbar__link'
              }
            >
              Quản lý User
            </NavLink>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                isActive ? 'navbar__link active' : 'navbar__link'
              }
            >
              Dashboard KPI
            </NavLink>
            <NavLink
              to="/admin/audit-logs"
              className={({ isActive }) =>
                isActive ? 'navbar__link active' : 'navbar__link'
              }
            >
              Audit Logs
            </NavLink>
          </>
        )}

        <NavLink
          to="/check-in"
          className={({ isActive }) =>
            isActive ? 'navbar__link active' : 'navbar__link'
          }
        >
          Check-in QR
        </NavLink>

        {/* User Info & Actions */}
        {isAuthenticated && user && (
          <div className="navbar__user-section">
            <div className="navbar__user-info">
              <span className="navbar__user-name">{user.full_name}</span>
              <span className={`role-badge ${roleInfo.className}`}>{roleInfo.text}</span>
            </div>

            <button
              className="navbar__icon-button navbar__icon-button--logout"
              type="button"
              onClick={handleLogout}
              aria-label="Đăng xuất"
              title="Đăng xuất"
            >
              <svg
                className="navbar__icon"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10 5H6.5C5.67 5 5 5.67 5 6.5V17.5C5 18.33 5.67 19 6.5 19H10"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M14 8L18 12L14 16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 12H18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}

export default Navbar;