import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cancelWorkshop, getWorkshops, reviewWorkshop } from '../services/workshopService';

function AdminReviewPage() {
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');

  // Reject Modal
  const [selectedWorkshop, setSelectedWorkshop] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('Cần bổ sung chi tiết nội dung và diễn giả');

  // Force Cancel Modal
  const [showForceCancelModal, setShowForceCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Quản trị viên hủy bỏ sự kiện theo yêu cầu quản lý');

  const [isProcessing, setIsProcessing] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function loadWorkshops() {
      setLoading(true);
      try {
        const params = {};
        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }
        const data = await getWorkshops(params);
        if (!ignore) {
          setWorkshops(data);
        }
      } catch (err) {
        console.error('Error fetching workshops for review:', err);
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
  }, [statusFilter, reloadKey]);

  const handleApprove = async (workshopId) => {
    if (!window.confirm('Bạn có chắc chắn muốn PHÊ DUYỆT Workshop này và công bố mở đăng ký?')) return;
    setIsProcessing(true);
    try {
      await reviewWorkshop(workshopId, { action: 'approve' });
      setAlertMessage({ type: 'success', text: 'Đã phê duyệt Workshop thành công. Sự kiện đã chuyển sang Đã công bố.' });
      setReloadKey((k) => k + 1);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setAlertMessage({ type: 'error', text: typeof detail === 'string' ? detail : 'Phê duyệt thất bại.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!selectedWorkshop) return;
    setIsProcessing(true);
    try {
      await reviewWorkshop(selectedWorkshop.workshop_id, {
        action: 'reject',
        rejection_reason: rejectionReason,
      });
      setShowRejectModal(false);
      setSelectedWorkshop(null);
      setAlertMessage({ type: 'success', text: 'Đã từ chối Workshop và chuyển về trạng thái Bản nháp kèm lý do.' });
      setReloadKey((k) => k + 1);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setAlertMessage({ type: 'error', text: typeof detail === 'string' ? detail : 'Từ chối thất bại.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleForceCancel = async (e) => {
    e.preventDefault();
    if (!selectedWorkshop) return;
    setIsProcessing(true);
    try {
      await cancelWorkshop(selectedWorkshop.workshop_id, cancelReason);
      setShowForceCancelModal(false);
      setSelectedWorkshop(null);
      setAlertMessage({ type: 'success', text: 'Quản trị viên đã cưỡng chế hủy Workshop.' });
      setReloadKey((k) => k + 1);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setAlertMessage({ type: 'error', text: typeof detail === 'string' ? detail : 'Cưỡng chế hủy thất bại.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section className="admin-review-page">
      <div className="home-page__header">
        <div>
          <h1>Xét duyệt và Kiểm soát Workshop</h1>
          <p className="home-page__subtitle">
            Kiểm duyệt các Workshop do Ban tổ chức gửi lên trước khi công bố ra toàn hệ thống.
          </p>
        </div>
      </div>

      {alertMessage && (
        <div className={`alert-banner alert-banner--${alertMessage.type}`} style={{ marginBottom: '20px' }}>
          <div>{alertMessage.text}</div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="filter-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {[
          { key: 'pending', label: 'Chờ phê duyệt' },
          { key: 'published', label: 'Đã công bố' },
          { key: 'all', label: 'Tất cả trạng thái' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tab-btn ${statusFilter === tab.key ? 'active' : ''}`}
            onClick={() => setStatusFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="state-card state-card--loading" style={{ margin: '60px auto', textAlign: 'center' }}>
          <div className="state-card__spinner" />
          <p style={{ marginTop: '12px' }}>Đang tải danh sách sự kiện xét duyệt...</p>
        </div>
      ) : workshops.length === 0 ? (
        <div className="workshop-empty">
          <div className="workshop-empty__icon">W</div>
          <h2>Không có Workshop nào cần xử lý</h2>
          <p>Hiện không có sự kiện nào trong danh mục này.</p>
        </div>
      ) : (
        <div className="admin-table-wrapper" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #ebdcd5', overflow: 'hidden' }}>
          <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fbf4f0', textAlign: 'left', borderBottom: '1px solid #ebdcd5' }}>
                <th style={{ padding: '14px 16px' }}>Workshop</th>
                <th style={{ padding: '14px 16px' }}>Trạng thái</th>
                <th style={{ padding: '14px 16px' }}>Thời gian sự kiện</th>
                <th style={{ padding: '14px 16px' }}>Số lượng chỗ</th>
                <th style={{ padding: '14px 16px' }}>Hành động xét duyệt</th>
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
                    <p style={{ fontSize: '13px', color: '#7a5b50', margin: '4px 0 0' }}>
                      {w.description?.slice(0, 100)}...
                    </p>
                    <div style={{ fontSize: '12px', color: '#886255', marginTop: '4px' }}>
                      Địa điểm: {w.location}
                    </div>
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
                    <strong>{w.quota}</strong> chỗ
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {w.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            className="home-page__primary-button"
                            style={{ fontSize: '12px', padding: '6px 12px' }}
                            onClick={() => handleApprove(w.workshop_id)}
                            disabled={isProcessing}
                          >
                            Duyệt
                          </button>
                          <button
                            type="button"
                            className="btn-danger-outline"
                            style={{ fontSize: '12px', padding: '6px 12px' }}
                            onClick={() => {
                              setSelectedWorkshop(w);
                              setShowRejectModal(true);
                            }}
                            disabled={isProcessing}
                          >
                            Từ chối
                          </button>
                        </>
                      )}

                      {w.status === 'published' && (
                        <button
                          type="button"
                          className="btn-danger-outline"
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                          onClick={() => {
                            setSelectedWorkshop(w);
                            setShowForceCancelModal(true);
                          }}
                          disabled={isProcessing}
                        >
                          Cưỡng chế Hủy
                        </button>
                      )}

                      <Link
                        to={`/workshops/${w.workshop_id}`}
                        className="btn-secondary"
                        style={{ fontSize: '12px', padding: '6px 12px', textDecoration: 'none' }}
                      >
                        Chi tiết
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Từ chối Workshop */}
      {showRejectModal && selectedWorkshop && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2>Từ chối Workshop</h2>
            <p>Workshop: <strong>{selectedWorkshop.title}</strong></p>

            <form onSubmit={handleReject}>
              <div className="form-group" style={{ marginTop: '14px' }}>
                <label>Lý do từ chối gửi lại Ban tổ chức *</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Nhập lý do từ chối để ban tổ chức chỉnh sửa..."
                  rows="3"
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowRejectModal(false)}
                  disabled={isProcessing}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="btn-danger"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Đang xử lý...' : 'Xác nhận Từ chối'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cưỡng chế Hủy Workshop */}
      {showForceCancelModal && selectedWorkshop && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2>Quản trị viên Cưỡng chế Hủy Workshop</h2>
            <p>Sự kiện: <strong>{selectedWorkshop.title}</strong></p>

            <form onSubmit={handleForceCancel}>
              <div className="form-group" style={{ marginTop: '14px' }}>
                <label>Lý do cưỡng chế hủy *</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows="3"
                  required
                />
              </div>

              <small style={{ color: '#c53030', display: 'block', margin: '8px 0' }}>
                Hành động này sẽ được ghi vết vào Nhật ký hoạt động hệ thống.
              </small>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowForceCancelModal(false)}
                  disabled={isProcessing}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="btn-danger"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Đang hủy...' : 'Cưỡng chế Hủy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminReviewPage;
