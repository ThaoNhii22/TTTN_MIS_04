import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../components/ui/Modal';
import { useToast } from '../context/useToast';
import { cancelRegistration, getMyRegistrations } from '../services/registrationService';

function WaitlistPage() {
  const toast = useToast();
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Leave Waitlist Modal
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Không thể sắp xếp thời gian tham gia');
  const [isProcessing, setIsProcessing] = useState(false);
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
        toast.apiError(err, 'Không thể tải danh sách chờ của bạn.');
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
  }, [reloadKey, toast]);

  const handleLeaveWaitlist = async (e) => {
    if (e) e.preventDefault();
    if (!selectedEntry) return;
    setIsProcessing(true);

    try {
      await cancelRegistration(selectedEntry.registration_id, cancelReason);
      setShowCancelModal(false);
      toast.success(`Đã rút khỏi Danh sách chờ cho Workshop "${selectedEntry.workshop_title}".`);
      setSelectedEntry(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.apiError(err, 'Không thể rút khỏi danh sách chờ.');
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

      {loading ? (
        <div className="state-card state-card--loading" style={{ margin: '60px auto', textAlign: 'center' }}>
          <div className="state-card__spinner" />
          <p style={{ marginTop: '12px' }}>Đang tải hàng đợi của bạn...</p>
        </div>
      ) : waitlistEntries.length === 0 ? (
        <div className="workshop-empty">
          <div className="workshop-empty__icon">W</div>
          <h2>Bạn hiện không ở trong danh sách chờ nào</h2>
          <p>Khi đăng ký một workshop đã kín chỗ, bạn có thể chọn vào danh sách chờ để tự động nhận vé khi có người hủy.</p>
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
                <p>📍 <strong>Địa điểm:</strong> {item.workshop_location}</p>
                <p>🕒 <strong>Thời gian sự kiện:</strong> {new Date(item.workshop_start_at).toLocaleString('vi-VN')}</p>
                <p style={{ fontSize: '12px', color: '#886255' }}>
                  📅 Ghi danh hàng đợi lúc: {new Date(item.registered_at).toLocaleString('vi-VN')}
                </p>
              </div>

              <div className="waitlist-entry-actions">
                <button
                  type="button"
                  className="btn-danger-outline"
                  onClick={() => {
                    setSelectedEntry(item);
                    setCancelReason('Không thể sắp xếp thời gian tham gia');
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
      <Modal
        isOpen={showCancelModal && !!selectedEntry}
        onClose={() => !isProcessing && setShowCancelModal(false)}
        title="Rút khỏi Danh sách chờ"
        subtitle={`Workshop: ${selectedEntry?.workshop_title}`}
        size="md"
      >
        <form onSubmit={handleLeaveWaitlist}>
          <div className="form-group">
            <label>Lý do rút khỏi hàng đợi:</label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Nhập lý do rút lui..."
              rows="3"
            />
          </div>

          <div
            style={{
              display: 'flex',
              gap: '8px',
              padding: '12px 14px',
              borderRadius: '8px',
              background: '#fef2f2',
              color: '#991b1b',
              fontSize: '13px',
              margin: '14px 0',
            }}
          >
            <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Khi rút khỏi hàng đợi, vị trí #{selectedEntry?.waitlist_position} của bạn sẽ bị hủy bỏ và không thể khôi phục.</span>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowCancelModal(false)}
              disabled={isProcessing}
            >
              Giữ lại vị trí
            </button>
            <button
              type="submit"
              className="btn-danger"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <span className="btn-loading-wrapper">
                  <span className="mini-spinner" /> Đang xử lý...
                </span>
              ) : (
                'Xác nhận Rút lui'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default WaitlistPage;
