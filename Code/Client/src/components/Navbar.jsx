import { NavLink, useNavigate } from 'react-router-dom';
import { removeToken } from '../services/auth';

function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    removeToken();
    navigate('/login');
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

        {/* Đăng nhập */}
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

        {/* Đăng xuất */}
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
      </nav>
    </header>
  );
}

export default Navbar;