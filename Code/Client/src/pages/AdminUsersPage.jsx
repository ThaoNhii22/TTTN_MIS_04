import { useEffect, useState } from 'react';
import { createInternalUser, getUsers, updateUserRole, updateUserStatus } from '../services/userService';

function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Create User Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'participant',
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);

  const [appliedSearch, setAppliedSearch] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function loadUsers() {
      setLoading(true);
      try {
        const params = {};
        if (appliedSearch.trim()) params.search = appliedSearch.trim();
        if (roleFilter) params.role = roleFilter;
        if (statusFilter) params.status_filter = statusFilter;

        const data = await getUsers(params);
        if (!ignore) {
          setUsers(data);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadUsers();
    return () => {
      ignore = true;
    };
  }, [roleFilter, statusFilter, appliedSearch, reloadKey]);

  const handleSearch = (e) => {
    e.preventDefault();
    setAppliedSearch(searchTerm);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await createInternalUser(formData);
      setShowCreateModal(false);
      setFormData({ full_name: '', email: '', password: '', role: 'participant' });
      setAlertMessage({ type: 'success', text: 'Cấp tài khoản nội bộ mới thành công.' });
      setReloadKey((k) => k + 1);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setAlertMessage({ type: 'error', text: typeof detail === 'string' ? detail : 'Cấp tài khoản thất bại.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole);
      setAlertMessage({ type: 'success', text: 'Cập nhật phân quyền vai trò thành công.' });
      setReloadKey((k) => k + 1);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setAlertMessage({ type: 'error', text: typeof detail === 'string' ? detail : 'Đổi vai trò thất bại.' });
    }
  };

  const handleStatusToggle = async (user) => {
    const newStatus = user.status === 'active' ? 'locked' : 'active';
    const actionText = newStatus === 'locked' ? 'khóa' : 'mở khóa';
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản của ${user.full_name}?`)) return;

    try {
      await updateUserStatus(user.user_id, newStatus);
      setAlertMessage({ type: 'success', text: `Đã ${actionText} tài khoản thành công.` });
      setReloadKey((k) => k + 1);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setAlertMessage({ type: 'error', text: typeof detail === 'string' ? detail : 'Thao tác thất bại.' });
    }
  };

  return (
    <section className="admin-users-page">
      <div className="home-page__header">
        <div>
          <h1>Quản lý Tài khoản và Phân quyền</h1>
          <p className="home-page__subtitle">
            Cấp tài khoản nội bộ, phân quyền vai trò và kiểm soát trạng thái hoạt động.
          </p>
        </div>

        <button type="button" className="home-page__primary-button" onClick={() => setShowCreateModal(true)}>
          + Cấp Tài khoản Mới
        </button>
      </div>

      {alertMessage && (
        <div className={`alert-banner alert-banner--${alertMessage.type}`} style={{ marginBottom: '20px' }}>
          <div>{alertMessage.text}</div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="workshop-toolbar" style={{ marginBottom: '20px' }}>
        <form className="workshop-search" onSubmit={handleSearch}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="M16 16L20 20" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          <input
            type="text"
            placeholder="Tìm theo tên hoặc email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit" className="search-submit-btn">Tìm</button>
        </form>

        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="filter-select">
          <option value="">Tất cả vai trò</option>
          <option value="admin">Quản trị viên</option>
          <option value="organizer">Ban tổ chức</option>
          <option value="participant">Người tham gia</option>
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
          <option value="">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="locked">Khóa</option>
        </select>
      </div>

      {loading ? (
        <div className="state-card state-card--loading" style={{ margin: '60px auto', textAlign: 'center' }}>
          <div className="state-card__spinner" />
          <p style={{ marginTop: '12px' }}>Đang tải danh sách tài khoản...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="workshop-empty">
          <div className="workshop-empty__icon">W</div>
          <h2>Không tìm thấy người dùng phù hợp</h2>
          <p>Hãy thử thay đổi tiêu chí tìm kiếm.</p>
        </div>
      ) : (
        <div className="admin-table-wrapper" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #ebdcd5', overflow: 'hidden' }}>
          <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fbf4f0', textAlign: 'left', borderBottom: '1px solid #ebdcd5' }}>
                <th style={{ padding: '14px 16px' }}>Họ và tên</th>
                <th style={{ padding: '14px 16px' }}>Email đăng nhập</th>
                <th style={{ padding: '14px 16px' }}>Vai trò</th>
                <th style={{ padding: '14px 16px' }}>Trạng thái</th>
                <th style={{ padding: '14px 16px' }}>Ngày tạo</th>
                <th style={{ padding: '14px 16px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id} style={{ borderBottom: '1px solid #f2e6e0' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <strong>{u.full_name}</strong>
                    <div style={{ fontSize: '11px', color: '#886255' }}>ID: USR-{u.user_id}</div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>{u.email}</td>

                  <td style={{ padding: '14px 16px' }}>
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.user_id, e.target.value)}
                      className="filter-select"
                      style={{ padding: '4px 8px', fontSize: '13px' }}
                    >
                      <option value="admin">Quản trị viên</option>
                      <option value="organizer">Ban tổ chức</option>
                      <option value="participant">Người tham gia</option>
                    </select>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <span className={`status-tag ${u.status === 'active' ? 'status-tag--published' : 'status-tag--cancelled'}`}>
                      {u.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                  </td>

                  <td style={{ padding: '14px 16px', fontSize: '12px' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '--'}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <button
                      type="button"
                      className={u.status === 'active' ? 'btn-danger-outline' : 'btn-secondary'}
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                      onClick={() => handleStatusToggle(u)}
                    >
                      {u.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Cấp Tài khoản Mới */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2>Cấp Tài khoản Nội bộ Mới</h2>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label>Họ và tên *</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  required
                />
              </div>

              <div className="form-group">
                <label>Email đăng nhập *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@workshop.edu.vn"
                  required
                />
              </div>

              <div className="form-group">
                <label>Mật khẩu khởi tạo *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Nhập mật khẩu..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Phân quyền Vai trò</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="filter-select"
                  style={{ width: '100%' }}
                >
                  <option value="participant">Người tham gia</option>
                  <option value="organizer">Ban tổ chức</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isProcessing}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="home-page__primary-button"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Đang tạo...' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminUsersPage;
