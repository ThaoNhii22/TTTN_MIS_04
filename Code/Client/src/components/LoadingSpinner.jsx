function LoadingSpinner({ message = 'Đang tải dữ liệu...', size = 'medium', fullPage = false }) {
  const content = (
    <div className={`loading-spinner-wrapper loading-spinner-wrapper--${size}`}>
      <div className="custom-spinner" />
      {message && <p className="loading-spinner-text">{message}</p>}
    </div>
  );

  if (fullPage) {
    return <div className="loading-fullpage-overlay">{content}</div>;
  }

  return <div className="state-card state-card--loading">{content}</div>;
}

export default LoadingSpinner;
