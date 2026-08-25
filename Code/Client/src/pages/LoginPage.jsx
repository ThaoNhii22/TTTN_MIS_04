import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { login } from '../services/auth';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('user@workshop.edu.vn');
  const [password, setPassword] = useState('User@123');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const from = location.state?.from?.pathname || '/';

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.userMessage || err.response?.data?.detail || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrorMessage('');
  };

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-card__header">
          <div className="login-card__logo">W</div>
          <h1>Đăng nhập Hệ thống</h1>
          <p>Quản lý và tham gia các Workshop nội bộ (TTTN_MIS_04)</p>
        </div>

        {errorMessage && (
          <div
            style={{
              padding: '12px 16px',
              marginBottom: '16px',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              border: '1px solid #f87171',
              borderRadius: '8px',
              fontSize: '14px',
              lineHeight: '1.4',
            }}
          >
            ⚠️ {errorMessage}
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
              placeholder="Nhập email của bạn"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Nhập mật khẩu"
              required
              disabled={isLoading}
            />
          </div>

          <button className="login-button" type="submit" disabled={isLoading}>
            {isLoading ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
          <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: 600 }}>
            TÀI KHOẢN MẪU (TEST NHANH 1-CHẠM):
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleQuickFill('user@workshop.edu.vn', 'User@123')}
              style={{
                padding: '6px 10px',
                fontSize: '12px',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              🎓 Sinh viên (Participant)
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('organizer@workshop.edu.vn', 'Organizer@123')}
              style={{
                padding: '6px 10px',
                fontSize: '12px',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              🏢 Ban Tổ chức (Organizer)
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('admin@workshop.edu.vn', 'Admin@123')}
              style={{
                padding: '6px 10px',
                fontSize: '12px',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              🛡️ Quản trị viên (Admin)
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default LoginPage;