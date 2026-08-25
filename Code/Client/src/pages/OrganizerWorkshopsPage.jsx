import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  cancelWorkshop,
  createWorkshop,
  getWorkshops,
  submitWorkshopForApproval,
  updateWorkshop,
} from '../services/workshopService';
import { getWorkshopRegistrations } from '../services/registrationService';
import { getWorkshopAttendanceList } from '../services/attendanceService';
import { getWorkshopSurveys } from '../services/surveyService';

function OrganizerWorkshopsPage() {
  const { user } = useAuth();
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals & Action States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedWorkshop, setSelectedWorkshop] = useState(null);

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
  const [alertMessage, setAlertMessage] = useState(null);

  const fetchMyWorkshops = async () => {
    setLoading(true);
    try {
      const data = await getWorkshops({ my_organized: true });
      setWorkshops(data);
    } catch (err) {
      console.error('Error fetching organized workshops:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyWorkshops();
  }, []);

  const openCreateModal = () => {
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    const startStr = new Date(tomorrow.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 16);
    const endStr = new Date(tomorrow.getTime() + 12 * 3600 * 1000).toISOString().slice(0, 16);

    setFormData({
      title: '',
      description: '',
      location: 'Phòng Hội thảo A101',
      start_at: startStr,
      end_at: endStr,
      registration_open_at: new Date().toISOString().slice(0, 16),
      registration_close_at: startStr,
      quota: 40,
      checkin_start_at: new Date(new Date(startStr).getTime() - 45 * 60 * 1000).toISOString().slice(0, 16),
      checkin_end_at: new Date(new Date(startStr).getTime() + 60 * 60 * 1000).toISOString().slice(0, 16),
    });
    setShowCreateModal(true);
  };

  const openEditModal = (w) => {
    setSelectedWorkshop(w);
    setFormData({
      title: w.title,
      description: w.description || '',
      location: w.location,
      start_at: w.start_at ? new Date(w.start_at).toISOString().slice(0, 16) : '',
      end_at: w.end_at ? new Date(w.end_at).toISOString().slice(0, 16) : '',
      registration_open_at: w.registration_open_at ? new Date(w.registration_open_at).toISOString().slice(0, 16) : '',
      registration_close_at: w.registration_close_at ? new Date(w.registration_close_at).toISOString().slice(0, 16) : '',
      quota: w.quota,
      checkin_start_at: w.checkin_start_at ? new Date(w.checkin_start_at).toISOString().slice(0, 16) : '',
      checkin_end_at: w.checkin_end_at ? new Date(w.checkin_end_at).toISOString().slice(0, 16) : '',
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
      setAlertMessage({ type: 'success', text: 'Tạo bản nháp Workshop thành công (UC-03, BR-07)!' });
      fetchMyWorkshops();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setAlertMessage({ type: 'error', text: typeof detail === 'string' ? detail : 'Không thể tạo workshop.' });
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
      setAlertMessage({ type: 'success', text: 'Cập nhật thông tin Workshop thành công (UC-04)!' });
      fetchMyWorkshops();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setAlertMessage({ type: 'error', text: typeof detail === 'string' ? detail : 'Cập nhật thất bại.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitApproval = async (workshopId) => {
    if (!window.confirm('Bạn có chắc chắn muốn gửi Workshop này cho Quản trị viên xét duyệt?')) return;
    try {
      await submitWorkshopForApproval(workshopId);
      setAlertMessage({ type: 'success', text: 'Đã gửi Workshop đi xét duyệt (UC-05 - Pending Approval)!' });
      fetchMyWorkshops();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setAlertMessage({ type: 'error', text: typeof detail === 'string' ? detail : 'Gửi xét duyệt thất bại.' });
    }
  };

  const handleCancelWorkshop = async (e) => {
    e.preventDefault();
    if (!selectedWorkshop) return;
    setIsProcessing(true);
    try {
      await cancelWorkshop(selectedWorkshop.workshop_id, cancelReason);
      setShowCancelModal(false);
      setSelectedWorkshop(null);
      setAlertMessage({ type: 'success', text: 'Đã hủy Workshop thành công. Toàn bộ đăng ký liên quan đã được tự động hủy (BR-13).' });
      fetchMyWorkshops();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setAlertMessage({ type: 'error', text: typeof detail === 'string' ? detail : 'Hủy Workshop thất bại.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Open Attendees Modal (UC-11)
  const openAttendeesModal = async (w) => {
    setSelectedWorkshop(w);
    setShowAttendeesModal(true);
    setLoadingAttendees(true);
    try {
      const data = await getWorkshopRegistrations(w.workshop_id);
      setAttendeesList(data);
    } catch (err) {
      console.error('Error loading attendees:', err);
    } finally {
      setLoadingAttendees(false);
    }
  };

  // Open Live Attendance Modal (UC-13)
  const openAttendanceModal = async (w) => {
    setSelectedWorkshop(w);
    setShowAttendanceModal(true);
    setLoadingAttendance(true);
    try {
      const data = await getWorkshopAttendanceList(w.workshop_id);
      setAttendanceRecords(data);
    } catch (err) {
      console.error('Error loading attendance list:', err);
    } finally {
      setLoadingAttendance(false);
    }
  };

  // Open Survey Analytics Modal (UC-17)
  const openSurveyModal = async (w) => {
    setSelectedWorkshop(w);
    setShowSurveyModal(true);
    setLoadingSurvey(true);
    try {
      const data = await getWorkshopSurveys(w.workshop_id);
      setSurveyData(data);
    } catch (err) {
      console.error('Error loading surveys:', err);
    } finally {
      setLoadingSurvey(false);
    }
  };

  return (
    <section className="organizer-page">
      <div className="home-page__header">
        <div>
          <p className="home-page__eyebrow">ORGANIZER WORKSPACE (UC-03 to UC-07, UC-11, UC-13, UC-17)</p>
          <h1>Quản lý Workshop của bạn</h1>
          <p className="home-page__subtitle">
            Tạo mới, chỉnh sửa, gửi duyệt, quản lý danh sách đăng ký, điểm danh và xem kết quả khảo sát.
          </p>
        </div>

        <button type="button" className="home-page__primary-button" onClick={openCreateModal}>
          + Tạo Workshop Mới (UC-03)
        </button>
      </div>

      {alertMessage && (
        <div className={`alert-banner alert-banner--${alertMessage.type}`} style={{ marginBottom: '20px' }}>
          <span>{alertMessage.type === 'success' ? '✅' : '⚠️'}</span>
          <div>{alertMessage.text}</div>
        </div>
      )}

      {loading ? (
        <div className="state-card state-card--loading" style={{ margin: '60px auto', textAlign: 'center' }}>
          <div className="state-card__spinner" />
          <p style={{ marginTop: '12px' }}>Đang tải danh sách workshop...</p>
        </div>
      ) : workshops.length === 0 ? (
        <div className="workshop-empty">
          <div className="workshop-empty__icon">📅</div>
          <h2>Bạn chưa tạo Workshop nào</h2>
          <p>Bấm nút "Tạo Workshop Mới" ở trên để bắt đầu khởi tạo sự kiện của bạn.</p>
        </div>
      ) : (
        <div className="organizer-table-wrapper" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #ebdcd5', overflow: 'hidden' }}>
          <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fbf4f0', textAlign: 'left', borderBottom: '1px solid #ebdcd5' }}>
                <th style={{ padding: '14px 16px' }}>Tiêu đề Workshop</th>
                <th style={{ padding: '14px 16px' }}>Trạng thái</th>
                <th style={{ padding: '14px 16px' }}>Thời gian</th>
                <th style={{ padding: '14px 16px' }}>Chỗ (Đã đăng ký / Quota)</th>
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
                    <div style={{ fontSize: '12px', color: '#886255', marginTop: '4px' }}>📍 {w.location}</div>
                    {w.rejection_reason && (
                      <div style={{ fontSize: '12px', color: '#c53030', marginTop: '4px' }}>
                        ⚠️ Lý do từ chối: {w.rejection_reason}
                      </div>
                    )}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <span className={`status-tag status-tag--${w.status}`}>
                      {w.status.toUpperCase()}
                    </span>
                  </td>

                  <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                    {new Date(w.start_at).toLocaleString('vi-VN')}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <strong>{w.confirmed_count}/{w.quota}</strong>
                    {w.waitlist_count > 0 && (
                      <span style={{ fontSize: '11px', color: '#b7791f', display: 'block' }}>
                        ⏳ {w.waitlist_count} trong waitlist
                      </span>
                    )}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {/* Draft actions */}
                      {w.status === 'draft' && (
                        <>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: '12px', padding: '5px 10px' }}
                            onClick={() => openEditModal(w)}
                          >
                            ✏️ Sửa
                          </button>
                          <button
                            type="button"
                            className="home-page__primary-button"
                            style={{ fontSize: '12px', padding: '5px 10px' }}
                            onClick={() => handleSubmitApproval(w.workshop_id)}
                          >
                            🚀 Gửi duyệt
                          </button>
                        </>
                      )}

                      {/* Published / Completed actions */}
                      {w.status !== 'draft' && w.status !== 'pending' && (
                        <>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: '12px', padding: '5px 10px' }}
                            onClick={() => openAttendeesModal(w)}
                          >
                            👥 Đăng ký ({w.confirmed_count + w.waitlist_count})
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: '12px', padding: '5px 10px' }}
                            onClick={() => openAttendanceModal(w)}
                          >
                            📋 Điểm danh ({w.attended_count})
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: '12px', padding: '5px 10px' }}
                            onClick={() => openSurveyModal(w)}
                          >
                            ⭐ Khảo sát
                          </button>
                        </>
                      )}

                      {/* Cancel action */}
                      {w.status !== 'cancelled' && w.status !== 'completed' && (
                        <button
                          type="button"
                          className="btn-danger-outline"
                          style={{ fontSize: '12px', padding: '5px 10px' }}
                          onClick={() => {
                            setSelectedWorkshop(w);
                            setShowCancelModal(true);
                          }}
                        >
                          Hủy sự kiện
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

      {/* Modal Tạo Workshop (UC-03) */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-content modal-content--large">
            <h2>Tạo Workshop Mới (Khởi tạo Bản nháp - BR-07)</h2>
            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label>Tiêu đề Workshop *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ví dụ: AI & Machine Learning in Practice"
                  required
                />
              </div>

              <div className="form-group">
                <label>Mô tả chi tiết *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mục tiêu, nội dung giảng dạy, đối tượng tham gia..."
                  rows="4"
                  required
                />
              </div>

              <div className="form-row-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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

              <div className="form-row-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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

              <div className="modal-actions">
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
                  {isProcessing ? 'Đang tạo...' : 'Lưu Bản nháp (Create Draft)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chỉnh sửa Workshop (UC-04) */}
      {showEditModal && selectedWorkshop && (
        <div className="modal-backdrop">
          <div className="modal-content modal-content--large">
            <h2>Chỉnh sửa Workshop (UC-04)</h2>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>Tiêu đề Workshop</label>
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
                  rows="4"
                  required
                />
              </div>

              <div className="form-row-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Địa điểm</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Giới hạn Quota</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quota}
                    onChange={(e) => setFormData({ ...formData, quota: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
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
                  {isProcessing ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xem Danh sách Đăng ký & Waitlist (UC-11) */}
      {showAttendeesModal && selectedWorkshop && (
        <div className="modal-backdrop">
          <div className="modal-content modal-content--large">
            <h2>Danh sách Đăng ký & Waitlist (UC-11)</h2>
            <p>Workshop: <strong>{selectedWorkshop.title}</strong></p>

            {loadingAttendees ? (
              <p>Đang tải danh sách...</p>
            ) : attendeesList.length === 0 ? (
              <p style={{ margin: '20px 0', color: '#7a5b50' }}>Chưa có lượt đăng ký nào.</p>
            ) : (
              <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto', margin: '16px 0' }}>
                <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#fbf4f0', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px' }}>Mã</th>
                      <th style={{ padding: '8px 12px' }}>Họ và tên</th>
                      <th style={{ padding: '8px 12px' }}>Email</th>
                      <th style={{ padding: '8px 12px' }}>Trạng thái</th>
                      <th style={{ padding: '8px 12px' }}>Vị trí Waitlist</th>
                      <th style={{ padding: '8px 12px' }}>Thời gian đăng ký</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendeesList.map((a) => (
                      <tr key={a.registration_id} style={{ borderBottom: '1px solid #f2e6e0' }}>
                        <td style={{ padding: '8px 12px' }}><code>REG-{a.registration_id}</code></td>
                        <td style={{ padding: '8px 12px' }}><strong>{a.user_name}</strong></td>
                        <td style={{ padding: '8px 12px' }}>{a.user_email}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span className={`status-tag status-tag--${a.status}`}>{a.status}</span>
                        </td>
                        <td style={{ padding: '8px 12px' }}>{a.waitlist_position ? `#${a.waitlist_position}` : '--'}</td>
                        <td style={{ padding: '8px 12px', fontSize: '12px' }}>{new Date(a.registered_at).toLocaleString('vi-VN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowAttendeesModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bảng Điểm danh Thời gian thực (UC-13) */}
      {showAttendanceModal && selectedWorkshop && (
        <div className="modal-backdrop">
          <div className="modal-content modal-content--large">
            <h2>Bảng Điểm danh Sự kiện (UC-13)</h2>
            <p>Workshop: <strong>{selectedWorkshop.title}</strong></p>

            {loadingAttendance ? (
              <p>Đang tải dữ liệu điểm danh...</p>
            ) : attendanceRecords.length === 0 ? (
              <p style={{ margin: '20px 0', color: '#7a5b50' }}>Chưa có ai điểm danh cho workshop này.</p>
            ) : (
              <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto', margin: '16px 0' }}>
                <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#fbf4f0', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px' }}>Mã Attendance</th>
                      <th style={{ padding: '8px 12px' }}>Người tham gia</th>
                      <th style={{ padding: '8px 12px' }}>Email</th>
                      <th style={{ padding: '8px 12px' }}>Phương thức</th>
                      <th style={{ padding: '8px 12px' }}>Thời gian Check-in</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.map((att) => (
                      <tr key={att.attendance_id} style={{ borderBottom: '1px solid #f2e6e0' }}>
                        <td style={{ padding: '8px 12px' }}><code>ATT-{att.attendance_id}</code></td>
                        <td style={{ padding: '8px 12px' }}><strong>{att.user_name}</strong></td>
                        <td style={{ padding: '8px 12px' }}>{att.user_email}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span className="status-tag status-tag--draft">{att.checkin_method}</span>
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: '12px' }}>{new Date(att.checkin_at).toLocaleString('vi-VN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowAttendanceModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Phân tích Khảo sát (UC-17) */}
      {showSurveyModal && selectedWorkshop && (
        <div className="modal-backdrop">
          <div className="modal-content modal-content--large">
            <h2>Kết quả Khảo sát & Đánh giá (UC-17)</h2>
            <p>Workshop: <strong>{selectedWorkshop.title}</strong></p>

            {loadingSurvey ? (
              <p>Đang tải kết quả khảo sát...</p>
            ) : !surveyData ? (
              <p>Không có dữ liệu khảo sát.</p>
            ) : (
              <div style={{ margin: '16px 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ padding: '16px', background: '#fdf7f4', borderRadius: '8px', border: '1px solid #ebdcd5' }}>
                    <span style={{ fontSize: '12px', color: '#886255' }}>Điểm đánh giá trung bình:</span>
                    <h3 style={{ fontSize: '28px', color: '#c2410c', margin: '6px 0' }}>
                      {surveyData.average_rating} / 5.0 ⭐
                    </h3>
                  </div>
                  <div style={{ padding: '16px', background: '#fdf7f4', borderRadius: '8px', border: '1px solid #ebdcd5' }}>
                    <span style={{ fontSize: '12px', color: '#886255' }}>Tổng số phản hồi:</span>
                    <h3 style={{ fontSize: '28px', color: '#2b6cb0', margin: '6px 0' }}>
                      {surveyData.total_surveys} phiếu
                    </h3>
                  </div>
                </div>

                <h3>Danh sách ý kiến đóng góp từ học viên:</h3>
                {surveyData.feedbacks.length === 0 ? (
                  <p style={{ color: '#7a5b50', fontSize: '13px' }}>Chưa có ý kiến nhận xét chi tiết nào.</p>
                ) : (
                  <div style={{ maxHeight: '250px', overflowY: 'auto', marginTop: '8px' }}>
                    {surveyData.feedbacks.map((fb, idx) => (
                      <div key={idx} style={{ padding: '10px', background: '#fcfcfc', borderBottom: '1px solid #f0e6e2', fontSize: '13px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <strong>{fb.user_name || 'Học viên ẩn danh'} ({fb.rating}★)</strong>
                          <span style={{ fontSize: '11px', color: '#886255' }}>{new Date(fb.submitted_at).toLocaleString('vi-VN')}</span>
                        </div>
                        <p style={{ margin: 0, color: '#4a3832' }}>"{fb.feedback || 'Không có ghi chú'}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowSurveyModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hủy Sự kiện (UC-07) */}
      {showCancelModal && selectedWorkshop && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2>Hủy Workshop (UC-07)</h2>
            <p>Hủy sự kiện: <strong>{selectedWorkshop.title}</strong></p>

            <form onSubmit={handleCancelWorkshop}>
              <div className="form-group" style={{ marginTop: '14px' }}>
                <label>Lý do hủy Workshop *</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Nhập lý do hủy bỏ sự kiện..."
                  rows="3"
                  required
                />
              </div>

              <small style={{ color: '#c53030', display: 'block', margin: '8px 0' }}>
                ⚠️ Cảnh báo: Việc hủy workshop sẽ tự động hủy toàn bộ vé đã đăng ký và gửi thông báo hệ thống (BR-13).
              </small>

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
                  {isProcessing ? 'Đang hủy...' : 'Xác nhận Hủy Workshop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default OrganizerWorkshopsPage;
