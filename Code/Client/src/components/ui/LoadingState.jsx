function LoadingState({ message = 'Đang tải dữ liệu...' }) {
  return (
    <div className="state-card state-card--loading">
      <div className="state-card__spinner" />
      <h2>Đang tải</h2>
      <p>{message}</p>
    </div>
  );
}

export default LoadingState;