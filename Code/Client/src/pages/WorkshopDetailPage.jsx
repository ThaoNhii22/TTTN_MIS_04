import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/useToast';
import { cancelRegistration, getMyRegistrations, registerWorkshop } from '../services/registrationService';
import { submitSurvey } from '../services/surveyService';
import { getWorkshopById } from '../services/workshopService';
import { formatDateTime, getWorkshopLifecycle } from '../utils/workshopStatus';

function WorkshopDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, role } = useAuth();
  const toast = useToast();

  const [workshop, setWorkshop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myRegistration, setMyRegistration] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Cập nhật trạng thái tự động theo thời gian thực (15s/lần), dọn timer khi unmount
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Registration Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [acceptWaitlist, setAcceptWaitlist] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cancel Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Bận lịch cá nhân đột xuất');

  // Survey Modal State
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [surveyRating, setSurveyRating] = useState(5);
  const [surveyFeedback, setSurveyFeedback] = useState('');
  const [surveySubmitted, setSurveySubmitted] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function loadDetail() {
      setLoading(true);
      try {
        const data = await getWorkshopById(id);
        if (!ignore) {
          setWorkshop(data);
        }

        if (isAuthenticated) {
          const myRegs = await getMyRegistrations();
          if (!ignore) {
            const found = myRegs.find((r) => r.workshop_id === Number(id));
            setMyRegistration(found || null);
          }
        }
      } catch (err) {
        console.error('Error fetching workshop detail:', err);
        if (!ignore) {
          toast.apiError(err, 'Không tìm thấy thông tin Workshop.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadDetail();
    return () => {
      ignore = true;
    };
  }, [id, isAuthenticated, reloadKey, toast]);

  const handleRegister = async (e) => {
    if (e) e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await registerWorkshop({
        workshop_id: Number(id),
        accept_waitlist: acceptWaitlist,
      });

      setShowRegisterModal(false);
      if (result.status === 'confirmed') {
        toast.success('Đăng ký thành công! Bạn đã được cấp vé tham dự chính thức.');
      } else if (result.status === 'waitlist') {
        toast.info(`Bạn đã được ghi danh vào Danh sách chờ ở vị trí #${result.waitlist_position}.`);
      }
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.apiError(err, 'Đăng ký Workshop không thành công.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRegistration = async (e) => {
    if (e) e.preventDefault();
    if (!myRegistration) return;

    setIsSubmitting(true);

    try {
      await cancelRegistration(myRegistration.registration_id, cancelReason);
      setShowCancelModal(false);
      toast.success('Đã hủy đăng ký vé thành công.');
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.apiError(err, 'Hủy đăng ký vé thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitSurvey = async (e) => {
    if (e) e.preventDefault();
    if (!myRegistration) return;

    setIsSubmitting(true);

    try {
      await submitSurvey({
        registration_id: myRegistration.registration_id,
        rating: Number(surveyRating),
        answers: {},
        feedback: surveyFeedback.trim(),
      });
      setShowSurveyModal(false);
      setSurveySubmitted(true);
      setMyRegistration((prev) => (prev ? { ...prev, is_survey_available: false } : null));
      toast.success('Cảm ơn bạn đã gửi ý kiến đánh giá khảo sát thành công!');
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.apiError(err, 'Gửi khảo sát đánh giá thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="state-card state-card--loading" style={{ margin: '80px auto', textAlign: 'center' }}>
        <div className="state-card__spinner" />
        <p style={{ marginTop: '14px' }}>Đang tải chi tiết Workshop...</p>
      </div>
    );
  }

  if (!workshop) {
    return (
      <div className="workshop-empty" style={{ margin: '60px auto' }}>
        <h2>Không tìm thấy Workshop</h2>
        <p>Sự kiện không tồn tại hoặc đã bị xóa khỏi hệ thống.</p>
        <Link to="/workshops" className="home-page__primary-button">Quay lại danh sách</Link>
      </div>
    );
  }

  const fillPercent = Math.min(100, Math.round((workshop.confirmed_count / workshop.quota) * 100));
  const remaining = Math.max(0, workshop.quota - workshop.confirmed_count);

  // Vòng đời Workshop thống nhất theo chuẩn UTC
  const lifecycle = getWorkshopLifecycle(workshop, currentTime);
  const isEnded = lifecycle.isEnded;
  const isOngoing = lifecycle.isOngoing;

  return (
    <div className="workshop-detail-page">
      <div className="breadcrumb" style={{ marginBottom: '16px', fontSize: '13px', color: '#886255' }}>
        <Link to="/workshops" style={{ color: '#886255', textDecoration: 'none' }}>← Quay lại danh sách</Link>
      </div>

      <div className="detail-layout">
        {/* Main Content */}
        <div className="detail-main">
          <div className="detail-header">
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <span className={`status-tag ${lifecycle.badgeClass}`}>
                {lifecycle.label.toUpperCase()}
              </span>
              {!isEnded && workshop.is_full && (
                <span className="status-tag status-tag--full">ĐÃ HẾT CHỖ</span>
              )}
            </div>

            <h1>{workshop.title}</h1>

            <div className="detail-organizer">
              <span>Đơn vị tổ chức: <strong>{workshop.organizer?.full_name || 'Ban tổ chức'}</strong> - {workshop.organizer?.email}</span>
            </div>
          </div>

          <div className="detail-section">
            <h2>Mô tả Workshop</h2>
            <p style={{ lineHeight: '1.7', whiteSpace: 'pre-line', color: '#4a3832' }}>
              {workshop.description || 'Chưa có mô tả chi tiết cho workshop này.'}
            </p>
          </div>

          <div className="detail-section">
            <h2>Thông tin lịch trình và điểm danh</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Thời gian bắt đầu:</span>
                <strong>{formatDateTime(workshop.start_at)}</strong>
              </div>
              <div className="info-item">
                <span className="info-label">Thời gian kết thúc:</span>
                <strong>{formatDateTime(workshop.end_at)}</strong>
              </div>
              <div className="info-item">
                <span className="info-label">Địa điểm tổ chức:</span>
                <strong>{workshop.location}</strong>
              </div>
              <div className="info-item">
                <span className="info-label">Khung giờ điểm danh:</span>
                <strong>
                  {workshop.checkin_start_at ? formatDateTime(workshop.checkin_start_at) : '--'} - {workshop.checkin_end_at ? formatDateTime(workshop.checkin_end_at) : '--'}
                </strong>
              </div>
            </div>
          </div>

          {/* User's Active Registration / Ticket Card */}
          {myRegistration && myRegistration.status !== 'cancelled' && (
            <div className="user-ticket-card">
              <div className="user-ticket-card__header">
                <h3>Vé tham gia của bạn</h3>
                <span className={`status-tag status-tag--${myRegistration.status}`}>
                  {myRegistration.status === 'confirmed' && 'Xác nhận tham gia'}
                  {myRegistration.status === 'waitlist' && (
                    isEnded
                      ? 'Hàng đợi (Đã kết thúc)'
                      : `Hàng đợi #${myRegistration.waitlist_position}`
                  )}
                  {myRegistration.status === 'attended' && 'Đã tham dự'}
                </span>
              </div>

              <div className="user-ticket-card__body">
                <p>Mã đăng ký: <code>REG-{myRegistration.registration_id}</code></p>
                <p>Đăng ký lúc: {formatDateTime(myRegistration.registered_at)}</p>

                {/* Thông báo rõ khi waitlist đã hết hạn */}
                {myRegistration.status === 'waitlist' && isEnded && (
                  <div className="alert-banner alert-banner--warning" style={{ marginTop: '12px' }}>
                    Sự kiện đã kết thúc. Vị trí hàng đợi này không còn hiệu lực — không có vé nào được đôn thêm.
                  </div>
                )}

                {myRegistration.qr_payload && (
                  <div className="qr-code-box">
                    <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>Mã QR điểm danh cá nhân:</p>
                    <div className="qr-display-badge">
                      <code>{myRegistration.qr_payload}</code>
                    </div>
                    <small style={{ display: 'block', marginTop: '6px', color: '#7a5b50' }}>
                      Xuất trình mã này tại bàn đón tiếp để quét QR điểm danh
                    </small>
                  </div>
                )}

                <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                  {myRegistration.is_cancellable && (
                    <button
                      type="button"
                      className="btn-danger-outline"
                      onClick={() => setShowCancelModal(true)}
                    >
                      Hủy đăng ký vé
                    </button>
                  )}

                  {myRegistration.status === 'attended' && (myRegistration.is_survey_available || surveySubmitted) && (
                    <button
                      type="button"
                      className="home-page__primary-button"
                      onClick={() => !surveySubmitted && setShowSurveyModal(true)}
                      disabled={surveySubmitted}
                    >
                      {surveySubmitted ? 'Đã gửi khảo sát' : 'Làm khảo sát đánh giá'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Quota & Actions */}
        <div className="detail-sidebar">
          <div className="quota-widget">
            <h3>Tình trạng chỗ</h3>
            <div className="quota-number">
              <strong>{workshop.confirmed_count}</strong> / {workshop.quota}
            </div>

            <div className="workshop-card__progress" style={{ margin: '14px 0' }}>
              <span style={{ width: `${fillPercent}%` }} />
            </div>

            {/* Nếu workshop đã kết thúc: hiện banner kết thúc, ẩn hành động đăng ký */}
            {isEnded ? (
              <div className="alert-banner alert-banner--warning" style={{ marginTop: '8px' }}>
                <div>
                  <strong>Sự kiện đã kết thúc</strong>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>
                    Kết thúc lúc {formatDateTime(workshop.end_at)}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <p style={{ fontSize: '13px', color: '#7a5b50', margin: '8px 0' }}>
                  {workshop.is_full
                    ? 'Workshop đã hết chỗ chính thức. Bạn có thể đăng ký vào Hàng đợi.'
                    : `Còn lại ${remaining} chỗ trống.`}
                </p>

                {workshop.waitlist_count > 0 && (
                  <div className="waitlist-indicator">
                    Hiện có <strong>{workshop.waitlist_count}</strong> người trong danh sách chờ.
                  </div>
                )}

                {/* Hành động Đăng ký và Thông báo chỉ dành cho Người tham gia */}
                {(!role || role === 'participant') && (
                  <>
                    {workshop.status === 'published' && (!myRegistration || myRegistration.status === 'cancelled') && (
                      <button
                        type="button"
                        className="home-page__primary-button"
                        style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}
                        onClick={() => {
                          setAcceptWaitlist(workshop.is_full);
                          setShowRegisterModal(true);
                        }}
                      >
                        {workshop.is_full ? 'Đăng ký vào Danh sách chờ' : 'Đăng ký tham gia ngay'}
                      </button>
                    )}

                    {workshop.status !== 'published' && (
                      <div className="alert-banner alert-banner--warning" style={{ marginTop: '16px' }}>
                        Workshop hiện không mở đăng ký.
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal Đăng ký Workshop */}
      <Modal
        isOpen={showRegisterModal}
        onClose={() => !isSubmitting && setShowRegisterModal(false)}
        title="Xác nhận Đăng ký Workshop"
        subtitle={`Sự kiện: ${workshop.title}`}
        size="md"
      >
        <div className="modal-info-box">
          <p>📍 <strong>Địa điểm:</strong> {workshop.location}</p>
          <p>🕒 <strong>Thời gian:</strong> {formatDateTime(workshop.start_at)}</p>
          <p>👤 <strong>Người đăng ký:</strong> {user?.full_name} ({user?.email})</p>
        </div>

        {workshop.is_full && (
          <div
            style={{
              display: 'flex',
              gap: '10px',
              padding: '12px 14px',
              borderRadius: '8px',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              color: '#92400e',
              fontSize: '13px',
              margin: '14px 0',
            }}
          >
            <input
              type="checkbox"
              id="waitlist-check"
              checked={acceptWaitlist}
              onChange={(e) => setAcceptWaitlist(e.target.checked)}
              style={{ marginTop: '2px' }}
            />
            <label htmlFor="waitlist-check" style={{ cursor: 'pointer', lineHeight: '1.4' }}>
              Workshop đã hết chỗ chính thức. Tôi đồng ý ghi danh vào <strong>Danh sách chờ (Waitlist)</strong> để tự động nhận vé khi có người hủy.
            </label>
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: '20px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowRegisterModal(false)}
            disabled={isSubmitting}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            className="home-page__primary-button"
            onClick={handleRegister}
            disabled={isSubmitting || (workshop.is_full && !acceptWaitlist)}
          >
            {isSubmitting ? (
              <span className="btn-loading-wrapper">
                <span className="mini-spinner" /> Đang xử lý...
              </span>
            ) : (
              'Xác nhận Đăng ký'
            )}
          </button>
        </div>
      </Modal>

      {/* Modal Hủy Đăng ký Vé */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => !isSubmitting && setShowCancelModal(false)}
        title="Hủy Vé Tham gia Workshop"
        subtitle={`Sự kiện: ${workshop.title}`}
        size="md"
      >
        <form onSubmit={handleCancelRegistration}>
          <div className="form-group">
            <label>Lý do hủy vé *</label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Nhập lý do hủy vé tham dự..."
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
            <span>Sau khi hủy, chỗ của bạn sẽ được chuyển nhượng ngay cho người đầu tiên trong Hàng đợi (nếu có).</span>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowCancelModal(false)}
              disabled={isSubmitting}
            >
              Đóng
            </button>
            <button
              type="submit"
              className="btn-danger"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="btn-loading-wrapper">
                  <span className="mini-spinner" /> Đang hủy...
                </span>
              ) : (
                'Xác nhận Hủy'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Khảo sát Đánh giá */}
      <Modal
        isOpen={showSurveyModal}
        onClose={() => !isSubmitting && setShowSurveyModal(false)}
        title="Đánh giá và Khảo sát Workshop"
        subtitle={`Sự kiện: ${workshop.title}`}
        size="md"
      >
        <form onSubmit={handleSubmitSurvey}>
          <div className="form-group" style={{ margin: '8px 0 16px' }}>
            <label>Mức độ hài lòng chung từ 1 đến 5 sao:</label>
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
            <label>Ý kiến đóng góp và Phản hồi:</label>
            <textarea
              value={surveyFeedback}
              onChange={(e) => setSurveyFeedback(e.target.value)}
              placeholder="Nội dung workshop, giảng viên, tổ chức..."
              rows="4"
            />
          </div>

          <div className="modal-actions" style={{ marginTop: '20px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowSurveyModal(false)}
              disabled={isSubmitting}
            >
              Đóng
            </button>
            <button
              type="submit"
              className="home-page__primary-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
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
    </div>
  );
}

export default WorkshopDetailPage;
