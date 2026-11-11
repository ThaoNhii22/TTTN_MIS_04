import { useEffect } from 'react';

/**
 * Modern, accessible Modal dialog component following international UI/UX standards.
 * Features:
 * - Backdrop click to close (optional)
 * - Keyboard Escape listener
 * - Body scroll lock while opened
 * - Smooth entrance animations
 * - Accessible ARIA attributes
 */
function Modal({
  isOpen,
  onClose,
  title,
  subtitle = null,
  children,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  closeOnBackdrop = true,
  showCloseButton = true,
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && closeOnBackdrop) {
      onClose();
    }
  };

  return (
    <div
      className="modal-backdrop-portal"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-dialog-title' : undefined}
    >
      <div className={`modal-window-box modal-window-box--${size}`}>
        {(title || showCloseButton) && (
          <div className="modal-header-bar">
            <div>
              {title && (
                <h3 id="modal-dialog-title" className="modal-header-title">
                  {title}
                </h3>
              )}
              {subtitle && <p className="modal-header-subtitle">{subtitle}</p>}
            </div>

            {showCloseButton && (
              <button
                type="button"
                className="modal-close-icon-btn"
                onClick={onClose}
                aria-label="Đóng hộp thoại"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        )}

        <div className="modal-body-scrollable">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
