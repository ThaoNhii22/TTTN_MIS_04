function SuccessState({
  title = 'Thành công',
  message = 'Thao tác đã được thực hiện thành công.',
  action,
}) {
  return (
    <div className="state-card state-card--success">
      <div className="state-card__icon">✓</div>

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

export default SuccessState;