import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getWorkshops } from '../services/workshopService';

function WorkshopPage() {
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [availability, setAvailability] = useState('all');
  const [reloadIndex, setReloadIndex] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await getWorkshops();
        if (!ignore) {
          setWorkshops(data);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.userMessage || 'Không thể tải danh sách Workshop từ máy chủ.');
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [reloadIndex]);

  const handleRetry = () => {
    setLoading(true);
    setReloadIndex((prev) => prev + 1);
  };

  const filteredWorkshops = useMemo(() => {
    return workshops.filter((workshop) => {
      const keyword = searchTerm.toLowerCase().trim();

      const matchesSearch =
        workshop.title.toLowerCase().includes(keyword) ||
        workshop.organizer.toLowerCase().includes(keyword) ||
        workshop.location.toLowerCase().includes(keyword);

      const matchesCategory =
        category === 'all' || workshop.category === category;

      const matchesAvailability =
        availability === 'all' ||
        (availability === 'open' && workshop.status === 'open') ||
        (availability === 'full' && workshop.status === 'full');

      return (
        matchesSearch &&
        matchesCategory &&
        matchesAvailability
      );
    });
  }, [workshops, searchTerm, category, availability]);

  const categories = [
    ...new Set(workshops.map((workshop) => workshop.category).filter(Boolean)),
  ];

  return (
    <section className="workshop-page">
      <div className="workshop-page__hero">
        <div>
          <p className="home-page__eyebrow">
            WORKSHOPS
          </p>

          <h1>Khám phá Workshop</h1>

          <p>
            Tìm những Workshop phù hợp với sở thích, kỹ năng và mục tiêu phát triển của bạn.
          </p>
        </div>
      </div>

      <div className="workshop-toolbar">
        <div className="workshop-search">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="11"
              cy="11"
              r="6.5"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="M16 16L20 20"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>

          <input
            type="text"
            placeholder="Tìm Workshop, địa điểm hoặc đơn vị tổ chức..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="all">Tất cả lĩnh vực</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={availability}
          onChange={(event) => setAvailability(event.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="open">Còn chỗ</option>
          <option value="full">Đã đầy (Có Waitlist)</option>
        </select>
      </div>

      {error && (
        <div style={{ padding: '16px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '20px' }}>
          ⚠️ {error}
          <button
            onClick={handleRetry}
            style={{ marginLeft: '12px', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontWeight: 600 }}
          >
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <div className="state-card state-card--loading" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="state-card__spinner" style={{ margin: '0 auto 16px' }} />
          <h2>Đang tải danh sách Workshop...</h2>
        </div>
      ) : (
        <>
          <div className="workshop-page__result">
            Tìm thấy {filteredWorkshops.length} Workshop
          </div>

          {filteredWorkshops.length === 0 ? (
            <div className="workshop-empty">
              <div className="workshop-empty__icon">W</div>
              <h2>Không tìm thấy Workshop</h2>
              <p>Hãy thử thay đổi từ khóa hoặc bộ lọc để tìm Workshop phù hợp.</p>
            </div>
          ) : (
            <div className="workshop-grid">
              {filteredWorkshops.map((workshop) => {
                const remaining = Math.max(0, workshop.quota - workshop.registered);
                const fillPercent = workshop.quota > 0 ? Math.min(100, (workshop.registered / workshop.quota) * 100) : 0;

                return (
                  <article
                    className="workshop-card"
                    key={workshop.id}
                  >
                    <div className="workshop-card__cover">
                      <span className="workshop-card__category">
                        {workshop.category}
                      </span>

                      <span
                        className={`workshop-card__status workshop-card__status--${workshop.status}`}
                      >
                        {workshop.status === 'open'
                          ? 'Còn chỗ'
                          : (workshop.status === 'full' ? 'Đã đầy' : workshop.rawStatus)}
                      </span>
                    </div>

                    <div className="workshop-card__body">
                      <h2>{workshop.title}</h2>

                      <p className="workshop-card__description">
                        {workshop.description}
                      </p>

                      <div className="workshop-card__meta">
                        <div>
                          <span>📅</span>
                          <span>
                            {workshop.date} · {workshop.time}
                          </span>
                        </div>

                        <div>
                          <span>📍</span>
                          <span>{workshop.location}</span>
                        </div>

                        <div>
                          <span>🏢</span>
                          <span>{workshop.organizer}</span>
                        </div>
                      </div>

                      <div className="workshop-card__quota">
                        <div className="workshop-card__quota-header">
                          <span>Chỗ đã đăng ký</span>

                          <strong>
                            {workshop.registered}/{workshop.quota}
                          </strong>
                        </div>

                        <div className="workshop-card__progress">
                          <span
                            style={{
                              width: `${fillPercent}%`,
                            }}
                          />
                        </div>

                        <small>
                          {remaining > 0
                            ? `Còn ${remaining} chỗ`
                            : `Đã đủ chỗ · ${workshop.waitlistCount || 0} người đang chờ`}
                        </small>
                      </div>

                      <Link
                        to={`/workshops/${workshop.id}`}
                        className="workshop-card__button"
                      >
                        Xem chi tiết
                        <span>→</span>
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default WorkshopPage;