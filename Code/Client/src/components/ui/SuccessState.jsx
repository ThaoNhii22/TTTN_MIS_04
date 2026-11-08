function SuccessState({
  title = 'Thao tác thành công',
  message = 'Thao tác đã được thực hiện và lưu trữ thành công.',
  action,
}) {
  return (
    <div className="state-card state-card--success" role="region" aria-label="Thành công">
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
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>

      <h2 className="state-card__title">{title}</h2>
      <p className="state-card__message">{message}</p>

      {action && (
        <button
          type="button"
          className="home-page__primary-button state-card__action-btn"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export default SuccessState;
