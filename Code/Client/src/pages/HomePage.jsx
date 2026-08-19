import { Link } from 'react-router-dom';

const nextWorkshop = {
  title: 'UI/UX Design Workshop',
  date: '24/08/2026',
  location: 'Phòng A203',
  remainingDays: 3,
};

const waitlistItems = [
  {
    title: 'Python for Data Analysis',
    position: 2,
  },
  {
    title: 'React Advanced Workshop',
    position: 5,
  },
];

function HomePage() {
  return (
    <section className="home-page">
      <div className="home-page__header">
        <div>
          <p className="home-page__eyebrow">
            WORKSHOP MANAGEMENT SYSTEM
          </p>

          <h1>
            Xin chào <span>👋</span>
          </h1>

          <p className="home-page__subtitle">
            Khám phá Workshop phù hợp và theo dõi hành trình
            tham gia của bạn.
          </p>
        </div>

        <Link to="/workshops" className="home-page__primary-button">
          Tìm Workshop
        </Link>
      </div>

      <div className="home-page__stats">
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
            to="/workshops"
            className="dashboard-card__link"
          >
            Xem chi tiết
            <span>→</span>
          </Link>
        </div>

        <div className="dashboard-card dashboard-card--attendance">
          <div className="dashboard-card__icon">
            ✓
          </div>

          <p className="dashboard-card__label">
            Đã tham dự
          </p>

          <strong className="dashboard-card__number">
            12
          </strong>

          <span className="dashboard-card__muted">
            Workshop
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

        <div className="waitlist-grid">
          {waitlistItems.map((item) => (
            <div
              className="waitlist-card"
              key={item.title}
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

          <Link to="/workshops" className="shortcut-card">
            <div className="shortcut-card__icon">
              ⟳
            </div>

            <div>
              <h3>Lịch sử tham gia</h3>
              <p>Xem các Workshop đã đăng ký</p>
            </div>

            <span>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default HomePage;