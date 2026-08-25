import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getWorkshops } from '../services/workshopService';
import { getMyRegistrations } from '../services/registrationService';
import { getDashboardStats } from '../services/dashboardService';

function HomePage() {
  const { user, role } = useAuth();
  const [upcomingWorkshops, setUpcomingWorkshops] = useState([]);
  const [myWaitlists, setMyWaitlists] = useState([]);
  const [myRegistrationsCount, setMyRegistrationsCount] = useState(0);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHomeData() {
      try {
        const workshopsData = await getWorkshops({ status: 'published' });
        setUpcomingWorkshops(workshopsData);

        if (role === 'participant') {
          const myRegs = await getMyRegistrations();
          setMyRegistrationsCount(myRegs.filter((r) => r.status === 'confirmed' || r.status === 'attended').length);
          setMyWaitlists(myRegs.filter((r) => r.status === 'waitlist'));
        } else if (role === 'admin' || role === 'organizer') {
          const stats = await getDashboardStats();
          setDashboardStats(stats);
        }
      } catch (err) {
        console.error('Error loading home data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHomeData();
  }, [role]);

  const nextWorkshop = upcomingWorkshops.length > 0 ? upcomingWorkshops[0] : null;

  return (
    <section className="home-page">
      <div className="home-page__header">
        <div>
          <h1>
            Xin chào, {user?.full_name || 'Bạn'}
          </h1>
          <p className="home-page__subtitle">
            {role === 'admin' && 'Bảng điều phối quản trị hệ thống, xét duyệt sự kiện và theo dõi nhật ký hoạt động.'}
            {role === 'organizer' && 'Quản lý các Workshop do bạn tổ chức, theo dõi đăng ký và điểm danh.'}
            {role === 'participant' && 'Khám phá Workshop bổ ích, theo dõi vé tham gia và danh sách chờ của bạn.'}
          </p>
        </div>

        <div className="home-page__header-actions">
          {role === 'organizer' && (
            <Link to="/organizer/workshops" className="home-page__primary-button">
              + Quản lý Workshop
            </Link>
          )}
          {role === 'admin' && (
            <Link to="/admin/reviews" className="home-page__primary-button">
              Xét duyệt Workshop
            </Link>
          )}
          {role === 'participant' && (
            <Link to="/workshops" className="home-page__primary-button">
              Tìm Workshop
            </Link>
          )}
        </div>
      </div>

      {/* Featured Statistics & Cards */}
      <div className="home-page__stats">
        {nextWorkshop ? (
          <div className="dashboard-card dashboard-card--featured">
            <div className="dashboard-card__top">
              <span className="dashboard-card__label">Workshop sắp diễn ra</span>
              <span className="dashboard-card__badge">Sắp tới</span>
            </div>

            <h2>{nextWorkshop.title}</h2>

            <div className="dashboard-card__info">
              <span>Thời gian: {new Date(nextWorkshop.start_at).toLocaleString('vi-VN')}</span>
              <span>Địa điểm: {nextWorkshop.location}</span>
            </div>

            <div className="dashboard-card__countdown">
              <strong>{nextWorkshop.confirmed_count}/{nextWorkshop.quota}</strong>
              <span>chỗ đã đăng ký</span>
            </div>

            <Link to={`/workshops/${nextWorkshop.workshop_id}`} className="dashboard-card__link">
              Xem chi tiết <span>→</span>
            </Link>
          </div>
        ) : (
          <div className="dashboard-card dashboard-card--featured">
            <div className="dashboard-card__top">
              <span className="dashboard-card__label">Trạng thái Workshop</span>
            </div>
            <h2>Chưa có workshop công bố</h2>
            <p style={{ color: '#7a5b50', fontSize: '13px', margin: '12px 0' }}>
              Hãy theo dõi danh sách để cập nhật các workshop mới nhất từ ban tổ chức.
            </p>
            <Link to="/workshops" className="dashboard-card__link">
              Xem tất cả <span>→</span>
            </Link>
          </div>
        )}

        {/* Dynamic Metric Card based on Role */}
        {role === 'participant' ? (
          <div className="dashboard-card dashboard-card--attendance">
            <p className="dashboard-card__label">Vé tham dự của bạn</p>
            <strong className="dashboard-card__number">{myRegistrationsCount}</strong>
            <span className="dashboard-card__muted">Workshop đã đăng ký</span>
          </div>
        ) : (
          <div className="dashboard-card dashboard-card--attendance">
            <p className="dashboard-card__label">Tỷ lệ lấp đầy</p>
            <strong className="dashboard-card__number">
              {dashboardStats ? `${dashboardStats.average_fill_rate}%` : '--'}
            </strong>
            <span className="dashboard-card__muted">Trung bình toàn hệ thống</span>
          </div>
        )}
      </div>

      {/* Participant Waitlist section */}
      {role === 'participant' && myWaitlists.length > 0 && (
        <div className="home-page__section">
          <div className="home-page__section-header">
            <div>
              <h2>Danh sách chờ của bạn</h2>
            </div>
            <Link to="/waitlist" className="text-link">
              Xem tất cả →
            </Link>
          </div>

          <div className="waitlist-grid">
            {myWaitlists.map((item) => (
              <div className="waitlist-card" key={item.registration_id}>
                <div className="waitlist-card__content">
                  <span className="waitlist-card__dot" />
                  <div>
                    <h3>{item.workshop_title}</h3>
                    <p>Đăng ký lúc: {new Date(item.registered_at).toLocaleString('vi-VN')}</p>
                  </div>
                </div>
                <span className="waitlist-card__position">
                  #{item.waitlist_position || 'Chờ'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shortcuts */}
      <div className="home-page__section">
        <div className="home-page__section-header">
          <div>
            <h2>Truy cập nhanh</h2>
          </div>
        </div>

        <div className="shortcut-grid">
          <Link to="/check-in" className="shortcut-card">
            <div>
              <h3>Mã QR Điểm danh</h3>
              <p>Quét hoặc nhập mã điểm danh</p>
            </div>
            <span>→</span>
          </Link>

          <Link to="/workshops" className="shortcut-card">
            <div>
              <h3>Khám phá Workshop</h3>
              <p>Xem các Workshop đang mở</p>
            </div>
            <span>→</span>
          </Link>

          {role === 'participant' && (
            <Link to="/my-tickets" className="shortcut-card">
              <div>
                <h3>Vé của tôi</h3>
                <p>Xem mã QR và trạng thái đăng ký</p>
              </div>
              <span>→</span>
            </Link>
          )}

          {role === 'organizer' && (
            <Link to="/organizer/workshops" className="shortcut-card">
              <div>
                <h3>Quản lý Workshop</h3>
                <p>Tạo mới, điểm danh, khảo sát</p>
              </div>
              <span>→</span>
            </Link>
          )}

          {role === 'admin' && (
            <Link to="/admin/reviews" className="shortcut-card">
              <div>
                <h3>Xét duyệt sự kiện</h3>
                <p>Phê duyệt các Workshop chờ duyệt</p>
              </div>
              <span>→</span>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export default HomePage;