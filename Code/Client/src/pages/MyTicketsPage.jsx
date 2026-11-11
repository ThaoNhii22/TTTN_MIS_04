import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../components/ui/Modal';
import { useToast } from '../context/useToast';
import { cancelRegistration, getMyRegistrations } from '../services/registrationService';
import { submitSurvey } from '../services/surveyService';

function MyTicketsPage() {
  const toast = useToast();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Cancel Modal State
  const [selectedReg, setSelectedReg] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Bận lịch cá nhân đột xuất');

  // Survey Modal State
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [surveyRating, setSurveyRating] = useState(5);
  const [surveyFeedback, setSurveyFeedback] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
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
        toast.apiError(err, 'Không thể tải danh sách vé của bạn.');
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
  }, [reloadKey, toast]);

  const handleCancel = async (e) => {
    if (e) e.preventDefault();
    if (!selectedReg) return;
    setIsProcessing(true);

    try {
      await cancelRegistration(selectedReg.registration_id, cancelReason);
      setShowCancelModal(false);
      toast.success(`Đã hủy vé tham gia Workshop "${selectedReg.workshop_title}" thành công.`);
      setSelectedReg(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.apiError(err, 'Không thể hủy vé đăng ký.');
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
        answers: {},
        feedback: surveyFeedback.trim(),
      });
      setShowSurveyModal(false);
      toast.success('Đã gửi đánh giá khảo sát thành công. Cảm ơn ý kiến quý báu của bạn!');
      setSelectedReg(null);
      setRegistrations((prev) =>
        prev.map((r) =>
          r.registration_id === selectedReg.registration_id
            ? { ...r, is_survey_available: false }
            : r
        )
      );
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.apiError(err, 'Gửi khảo sát đánh giá thất bại.');
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
            Xem danh sách vé tham gia, vị trí hàng đợi và gửi khảo sát đánh giá sau khi hoàn thành.
          </p>
        </div>
        <Link to="/workshops" className="home-page__primary-button">
          + Khám phá thêm Workshop
        </Link>
      </div>

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
                  <p>🕒 <strong>Thời gian:</strong> {new Date(t.workshop_start_at).toLocaleString('vi-VN')}</p>
                  <p>📍 <strong>Địa điểm:</strong> {t.workshop_location}</p>
                  <p>📅 <strong>Đăng ký lúc:</strong> {new Date(t.registered_at).toLocaleString('vi-VN')}</p>
                </div>

                <div className="ticket-actions" style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {t.is_cancellable && (
                    <button
                      type="button"
                      className="btn-danger-outline"
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                      onClick={() => {
                        setSelectedReg(t);
                        setCancelReason('Bận việc cá nhân đột xuất');
                        setShowCancelModal(true);
                      }}
                    >
                      Hủy vé
                    </button>
                  )}

                  {t.is_survey_available && (
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
      <Modal
        isOpen={showCancelModal && !!selectedReg}
        onClose={() => !isProcessing && setShowCancelModal(false)}
        title="Xác nhận Hủy Vé Tham gia"
        subtitle={`Workshop: ${selectedReg?.workshop_title}`}
        size="md"
      >
        <form onSubmit={handleCancel}>
          <div className="form-group">
            <label>Lý do hủy vé *</label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Nhập lý do hủy vé..."
              rows="3"
              required
            />
          </div>

          <div
            style={{
              display: 'flex',
              gap: '8px',
              padding: '12px 14px',
              borderRadius: '8px',
              background: '#fffbeb',
              color: '#92400e',
              fontSize: '13px',
              margin: '14px 0',
            }}
          >
            <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>Khi bạn hủy vé chính thức, hệ thống sẽ tự động chuyển nhượng vị trí trống cho người đầu tiên trong Danh sách chờ.</span>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowCancelModal(false)}
              disabled={isProcessing}
            >
              Giữ lại vé
            </button>
            <button
              type="submit"
              className="btn-danger"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <span className="btn-loading-wrapper">
                  <span className="mini-spinner" /> Đang hủy...
                </span>
              ) : (
                'Xác nhận Hủy vé'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Khảo sát */}
      <Modal
        isOpen={showSurveyModal && !!selectedReg}
        onClose={() => !isProcessing && setShowSurveyModal(false)}
        title="Khảo sát và Đánh giá Workshop"
        subtitle={`Workshop: ${selectedReg?.workshop_title}`}
        size="md"
      >
        <form onSubmit={handleSurveySubmit}>
          <div className="form-group" style={{ margin: '8px 0 16px' }}>
            <label>Đánh giá mức độ hài lòng:</label>
            <div className="star-rating-selector" style={{ marginTop: '8px' }}>
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
              <span style={{ marginLeft: '10px', fontWeight: 'bold', color: '#c2410c' }}>{surveyRating}/5 sao</span>
            </div>
          </div>

          <div className="form-group">
            <label>Ý kiến nhận xét và Đóng góp:</label>
            <textarea
              value={surveyFeedback}
              onChange={(e) => setSurveyFeedback(e.target.value)}
              placeholder="Chia sẻ trải nghiệm học tập, sự tổ chức, diễn giả..."
              rows="4"
            />
          </div>

          <div className="modal-actions" style={{ marginTop: '20px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowSurveyModal(false)}
              disabled={isProcessing}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="home-page__primary-button"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <span className="btn-loading-wrapper">
                  <span className="mini-spinner" /> Đang gửi...
                </span>
              ) : (
                'Gửi đánh giá'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

export default MyTicketsPage;
