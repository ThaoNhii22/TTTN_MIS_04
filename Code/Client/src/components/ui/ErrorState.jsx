function ErrorState({
  title = 'Có lỗi xảy ra',
  message = 'Không thể tải dữ liệu. Vui lòng thử lại.',
  onRetry,
}) {
  return (
    <div className="state-card state-card--error" role="region" aria-label="Lỗi tải dữ liệu">
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
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <h2 className="state-card__title">{title}</h2>
      <p className="state-card__message">{message}</p>

      {onRetry && (
        <button
          type="button"
          className="home-page__primary-button state-card__action-btn"
          onClick={onRetry}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: '16px', height: '16px', marginRight: '6px' }}
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Thử lại
        </button>
      )}
    </div>
  );
}

export default ErrorState;
