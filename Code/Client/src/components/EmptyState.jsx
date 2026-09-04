import { Link } from 'react-router-dom';

function EmptyState({
  title = 'Không có dữ liệu',
  description = 'Hiện tại chưa có bản ghi nào để hiển thị.',
  actionLabel = null,
  actionLink = null,
  onActionClick = null,
}) {
  return (
    <div className="empty-state-container">
      <div className="empty-state-icon-box">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="empty-state-svg"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="15" y2="17" />
        </svg>
      </div>

      <h2 className="empty-state-title">{title}</h2>
      <p className="empty-state-description">{description}</p>

      {actionLabel && actionLink && (
        <Link to={actionLink} className="home-page__primary-button" style={{ marginTop: '16px' }}>
          {actionLabel}
        </Link>
      )}

      {actionLabel && onActionClick && (
        <button
          type="button"
          className="home-page__primary-button"
          style={{ marginTop: '16px' }}
          onClick={onActionClick}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
