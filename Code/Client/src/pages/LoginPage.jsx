import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const from = location.state?.from?.pathname || '/';

  const handleLogin = async (event) => {
    if (event) event.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      const detail = err.response?.data?.detail;
      setErrorMessage(
        typeof detail === 'string'
          ? detail
          : 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (quickEmail, quickPassword) => {
    setEmail(quickEmail);
    setPassword(quickPassword);
    setErrorMessage(null);
    setLoading(true);

    login(quickEmail, quickPassword)
      .then(() => {
        navigate(from, { replace: true });
      })
      .catch((err) => {
        const detail = err.response?.data?.detail;
        setErrorMessage(
          typeof detail === 'string'
            ? detail
            : 'Đăng nhập nhanh thất bại.'
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-card__header">
          <div className="login-card__logo">W</div>

          <h1>Đăng nhập Hệ thống</h1>

          <p>
            Hệ thống Quản lý Workshop Nội Bộ (TTTN_MIS_04)
          </p>
        </div>

        {errorMessage && (
          <div className="alert-banner alert-banner--error" style={{ marginBottom: '16px' }}>
            <span>⚠️</span>
            <div>{errorMessage}</div>
          </div>
        )}

        <form className="login-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@workshop.edu.vn"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button className="login-button" type="submit" disabled={loading}>
            {loading ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>
        </form>

        {/* Quick Demo Accounts */}
        <div className="quick-login-section">
          <p className="quick-login-title">⚡ Đăng nhập nhanh tài khoản mẫu (Demo)</p>
          <div className="quick-login-buttons">
            <button
              type="button"
              className="quick-login-btn quick-login-btn--admin"
              onClick={() => handleQuickLogin('admin@workshop.edu.vn', 'Admin@123')}
            >
              👑 Quản trị viên (Admin)
            </button>
            <button
              type="button"
              className="quick-login-btn quick-login-btn--organizer"
              onClick={() => handleQuickLogin('organizer@workshop.edu.vn', 'Organizer@123')}
            >
              🏢 Ban tổ chức (Organizer)
            </button>
            <button
              type="button"
              className="quick-login-btn quick-login-btn--user"
              onClick={() => handleQuickLogin('user@workshop.edu.vn', 'User@123')}
            >
              🎓 Học viên (Participant)
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default LoginPage;