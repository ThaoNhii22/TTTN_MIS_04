import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { setToken } from '../services/auth';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const from = location.state?.from?.pathname || '/';

  const handleLogin = (event) => {
    event.preventDefault();

    // Tạm thời mô phỏng đăng nhập thành công.
    // Sau khi có API FastAPI, phần này sẽ gọi API thật.
    if (!email || !password) {
      return;
    }

    setToken('mock-jwt-token');
    navigate(from, { replace: true });
  };

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-card__header">
          <div className="login-card__logo">W</div>

          <h1>Đăng nhập</h1>

          <p>
            Đăng nhập để quản lý và tham gia các Workshop nội bộ.
          </p>
        </div>

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
            />
          </div>

          <button className="login-button" type="submit">
            Đăng nhập
          </button>
        </form>
      </div>
    </main>
  );
}

export default LoginPage;