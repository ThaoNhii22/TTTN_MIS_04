import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getUser, logout } from '../services/auth';

function Navbar() {
  const navigate = useNavigate();
  const [currentUser] = useState(() => getUser());

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleLabel = (role) => {
    if (role === 'admin') return 'Quản trị viên';
    if (role === 'organizer') return 'Ban Tổ chức';
    return 'Sinh viên';
  };

  const getRoleBadgeStyle = (role) => {
    if (role === 'admin') {
      return { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #f87171' };
    }
    if (role === 'organizer') {
      return { backgroundColor: '#e0e7ff', color: '#3730a3', border: '1px solid #818cf8' };
    }
    return { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #4ade80' };
  };

  return (
    <header className="navbar">
      <div className="navbar__brand">
        <NavLink to="/">Workshop Management</NavLink>
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

        <NavLink
          to="/waitlist"
          className={({ isActive }) =>
            isActive ? 'navbar__link active' : 'navbar__link'
          }
        >
          Waitlist
        </NavLink>

        <NavLink
          to="/check-in"
          className={({ isActive }) =>
            isActive ? 'navbar__link active' : 'navbar__link'
          }
        >
          Check-in
        </NavLink>

        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
            <div style={{ textAlign: 'right', lineHeight: '1.2' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>
                {currentUser.full_name || currentUser.email}
              </div>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '999px',
                  display: 'inline-block',
                  marginTop: '2px',
                  ...getRoleBadgeStyle(currentUser.role),
                }}
              >
                {getRoleLabel(currentUser.role)}
              </span>
            </div>

            {/* Nút Đăng xuất */}
            <button
              className="navbar__icon-button navbar__icon-button--logout"
              type="button"
              onClick={handleLogout}
              aria-label="Đăng xuất"
              title="Đăng xuất khỏi hệ thống"
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
        ) : (
          <button
            className="navbar__icon-button"
            type="button"
            onClick={() => navigate('/login')}
            aria-label="Đăng nhập"
            title="Đăng nhập"
          >
            <svg
              className="navbar__icon"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="12"
                cy="8"
                r="4"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M4.5 20C5.3 16.9 8.2 15 12 15C15.8 15 18.7 16.9 19.5 20"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </nav>
    </header>
  );
}

export default Navbar;