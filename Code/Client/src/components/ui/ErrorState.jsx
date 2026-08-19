function ErrorState({
  title = 'Có lỗi xảy ra',
  message = 'Không thể tải dữ liệu. Vui lòng thử lại.',
  onRetry,
}) {
  return (
    <div className="state-card state-card--error">
      <div className="state-card__icon">!</div>

      <h2>{title}</h2>
      <p>{message}</p>

      {onRetry && (
        <button type="button" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}

export default ErrorState;