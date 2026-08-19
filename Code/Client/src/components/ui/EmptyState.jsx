function EmptyState({
  title = 'Chưa có dữ liệu',
  message = 'Hiện tại chưa có dữ liệu để hiển thị.',
  action,
}) {
  return (
    <div className="state-card state-card--empty">
      <div className="state-card__icon">♡</div>

      <h2>{title}</h2>
      <p>{message}</p>

      {action && (
        <button type="button" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}

export default EmptyState;