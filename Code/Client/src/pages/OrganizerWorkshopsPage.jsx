import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import { useToast } from '../context/useToast';
import { getWorkshopAttendanceList } from '../services/attendanceService';
import { getWorkshopRegistrations } from '../services/registrationService';
import { getWorkshopSurveys } from '../services/surveyService';
import {
  cancelWorkshop,
  createWorkshop,
  getWorkshops,
  submitWorkshopForApproval,
  updateWorkshop,
} from '../services/workshopService';

function OrganizerWorkshopsPage() {
  const toast = useToast();
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  // Modals & Action States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedWorkshop, setSelectedWorkshop] = useState(null);

  // Submit Approval Confirmation
  const [workshopToSubmit, setWorkshopToSubmit] = useState(null);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);

  // Attendees Modal
  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [attendeesList, setAttendeesList] = useState([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  // Live Attendance Modal
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Survey Results Modal
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [surveyData, setSurveyData] = useState(null);
  const [loadingSurvey, setLoadingSurvey] = useState(false);

  // Cancel Modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Form State for Create / Edit
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    start_at: '',
    end_at: '',
    registration_open_at: '',
    registration_close_at: '',
    quota: 30,
    checkin_start_at: '',
    checkin_end_at: '',
  });

  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function loadWorkshops() {
      setLoading(true);
      try {
        const data = await getWorkshops({ my_organized: true });
        if (!ignore) {
          setWorkshops(data);
        }
      } catch (err) {
        console.error('Error fetching organized workshops:', err);
        toast.apiError(err, 'Không thể tải danh sách Workshop của bạn.');
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadWorkshops();
    return () => {
      ignore = true;
    };
  }, [reloadKey, toast]);

  const toLocalDatetimeInput = (dateInput) => {
    if (!dateInput) return '';
    if (typeof dateInput === 'string' && !dateInput.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(dateInput)) {
      return dateInput.slice(0, 16);
    }
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (!(d instanceof Date) || isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const openCreateModal = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startAt = new Date(tomorrow);
    startAt.setHours(9, 0, 0, 0);

    const endAt = new Date(tomorrow);
    endAt.setHours(11, 30, 0, 0);

    const regOpen = new Date();
    regOpen.setHours(regOpen.getHours() + 1);

    const regClose = new Date(startAt);
    regClose.setHours(regClose.getHours() - 2);

    const checkinStart = new Date(startAt);
    checkinStart.setMinutes(checkinStart.getMinutes() - 30);

    const checkinEnd = new Date(startAt);
    checkinEnd.setMinutes(checkinEnd.getMinutes() + 30);

    setFormData({
      title: '',
      description: '',
      location: 'Hội trường B, Tòa nhà Trung tâm',
      start_at: toLocalDatetimeInput(startAt),
      end_at: toLocalDatetimeInput(endAt),
      registration_open_at: toLocalDatetimeInput(regOpen),
      registration_close_at: toLocalDatetimeInput(regClose),
      quota: 40,
      checkin_start_at: toLocalDatetimeInput(checkinStart),
      checkin_end_at: toLocalDatetimeInput(checkinEnd),
    });
    setShowCreateModal(true);
  };

  const openEditModal = (w) => {
    setSelectedWorkshop(w);
    setFormData({
      title: w.title,
      description: w.description || '',
      location: w.location,
      start_at: toLocalDatetimeInput(w.start_at),
      end_at: toLocalDatetimeInput(w.end_at),
      registration_open_at: toLocalDatetimeInput(w.registration_open_at),
      registration_close_at: toLocalDatetimeInput(w.registration_close_at),
      quota: w.quota,
      checkin_start_at: toLocalDatetimeInput(w.checkin_start_at),
      checkin_end_at: toLocalDatetimeInput(w.checkin_end_at),
    });
    setShowEditModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await createWorkshop({
        ...formData,
        quota: Number(formData.quota),
      });
      setShowCreateModal(false);
      toast.success('Tạo bản nháp Workshop thành công. Bạn có thể kiểm tra lại trước khi gửi duyệt.');
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.apiError(err, 'Không thể tạo bản nháp Workshop.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedWorkshop) return;
    setIsProcessing(true);
    try {
      await updateWorkshop(selectedWorkshop.workshop_id, {
        ...formData,
        quota: Number(formData.quota),
      });
      setShowEditModal(false);
      setSelectedWorkshop(null);
      toast.success('Cập nhật thông tin Workshop thành công.');
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.apiError(err, 'Cập nhật thông tin Workshop thất bại.');
    } finally {
      setIsProcessing(false);
    }
  };

  const openSubmitApprovalConfirm = (w) => {
    setWorkshopToSubmit(w);
    setShowSubmitConfirmModal(true);
  };

  const handleConfirmSubmitApproval = async () => {
    if (!workshopToSubmit) return;
    setIsProcessing(true);
    try {
      await submitWorkshopForApproval(workshopToSubmit.workshop_id);
      toast.success(`Đã gửi Workshop "${workshopToSubmit.title}" cho Quản trị viên xét duyệt.`);
      setShowSubmitConfirmModal(false);
      setWorkshopToSubmit(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.apiError(err, 'Gửi xét duyệt Workshop thất bại.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelWorkshop = async (e) => {
    e.preventDefault();
    if (!selectedWorkshop) return;
    setIsProcessing(true);
    try {
      await cancelWorkshop(selectedWorkshop.workshop_id, cancelReason);
      setShowCancelModal(false);
      toast.success(`Đã hủy Workshop "${selectedWorkshop.title}" thành công. Toàn bộ đăng ký liên quan đã được tự động hủy.`);
      setSelectedWorkshop(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.apiError(err, 'Hủy Workshop thất bại.');
    } finally {
      setIsProcessing(false);
    }
  };

  const openAttendeesModal = async (w) => {
    setSelectedWorkshop(w);
    setAttendeesList([]);
    setShowAttendeesModal(true);
    setLoadingAttendees(true);
    try {
      const data = await getWorkshopRegistrations(w.workshop_id);
      setAttendeesList(data);
    } catch (err) {
      console.error('Error loading attendees:', err);
      toast.apiError(err, 'Không thể tải danh sách người đăng ký.');
    } finally {
      setLoadingAttendees(false);
    }
  };

  const openAttendanceModal = async (w) => {
    setSelectedWorkshop(w);
    setAttendanceRecords([]);
    setShowAttendanceModal(true);
    setLoadingAttendance(true);
    try {
      const data = await getWorkshopAttendanceList(w.workshop_id);
      setAttendanceRecords(data);
    } catch (err) {
      console.error('Error loading attendance list:', err);
      toast.apiError(err, 'Không thể tải danh sách điểm danh.');
    } finally {
      setLoadingAttendance(false);
    }
  };

  const openSurveyModal = async (w) => {
    setSelectedWorkshop(w);
    setSurveyData(null);
    setShowSurveyModal(true);
    setLoadingSurvey(true);
    try {
      const data = await getWorkshopSurveys(w.workshop_id);
      setSurveyData(data);
    } catch (err) {
      console.error('Error loading surveys:', err);
      toast.apiError(err, 'Không thể tải kết quả khảo sát.');
    } finally {
      setLoadingSurvey(false);
    }
  };

  return (
    <section className="organizer-workshops-page">
      <div className="home-page__header">
        <div>
          <h1>Quản lý Workshop của tôi</h1>
          <p className="home-page__subtitle">
            Khởi tạo, chỉnh sửa bản nháp, gửi phê duyệt và quản lý toàn bộ vòng đời Workshop.
          </p>
        </div>

        <button type="button" className="home-page__primary-button" onClick={openCreateModal}>
          + Tạo Workshop Mới
        </button>
      </div>

      {loading ? (
        <div className="state-card state-card--loading" style={{ margin: '60px auto', textAlign: 'center' }}>
          <div className="state-card__spinner" />
          <p style={{ marginTop: '12px' }}>Đang tải danh sách Workshop của bạn...</p>
        </div>
      ) : workshops.length === 0 ? (
        <div className="workshop-empty">
          <div className="workshop-empty__icon">W</div>
          <h2>Bạn chưa tạo Workshop nào</h2>
          <p>Hãy bắt đầu bằng cách bấm nút "Tạo Workshop Mới" phía trên.</p>
        </div>
      ) : (
        <div className="admin-table-wrapper" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #ebdcd5', overflow: 'hidden' }}>
          <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fbf4f0', textAlign: 'left', borderBottom: '1px solid #ebdcd5' }}>
                <th style={{ padding: '14px 16px' }}>Workshop</th>
                <th style={{ padding: '14px 16px' }}>Trạng thái</th>
                <th style={{ padding: '14px 16px' }}>Đăng ký / Chỗ</th>
                <th style={{ padding: '14px 16px' }}>Thời gian sự kiện</th>
                <th style={{ padding: '14px 16px' }}>Thao tác quản lý</th>
              </tr>
            </thead>
            <tbody>
              {workshops.map((w) => (
                <tr key={w.workshop_id} style={{ borderBottom: '1px solid #f2e6e0' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <strong>
                      <Link to={`/workshops/${w.workshop_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {w.title}
                      </Link>
                    </strong>
                    <div style={{ fontSize: '12px', color: '#886255', marginTop: '4px' }}>
                      📍 {w.location}
                    </div>
                    {w.rejection_reason && w.status === 'draft' && (
                      <div
                        style={{
                          marginTop: '6px',
                          padding: '6px 10px',
                          background: '#fff5f5',
                          borderRadius: '6px',
                          border: '1px solid #fed7d7',
                          color: '#c53030',
                          fontSize: '12px',
                        }}
                      >
                        ⚠️ <strong>Lý do từ chối:</strong> {w.rejection_reason}
                      </div>
                    )}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <span className={`status-tag status-tag--${w.status}`}>
                      {w.status.toUpperCase()}
                    </span>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div>
                      <strong>{w.confirmed_count || 0}</strong> / {w.quota} chính thức
                    </div>
                    {w.waitlist_count > 0 && (
                      <div style={{ fontSize: '11px', color: '#c2410c', marginTop: '2px' }}>
                        +{w.waitlist_count} đang chờ
                      </div>
                    )}
                  </td>

                  <td style={{ padding: '14px 16px', fontSize: '12px' }}>
                    <div>{new Date(w.start_at).toLocaleString('vi-VN')}</div>
                    <div style={{ color: '#886255' }}>đến {new Date(w.end_at).toLocaleTimeString('vi-VN')}</div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {w.status === 'draft' && (
                        <>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: '12px', padding: '5px 10px' }}
                            onClick={() => openEditModal(w)}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="home-page__primary-button"
                            style={{ fontSize: '12px', padding: '5px 10px' }}
                            onClick={() => openSubmitApprovalConfirm(w)}
                            disabled={isProcessing}
                          >
                            Gửi duyệt
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: '12px', padding: '5px 10px' }}
                        onClick={() => openAttendeesModal(w)}
                      >
                        Người đăng ký
                      </button>

                      {(w.status === 'published' || w.status === 'completed') && (
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: '12px', padding: '5px 10px' }}
                          onClick={() => openAttendanceModal(w)}
                        >
                          Điểm danh ({w.attended_count || 0})
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: '12px', padding: '5px 10px' }}
                        onClick={() => openSurveyModal(w)}
                      >
                        Khảo sát
                      </button>

                      {(w.status === 'draft' || w.status === 'pending' || w.status === 'published') && (
                        <button
                          type="button"
                          className="btn-danger-outline"
                          style={{ fontSize: '12px', padding: '5px 10px' }}
                          onClick={() => {
                            setSelectedWorkshop(w);
                            setCancelReason('Ban tổ chức hủy sự kiện do thay đổi kế hoạch');
                            setShowCancelModal(true);
                          }}
                        >
                          Hủy
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Dialog Gửi duyệt Workshop */}
      <ConfirmDialog
        isOpen={showSubmitConfirmModal}
        onClose={() => setShowSubmitConfirmModal(false)}
        onConfirm={handleConfirmSubmitApproval}
        title="Gửi Workshop xét duyệt"
        message={`Bạn có chắc chắn muốn gửi Workshop "${workshopToSubmit?.title}" cho Quản trị viên xét duyệt? Sau khi gửi, sự kiện sẽ chuyển sang trạng thái "Chờ duyệt" và không thể chỉnh sửa cho đến khi có phản hồi.`}
        confirmText="Xác nhận Gửi duyệt"
        variant="primary"
        isLoading={isProcessing}
      />

      {/* Modal Tạo Workshop Mới */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => !isProcessing && setShowCreateModal(false)}
        title="Tạo Workshop Mới"
        subtitle="Khởi tạo bản nháp sự kiện với đầy đủ thông tin thời gian và số lượng"
        size="lg"
      >
        <form onSubmit={handleCreateSubmit}>
          <div className="form-group">
            <label>Tiêu đề Workshop *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ví dụ: Hội thảo An toàn thông tin và AI trong doanh nghiệp"
              required
            />
          </div>

          <div className="form-group">
            <label>Mô tả chi tiết</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Nội dung tổng quan, mục tiêu bài giảng, diễn giả..."
              rows="3"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Địa điểm tổ chức *</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Giới hạn số lượng chỗ (Quota) *</label>
              <input
                type="number"
                min="1"
                value={formData.quota}
                onChange={(e) => setFormData({ ...formData, quota: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Thời gian bắt đầu sự kiện *</label>
              <input
                type="datetime-local"
                value={formData.start_at}
                onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Thời gian kết thúc sự kiện *</label>
              <input
                type="datetime-local"
                value={formData.end_at}
                onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Thời gian mở đăng ký *</label>
              <input
                type="datetime-local"
                value={formData.registration_open_at}
                onChange={(e) => setFormData({ ...formData, registration_open_at: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Thời gian đóng đăng ký *</label>
              <input
                type="datetime-local"
                value={formData.registration_close_at}
                onChange={(e) => setFormData({ ...formData, registration_close_at: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Bắt đầu mở cổng Check-in</label>
              <input
                type="datetime-local"
                value={formData.checkin_start_at}
                onChange={(e) => setFormData({ ...formData, checkin_start_at: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Đóng cổng Check-in</label>
              <input
                type="datetime-local"
                value={formData.checkin_end_at}
                onChange={(e) => setFormData({ ...formData, checkin_end_at: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: '24px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowCreateModal(false)}
              disabled={isProcessing}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="home-page__primary-button"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <span className="btn-loading-wrapper">
                  <span className="mini-spinner" /> Đang tạo...
                </span>
              ) : (
                'Lưu Bản nháp'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Chỉnh sửa Workshop */}
      <Modal
        isOpen={showEditModal && !!selectedWorkshop}
        onClose={() => !isProcessing && setShowEditModal(false)}
        title={`Chỉnh sửa Workshop #${selectedWorkshop?.workshop_id}`}
        subtitle={`Sự kiện: ${selectedWorkshop?.title}`}
        size="lg"
      >
        <form onSubmit={handleEditSubmit}>
          <div className="form-group">
            <label>Tiêu đề Workshop *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Mô tả chi tiết</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="3"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Địa điểm *</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Giới hạn số lượng chỗ (Quota) *</label>
              <input
                type="number"
                min="1"
                value={formData.quota}
                onChange={(e) => setFormData({ ...formData, quota: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Thời gian bắt đầu *</label>
              <input
                type="datetime-local"
                value={formData.start_at}
                onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Thời gian kết thúc *</label>
              <input
                type="datetime-local"
                value={formData.end_at}
                onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Thời gian mở đăng ký *</label>
              <input
                type="datetime-local"
                value={formData.registration_open_at}
                onChange={(e) => setFormData({ ...formData, registration_open_at: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Thời gian đóng đăng ký *</label>
              <input
                type="datetime-local"
                value={formData.registration_close_at}
                onChange={(e) => setFormData({ ...formData, registration_close_at: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: '24px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowEditModal(false)}
              disabled={isProcessing}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="home-page__primary-button"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <span className="btn-loading-wrapper">
                  <span className="mini-spinner" /> Đang cập nhật...
                </span>
              ) : (
                'Cập nhật Thay đổi'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Xem Danh sách Đăng ký */}
      <Modal
        isOpen={showAttendeesModal && !!selectedWorkshop}
        onClose={() => setShowAttendeesModal(false)}
        title="Danh sách Đăng ký và Hàng đợi"
        subtitle={`Workshop: ${selectedWorkshop?.title}`}
        size="lg"
      >
        {loadingAttendees ? (
          <div style={{ textAlign: 'center', padding: '30px' }}>
            <div className="mini-spinner" style={{ margin: '0 auto 10px', width: '24px', height: '24px', borderColor: '#c2410c transparent #c2410c #c2410c' }} />
            <p>Đang tải danh sách người đăng ký...</p>
          </div>
        ) : attendeesList.length === 0 ? (
          <p style={{ margin: '30px 0', textAlign: 'center', color: '#7a5b50' }}>Hiện chưa có lượt đăng ký nào cho Workshop này.</p>
        ) : (
          <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto', margin: '16px 0' }}>
            <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fbf4f0', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>Mã vé</th>
                  <th style={{ padding: '10px 12px' }}>Họ và tên</th>
                  <th style={{ padding: '10px 12px' }}>Email</th>
                  <th style={{ padding: '10px 12px' }}>Trạng thái</th>
                  <th style={{ padding: '10px 12px' }}>Hàng đợi</th>
                  <th style={{ padding: '10px 12px' }}>Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {attendeesList.map((a) => (
                  <tr key={a.registration_id} style={{ borderBottom: '1px solid #f2e6e0' }}>
                    <td style={{ padding: '10px 12px' }}><code>REG-{a.registration_id}</code></td>
                    <td style={{ padding: '10px 12px' }}><strong>{a.user_name}</strong></td>
                    <td style={{ padding: '10px 12px' }}>{a.user_email}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={`status-tag status-tag--${a.status}`}>{a.status}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>{a.waitlist_position ? `#${a.waitlist_position}` : '--'}</td>
                    <td style={{ padding: '10px 12px', fontSize: '12px' }}>{new Date(a.registered_at).toLocaleString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: '16px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowAttendeesModal(false)}
          >
            Đóng
          </button>
        </div>
      </Modal>

      {/* Modal Bảng Điểm danh Thời gian thực */}
      <Modal
        isOpen={showAttendanceModal && !!selectedWorkshop}
        onClose={() => setShowAttendanceModal(false)}
        title="Bảng Điểm danh Sự kiện"
        subtitle={`Workshop: ${selectedWorkshop?.title}`}
        size="lg"
      >
        {loadingAttendance ? (
          <div style={{ textAlign: 'center', padding: '30px' }}>
            <div className="mini-spinner" style={{ margin: '0 auto 10px', width: '24px', height: '24px', borderColor: '#c2410c transparent #c2410c #c2410c' }} />
            <p>Đang tải dữ liệu điểm danh...</p>
          </div>
        ) : attendanceRecords.length === 0 ? (
          <p style={{ margin: '30px 0', textAlign: 'center', color: '#7a5b50' }}>Chưa có người tham gia nào thực hiện điểm danh.</p>
        ) : (
          <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto', margin: '16px 0' }}>
            <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fbf4f0', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>Mã điểm danh</th>
                  <th style={{ padding: '10px 12px' }}>Người tham gia</th>
                  <th style={{ padding: '10px 12px' }}>Email</th>
                  <th style={{ padding: '10px 12px' }}>Phương thức</th>
                  <th style={{ padding: '10px 12px' }}>Thời gian check-in</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((att) => (
                  <tr key={att.attendance_id} style={{ borderBottom: '1px solid #f2e6e0' }}>
                    <td style={{ padding: '10px 12px' }}><code>ATT-{att.attendance_id}</code></td>
                    <td style={{ padding: '10px 12px' }}><strong>{att.user_name}</strong></td>
                    <td style={{ padding: '10px 12px' }}>{att.user_email}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className="status-tag status-tag--draft">{att.checkin_method}</span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: '12px' }}>{new Date(att.checkin_at).toLocaleString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: '16px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowAttendanceModal(false)}
          >
            Đóng
          </button>
        </div>
      </Modal>

      {/* Modal Phân tích Khảo sát */}
      <Modal
        isOpen={showSurveyModal && !!selectedWorkshop}
        onClose={() => setShowSurveyModal(false)}
        title="Kết quả Khảo sát và Đánh giá"
        subtitle={`Workshop: ${selectedWorkshop?.title}`}
        size="lg"
      >
        {loadingSurvey ? (
          <div style={{ textAlign: 'center', padding: '30px' }}>
            <div className="mini-spinner" style={{ margin: '0 auto 10px', width: '24px', height: '24px', borderColor: '#c2410c transparent #c2410c #c2410c' }} />
            <p>Đang tải kết quả khảo sát...</p>
          </div>
        ) : !surveyData ? (
          <p style={{ margin: '30px 0', textAlign: 'center', color: '#7a5b50' }}>Không có dữ liệu khảo sát.</p>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div style={{ padding: '16px', background: '#fdf7f4', borderRadius: '10px', border: '1px solid #ebdcd5' }}>
                <span style={{ fontSize: '13px', color: '#886255' }}>Điểm đánh giá trung bình:</span>
                <h3 style={{ fontSize: '32px', color: '#c2410c', margin: '6px 0', fontWeight: '800' }}>
                  {surveyData.average_rating || 0} <span style={{ fontSize: '18px', color: '#886255', fontWeight: 'normal' }}>/ 5.0 ★</span>
                </h3>
              </div>
              <div style={{ padding: '16px', background: '#f0f9ff', borderRadius: '10px', border: '1px solid #bae6fd' }}>
                <span style={{ fontSize: '13px', color: '#0369a1' }}>Tổng số phiếu khảo sát:</span>
                <h3 style={{ fontSize: '32px', color: '#0284c7', margin: '6px 0', fontWeight: '800' }}>
                  {surveyData.total_surveys || 0} <span style={{ fontSize: '18px', color: '#0369a1', fontWeight: 'normal' }}>phiếu</span>
                </h3>
              </div>
            </div>

            {surveyData.rating_distribution && (
              <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#fafafa', borderRadius: '8px', border: '1px solid #ebdcd5' }}>
                <span style={{ fontSize: '12px', color: '#886255', fontWeight: 'bold' }}>Phân bố đánh giá:</span>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {[5, 4, 3, 2, 1].map((star) => (
                    <span key={star} style={{ fontSize: '12px', background: '#fff', padding: '3px 10px', borderRadius: '6px', border: '1px solid #e2d2ca' }}>
                      {star} ★: <strong>{surveyData.rating_distribution[star] || 0}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <h4 style={{ margin: '0 0 10px', color: '#3d2b24' }}>Danh sách ý kiến đóng góp từ người tham dự:</h4>
            {(() => {
              const items = surveyData.surveys || surveyData.feedbacks || [];
              if (items.length === 0) {
                return <p style={{ color: '#7a5b50', fontSize: '13px', margin: '14px 0' }}>Chưa có ý kiến nhận xét chi tiết nào.</p>;
              }
              return (
                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  {items.map((fb, idx) => (
                    <div key={fb.survey_id || idx} style={{ padding: '12px', background: '#fbf8f6', borderRadius: '8px', border: '1px solid #ebdcd5', marginBottom: '8px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong>{fb.user_name || 'Người tham gia'} - {fb.rating} ★</strong>
                        <span style={{ fontSize: '11px', color: '#886255' }}>
                          {fb.submitted_at ? new Date(fb.submitted_at).toLocaleString('vi-VN') : ''}
                        </span>
                      </div>
                      <p style={{ margin: 0, color: '#4a3832', lineHeight: '1.4' }}>"{fb.feedback || 'Không có ghi chú'}"</p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: '20px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowSurveyModal(false)}
          >
            Đóng
          </button>
        </div>
      </Modal>

      {/* Modal Hủy Sự kiện */}
      <Modal
        isOpen={showCancelModal && !!selectedWorkshop}
        onClose={() => !isProcessing && setShowCancelModal(false)}
        title="Hủy Workshop"
        subtitle={`Sự kiện: ${selectedWorkshop?.title}`}
        size="md"
      >
        <form onSubmit={handleCancelWorkshop}>
          <div className="form-group">
            <label>Lý do hủy Workshop *</label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Nhập lý do hủy bỏ sự kiện..."
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
            <span>Cảnh báo: Việc hủy Workshop sẽ tự động hủy toàn bộ vé của người đăng ký và giải phóng tài nguyên.</span>
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
              type="submit"
              className="btn-danger"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <span className="btn-loading-wrapper">
                  <span className="mini-spinner" /> Đang hủy...
                </span>
              ) : (
                'Xác nhận Hủy Workshop'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

export default OrganizerWorkshopsPage;
