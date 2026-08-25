import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats } from '../services/dashboardService';

function DashboardPage() {
  const { role } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="state-card state-card--loading" style={{ margin: '80px auto', textAlign: 'center' }}>
        <div className="state-card__spinner" />
        <p style={{ marginTop: '16px' }}>Đang tải báo cáo chỉ số KPI...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="workshop-empty">
        <h2>Không thể tải dữ liệu thống kê</h2>
      </div>
    );
  }

  return (
    <section className="dashboard-page">
      <div className="home-page__header">
        <div>
          <p className="home-page__eyebrow">EXECUTIVE KPI DASHBOARD (UC-18, UC-19)</p>
          <h1>Bảng Điều khiển & Chỉ số KPI</h1>
          <p className="home-page__subtitle">
            {role === 'admin'
              ? 'Tổng hợp số liệu toàn diện hệ thống quản lý Workshop nội bộ theo thời gian thực.'
              : 'Tổng hợp số liệu hiệu quả và tỷ lệ tham dự của các Workshop do bạn tổ chức.'}
          </p>
        </div>

        <button type="button" className="btn-secondary" onClick={fetchStats}>
          ⟳ Cập nhật số liệu
        </button>
      </div>

      {/* Top Level 3 KPI Metric Cards */}
      <div className="kpi-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <div className="kpi-card" style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #ebdcd5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#886255', fontWeight: 'bold' }}>TỶ LỆ LẤP ĐẦY QUOTA</span>
            <span style={{ fontSize: '24px' }}>📈</span>
          </div>
          <h2 style={{ fontSize: '36px', color: '#c2410c', margin: '12px 0 6px' }}>{stats.average_fill_rate}%</h2>
          <p style={{ fontSize: '12px', color: '#7a5b50', margin: 0 }}>
            Tổng chỗ đã xác nhận trên tổng sức chứa của các Workshop.
          </p>
        </div>

        <div className="kpi-card" style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #ebdcd5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#886255', fontWeight: 'bold' }}>TỶ LỆ THAM DỰ THỰC TẾ</span>
            <span style={{ fontSize: '24px' }}>🎯</span>
          </div>
          <h2 style={{ fontSize: '36px', color: '#2b6cb0', margin: '12px 0 6px' }}>{stats.average_attendance_rate}%</h2>
          <p style={{ fontSize: '12px', color: '#7a5b50', margin: 0 }}>
            {stats.total_attended} người đã điểm danh trên tổng số {stats.total_confirmed} vé chính thức.
          </p>
        </div>

        <div className="kpi-card" style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #ebdcd5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#886255', fontWeight: 'bold' }}>ĐIỂM HÀI LÒNG TRUNG BÌNH</span>
            <span style={{ fontSize: '24px' }}>⭐</span>
          </div>
          <h2 style={{ fontSize: '36px', color: '#d97706', margin: '12px 0 6px' }}>{stats.average_satisfaction_score} / 5.0</h2>
          <p style={{ fontSize: '12px', color: '#7a5b50', margin: 0 }}>
            Khảo sát đánh giá trải nghiệm thực tế từ học viên sau workshop.
          </p>
        </div>
      </div>

      {/* Workshop & Registration Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        {/* Workshop status distribution */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #ebdcd5' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>📊 Cơ cấu Trạng thái Workshop (Tổng: {stats.total_workshops})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Đang mở (Published)</span>
              <strong>{stats.published_workshops}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Chờ xét duyệt (Pending)</span>
              <strong style={{ color: '#b7791f' }}>{stats.pending_workshops}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Bản nháp (Draft)</span>
              <strong style={{ color: '#718096' }}>{stats.draft_workshops}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Đã hoàn thành (Completed)</span>
              <strong style={{ color: '#2b6cb0' }}>{stats.completed_workshops}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Đã hủy (Cancelled)</span>
              <strong style={{ color: '#e53e3e' }}>{stats.cancelled_workshops}</strong>
            </div>
          </div>
        </div>

        {/* Registration distribution */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #ebdcd5' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>🎟️ Tổng hợp Đăng ký (Tổng: {stats.total_registrations})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Vé chính thức đã cấp</span>
              <strong>{stats.total_confirmed}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Đã điểm danh tham dự</span>
              <strong style={{ color: '#2f855a' }}>{stats.total_attended}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Đang trong Danh sách chờ (Waitlist)</span>
              <strong style={{ color: '#b7791f' }}>{stats.total_waitlist}</strong>
            </div>
            {role === 'admin' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ebdcd5', paddingTop: '10px' }}>
                <span>Tổng người dùng nội bộ</span>
                <strong>{stats.total_users}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Workshops Activity */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #ebdcd5', padding: '20px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>📅 Các Workshop Gần Đây</h3>
        <div className="table-responsive">
          <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fbf4f0', textAlign: 'left', borderBottom: '1px solid #ebdcd5' }}>
                <th style={{ padding: '10px 14px' }}>Tiêu đề Workshop</th>
                <th style={{ padding: '10px 14px' }}>Trạng thái</th>
                <th style={{ padding: '10px 14px' }}>Đã đăng ký / Quota</th>
                <th style={{ padding: '10px 14px' }}>Hàng đợi (Waitlist)</th>
                <th style={{ padding: '10px 14px' }}>Đã điểm danh</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent_workshops.map((w) => (
                <tr key={w.workshop_id} style={{ borderBottom: '1px solid #f2e6e0' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <strong>
                      <Link to={`/workshops/${w.workshop_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {w.title}
                      </Link>
                    </strong>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span className={`status-tag status-tag--${w.status}`}>{w.status.toUpperCase()}</span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>{w.confirmed_count}/{w.quota}</td>
                  <td style={{ padding: '10px 14px' }}>{w.waitlist_count}</td>
                  <td style={{ padding: '10px 14px' }}>{w.attended_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default DashboardPage;
