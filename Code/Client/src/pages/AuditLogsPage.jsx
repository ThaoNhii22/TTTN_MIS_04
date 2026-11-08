import { useEffect, useState } from 'react';
import Modal from '../components/ui/Modal';
import { useToast } from '../context/useToast';
import { getAuditLogs } from '../services/auditLogService';
import { formatDateTime } from '../utils/dateUtils';

function AuditLogsPage() {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function loadLogs() {
      setLoading(true);
      try {
        const params = {};
        if (actionFilter) params.action = actionFilter;
        if (entityFilter) params.target_entity = entityFilter;
        params.limit = 100;

        const data = await getAuditLogs(params);
        if (!ignore) {
          setLogs(data);
        }
      } catch (err) {
        console.error('Error fetching audit logs:', err);
        toast.apiError(err, 'Không thể tải nhật ký hoạt động hệ thống.');
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadLogs();
    return () => {
      ignore = true;
    };
  }, [actionFilter, entityFilter, reloadKey, toast]);

  const getActionBadgeClass = (action) => {
    if (action.includes('CREATE') || action.includes('APPROVE') || action.includes('REGISTER')) return 'status-tag--published';
    if (action.includes('CANCEL') || action.includes('REJECT') || action.includes('LOCK')) return 'status-tag--cancelled';
    if (action.includes('UPDATE') || action.includes('SUBMIT')) return 'status-tag--pending';
    return 'status-tag--draft';
  };

  return (
    <section className="audit-logs-page">
      <div className="home-page__header">
        <div>
          <h1>Nhật ký Hoạt động Hệ thống</h1>
          <p className="home-page__subtitle">
            Dữ liệu nhật ký máy chủ bất biến ghi vết toàn bộ hành vi người dùng và thay đổi dữ liệu quan trọng.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setReloadKey((k) => k + 1);
            toast.info('Đang làm mới dữ liệu nhật ký...');
          }}
        >
          Làm mới Nhật ký
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="workshop-toolbar" style={{ marginBottom: '20px' }}>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="filter-select"
        >
          <option value="">Tất cả hành động</option>
          <option value="CREATE_USER">CREATE_USER</option>
          <option value="UPDATE_ROLE">UPDATE_ROLE</option>
          <option value="UPDATE_STATUS">UPDATE_STATUS</option>
          <option value="CREATE_WORKSHOP">CREATE_WORKSHOP</option>
          <option value="UPDATE_WORKSHOP">UPDATE_WORKSHOP</option>
          <option value="SUBMIT_WORKSHOP">SUBMIT_WORKSHOP</option>
          <option value="APPROVE_WORKSHOP">APPROVE_WORKSHOP</option>
          <option value="REJECT_WORKSHOP">REJECT_WORKSHOP</option>
          <option value="CANCEL_BY_ORGANIZER">CANCEL_BY_ORGANIZER</option>
          <option value="FORCE_CANCEL_BY_ADMIN">FORCE_CANCEL_BY_ADMIN</option>
          <option value="REGISTER">REGISTER</option>
          <option value="CANCEL_REGISTRATION">CANCEL_REGISTRATION</option>
          <option value="CHECKIN">CHECKIN</option>
          <option value="SUBMIT_SURVEY">SUBMIT_SURVEY</option>
        </select>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="filter-select"
        >
          <option value="">Tất cả Thực thể</option>
          <option value="Workshops">Workshops</option>
          <option value="Users">Users</option>
          <option value="Registrations">Registrations</option>
          <option value="Attendance">Attendance</option>
          <option value="Surveys">Surveys</option>
        </select>
      </div>

      {loading ? (
        <div className="state-card state-card--loading" style={{ margin: '60px auto', textAlign: 'center' }}>
          <div className="state-card__spinner" />
          <p style={{ marginTop: '12px' }}>Đang tải nhật ký kiểm toán...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="workshop-empty">
          <div className="workshop-empty__icon">W</div>
          <h2>Không có bản ghi nhật ký phù hợp</h2>
          <p>Hãy thử thay đổi bộ lọc thao tác hoặc thực thể.</p>
        </div>
      ) : (
        <div className="admin-table-wrapper" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #ebdcd5', overflow: 'hidden' }}>
          <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fbf4f0', textAlign: 'left', borderBottom: '1px solid #ebdcd5' }}>
                <th style={{ padding: '14px 16px' }}>Mã log</th>
                <th style={{ padding: '14px 16px' }}>Hành động</th>
                <th style={{ padding: '14px 16px' }}>Thực thể</th>
                <th style={{ padding: '14px 16px' }}>Người thực hiện</th>
                <th style={{ padding: '14px 16px' }}>Thời gian</th>
                <th style={{ padding: '14px 16px' }}>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.audit_log_id} style={{ borderBottom: '1px solid #f2e6e0' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <code>LOG-{log.audit_log_id}</code>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <span className={`status-tag ${getActionBadgeClass(log.action)}`}>
                      {log.action}
                    </span>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <strong>{log.target_entity}</strong>
                    <div style={{ fontSize: '11px', color: '#886255' }}>ID: #{log.target_id}</div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div><strong>{log.actor_name || 'Hệ thống'}</strong></div>
                    <div style={{ fontSize: '11px', color: '#886255' }}>{log.actor_email}</div>
                  </td>

                  <td style={{ padding: '14px 16px', fontSize: '12px' }}>
                    {formatDateTime(log.timestamp)}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '12px', padding: '5px 10px' }}
                      onClick={() => setSelectedLog(log)}
                    >
                      Xem Diff
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Chi tiết Audit Log */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`Chi tiết Nhật ký Audit Log #${selectedLog?.audit_log_id}`}
        subtitle={`Thời gian: ${selectedLog ? new Date(selectedLog.timestamp).toLocaleString('vi-VN') : ''} | IP: ${selectedLog?.ip_address || '127.0.0.1'}`}
        size="lg"
      >
        {selectedLog && (
          <div>
            <div className="modal-info-box" style={{ margin: '0 0 16px' }}>
              <p>👤 <strong>Người thực hiện:</strong> {selectedLog.actor_name} ({selectedLog.actor_email})</p>
              <p>⚡ <strong>Hành động:</strong> <code>{selectedLog.action}</code> trên thực thể <strong>{selectedLog.target_entity}</strong> #{selectedLog.target_id}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '16px 0' }}>
              <div>
                <h4 style={{ fontSize: '13px', marginBottom: '6px', color: '#c53030', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>●</span> Dữ liệu trước khi sửa đổi (Old Value):
                </h4>
                <pre style={{ padding: '12px', background: '#fdf7f4', borderRadius: '8px', fontSize: '12px', overflowX: 'auto', border: '1px solid #ebdcd5', maxHeight: '240px' }}>
                  {JSON.stringify(selectedLog.old_value, null, 2) || 'null'}
                </pre>
              </div>

              <div>
                <h4 style={{ fontSize: '13px', marginBottom: '6px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>●</span> Dữ liệu sau khi sửa đổi (New Value):
                </h4>
                <pre style={{ padding: '12px', background: '#f0fdf4', borderRadius: '8px', fontSize: '12px', overflowX: 'auto', border: '1px solid #bbf7d0', maxHeight: '240px' }}>
                  {JSON.stringify(selectedLog.new_value, null, 2) || 'null'}
                </pre>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedLog(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}

export default AuditLogsPage;
