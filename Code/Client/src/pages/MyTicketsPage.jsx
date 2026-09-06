import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cancelRegistration, getMyRegistrations } from '../services/registrationService';
import { submitSurvey } from '../services/surveyService';

function MyTicketsPage() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Cancel Modal State
  const [selectedReg, setSelectedReg] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Bận lịch cá nhân');

  // Survey Modal State
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [surveyRating, setSurveyRating] = useState(5);
  const [surveyFeedback, setSurveyFeedback] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function loadTickets() {
      setLoading(true);
      try {
        const data = await getMyRegistrations();
        if (!ignore) {
          setRegistrations(data);
        }
      } catch (err) {
        console.error('Error fetching my tickets:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadTickets();
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const handleCancel = async (e) => {
    if (e) e.preventDefault();
    if (!selectedReg) return;
    setIsProcessing(true);

    try {
      await cancelRegistration(selectedReg.registration_id, cancelReason);
      setShowCancelModal(false);
      setSelectedReg(null);
      setActionMessage({ type: 'success', text: 'Đã hủy vé tham gia thành công.' });
      setReloadKey((k) => k + 1);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setActionMessage({ type: 'error', text: typeof detail === 'string' ? detail : 'Không thể hủy vé.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSurveySubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedReg) return;
    setIsProcessing(true);

    try {
      await submitSurvey({
        registration_id: selectedReg.registration_id,
        rating: Number(surveyRating),
        feedback: surveyFeedback.trim(),
      });
      setShowSurveyModal(false);
      setSelectedReg(null);
      setActionMessage({ type: 'success', text: 'Đã gửi khảo sát thành công. Cảm ơn bạn đã đóng góp ý kiến.' });
      setReloadKey((k) => k + 1);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setActionMessage({ type: 'error', text: typeof detail === 'string' ? detail : 'Gửi khảo sát thất bại.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredTickets = registrations.filter((r) => {
    if (selectedFilter === 'confirmed') return r.status === 'confirmed';
    if (selectedFilter === 'waitlist') return r.status === 'waitlist';
    if (selectedFilter === 'attended') return r.status === 'attended';
    if (selectedFilter === 'cancelled') return r.status === 'cancelled';
    return true;
  });

  return (
    <section className="my-tickets-page">
      <div className="home-page__header">
        <div>
          <h1>Vé và Lịch sử Đăng ký của bạn</h1>
          <p className="home-page__subtitle">
            Xem danh sách vé tham gia, trạng thái đăng ký và gửi khảo sát đánh giá sau khi tham dự.
          </p>
        </div>
        <Link to="/workshops" className="home-page__primary-button">
          + Khám phá thêm Workshop
        </Link>
      </div>

      {actionMessage && (
        <div className={`alert-banner alert-banner--${actionMessage.type}`} style={{ marginBottom: '20px' }}>
          <div>{actionMessage.text}</div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="filter-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'Tất cả' },
          { key: 'confirmed', label: 'Vé chính thức' },
          { key: 'waitlist', label: 'Hàng đợi' },
          { key: 'attended', label: 'Đã tham dự' },
          { key: 'cancelled', label: 'Đã hủy' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tab-btn ${selectedFilter === tab.key ? 'active' : ''}`}
            onClick={() => setSelectedFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="state-card state-card--loading" style={{ margin: '60px auto', textAlign: 'center' }}>
          <div className="state-card__spinner" />
          <p style={{ marginTop: '12px' }}>Đang tải danh sách vé...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="workshop-empty">
          <div className="workshop-empty__icon">W</div>
          <h2>Không có lượt đăng ký nào</h2>
          <p>Bạn chưa có vé hoặc lượt đăng ký nào trong mục này.</p>
          <Link to="/workshops" className="home-page__primary-button" style={{ marginTop: '16px' }}>
            Tìm Workshop ngay
          </Link>
        </div>
      ) : (
        <div className="tickets-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {filteredTickets.map((t) => (
            <div className="ticket-card" key={t.registration_id}>
              <div className="ticket-card__header">
                <span className={`status-tag status-tag--${t.status}`}>
                  {t.status === 'confirmed' && 'Vé chính thức'}
                  {t.status === 'waitlist' && `Hàng đợi #${t.waitlist_position}`}
                  {t.status === 'attended' && 'Đã tham dự'}
                  {t.status === 'cancelled' && 'Đã hủy'}
                </span>
                <small style={{ color: '#886255' }}>REG-{t.registration_id}</small>
              </div>

              <div className="ticket-card__body">
                <h3>
                  <Link to={`/workshops/${t.workshop_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {t.workshop_title}
                  </Link>
                </h3>

                <div className="ticket-meta" style={{ margin: '12px 0', fontSize: '13px', color: '#6d4336' }}>
                  <p>Thời gian: {new Date(t.workshop_start_at).toLocaleString('vi-VN')}</p>
                  <p>Địa điểm: {t.workshop_location}</p>
                  <p>Đăng ký lúc: {new Date(t.registered_at).toLocaleString('vi-VN')}</p>
                </div>



                <div className="ticket-actions" style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                  {t.is_cancellable && (
                    <button
                      type="button"
                      className="btn-danger-outline"
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                      onClick={() => {
                        setSelectedReg(t);
                        setShowCancelModal(true);
                      }}
                    >
                      Hủy vé
                    </button>
                  )}

                  {t.status === 'attended' && (
                    <button
                      type="button"
                      className="home-page__primary-button"
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                      onClick={() => {
                        setSelectedReg(t);
                        setShowSurveyModal(true);
                      }}
                    >
                      Đánh giá khảo sát
                    </button>
                  )}

                  <Link
                    to={`/workshops/${t.workshop_id}`}
                    className="btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 12px', textDecoration: 'none' }}
                  >
                    Xem chi tiết
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Hủy Vé */}
      {showCancelModal && selectedReg && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2>Xác nhận Hủy Vé</h2>
            <p>Hủy đăng ký cho: <strong>{selectedReg.workshop_title}</strong></p>

            <div className="form-group" style={{ marginTop: '14px' }}>
              <label>Lý do hủy:</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do..."
                rows="3"
                required
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
                onClick={handleCancel}
                disabled={isProcessing}
              >
                {isProcessing ? 'Đang xử lý...' : 'Xác nhận Hủy vé'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Khảo sát */}
      {showSurveyModal && selectedReg && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2>Khảo sát và Đánh giá Workshop</h2>
            <p><strong>{selectedReg.workshop_title}</strong></p>

            <form onSubmit={handleSurveySubmit}>
              <div className="form-group" style={{ margin: '16px 0' }}>
                <label>Đánh giá chất lượng:</label>
                <div className="star-rating-selector">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      className={`star-btn ${surveyRating >= star ? 'active' : ''}`}
                      onClick={() => setSurveyRating(star)}
                    >
                      ★
                    </button>
                  ))}
                  <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>{surveyRating}/5 sao</span>
                </div>
              </div>

              <div className="form-group">
                <label>Ý kiến nhận xét và Đóng góp:</label>
                <textarea
                  value={surveyFeedback}
                  onChange={(e) => setSurveyFeedback(e.target.value)}
                  placeholder="Chia sẻ trải nghiệm học tập của bạn..."
                  rows="4"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowSurveyModal(false)}
                  disabled={isProcessing}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="home-page__primary-button"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Đang gửi...' : 'Gửi khảo sát'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default MyTicketsPage;
