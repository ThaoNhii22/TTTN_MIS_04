import { useNavigate } from 'react-router-dom';

function ForbiddenState({
  title = 'Không có quyền truy cập',
  message = 'Bạn không có quyền thực hiện chức năng này.',
}) {
  const navigate = useNavigate();

  return (
    <div className="state-card state-card--forbidden">
      <div className="state-card__code">403</div>

      <h2>{title}</h2>
      <p>{message}</p>

      <button type="button" onClick={() => navigate('/')}>
        Về trang chủ
      </button>
    </div>
  );
}

export default ForbiddenState;