import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import { useToast } from '../context/useToast';
import { cancelWorkshop, getWorkshops, reviewWorkshop } from '../services/workshopService';

function AdminReviewPage() {
  const toast = useToast();
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');

  // Approve Confirmation
  const [workshopToApprove, setWorkshopToApprove] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);

  // Reject Modal
  const [selectedWorkshop, setSelectedWorkshop] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('Cần bổ sung chi tiết nội dung và diễn giả');

  // Force Cancel Modal
  const [showForceCancelModal, setShowForceCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Quản trị viên hủy bỏ sự kiện theo yêu cầu quản lý');

  const [isProcessing, setIsProcessing] = useState(false);
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
          // Lọc bỏ các workshop test (tiêu đề bắt đầu bằng "TEST")
          const filtered = data.filter(
            (w) => !w.title?.trim().toUpperCase().match(/^(TEST|Exception Test|Functional Test|Workshop Test|CONCURRENCY)/i)
          );
          setWorkshops(filtered);
        }
      } catch (err) {
        console.error('Error fetching workshops for review:', err);
        toast.apiError(err, 'Không thể tải danh sách sự kiện xét duyệt.');
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
  }, [statusFilter, reloadKey, toast]);

  const openApproveModal = (workshop) => {
    setWorkshopToApprove(workshop);
    setShowApproveModal(true);
  };

  const handleConfirmApprove = async () => {
    if (!workshopToApprove) return;
    setIsProcessing(true);
    try {
      await reviewWorkshop(workshopToApprove.workshop_id, { action: 'approve' });
      toast.success(`Đã phê duyệt sự kiện "${workshopToApprove.title}". Workshop hiện đã được công bố mở đăng ký.`);
      setShowApproveModal(false);
      setWorkshopToApprove(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.apiError(err, 'Phê duyệt Workshop thất bại.');
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
      toast.success(`Đã từ chối Workshop "${selectedWorkshop.title}" và trả lại trạng thái Bản nháp cho Ban tổ chức.`);
      setSelectedWorkshop(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.apiError(err, 'Từ chối Workshop thất bại.');
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
      toast.success(`Quản trị viên đã hủy Workshop "${selectedWorkshop.title}". Toàn bộ vé đăng ký liên quan đã được hủy.`);
      setSelectedWorkshop(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.apiError(err, 'Cưỡng chế hủy Workshop thất bại.');
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
                            onClick={() => openApproveModal(w)}
                            disabled={isProcessing}
                          >
                            Phê duyệt
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

      {/* Confirmation Dialog Phê duyệt Workshop */}
      <ConfirmDialog
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        onConfirm={handleConfirmApprove}
        title="Phê duyệt Workshop"
        message={`Bạn có chắc chắn muốn PHÊ DUYỆT Workshop "${workshopToApprove?.title}"? Sự kiện sẽ được chuyển sang trạng thái "Đã công bố" và cho phép người tham gia đăng ký.`}
        confirmText="Xác nhận Phê duyệt"
        variant="primary"
        isLoading={isProcessing}
      />

      {/* Modal Từ chối Workshop */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => !isProcessing && setShowRejectModal(false)}
        title="Từ chối Phê duyệt Workshop"
        subtitle={`Sự kiện: ${selectedWorkshop?.title}`}
        size="md"
      >
        <form onSubmit={handleReject}>
          <div className="form-group">
            <label>Lý do từ chối gửi lại Ban tổ chức *</label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Nhập lý do cụ thể để Ban tổ chức biết và chỉnh sửa bổ sung..."
              rows="4"
              required
            />
          </div>

          <div className="modal-actions" style={{ marginTop: '20px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowRejectModal(false)}
              disabled={isProcessing}
            >
              Hủy
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
                'Xác nhận Từ chối'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Cưỡng chế Hủy Workshop */}
      <Modal
        isOpen={showForceCancelModal}
        onClose={() => !isProcessing && setShowForceCancelModal(false)}
        title="Quản trị viên Cưỡng chế Hủy Workshop"
        subtitle={`Sự kiện: ${selectedWorkshop?.title}`}
        size="md"
      >
        <form onSubmit={handleForceCancel}>
          <div className="form-group">
            <label>Lý do cưỡng chế hủy sự kiện *</label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Nhập lý do hủy bỏ sự kiện..."
              rows="4"
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
            <span>Hành động này sẽ hủy toàn bộ vé của người đăng ký và được ghi vết kiểm toán vĩnh viễn vào hệ thống.</span>
          </div>

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
              {isProcessing ? (
                <span className="btn-loading-wrapper">
                  <span className="mini-spinner" /> Đang hủy...
                </span>
              ) : (
                'Cưỡng chế Hủy Workshop'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

export default AdminReviewPage;
