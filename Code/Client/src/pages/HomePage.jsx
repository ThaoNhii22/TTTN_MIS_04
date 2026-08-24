import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUser } from '../services/auth';
import {
  getAttendanceHistory,
  getUserWaitlistEntries,
  getWorkshops,
} from '../services/workshopService';

function HomePage() {
  const [currentUser, setCurrentUser] = useState(getUser());
  const [nextWorkshop, setNextWorkshop] = useState(null);
  const [waitlistItems, setWaitlistItems] = useState([]);
  const [attendedCount, setAttendedCount] = useState(0);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const user = getUser();
        setCurrentUser(user);

        // 1. Lấy danh sách Workshop để tìm workshop gần nhất
        const workshops = await getWorkshops();
        const publishedWorkshops = workshops.filter((w) => w.rawStatus === 'published' || w.status === 'open' || w.status === 'full');
        if (publishedWorkshops.length > 0) {
          const first = publishedWorkshops[0];
          const eventDate = new Date(first.startAt);
          const now = new Date();
          const diffDays = Math.max(0, Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

          setNextWorkshop({
            id: first.id,
            title: first.title,
            date: first.date,
            location: first.location,
            remainingDays: diffDays,
          });
        }

        // 2. Lấy danh sách Waitlist của user
        const waitlist = await getUserWaitlistEntries();
        setWaitlistItems(
          waitlist.filter((w) => w.status === 'waitlist').map((w) => ({
            id: w.id,
            title: w.workshopTitle,
            position: w.waitlistPosition || 1,
          }))
        );

        // 3. Lấy số lượng đã tham dự
        const attendance = await getAttendanceHistory();
        setAttendedCount(attendance.length);
      } catch (err) {
        console.error('Lỗi tải dữ liệu Dashboard:', err);
      }
    }

    loadDashboardData();
  }, []);

  return (
    <section className="home-page">
      <div className="home-page__header">
        <div>
          <p className="home-page__eyebrow">
            WORKSHOP MANAGEMENT SYSTEM (TTTN_MIS_04)
          </p>

          <h1>
            Xin chào {currentUser?.full_name ? `, ${currentUser.full_name}` : ''} <span>👋</span>
          </h1>

          <p className="home-page__subtitle">
            Khám phá Workshop phù hợp và theo dõi hành trình tham gia của bạn.
          </p>
        </div>

        <Link to="/workshops" className="home-page__primary-button">
          Tìm Workshop
        </Link>
      </div>

      <div className="home-page__stats">
        {nextWorkshop ? (
          <div className="dashboard-card dashboard-card--featured">
            <div className="dashboard-card__top">
              <span className="dashboard-card__label">
                Workshop sắp diễn ra
              </span>

              <span className="dashboard-card__badge">
                Sắp tới
              </span>
            </div>

            <h2>{nextWorkshop.title}</h2>

            <div className="dashboard-card__info">
              <span>📅 {nextWorkshop.date}</span>
              <span>📍 {nextWorkshop.location}</span>
            </div>

            <div className="dashboard-card__countdown">
              <strong>{nextWorkshop.remainingDays}</strong>
              <span>ngày nữa</span>
            </div>

            <Link
              to={`/workshops/${nextWorkshop.id}`}
              className="dashboard-card__link"
            >
              Xem chi tiết
              <span>→</span>
            </Link>
          </div>
        ) : (
          <div className="dashboard-card dashboard-card--featured">
            <div className="dashboard-card__top">
              <span className="dashboard-card__label">
                Workshop sắp diễn ra
              </span>
            </div>
            <h2>Chưa có Workshop mới</h2>
            <p className="dashboard-card__info">Hãy theo dõi các sự kiện sắp mở đăng ký.</p>
            <Link to="/workshops" className="dashboard-card__link">
              Khám phá danh sách <span>→</span>
            </Link>
          </div>
        )}

        <div className="dashboard-card dashboard-card--attendance">
          <div className="dashboard-card__icon">
            ✓
          </div>

          <p className="dashboard-card__label">
            Đã tham dự
          </p>

          <strong className="dashboard-card__number">
            {attendedCount}
          </strong>

          <span className="dashboard-card__muted">
            Workshop đã điểm danh
          </span>
        </div>
      </div>

      <div className="home-page__section">
        <div className="home-page__section-header">
          <div>
            <p className="home-page__eyebrow">WAITLIST</p>
            <h2>Danh sách chờ của bạn</h2>
          </div>

          <Link to="/waitlist" className="text-link">
            Xem tất cả →
          </Link>
        </div>

        {waitlistItems.length === 0 ? (
          <div style={{ padding: '24px', background: '#f9fafb', borderRadius: '12px', textAlign: 'center', color: '#6b7280' }}>
            Bạn hiện không ở trong danh sách chờ của Workshop nào.
          </div>
        ) : (
          <div className="waitlist-grid">
            {waitlistItems.map((item) => (
              <div
                className="waitlist-card"
                key={item.id}
              >
                <div className="waitlist-card__content">
                  <span className="waitlist-card__dot" />

                  <div>
                    <h3>{item.title}</h3>

                    <p>
                      Vị trí hiện tại trong danh sách chờ
                    </p>
                  </div>
                </div>

                <span className="waitlist-card__position">
                  #{item.position}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="home-page__section">
        <div className="home-page__section-header">
          <div>
            <p className="home-page__eyebrow">SHORTCUTS</p>
            <h2>Truy cập nhanh</h2>
          </div>
        </div>

        <div className="shortcut-grid">
          <Link to="/check-in" className="shortcut-card">
            <div className="shortcut-card__icon">
              QR
            </div>

            <div>
              <h3>Mã QR điểm danh</h3>
              <p>Mở chức năng Check-in</p>
            </div>

            <span>→</span>
          </Link>

          <Link to="/workshops" className="shortcut-card">
            <div className="shortcut-card__icon">
              W
            </div>

            <div>
              <h3>Tìm Workshop mới</h3>
              <p>Khám phá các Workshop đang mở</p>
            </div>

            <span>→</span>
          </Link>

          <Link to="/waitlist" className="shortcut-card">
            <div className="shortcut-card__icon">
              ⟳
            </div>

            <div>
              <h3>Danh sách chờ & Hàng đợi</h3>
              <p>Theo dõi vị trí chuyển vé</p>
            </div>

            <span>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default HomePage;