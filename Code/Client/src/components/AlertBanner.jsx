import { formatErrorMessage } from '../utils/errorHandler';

function AlertBanner({ type = 'info', message = '', onDismiss = null }) {
  if (!message) return null;

  let displayContent = null;
  if (typeof message === 'string') {
    displayContent = message.split('\n').map((line, idx) => (
      <div key={idx} style={{ marginTop: idx > 0 ? '4px' : '0' }}>
        {line}
      </div>
    ));
  } else if (Array.isArray(message)) {
    displayContent = message.map((item, idx) => (
      <div key={idx} style={{ margin: '3px 0' }}>
        {item.loc ? `• ${item.loc.join('.')}: ` : '• '}
        {item.msg || JSON.stringify(item)}
      </div>
    ));
  } else if (typeof message === 'object' && message !== null) {
    displayContent = formatErrorMessage(message);
  }

  const renderIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className="alert-banner__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        );
      case 'error':
        return (
          <svg className="alert-banner__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="alert-banner__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg className="alert-banner__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
    }
  };

  return (
    <div className={`alert-banner alert-banner--${type}`} role="alert" aria-live="polite">
      <div className="alert-banner__icon-wrap">{renderIcon()}</div>
      <div className="alert-banner__content">{displayContent}</div>

      {onDismiss && (
        <button
          type="button"
          className="alert-banner__close-btn"
          onClick={onDismiss}
          aria-label="Đóng thông báo"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default AlertBanner;
