import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getWorkshops } from '../services/workshopService';

function WorkshopPage() {
  const [workshops, setWorkshops] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [availability, setAvailability] = useState('all');

  useEffect(() => {
    setWorkshops(getWorkshops());
  }, []);

  const filteredWorkshops = useMemo(() => {
    return workshops.filter((workshop) => {
      const keyword = searchTerm.toLowerCase().trim();

      const matchesSearch =
        workshop.title.toLowerCase().includes(keyword) ||
        workshop.organizer.toLowerCase().includes(keyword);

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
    ...new Set(workshops.map((workshop) => workshop.category)),
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
            Tìm những Workshop phù hợp với sở thích, kỹ năng
            và mục tiêu phát triển của bạn.
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
            placeholder="Tìm Workshop hoặc đơn vị tổ chức..."
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
          <option value="full">Đã đầy</option>
        </select>
      </div>

      <div className="workshop-page__result">
        {filteredWorkshops.length} Workshop
      </div>

      {filteredWorkshops.length === 0 ? (
        <div className="workshop-empty">
          <div className="workshop-empty__icon">W</div>

          <h2>Không tìm thấy Workshop</h2>

          <p>
            Hãy thử thay đổi từ khóa hoặc bộ lọc để tìm
            Workshop phù hợp.
          </p>
        </div>
      ) : (
        <div className="workshop-grid">
          {filteredWorkshops.map((workshop) => {
            const remaining =
              workshop.quota - workshop.registered;

            const fillPercent =
              (workshop.registered / workshop.quota) * 100;

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
                      : 'Đã đầy'}
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
                        : 'Workshop đã đủ chỗ'}
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
    </section>
  );
}

export default WorkshopPage;