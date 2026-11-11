import { useNavigate } from 'react-router-dom';

function ForbiddenState({
  title = 'Không có quyền truy cập',
  message = 'Bạn không có quyền thực hiện chức năng hoặc truy cập vào khu vực này.',
}) {
  const navigate = useNavigate();

  return (
    <div className="state-card state-card--forbidden" role="region" aria-label="Quyền truy cập bị từ chối">
      <div className="state-card__icon-wrap">
        <svg
          className="state-card__svg-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>

      <div className="state-card__badge-403">MÃ LỖI 403: FORBIDDEN</div>
      <h2 className="state-card__title">{title}</h2>
      <p className="state-card__message">{message}</p>

      <div className="state-card__actions" style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '16px' }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => navigate(-1)}
        >
          Quay lại trang trước
        </button>
        <button
          type="button"
          className="home-page__primary-button"
          onClick={() => navigate('/')}
        >
          Về trang chủ
        </button>
      </div>
    </div>
  );
}

export default ForbiddenState;
