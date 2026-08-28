import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checkInParticipant, getMyAttendanceHistory } from '../services/attendanceService';
import { getMyRegistrations } from '../services/registrationService';

function CheckInPage() {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState(role === 'participant' ? 'ticket' : 'scanner');
  const [myTickets, setMyTickets] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Scanner Form state
  const [manualCode, setManualCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Feedback state
  const [checkInResult, setCheckInResult] = useState(null);
  const [checkInError, setCheckInError] = useState(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function fetchData() {
      setLoading(true);
      try {
        const myRegs = await getMyRegistrations();
        const history = await getMyAttendanceHistory();
        if (!ignore) {
          setMyTickets(myRegs.filter((r) => r.status === 'confirmed' || r.status === 'attended'));
          setAttendanceLogs(history);
        }
      } catch (err) {
        console.error('Error loading check-in data:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    fetchData();
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const handleExecuteCheckIn = async (codeToVerify) => {
    const code = (codeToVerify || manualCode).trim();
    if (!code) {
      setCheckInError('Vui lòng nhập hoặc quét mã QR.');
      return;
    }

    setIsProcessing(true);
    setCheckInResult(null);
    setCheckInError(null);

    try {
      const payload = {
        qr_payload: code.includes('|') ? code : null,
        checkin_code: !code.includes('|') ? code : null,
        checkin_method: code.includes('|') ? 'qr' : 'manual',
      };

      const result = await checkInParticipant(payload);
      setCheckInResult(result);
      setManualCode('');
      setReloadKey((k) => k + 1);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setCheckInError(typeof detail === 'string' ? detail : 'Điểm danh không thành công.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="checkin-page">
      <div className="checkin-page__header">
        <div>
          <h1>Điểm danh Workshop</h1>
          <p className="checkin-page__subtitle">
            Quét mã QR cá nhân hoặc nhập mã điểm danh sự kiện.
          </p>
        </div>

        <div className="checkin-tabs-toggle">
          <button
            type="button"
            className={`checkin-toggle-btn ${activeTab === 'ticket' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('ticket');
              setCheckInResult(null);
              setCheckInError(null);
            }}
          >
            Vé của tôi
          </button>
          <button
            type="button"
            className={`checkin-toggle-btn ${activeTab === 'scanner' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('scanner');
              setCheckInResult(null);
              setCheckInError(null);
            }}
          >
            Quét và Nhập mã
          </button>
        </div>
      </div>

      {checkInResult && (
        <div className="alert-banner alert-banner--success" style={{ marginBottom: '20px' }}>
          <div>
            <strong>{checkInResult.message}</strong>
            <p style={{ margin: '4px 0 0', fontSize: '13px' }}>
              Workshop: <strong>{checkInResult.workshop_title}</strong> - Người tham dự: <strong>{checkInResult.user_name}</strong> - {checkInResult.user_email}
            </p>
            <small>Thời gian ghi nhận: {new Date(checkInResult.checkin_at).toLocaleString('vi-VN')}</small>
          </div>
        </div>
      )}

      {checkInError && (
        <div className="alert-banner alert-banner--error" style={{ marginBottom: '20px' }}>
          <div>{checkInError}</div>
        </div>
      )}

      {/* Tab 1: My Ticket QR Code */}
      {activeTab === 'ticket' && (
        <div className="checkin-ticket-tab">
          {loading ? (
            <div className="state-card state-card--loading" style={{ margin: '40px auto', textAlign: 'center' }}>
              <div className="state-card__spinner" />
              <p style={{ marginTop: '12px' }}>Đang tải danh sách vé...</p>
            </div>
          ) : myTickets.length === 0 ? (
            <div className="workshop-empty">
              <div className="workshop-empty__icon">W</div>
              <h2>Bạn chưa có vé tham dự chính thức</h2>
              <p>Hãy đăng ký một Workshop để nhận mã QR điểm danh.</p>
              <Link to="/workshops" className="home-page__primary-button" style={{ marginTop: '16px' }}>
                Tìm Workshop
              </Link>
            </div>
          ) : (
            <div className="my-ticket-qr-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {myTickets.map((ticket) => (
                <div className="qr-ticket-display-card" key={ticket.registration_id}>
                  <div className="qr-ticket-header">
                    <span className={`status-tag status-tag--${ticket.status}`}>
                      {ticket.status === 'confirmed' ? 'Sẵn sàng Check-in' : 'Đã điểm danh'}
                    </span>
                    <small>REG-{ticket.registration_id}</small>
                  </div>

                  <h3>{ticket.workshop_title}</h3>
                  <p style={{ fontSize: '13px', color: '#6d4336', margin: '8px 0' }}>
                    Thời gian: {new Date(ticket.workshop_start_at).toLocaleString('vi-VN')}
                  </p>
                  <p style={{ fontSize: '13px', color: '#6d4336' }}>
                    Địa điểm: {ticket.workshop_location}
                  </p>

                  {ticket.qr_payload && (
                    <div className="qr-box" style={{ margin: '16px 0', textAlign: 'center', padding: '16px', background: '#fdf7f4', borderRadius: '8px', border: '1px solid #ebdcd5' }}>
                      <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#4a3832', marginBottom: '8px' }}>MÃ QR ĐIỂM DANH:</p>
                      <code style={{ fontSize: '11px', wordBreak: 'break-all', display: 'block', padding: '8px', background: '#fff', borderRadius: '4px' }}>
                        {ticket.qr_payload}
                      </code>

                      {ticket.status === 'confirmed' && (
                        <button
                          type="button"
                          className="home-page__primary-button"
                          style={{ marginTop: '12px', width: '100%', justifyContent: 'center' }}
                          onClick={() => handleExecuteCheckIn(ticket.qr_payload)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? 'Đang gửi...' : 'Tự động Điểm danh với vé này'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Scanner & Manual Code Input */}
      {activeTab === 'scanner' && (
        <div className="checkin-scanner-tab">
          <div className="scanner-card" style={{ maxWidth: '540px', margin: '0 auto', background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #ebdcd5' }}>
            <h2>Nhập mã điểm danh hoặc Quét QR</h2>
            <p style={{ color: '#7a5b50', fontSize: '13px', marginBottom: '20px' }}>
              Nhập chuỗi mã QR cá nhân của người tham gia hoặc mã check-in workshop để xác thực điểm danh.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleExecuteCheckIn();
              }}
            >
              <div className="form-group">
                <label>Mã QR Payload hoặc Mã Check-in:</label>
                <textarea
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Nhập chuỗi mã QR hoặc mã check-in"
                  rows="3"
                  required
                />
              </div>

              <button
                type="submit"
                className="home-page__primary-button"
                style={{ width: '100%', justifyContent: 'center', marginTop: '14px' }}
                disabled={isProcessing}
              >
                {isProcessing ? 'Đang xác thực...' : 'Xác nhận Điểm danh'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Attendance History Section */}
      <div className="home-page__section" style={{ marginTop: '40px' }}>
        <div className="home-page__section-header">
          <div>
            <h2>Lịch sử điểm danh của bạn</h2>
          </div>
        </div>

        {attendanceLogs.length === 0 ? (
          <p style={{ color: '#7a5b50', fontSize: '14px' }}>Chưa có bản ghi điểm danh nào.</p>
        ) : (
          <div className="table-responsive" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #ebdcd5', overflow: 'hidden' }}>
            <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fbf4f0', textAlign: 'left', borderBottom: '1px solid #ebdcd5' }}>
                  <th style={{ padding: '12px 16px' }}>Mã điểm danh</th>
                  <th style={{ padding: '12px 16px' }}>Workshop</th>
                  <th style={{ padding: '12px 16px' }}>Phương thức</th>
                  <th style={{ padding: '12px 16px' }}>Thời gian</th>
                  <th style={{ padding: '12px 16px' }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {attendanceLogs.map((log) => (
                  <tr key={log.attendance_id} style={{ borderBottom: '1px solid #f2e6e0' }}>
                    <td style={{ padding: '12px 16px' }}><code>ATT-{log.attendance_id}</code></td>
                    <td style={{ padding: '12px 16px' }}><strong>{log.workshop_title}</strong></td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="status-tag status-tag--draft">{log.checkin_method}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>{new Date(log.checkin_at).toLocaleString('vi-VN')}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="status-tag status-tag--attended">Đã tham dự</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default CheckInPage;
