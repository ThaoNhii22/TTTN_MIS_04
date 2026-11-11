import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AlertBanner from '../components/AlertBanner';
import { useAuth } from '../context/AuthContext';
import { formatErrorMessage } from '../utils/errorHandler';

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
    if (!email || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      const msg = formatErrorMessage(err, 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-card__header">
          <div className="login-card__logo">W</div>

          <h1>Đăng nhập Hệ thống</h1>

          <p>
            Hệ thống Quản lý Workshop Nội bộ
          </p>
        </div>

        {errorMessage && (
          <div style={{ marginBottom: '18px' }}>
            <AlertBanner
              type="error"
              message={errorMessage}
              onDismiss={() => setErrorMessage(null)}
            />
          </div>
        )}

        <form className="login-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email tài khoản</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@workshop.edu.vn"
              required
              autoFocus
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
            {loading ? (
              <span className="btn-loading-wrapper">
                <span className="mini-spinner" /> Đang xác thực...
              </span>
            ) : (
              'Đăng nhập'
            )}
          </button>
        </form>

        <div style={{ marginTop: '24px', padding: '12px', background: '#fdf7f4', borderRadius: '8px', border: '1px solid #ebdcd5', fontSize: '12px', color: '#7a5b50', lineHeight: '1.5' }}>
          <strong>Tài khoản thử nghiệm mẫu:</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
            <li>Admin: <code>admin@workshop.edu.vn</code> | Pass: <code>Admin@123</code></li>
            <li>Organizer: <code>organizer@workshop.edu.vn</code> | Pass: <code>Organizer@123</code></li>
            <li>Participant: <code>user@workshop.edu.vn</code> | Pass: <code>User@123</code></li>
          </ul>
        </div>
      </div>
    </main>
  );
}

export default LoginPage;
