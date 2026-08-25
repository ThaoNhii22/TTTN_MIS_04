function AlertBanner({ type = 'info', message = '', onDismiss = null }) {
  if (!message) return null;

  // Handle format if message is an array of errors (from Pydantic validation 422)
  let formattedMessage = message;
  if (Array.isArray(message)) {
    formattedMessage = message.map((item, idx) => (
      <div key={idx} style={{ margin: '2px 0' }}>
        {item.loc ? `• ${item.loc.join('.')}: ` : '• '}
        {item.msg || JSON.stringify(item)}
      </div>
    ));
  } else if (typeof message === 'object' && message !== null) {
    formattedMessage = message.detail || JSON.stringify(message);
  }

  return (
    <div className={`alert-banner alert-banner--${type}`} role="alert">
      <div className="alert-banner__content">
        {formattedMessage}
      </div>

      {onDismiss && (
        <button
          type="button"
          className="alert-banner__close-btn"
          onClick={onDismiss}
          aria-label="Đóng thông báo"
        >
          ×
        </button>
      )}
    </div>
  );
}

export default AlertBanner;
