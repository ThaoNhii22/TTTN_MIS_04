import { useEffect, useState } from 'react';
import { getAuditLogs } from '../services/auditLogService';

function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.target_entity = entityFilter;
      params.limit = 100;

      const data = await getAuditLogs(params);
      setLogs(data);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, entityFilter]);

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
          <p className="home-page__eyebrow">SECURITY & AUDIT LOGS (UC-20, BR-10)</p>
          <h1>Nhật ký Hoạt động Hệ thống</h1>
          <p className="home-page__subtitle">
            Dữ liệu nhật ký máy chủ bất biến (Read-only / Immutable) ghi vết toàn bộ hành vi người dùng và thay đổi dữ liệu quan trọng.
          </p>
        </div>

        <button type="button" className="btn-secondary" onClick={fetchLogs}>
          ⟳ Làm mới Nhật ký
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="workshop-toolbar" style={{ marginBottom: '20px' }}>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="filter-select"
        >
          <option value="">Tất cả hành động (Actions)</option>
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
          <option value="">Tất cả Thực thể (Entities)</option>
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
          <div className="workshop-empty__icon">📜</div>
          <h2>Không có bản ghi nhật ký nào</h2>
          <p>Không tìm thấy bản ghi theo bộ lọc đã chọn.</p>
        </div>
      ) : (
        <div className="audit-table-wrapper" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #ebdcd5', overflow: 'hidden' }}>
          <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fbf4f0', textAlign: 'left', borderBottom: '1px solid #ebdcd5' }}>
                <th style={{ padding: '12px 14px' }}>Thời gian (Timestamp)</th>
                <th style={{ padding: '12px 14px' }}>Người thực hiện (Actor)</th>
                <th style={{ padding: '12px 14px' }}>Hành động (Action)</th>
                <th style={{ padding: '12px 14px' }}>Thực thể (Target)</th>
                <th style={{ padding: '12px 14px' }}>Địa chỉ IP</th>
                <th style={{ padding: '12px 14px' }}>Chi tiết thay đổi</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.audit_log_id} style={{ borderBottom: '1px solid #f2e6e0' }}>
                  <td style={{ padding: '12px 14px', fontSize: '12px' }}>
                    {new Date(log.timestamp).toLocaleString('vi-VN')}
                  </td>

                  <td style={{ padding: '12px 14px' }}>
                    <strong>{log.actor_name || `User #${log.actor_id}`}</strong>
                    <div style={{ fontSize: '11px', color: '#886255' }}>{log.actor_email}</div>
                  </td>

                  <td style={{ padding: '12px 14px' }}>
                    <span className={`status-tag ${getActionBadgeClass(log.action)}`}>
                      {log.action}
                    </span>
                  </td>

                  <td style={{ padding: '12px 14px', fontSize: '13px' }}>
                    <strong>{log.target_entity}</strong> #{log.target_id}
                  </td>

                  <td style={{ padding: '12px 14px', fontSize: '12px' }}>
                    <code>{log.ip_address || '127.0.0.1'}</code>
                  </td>

                  <td style={{ padding: '12px 14px' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                      onClick={() => setSelectedLog(log)}
                    >
                      🔍 Xem Diff JSON
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Chi tiết Audit Log */}
      {selectedLog && (
        <div className="modal-backdrop">
          <div className="modal-content modal-content--large">
            <h2>Chi tiết Nhật ký Audit Log #{selectedLog.audit_log_id}</h2>
            <div style={{ margin: '14px 0', fontSize: '13px', lineHeight: '1.6' }}>
              <p>👤 Người thực hiện: <strong>{selectedLog.actor_name}</strong> ({selectedLog.actor_email})</p>
              <p>⚡ Hành động: <code>{selectedLog.action}</code> trên <strong>{selectedLog.target_entity}</strong> #{selectedLog.target_id}</p>
              <p>🕒 Thời gian: {new Date(selectedLog.timestamp).toLocaleString('vi-VN')} | 🌐 IP: {selectedLog.ip_address}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '16px 0' }}>
              <div>
                <h4 style={{ fontSize: '13px', marginBottom: '6px', color: '#c53030' }}>Giá trị cũ (Old Value):</h4>
                <pre style={{ padding: '12px', background: '#fdf7f4', borderRadius: '6px', fontSize: '11px', overflowX: 'auto', border: '1px solid #ebdcd5' }}>
                  {JSON.stringify(selectedLog.old_value, null, 2) || 'null'}
                </pre>
              </div>

              <div>
                <h4 style={{ fontSize: '13px', marginBottom: '6px', color: '#2f855a' }}>Giá trị mới (New Value):</h4>
                <pre style={{ padding: '12px', background: '#f6ffed', borderRadius: '6px', fontSize: '11px', overflowX: 'auto', border: '1px solid #b7eb8f' }}>
                  {JSON.stringify(selectedLog.new_value, null, 2) || 'null'}
                </pre>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedLog(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default AuditLogsPage;
