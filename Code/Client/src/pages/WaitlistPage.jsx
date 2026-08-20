import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getUserWaitlistEntries,
  leaveWaitlist,
} from '../services/workshopService';

function WaitlistPage() {
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'waiting' | 'promoted'

  // Action states
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionAlert, setActionAlert] = useState(null);

  // Load waitlist entries for current participant
  const loadData = () => {
    try {
      const entries = getUserWaitlistEntries('sinhvien@workshop.edu.vn');
      setWaitlistEntries(entries);
    } catch {
      setActionAlert({
        type: 'error',
        title: 'Lỗi tải dữ liệu',
        message: 'Không thể tải danh sách chờ. Vui lòng thử lại.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter entries
  const filteredEntries = waitlistEntries.filter((entry) => {
    if (filterTab === 'waiting') return entry.status === 'waitlist';
    if (filterTab === 'promoted') return entry.status === 'confirmed' && entry.wasPromoted;
    return true;
  });

  const waitingCount = waitlistEntries.filter((e) => e.status === 'waitlist').length;
  const promotedCount = waitlistEntries.filter((e) => e.status === 'confirmed' && e.wasPromoted).length;

  // Handle leave waitlist (cancel queue position)
  const handleLeaveWaitlist = async () => {
    if (!selectedEntry) return;
    setIsProcessing(true);

    try {
      await leaveWaitlist(selectedEntry.id, cancelReason);
      setShowCancelModal(false);
      setSelectedEntry(null);
      setCancelReason('');
      loadData();

      setActionAlert({
        type: 'success',
        title: 'Đã rút khỏi danh sách chờ',
        message: `Bạn đã hủy lượt chờ cho Workshop "${selectedEntry.workshopTitle}". Vị trí hàng đợi đã được nhường cho người tiếp theo.`,
      });
    } catch (err) {
      setActionAlert({
        type: 'error',
        title: 'Thao tác không thành công',
        message: err.message || 'Không thể rút khỏi danh sách chờ.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="state-card state-card--loading">
        <div className="state-card__spinner" />
        <h2>Đang tải Danh sách chờ</h2>
        <p>Vui lòng đợi trong giây lát...</p>
      </div>
    );
  }

  return (
    <div className="waitlist-page">
      {/* Header Banner */}
      <div className="waitlist-page__header">
        <div>
          <p className="home-page__eyebrow">WAITLIST MANAGEMENT</p>
          <h1>Danh sách chờ của bạn</h1>
          <p className="waitlist-page__subtitle">
            Theo dõi vị trí hàng đợi và trạng thái chuyển vé tự động khi có chỗ trống.
          </p>
        </div>

        <Link to="/workshops" className="home-page__primary-button">
          Khám phá thêm Workshop
        </Link>
      </div>

      {/* Alert Notification */}
      {actionAlert && (
        <div className={`detail-alert detail-alert--${actionAlert.type === 'error' ? 'error' : 'confirmed'}`}>
          <div className="detail-alert__icon">{actionAlert.type === 'error' ? '!' : '✓'}</div>
          <div className="detail-alert__content">
            <h4>{actionAlert.title}</h4>
            <p>{actionAlert.message}</p>
          </div>
          <button className="detail-alert__close" onClick={() => setActionAlert(null)}>
            ×
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="waitlist-summary-grid">
        <div className="waitlist-summary-card">
          <div>
            <span className="waitlist-summary-card__label">Đang chờ xếp chỗ</span>
            <strong className="waitlist-summary-card__number">{waitingCount}</strong>
            <small>Workshop</small>
          </div>
        </div>

        <div className="waitlist-summary-card">
          <div>
            <span className="waitlist-summary-card__label">Đã được chuyển vé chính thức</span>
            <strong className="waitlist-summary-card__number">{promotedCount}</strong>
            <small>Vé đã sẵn sàng</small>
          </div>
        </div>
      </div>

      {/* Tab Filter Bar */}
      <div className="waitlist-toolbar">
        <div className="waitlist-tabs">
          <button
            type="button"
            className={`waitlist-tab ${filterTab === 'all' ? 'active' : ''}`}
            onClick={() => setFilterTab('all')}
          >
            Tất cả ({waitlistEntries.length})
          </button>
          <button
            type="button"
            className={`waitlist-tab ${filterTab === 'waiting' ? 'active' : ''}`}
            onClick={() => setFilterTab('waiting')}
          >
            Đang chờ ({waitingCount})
          </button>
          <button
            type="button"
            className={`waitlist-tab ${filterTab === 'promoted' ? 'active' : ''}`}
            onClick={() => setFilterTab('promoted')}
          >
            Đã chuyển vé chính thức ({promotedCount})
          </button>
        </div>

        <button type="button" className="waitlist-refresh-btn" onClick={loadData} title="Làm mới dữ liệu">
          Cập nhật
        </button>
      </div>

      {/* List of Waitlist Items or Empty State */}
      {filteredEntries.length === 0 ? (
        <div className="workshop-empty">
          <h2>Không có Workshop nào trong danh sách</h2>
          <p>
            {filterTab === 'waiting'
              ? 'Bạn hiện không có Workshop nào đang trong trạng thái chờ xếp chỗ.'
              : filterTab === 'promoted'
                ? 'Chưa có Workshop nào được chuyển từ danh sách chờ sang vé chính thức.'
                : 'Bạn chưa đăng ký danh sách chờ cho bất kỳ Workshop nào.'}
          </p>
          <Link to="/workshops" className="home-page__primary-button" style={{ marginTop: '20px', display: 'inline-block' }}>
            Tìm Workshop ngay →
          </Link>
        </div>
      ) : (
        <div className="waitlist-items-grid">
          {filteredEntries.map((item) => {
            const isPromoted = item.status === 'confirmed' && item.wasPromoted;

            return (
              <div
                key={item.id}
                className={`waitlist-item-card ${isPromoted ? 'waitlist-item-card--promoted' : ''}`}
              >
                {/* Status Ribbon / Top Header */}
                <div className="waitlist-item-card__top">
                  <div className="waitlist-item-card__tags">
                    <span className="workshop-card__category">
                      {item.workshop?.category || 'Workshop'}
                    </span>
                    {isPromoted ? (
                      <span className="waitlist-badge waitlist-badge--promoted">
                        Đã chuyển thành vé chính thức
                      </span>
                    ) : (
                      <span className="waitlist-badge waitlist-badge--waiting">
                        Đang chờ xếp chỗ
                      </span>
                    )}
                  </div>

                  {!isPromoted && (
                    <div className="waitlist-position-badge">
                      <small>Vị trí hàng đợi</small>
                      <strong>#{item.waitlistPosition}</strong>
                    </div>
                  )}
                </div>

                {/* Body Content */}
                <div className="waitlist-item-card__body">
                  <h3 className="waitlist-item-card__title">
                    <Link to={`/workshops/${item.workshopId}`}>{item.workshopTitle}</Link>
                  </h3>

                  <div className="waitlist-item-card__meta">
                    <div>
                      <span>📅</span>
                      <span>
                        {item.workshop?.date} · {item.workshop?.time}
                      </span>
                    </div>
                    <div>
                      <span>📍</span>
                      <span>{item.workshop?.location || 'Phòng hội thảo'}</span>
                    </div>
                    <div>
                      <span>🏢</span>
                      <span>{item.workshop?.organizer}</span>
                    </div>
                  </div>

                  {/* Dynamic Status Box */}
                  {isPromoted ? (
                    <div className="waitlist-promoted-box">
                      <div className="waitlist-promoted-box__header">
                        <div>
                          <strong>Chúc mừng! Bạn đã nhận được vé chính thức</strong>
                          <p>
                            Do có người tham gia hủy vé, hệ thống đã tự động chuyển lượt chờ của bạn
                            thành vé chính thức.
                          </p>
                        </div>
                      </div>

                      <div className="promoted-ticket-info">
                        <div>
                          <small>MÃ VÉ CỦA BẠN</small>
                          <strong>{item.ticketCode}</strong>
                        </div>
                        <Link to="/check-in" className="promoted-checkin-link">
                          Mở mã QR Check-in →
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="waitlist-queue-box">
                      <div className="waitlist-queue-header">
                        <span>Tiến độ hàng đợi</span>
                        <strong>Vị trí #{item.waitlistPosition} trong hàng đợi</strong>
                      </div>
                      <div className="waitlist-queue-bar">
                        <div
                          className="waitlist-queue-fill"
                          style={{
                            width: `${Math.max(15, 100 - (item.waitlistPosition - 1) * 25)}%`,
                          }}
                        />
                      </div>
                      <p className="waitlist-queue-hint">
                        Hệ thống sẽ tự động gửi thông báo và chuyển vé khi có vị trí trống.
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="waitlist-item-card__footer">
                  <Link
                    to={`/workshops/${item.workshopId}`}
                    className="waitlist-btn waitlist-btn--secondary"
                  >
                    Xem chi tiết Workshop
                  </Link>

                  {!isPromoted && (
                    <button
                      type="button"
                      className="waitlist-btn waitlist-btn--danger"
                      onClick={() => {
                        setSelectedEntry(item);
                        setShowCancelModal(true);
                      }}
                    >
                      Rút khỏi danh sách chờ
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal to Leave Waitlist */}
      {showCancelModal && selectedEntry && (
        <div className="waitlist-modal__overlay">
          <div className="waitlist-modal">
            <button
              className="waitlist-modal__close"
              type="button"
              onClick={() => setShowCancelModal(false)}
            >
              ×
            </button>

            <h2>Xác nhận rút khỏi danh sách chờ</h2>
            <p>
              Bạn có chắc chắn muốn hủy vị trí chờ <strong>#{selectedEntry.waitlistPosition}</strong>{' '}
              cho Workshop <strong>"{selectedEntry.workshopTitle}"</strong>?
            </p>

            <div className="waitlist-modal__note" style={{ background: '#fff8f5' }}>
              <p>
                Sau khi rút, bạn sẽ mất số thứ tự ưu tiên hiện tại. Vị trí này sẽ được nhường lại cho
                những người đăng ký phía sau.
              </p>
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label htmlFor="leave-reason">Lý do hủy (Tùy chọn)</label>
              <input
                id="leave-reason"
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="VD: Không còn sắp xếp được thời gian tham gia..."
              />
            </div>

            <div className="waitlist-modal__actions">
              <button
                type="button"
                className="waitlist-modal__cancel"
                onClick={() => setShowCancelModal(false)}
                disabled={isProcessing}
              >
                Giữ vị trí chờ
              </button>
              <button
                type="button"
                className="waitlist-modal__confirm"
                style={{ background: '#c54a32', borderColor: '#c54a32' }}
                onClick={handleLeaveWaitlist}
                disabled={isProcessing}
              >
                {isProcessing ? 'Đang xử lý...' : 'Xác nhận Rút'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WaitlistPage;
