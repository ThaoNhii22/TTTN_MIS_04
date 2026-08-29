import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getWorkshops } from '../services/workshopService';

function WorkshopPage() {
  const { role } = useAuth();
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    let ignore = false;
    async function loadWorkshops() {
      setLoading(true);
      try {
        const params = {};
        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }
        if (appliedSearch.trim()) {
          params.search = appliedSearch.trim();
        }
        const data = await getWorkshops(params);
        if (!ignore) {
          setWorkshops(data);
        }
      } catch (err) {
        console.error('Error fetching workshops:', err);
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
  }, [statusFilter, appliedSearch]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setAppliedSearch(searchTerm);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'published':
        return { label: 'Đã công bố', class: 'status-tag--published' };
      case 'completed':
        return { label: 'Đã kết thúc', class: 'status-tag--completed' };
      case 'pending':
        return { label: 'Chờ duyệt', class: 'status-tag--pending' };
      case 'draft':
        return { label: 'Bản nháp', class: 'status-tag--draft' };
      case 'cancelled':
        return { label: 'Đã hủy', class: 'status-tag--cancelled' };
      default:
        return { label: status, class: '' };
    }
  };

  return (
    <section className="workshop-page">
      <div className="workshop-page__hero">
        <div>
          <h1>Khám phá Workshop</h1>
          <p>
            Tìm kiếm những Workshop phù hợp với kỹ năng, đam mê và định hướng phát triển của bạn.
          </p>
        </div>
      </div>

      <div className="workshop-toolbar">
        <form className="workshop-search" onSubmit={handleSearchSubmit}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="M16 16L20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Tìm theo tiêu đề hoặc địa điểm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit" className="search-submit-btn">Tìm</button>
        </form>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="published">Đang mở</option>
          <option value="completed">Đã kết thúc</option>
          {(role === 'admin' || role === 'organizer') && (
            <>
              <option value="pending">Chờ duyệt</option>
              <option value="draft">Bản nháp</option>
              <option value="cancelled">Đã hủy</option>
            </>
          )}
        </select>
      </div>

      <div className="workshop-page__result">
        {loading ? 'Đang tải...' : `${workshops.length} Workshop`}
      </div>

      {loading ? (
        <div className="state-card state-card--loading" style={{ margin: '40px auto', textAlign: 'center' }}>
          <div className="state-card__spinner" />
          <p style={{ marginTop: '12px' }}>Đang tải danh sách Workshop...</p>
        </div>
      ) : workshops.length === 0 ? (
        <div className="workshop-empty">
          <div className="workshop-empty__icon">W</div>
          <h2>Không tìm thấy Workshop nào</h2>
          <p>Hãy thử thay đổi từ khóa hoặc bộ lọc tìm kiếm.</p>
        </div>
      ) : (
        <div className="workshop-grid">
          {workshops.map((w) => {
            const statusInfo = getStatusBadge(w.status);
            const fillPercent = Math.min(100, Math.round((w.confirmed_count / w.quota) * 100));
            const remaining = Math.max(0, w.quota - w.confirmed_count);

            return (
              <article className="workshop-card" key={w.workshop_id}>
                <div className="workshop-card__cover">
                  <span className={`status-tag ${statusInfo.class}`}>{statusInfo.label}</span>
                  {w.is_full && (
                    <span className="status-tag status-tag--full">Đã hết chỗ</span>
                  )}
                </div>

                <div className="workshop-card__body">
                  <h2>{w.title}</h2>
                  <p className="workshop-card__description">{w.description}</p>

                  <div className="workshop-card__meta">
                    <div>
                      <span>Thời gian:</span>
                      <span>{new Date(w.start_at).toLocaleString('vi-VN')}</span>
                    </div>
                    <div>
                      <span>Địa điểm:</span>
                      <span>{w.location}</span>
                    </div>
                  </div>

                  <div className="workshop-card__quota">
                    <div className="workshop-card__quota-header">
                      <span>Chỗ đã xác nhận</span>
                      <strong>{w.confirmed_count}/{w.quota}</strong>
                    </div>

                    <div className="workshop-card__progress">
                      <span style={{ width: `${fillPercent}%` }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: '#7a5b50' }}>
                      <span>{w.is_full ? 'Hàng đợi' : `Còn ${remaining} chỗ`}</span>
                      {w.waitlist_count > 0 && (
                        <span>{w.waitlist_count} người chờ</span>
                      )}
                    </div>
                  </div>

                  <Link to={`/workshops/${w.workshop_id}`} className="workshop-card__button">
                    Xem chi tiết <span>→</span>
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