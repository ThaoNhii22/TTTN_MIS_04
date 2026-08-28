import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cancelRegistration, getMyRegistrations } from '../services/registrationService';

function WaitlistPage() {
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Leave Waitlist Modal
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Không thể tham gia nữa');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionAlert, setActionAlert] = useState(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function fetchWaitlists() {
      setLoading(true);
      try {
        const data = await getMyRegistrations();
        if (!ignore) {
          const waitlists = data.filter((r) => r.status === 'waitlist');
          setWaitlistEntries(waitlists);
        }
      } catch (err) {
        console.error('Error fetching waitlists:', err);
        if (!ignore) {
          setActionAlert({
            type: 'error',
            message: 'Không thể tải danh sách chờ. Vui lòng thử lại.',
          });
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    fetchWaitlists();
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const handleLeaveWaitlist = async () => {
    if (!selectedEntry) return;
    setIsProcessing(true);

    try {
      await cancelRegistration(selectedEntry.registration_id, cancelReason);
      setShowCancelModal(false);
      setSelectedEntry(null);
      setActionAlert({
        type: 'success',
        message: `Đã rút khỏi Danh sách chờ cho Workshop "${selectedEntry.workshop_title}".`,
      });
      setReloadKey((k) => k + 1);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setActionAlert({
        type: 'error',
        message: typeof detail === 'string' ? detail : 'Không thể rút khỏi danh sách chờ.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="waitlist-page">
      <div className="waitlist-page__header">
        <div>
          <h1>Danh sách chờ của bạn</h1>
          <p className="waitlist-page__subtitle">
            Theo dõi vị trí hàng đợi. Khi có người hủy vé chính thức, hệ thống sẽ tự động đôn người đầu danh sách lên vé chính thức.
          </p>
        </div>

        <Link to="/workshops" className="home-page__primary-button">
          + Xem Workshop khác
        </Link>
      </div>

      {actionAlert && (
        <div className={`alert-banner alert-banner--${actionAlert.type}`} style={{ marginBottom: '20px' }}>
          <div>{actionAlert.message}</div>
        </div>
      )}

      {loading ? (
        <div className="state-card state-card--loading" style={{ margin: '60px auto', textAlign: 'center' }}>
          <div className="state-card__spinner" />
          <p style={{ marginTop: '12px' }}>Đang tải hàng đợi của bạn...</p>
        </div>
      ) : waitlistEntries.length === 0 ? (
        <div className="workshop-empty">
          <div className="workshop-empty__icon">W</div>
          <h2>Bạn hiện không ở trong danh sách chờ nào</h2>
          <p>Khi đăng ký một workshop đã kín chỗ, bạn có thể chọn vào danh sách chờ.</p>
          <Link to="/workshops" className="home-page__primary-button" style={{ marginTop: '16px' }}>
            Khám phá Workshop
          </Link>
        </div>
      ) : (
        <div className="waitlist-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {waitlistEntries.map((item) => (
            <div className="waitlist-entry-card" key={item.registration_id}>
              <div className="waitlist-entry-position">
                <span className="queue-number">#{item.waitlist_position}</span>
                <small>Vị trí hàng đợi</small>
              </div>

              <div className="waitlist-entry-details">
                <h3>
                  <Link to={`/workshops/${item.workshop_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {item.workshop_title}
                  </Link>
                </h3>
                <p>Địa điểm: {item.workshop_location}</p>
                <p>Thời gian sự kiện: {new Date(item.workshop_start_at).toLocaleString('vi-VN')}</p>
                <p style={{ fontSize: '12px', color: '#886255' }}>
                  Ghi danh lúc: {new Date(item.registered_at).toLocaleString('vi-VN')}
                </p>
              </div>

              <div className="waitlist-entry-actions">
                <button
                  type="button"
                  className="btn-danger-outline"
                  onClick={() => {
                    setSelectedEntry(item);
                    setShowCancelModal(true);
                  }}
                >
                  Rút khỏi hàng đợi
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Leave Waitlist */}
      {showCancelModal && selectedEntry && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2>Rút khỏi Danh sách chờ</h2>
            <p>Bạn có chắc chắn muốn hủy vị trí hàng đợi cho <strong>{selectedEntry.workshop_title}</strong>?</p>

            <div className="form-group" style={{ marginTop: '14px' }}>
              <label>Lý do rút lui:</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do..."
                rows="3"
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowCancelModal(false)}
                disabled={isProcessing}
              >
                Đóng
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleLeaveWaitlist}
                disabled={isProcessing}
              >
                {isProcessing ? 'Đang xử lý...' : 'Xác nhận Rút lui'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WaitlistPage;
