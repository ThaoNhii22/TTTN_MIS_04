import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  cancelRegistration,
  getWorkshopById,
  getUserRegistration,
  registerWorkshop,
} from '../services/workshopService';

function WorkshopDetailPage() {
  const { id } = useParams();

  const [workshop, setWorkshop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRegistration, setUserRegistration] = useState(null);

  // Form State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showWaitlistPrompt, setShowWaitlistPrompt] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [formData, setFormData] = useState({
    fullName: 'Nguyễn Văn A',
    email: 'sinhvien@workshop.edu.vn',
    phone: '0987654321',
    department: 'Khoa Công nghệ Thông tin',
    note: '',
  });

  // Action feedback states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Load workshop & user registration
  const loadData = useCallback(async () => {
    try {
      const data = await getWorkshopById(id);
      if (data) {
        setWorkshop(data);
        const reg = await getUserRegistration(data.id);
        setUserRegistration(reg || null);
      }
    } catch (err) {
      console.error('Lỗi khi tải chi tiết Workshop:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await getWorkshopById(id);
        if (!ignore && data) {
          setWorkshop(data);
          const reg = await getUserRegistration(data.id);
          if (!ignore) {
            setUserRegistration(reg || null);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải chi tiết Workshop:', err);
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [id]);

  // Calculate remaining quota & fill percentage
  const quotaInfo = useMemo(() => {
    if (!workshop) return { remaining: 0, fillPercent: 0, isFull: false };
    const remaining = Math.max(0, workshop.quota - workshop.registered);
    const fillPercent = workshop.quota > 0 ? Math.min(100, (workshop.registered / workshop.quota) * 100) : 0;
    const isFull = workshop.registered >= workshop.quota;
    return { remaining, fillPercent, isFull };
  }, [workshop]);

  // Calculate cutoff info (BR-11)
  const cutoffInfo = useMemo(() => {
    if (!workshop) return { canCancel: true, deadlineStr: '', hoursLeft: 0 };
    const eventTime = new Date(workshop.startAt).getTime();
    const cutoffTime = eventTime - (workshop.cutoffHours || 24) * 60 * 60 * 1000;
    const canCancel = userRegistration?.isCancellable ?? true;
    const deadlineDate = new Date(cutoffTime);
    const deadlineStr = `${deadlineDate.getHours().toString().padStart(2, '0')}:${deadlineDate
      .getMinutes()
      .toString()
      .padStart(2, '0')} ngày ${deadlineDate.toLocaleDateString('vi-VN')}`;

    return { canCancel, deadlineStr, hoursLeft: 24 };
  }, [workshop, userRegistration]);

  // Handle open registration flow
  const handleOpenRegister = () => {
    setActionError(null);
    setActionSuccess(null);

    // If workshop is already full, prompt waitlist immediately (BR-02)
    if (quotaInfo.isFull) {
      setShowWaitlistPrompt(true);
    } else {
      setShowRegisterModal(true);
    }
  };

  // Submit registration (Direct or Waitlist)
  const handleFormSubmit = async (e, isWaitlist = false) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setActionError(null);

    try {
      const result = await registerWorkshop({
        workshopId: workshop.id,
        isWaitlistAccept: isWaitlist,
      });

      setShowRegisterModal(false);
      setShowWaitlistPrompt(false);
      await loadData();

      if (result.status === 'waitlist') {
        setActionSuccess({
          title: 'Đã vào Danh sách chờ!',
          message: `Bạn đang ở vị trí #${result.waitlistPosition || 1} trong danh sách chờ. Khi có người hủy vé, hệ thống sẽ tự động đôn bạn lên vé chính thức.`,
          type: 'waitlist',
        });
      } else {
        setActionSuccess({
          title: 'Đăng ký Workshop thành công!',
          message: `Vé của bạn đã được xác nhận (Mã vé: ${result.ticketCode}). Bạn có thể dùng mã QR để check-in tại sự kiện.`,
          type: 'confirmed',
        });
      }
    } catch (err) {
      const msg = err.userMessage || err.response?.data?.detail || err.message || 'Đăng ký không thành công.';
      if (msg.includes('BR-01') || msg.includes('đã có lượt đăng ký') || msg.includes('trùng')) {
        setActionError({
          title: 'Cảnh báo trùng đăng ký (BR-01)',
          message: msg,
          type: 'duplicate',
        });
      } else if (msg.includes('BR-02') || msg.includes('hết chỗ') || msg.includes('đầy')) {
        setShowRegisterModal(false);
        setShowWaitlistPrompt(true);
      } else {
        setActionError({
          title: 'Đăng ký không thành công',
          message: msg,
          type: 'general',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Cancel registration (BR-03, BR-11)
  const handleCancelRegistration = async () => {
    if (!userRegistration) return;
    setIsSubmitting(true);
    setActionError(null);

    try {
      await cancelRegistration(userRegistration.id, cancelReason);
      setShowCancelModal(false);
      await loadData();

      setActionSuccess({
        title: 'Hủy đăng ký thành công',
        message: 'Lượt đăng ký của bạn đã được hủy thành công trên hệ thống. Chỗ trống đã được nhường lại.',
        type: 'canceled',
      });
    } catch (err) {
      const msg = err.userMessage || err.response?.data?.detail || err.message || 'Không thể hủy đăng ký.';
      setActionError({
        title: 'Không thể hủy đăng ký',
        message: msg,
        type: 'cutoff_exceeded',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="state-card state-card--loading">
        <div className="state-card__spinner" />
        <h2>Đang tải thông tin Workshop</h2>
        <p>Vui lòng đợi trong giây lát...</p>
      </div>
    );
  }

  if (!workshop) {
    return (
      <div className="workshop-empty">
        <div className="workshop-empty__icon">!</div>
        <h2>Không tìm thấy Workshop</h2>
        <p>Sự kiện này không tồn tại hoặc đã bị xóa khỏi hệ thống.</p>
        <Link to="/workshops" className="home-page__primary-button" style={{ marginTop: '20px', display: 'inline-block' }}>
          ← Quay lại danh sách Workshop
        </Link>
      </div>
    );
  }

  return (
    <div className="workshop-detail-page">
      {/* Top Breadcrumb Navigation */}
      <div className="workshop-detail__nav">
        <Link to="/workshops" className="workshop-detail__back-link">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Danh sách Workshop
        </Link>
        <span className="workshop-detail__breadcrumb-sep">/</span>
        <span className="workshop-detail__breadcrumb-current">{workshop.title}</span>
      </div>

      {/* Action Notification Alert Banners */}
      {actionSuccess && (
        <div className={`detail-alert detail-alert--${actionSuccess.type}`}>
          <div className="detail-alert__icon">✓</div>
          <div className="detail-alert__content">
            <h4>{actionSuccess.title}</h4>
            <p>{actionSuccess.message}</p>
          </div>
          <button className="detail-alert__close" onClick={() => setActionSuccess(null)}>
            ×
          </button>
        </div>
      )}

      {actionError && (
        <div className={`detail-alert detail-alert--error`}>
          <div className="detail-alert__icon">!</div>
          <div className="detail-alert__content">
            <h4>{actionError.title}</h4>
            <p>{actionError.message}</p>
          </div>
          <button className="detail-alert__close" onClick={() => setActionError(null)}>
            ×
          </button>
        </div>
      )}

      {/* Main Grid: Content (Left) & Sidebar (Right) */}
      <div className="workshop-detail__grid">
        {/* Left Column: Comprehensive Info */}
        <div className="workshop-detail__main">
          {/* Hero Card */}
          <div className="detail-hero-card">
            <div className="detail-hero-card__tags">
              <span className="workshop-card__category">{workshop.category}</span>
              <span
                className={`workshop-card__status ${quotaInfo.isFull ? 'workshop-card__status--full' : 'workshop-card__status--open'
                  }`}
              >
                {quotaInfo.isFull ? 'Đã đủ chỗ' : 'Đang mở đăng ký'}
              </span>
            </div>

            <h1 className="detail-hero-card__title">{workshop.title}</h1>

            <p className="detail-hero-card__desc">{workshop.description}</p>

            <div className="detail-meta-pills">
              <div className="detail-meta-pill">
                <span className="detail-meta-pill__icon">📅</span>
                <div>
                  <small>Thời gian diễn ra</small>
                  <strong>{workshop.date} ({workshop.time})</strong>
                </div>
              </div>

              <div className="detail-meta-pill">
                <span className="detail-meta-pill__icon">📍</span>
                <div>
                  <small>Địa điểm tổ chức</small>
                  <strong>{workshop.location}</strong>
                </div>
              </div>

              <div className="detail-meta-pill">
                <span className="detail-meta-pill__icon">🏛️</span>
                <div>
                  <small>Đơn vị chủ trì</small>
                  <strong>{workshop.organizer}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Speaker Profile */}
          {workshop.speaker && (
            <div className="detail-section-card">
              <h3 className="detail-section-card__title">
                Diễn giả / Hướng dẫn chuyên môn
              </h3>
              <div className="speaker-card">
                <div className="speaker-card__avatar-placeholder" aria-label="Ảnh đại diện">
                  <svg
                    viewBox="0 0 48 48"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="speaker-card__silhouette-svg"
                  >
                    <circle cx="24" cy="24" r="24" fill="#CBD5E1" />
                    <circle cx="24" cy="17" r="7.5" fill="#FFFFFF" />
                    <path
                      d="M9 44C9 35.7157 15.7157 29 24 29C32.2843 29 39 35.7157 39 44C39 45.1046 38.1046 46 37 46H11C9.89543 46 9 45.1046 9 44Z"
                      fill="#FFFFFF"
                    />
                  </svg>
                </div>
                <div className="speaker-card__info">
                  <h4>{workshop.speaker.name}</h4>
                  <p>{workshop.speaker.title}</p>
                </div>
              </div>
            </div>
          )}

          {/* Learning Objectives */}
          {workshop.objectives && (
            <div className="detail-section-card">
              <h3 className="detail-section-card__title">
                Mục tiêu & Giá trị nhận được
              </h3>
              <ul className="detail-checklist">
                {workshop.objectives.map((item, idx) => (
                  <li key={idx}>
                    <span className="detail-checklist__check">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Agenda Timeline */}
          {workshop.agenda && (
            <div className="detail-section-card">
              <h3 className="detail-section-card__title">
                Lịch trình chi tiết sự kiện
              </h3>
              <div className="agenda-timeline">
                {workshop.agenda.map((item, idx) => (
                  <div className="agenda-item" key={idx}>
                    <div className="agenda-item__time">{item.time}</div>
                    <div className="agenda-item__dot" />
                    <div className="agenda-item__content">{item.activity}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prerequisites */}
          {workshop.prerequisites && (
            <div className="detail-section-card">
              <h3 className="detail-section-card__title">
                Yêu cầu chuẩn bị
              </h3>
              <ul className="detail-checklist detail-checklist--bullet">
                {workshop.prerequisites.map((req, idx) => (
                  <li key={idx}>
                    <span className="detail-checklist__bullet">•</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column: Sticky Registration / Status Card */}
        <div className="workshop-detail__sidebar">
          {/* Case 1: User already registered (Confirmed) */}
          {userRegistration && userRegistration.status === 'confirmed' && (
            <div className="ticket-card ticket-card--confirmed">
              <div className="ticket-card__header">
                <div className="ticket-card__badge">ĐÃ ĐĂNG KÝ THÀNH CÔNG</div>
                <h3>Vé tham dự Workshop</h3>
              </div>

              <div className="ticket-card__body">
                <div className="ticket-code-box">
                  <small>MÃ VÉ CỦA BẠN</small>
                  <strong>{userRegistration.ticketCode}</strong>
                </div>

                <div className="ticket-info-row">
                  <span>Họ và tên:</span>
                  <strong>{userRegistration.fullName}</strong>
                </div>
                <div className="ticket-info-row">
                  <span>Email:</span>
                  <strong>{userRegistration.email}</strong>
                </div>
                <div className="ticket-info-row">
                  <span>Trạng thái:</span>
                  <span className="ticket-status-tag ticket-status-tag--confirmed">Chính thức</span>
                </div>

                <div className="ticket-qr-placeholder">
                  <p>Sử dụng mã QR này khi check-in tại sự kiện</p>
                  <Link to="/check-in" className="ticket-qr-btn">
                    Mở màn hình Check-in →
                  </Link>
                </div>
              </div>

              <div className="ticket-card__footer">
                <div className="ticket-cutoff-notice">
                  <small>
                    Mốc hạn hủy vé: <strong>{cutoffInfo.deadlineStr}</strong>
                  </small>
                </div>

                {cutoffInfo.canCancel ? (
                  <button
                    type="button"
                    className="ticket-cancel-btn"
                    onClick={() => setShowCancelModal(true)}
                  >
                    Hủy đăng ký vé này
                  </button>
                ) : (
                  <div className="ticket-cutoff-expired">
                    Đã quá hạn chót hủy vé ({workshop.cutoffHours}h trước giờ diễn ra)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Case 2: User in Waitlist */}
          {userRegistration && userRegistration.status === 'waitlist' && (
            <div className="ticket-card ticket-card--waitlist">
              <div className="ticket-card__header">
                <div className="ticket-card__badge ticket-card__badge--waitlist">
                  ĐANG TRONG DANH SÁCH CHỜ
                </div>
                <h3>Vị trí hàng đợi: #{userRegistration.waitlistPosition}</h3>
              </div>

              <div className="ticket-card__body">
                <p className="waitlist-card__desc">
                  Workshop hiện tại đã hết chỗ. Bạn đang được xếp ở vị trí{' '}
                  <strong>#{userRegistration.waitlistPosition}</strong> trong danh sách chờ.
                </p>

                <div className="waitlist-rule-box">
                  <div className="waitlist-rule-box__title">
                    Quy tắc chuyển vé tự động
                  </div>
                  <p>
                    Ngay khi có người tham gia hủy vé, hệ thống sẽ <strong>tự động chuyển</strong> vé
                    cho bạn theo đúng thứ tự đăng ký.
                  </p>
                </div>
              </div>

              <div className="ticket-card__footer">
                <button
                  type="button"
                  className="ticket-cancel-btn"
                  onClick={() => setShowCancelModal(true)}
                >
                  Rút khỏi danh sách chờ
                </button>
              </div>
            </div>
          )}

          {/* Case 3: Not registered yet -> Registration Action Card */}
          {!userRegistration && (
            <div className="registration-sidebar-card">
              <div className="sidebar-quota-box">
                <div className="sidebar-quota-header">
                  <span>Tình trạng chỗ ngồi</span>
                  <strong className="sidebar-quota-ratio">
                    {workshop.registered} / {workshop.quota} chỗ
                  </strong>
                </div>

                <div className="sidebar-progress-bar">
                  <div
                    className={`sidebar-progress-fill ${quotaInfo.isFull ? 'sidebar-progress-fill--full' : ''
                      }`}
                    style={{ width: `${quotaInfo.fillPercent}%` }}
                  />
                </div>

                <div className="sidebar-quota-footer">
                  {quotaInfo.isFull ? (
                    <span className="quota-pill quota-pill--full">
                      Đã hết chỗ ({workshop.waitlistCount || 0} người đang chờ)
                    </span>
                  ) : (
                    <span className="quota-pill quota-pill--open">
                      Còn trống {quotaInfo.remaining} vé
                    </span>
                  )}
                </div>
              </div>

              {/* Event Countdown */}
              <div className="sidebar-countdown-box">
                <div className="sidebar-countdown-label">Thời hạn hủy vé trước sự kiện</div>
                <div className="sidebar-countdown-value">
                  <strong>{workshop.cutoffHours} giờ</strong>
                  <span>(trước {cutoffInfo.deadlineStr})</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="sidebar-action-box">
                {quotaInfo.isFull ? (
                  <button
                    type="button"
                    className="btn-register btn-register--waitlist"
                    onClick={handleOpenRegister}
                  >
                    Gia nhập Danh sách chờ
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-register btn-register--primary"
                    onClick={handleOpenRegister}
                  >
                    Đăng ký tham gia ngay
                  </button>
                )}
                <p className="sidebar-note">
                  * Mỗi tài khoản chỉ đăng ký 1 vé.
                </p>
              </div>
            </div>
          )}

          {/* Quick Support & Organizer Card */}
          <div className="sidebar-support-card">
            <h4>Hỗ trợ người tham dự</h4>
            <p>Nếu bạn gặp sự cố khi đăng ký hoặc cần giải đáp thông tin, vui lòng liên hệ:</p>
            <div className="support-contact">
              <span>workshop.support@edu.vn</span>
              <span>024.3754.7890 (Ext: 102)</span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Registration Form Modal */}
      {showRegisterModal && (
        <div className="waitlist-modal__overlay">
          <div className="waitlist-modal registration-form-modal">
            <button
              className="waitlist-modal__close"
              type="button"
              onClick={() => setShowRegisterModal(false)}
            >
              ×
            </button>

            <h2>Đăng ký tham gia Workshop</h2>
            <p>
              Bạn đang đăng ký cho <strong>"{workshop.title}"</strong>. Vui lòng xác nhận thông tin:
            </p>

            <form onSubmit={(e) => handleFormSubmit(e, false)} className="modal-form">
              <div className="form-group">
                <label htmlFor="reg-name">Họ và tên</label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Nhập họ và tên của bạn"
                />
              </div>

              <div className="form-group">
                <label htmlFor="reg-email">Email đăng ký</label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@workshop.edu.vn"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="reg-phone">Số điện thoại</label>
                  <input
                    id="reg-phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0987..."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="reg-dept">Khoa / Đơn vị</label>
                  <input
                    id="reg-dept"
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Khoa CNTT"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="reg-note">Câu hỏi / Góp ý cho Ban tổ chức (Tùy chọn)</label>
                <textarea
                  id="reg-note"
                  rows="2"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Bạn mong muốn học được gì từ buổi Workshop này..."
                />
              </div>

              <div className="waitlist-modal__actions">
                <button
                  type="button"
                  className="waitlist-modal__cancel"
                  onClick={() => setShowRegisterModal(false)}
                  disabled={isSubmitting}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="waitlist-modal__confirm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Đang xử lý...' : 'Xác nhận Đăng ký'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Waitlist Confirmation Prompt Modal (BR-02) */}
      {showWaitlistPrompt && (
        <div className="waitlist-modal__overlay">
          <div className="waitlist-modal">
            <button
              className="waitlist-modal__close"
              type="button"
              onClick={() => setShowWaitlistPrompt(false)}
            >
              ×
            </button>

            <h2>Workshop đã hết chỗ chính thức</h2>
            <p>
              Hiện tại Workshop <strong>"{workshop.title}"</strong> đã đạt giới hạn Quota{' '}
              <strong>
                ({workshop.quota}/{workshop.quota} chỗ)
              </strong>
              .
            </p>

            <div className="waitlist-modal__note">
              <div>
                <p>
                  Bạn có muốn tham gia <strong>Danh sách chờ</strong> không?
                </p>
                <p style={{ marginTop: '4px' }}>
                  Hệ thống áp dụng cơ chế <strong>tự động chuyển vé</strong>: Khi có bất kỳ
                  ai hủy vé, vị trí đầu tiên trong danh sách chờ sẽ tự động nhận vé chính thức.
                </p>
              </div>
            </div>

            <div className="waitlist-modal__actions">
              <button
                type="button"
                className="waitlist-modal__cancel"
                onClick={() => setShowWaitlistPrompt(false)}
                disabled={isSubmitting}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="waitlist-modal__confirm"
                onClick={() => handleFormSubmit(null, true)}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Đang ghi nhận...' : 'Đồng ý vào Danh sách chờ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Cancel Registration Confirmation Modal (BR-11) */}
      {showCancelModal && (
        <div className="waitlist-modal__overlay">
          <div className="waitlist-modal">
            <button
              className="waitlist-modal__close"
              type="button"
              onClick={() => setShowCancelModal(false)}
            >
              ×
            </button>

            <h2>Xác nhận hủy đăng ký</h2>
            <p>
              Bạn có chắc chắn muốn hủy lượt đăng ký cho Workshop <strong>"{workshop.title}"</strong>?
            </p>

            <div className="waitlist-modal__note" style={{ background: '#fff8f5' }}>
              <p>
                Sau khi hủy, chỗ trống của bạn sẽ được giải phóng ngay lập tức và chuyển giao cho
                người đứng đầu <strong>Danh sách chờ</strong>.
              </p>
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label htmlFor="cancel-reason">Lý do hủy (Tùy chọn)</label>
              <input
                id="cancel-reason"
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="VD: Trùng lịch học, có việc bận đột xuất..."
              />
            </div>

            <div className="waitlist-modal__actions">
              <button
                type="button"
                className="waitlist-modal__cancel"
                onClick={() => setShowCancelModal(false)}
                disabled={isSubmitting}
              >
                Giữ lại vé
              </button>
              <button
                type="button"
                className="waitlist-modal__confirm"
                style={{ background: '#c54a32', borderColor: '#c54a32' }}
                onClick={handleCancelRegistration}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Đang hủy...' : 'Xác nhận Hủy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkshopDetailPage;
