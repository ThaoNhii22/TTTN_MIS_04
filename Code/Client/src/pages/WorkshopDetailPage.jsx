import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getWorkshopById } from '../services/workshopService';
import { cancelRegistration, getMyRegistrations, registerWorkshop } from '../services/registrationService';
import { submitSurvey } from '../services/surveyService';

function WorkshopDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role, isAuthenticated } = useAuth();

  const [workshop, setWorkshop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myRegistration, setMyRegistration] = useState(null);

  // Registration Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [acceptWaitlist, setAcceptWaitlist] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Cancel Registration State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Bận lịch đột xuất');

  // Survey Modal State
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [surveyRating, setSurveyRating] = useState(5);
  const [surveyFeedback, setSurveyFeedback] = useState('');
  const [surveySubmitted, setSurveySubmitted] = useState(false);

  const fetchWorkshopData = async () => {
    setLoading(true);
    try {
      const data = await getWorkshopById(id);
      setWorkshop(data);

      if (isAuthenticated) {
        const myRegs = await getMyRegistrations();
        const found = myRegs.find((r) => r.workshop_id === Number(id));
        setMyRegistration(found || null);
      }
    } catch (err) {
      console.error('Error fetching workshop detail:', err);
      setErrorMessage('Không tìm thấy thông tin Workshop.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkshopData();
  }, [id, isAuthenticated]);

  const handleRegister = async (e) => {
    if (e) e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await registerWorkshop({
        workshop_id: Number(id),
        accept_waitlist: acceptWaitlist,
      });

      setShowRegisterModal(false);
      if (result.status === 'confirmed') {
        setSuccessMessage('Đăng ký thành công. Bạn đã được cấp vé tham dự chính thức.');
      } else if (result.status === 'waitlist') {
        setSuccessMessage(`Bạn đã được thêm vào Danh sách chờ ở vị trí #${result.waitlist_position}.`);
      }
      fetchWorkshopData();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setErrorMessage(typeof detail === 'string' ? detail : 'Đăng ký không thành công.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRegistration = async (e) => {
    if (e) e.preventDefault();
    if (!myRegistration) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await cancelRegistration(myRegistration.registration_id, cancelReason);
      setShowCancelModal(false);
      setSuccessMessage('Đã hủy đăng ký vé thành công.');
      fetchWorkshopData();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setErrorMessage(typeof detail === 'string' ? detail : 'Hủy đăng ký thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitSurvey = async (e) => {
    if (e) e.preventDefault();
    if (!myRegistration) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await submitSurvey({
        registration_id: myRegistration.registration_id,
        rating: Number(surveyRating),
        feedback: surveyFeedback.trim(),
      });
      setShowSurveyModal(false);
      setSurveySubmitted(true);
      setSuccessMessage('Cảm ơn bạn đã gửi đánh giá khảo sát thành công.');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setErrorMessage(typeof detail === 'string' ? detail : 'Gửi khảo sát thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="state-card state-card--loading" style={{ margin: '80px auto', textAlign: 'center' }}>
        <div className="state-card__spinner" />
        <p style={{ marginTop: '16px' }}>Đang tải chi tiết Workshop...</p>
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

  return (
    <div className="workshop-detail-page">
      <div className="breadcrumb" style={{ marginBottom: '16px', fontSize: '13px', color: '#886255' }}>
        <Link to="/workshops" style={{ color: '#886255', textDecoration: 'none' }}>← Quay lại danh sách</Link>
      </div>

      {successMessage && (
        <div className="alert-banner alert-banner--success" style={{ marginBottom: '20px' }}>
          <div>{successMessage}</div>
        </div>
      )}

      {errorMessage && (
        <div className="alert-banner alert-banner--error" style={{ marginBottom: '20px' }}>
          <div>{errorMessage}</div>
        </div>
      )}

      <div className="detail-layout">
        {/* Main Content */}
        <div className="detail-main">
          <div className="detail-header">
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <span className={`status-tag status-tag--${workshop.status}`}>
                {workshop.status.toUpperCase()}
              </span>
              {workshop.is_full && (
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
                <strong>{new Date(workshop.start_at).toLocaleString('vi-VN')}</strong>
              </div>
              <div className="info-item">
                <span className="info-label">Thời gian kết thúc:</span>
                <strong>{new Date(workshop.end_at).toLocaleString('vi-VN')}</strong>
              </div>
              <div className="info-item">
                <span className="info-label">Địa điểm tổ chức:</span>
                <strong>{workshop.location}</strong>
              </div>
              <div className="info-item">
                <span className="info-label">Khung giờ điểm danh:</span>
                <strong>
                  {workshop.checkin_start_at ? new Date(workshop.checkin_start_at).toLocaleTimeString('vi-VN') : '--'} - {workshop.checkin_end_at ? new Date(workshop.checkin_end_at).toLocaleTimeString('vi-VN') : '--'}
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
                  {myRegistration.status === 'waitlist' && `Hàng đợi #${myRegistration.waitlist_position}`}
                  {myRegistration.status === 'attended' && 'Đã tham dự'}
                </span>
              </div>

              <div className="user-ticket-card__body">
                <p>Mã đăng ký: <code>REG-{myRegistration.registration_id}</code></p>
                <p>Đăng ký lúc: {new Date(myRegistration.registered_at).toLocaleString('vi-VN')}</p>

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

                  {myRegistration.status === 'attended' && (
                    <button
                      type="button"
                      className="home-page__primary-button"
                      onClick={() => setShowSurveyModal(true)}
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

            {/* Action Buttons */}
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
          </div>
        </div>
      </div>

      {/* Modal Đăng ký Workshop */}
      {showRegisterModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2>Xác nhận Đăng ký Workshop</h2>
            <p><strong>{workshop.title}</strong></p>

            <div className="modal-info-box">
              <p>Địa điểm: {workshop.location}</p>
              <p>Thời gian: {new Date(workshop.start_at).toLocaleString('vi-VN')}</p>
              <p>Người đăng ký: {user?.full_name} - {user?.email}</p>
            </div>

            {workshop.is_full && (
              <div className="alert-banner alert-banner--warning" style={{ margin: '12px 0' }}>
                <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={acceptWaitlist}
                    onChange={(e) => setAcceptWaitlist(e.target.checked)}
                  />
                  <span>Tôi đồng ý ghi danh vào <strong>Danh sách chờ</strong> khi có người hủy vé.</span>
                </label>
              </div>
            )}

            <div className="modal-actions">
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
                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận Đăng ký'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hủy Đăng ký Vé */}
      {showCancelModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2>Hủy đăng ký Workshop</h2>
            <p>Bạn có chắc chắn muốn hủy vé tham gia workshop này?</p>

            <div className="form-group" style={{ marginTop: '14px' }}>
              <label>Lý do hủy:</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do hủy vé..."
                rows="3"
                required
              />
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
                type="button"
                className="btn-danger"
                onClick={handleCancelRegistration}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Đang hủy...' : 'Xác nhận Hủy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Khảo sát Đánh giá */}
      {showSurveyModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2>Đánh giá và Khảo sát Workshop</h2>
            <p><strong>{workshop.title}</strong></p>

            <form onSubmit={handleSubmitSurvey}>
              <div className="form-group" style={{ margin: '16px 0' }}>
                <label>Mức độ hài lòng chung từ 1 đến 5 sao:</label>
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
                <label>Ý kiến đóng góp và Phản hồi:</label>
                <textarea
                  value={surveyFeedback}
                  onChange={(e) => setSurveyFeedback(e.target.value)}
                  placeholder="Nội dung workshop, giảng viên, tổ chức..."
                  rows="4"
                />
              </div>

              <div className="modal-actions">
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
                  {isSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkshopDetailPage;
