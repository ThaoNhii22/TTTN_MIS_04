import { useCallback, useMemo, useState } from 'react';
import { formatErrorMessage } from '../utils/errorHandler';
import ToastContext from './ToastContext';

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type = 'info', title = '', message = '', duration = 4500 }) => {
      const id = Date.now() + Math.random().toString(36).substring(2, 9);
      const newToast = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }

      return id;
    },
    [dismissToast]
  );

  const toastMethods = useMemo(
    () => ({
      show: addToast,
      success: (message, title = 'Thành công') =>
        addToast({ type: 'success', title, message }),
      error: (message, title = 'Có lỗi xảy ra') =>
        addToast({ type: 'error', title, message, duration: 6000 }),
      warning: (message, title = 'Cảnh báo') =>
        addToast({ type: 'warning', title, message, duration: 5000 }),
      info: (message, title = 'Thông báo') =>
        addToast({ type: 'info', title, message }),
      apiError: (err, fallback = 'Thao tác không thành công', title = 'Lỗi hệ thống') => {
        const msg = formatErrorMessage(err, fallback);
        return addToast({ type: 'error', title, message: msg, duration: 6000 });
      },
      dismiss: dismissToast,
    }),
    [addToast, dismissToast]
  );

  return (
    <ToastContext.Provider value={toastMethods}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <aside
      className="toast-container"
      aria-live="polite"
      aria-label="Thông báo hệ thống"
      role="region"
    >
      {toasts.map((item) => (
        <ToastItem key={item.id} toast={item} onDismiss={() => onDismiss(item.id)} />
      ))}
    </aside>
  );
}

function ToastItem({ toast, onDismiss }) {
  const { type, title, message } = toast;

  const renderIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        );
      case 'error':
        return (
          <svg className="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg className="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
    }
  };

  return (
    <div
      className={`toast-item toast-item--${type}`}
      role={type === 'error' ? 'alert' : 'status'}
    >
      <div className="toast-item__icon-wrapper">{renderIcon()}</div>
      <div className="toast-item__body">
        {title && <h5 className="toast-item__title">{title}</h5>}
        {message && (
          <div className="toast-item__message">
            {typeof message === 'string'
              ? message.split('\n').map((line, idx) => (
                  <p key={idx} style={{ margin: idx > 0 ? '4px 0 0' : '0' }}>
                    {line}
                  </p>
                ))
              : message}
          </div>
        )}
      </div>
      <button
        type="button"
        className="toast-item__close-btn"
        onClick={onDismiss}
        aria-label="Đóng thông báo"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

export default ToastProvider;
