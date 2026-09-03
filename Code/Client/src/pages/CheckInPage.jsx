import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import QRCode from 'qrcode';
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

  // QR Camera Scanner state
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState(null);
  const html5QrCodeRef = useRef(null);

  // QR image state for tickets
  const [qrImages, setQrImages] = useState({});

  // Feedback state
  const [checkInResult, setCheckInResult] = useState(null);
  const [checkInError, setCheckInError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const myRegs = await getMyRegistrations();
      const tickets = myRegs.filter((r) => r.status === 'confirmed' || r.status === 'attended');
      setMyTickets(tickets);

      // Generate QR images for each ticket
      const images = {};
      for (const t of tickets) {
        if (t.qr_payload) {
          try {
            images[t.registration_id] = await QRCode.toDataURL(t.qr_payload, {
              width: 200,
              margin: 2,
              color: { dark: '#4a3832', light: '#ffffff' },
            });
          } catch (_) {
            // ignore
          }
        }
      }
      setQrImages(images);

      const history = await getMyAttendanceHistory();
      setAttendanceLogs(history);
    } catch (err) {
      console.error('Error loading check-in data:', err);
    } finally {
      setLoading(false);
    }
  };
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

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

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

  const startQrScanner = async () => {
    setScannerError(null);
    setIsScannerActive(true);

    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          // Success callback
          html5QrCode.stop().then(() => {
            setIsScannerActive(false);
            html5QrCodeRef.current = null;
            handleExecuteCheckIn(decodedText);
          });
        },
        () => {
          // Scan error — ignore per-frame errors
        }
      );
    } catch (err) {
      setIsScannerActive(false);
      setScannerError(
        err?.message?.includes('Permission')
          ? 'Không có quyền truy cập camera. Vui lòng cấp quyền trong trình duyệt.'
          : `Không thể khởi động camera: ${err?.message || 'Lỗi không xác định'}`
      );
    }
  };

  const stopQrScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (_) {}
      html5QrCodeRef.current = null;
    }
    setIsScannerActive(false);
  };

  const switchTab = (tab) => {
    stopQrScanner();
    setActiveTab(tab);
    setCheckInResult(null);
    setCheckInError(null);
  };

  return (
    <div className="checkin-page">
      <div className="checkin-page__header">
        <div>
          <h1>Điểm danh Sự kiện</h1>
          <p className="checkin-page__subtitle">
            Quét mã QR cá nhân hoặc nhập mã điểm danh sự kiện.
          </p>
        </div>

        <div className="checkin-tabs-toggle">
          <button
            type="button"
            className={`checkin-toggle-btn ${activeTab === 'ticket' ? 'active' : ''}`}
            onClick={() => switchTab('ticket')}
          >
            Vé của tôi
          </button>
          <button
            type="button"
            className={`checkin-toggle-btn ${activeTab === 'scanner' ? 'active' : ''}`}
            onClick={() => switchTab('scanner')}
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
              Sự kiện: <strong>{checkInResult.workshop_title}</strong> - Người tham dự: <strong>{checkInResult.user_name}</strong> - {checkInResult.user_email}
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
              <p>Hãy đăng ký một Sự kiện để nhận mã QR điểm danh.</p>
              <Link to="/workshops" className="home-page__primary-button" style={{ marginTop: '16px' }}>
                Tìm Sự kiện
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
                      <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#4a3832', marginBottom: '10px' }}>MÃ QR ĐIỂM DANH:</p>

                      {qrImages[ticket.registration_id] ? (
                        <img
                          src={qrImages[ticket.registration_id]}
                          alt={`QR Code vé ${ticket.registration_id}`}
                          style={{ width: '180px', height: '180px', borderRadius: '6px', border: '1px solid #ebdcd5' }}
                        />
                      ) : (
                        <code style={{ fontSize: '11px', wordBreak: 'break-all', display: 'block', padding: '8px', background: '#fff', borderRadius: '4px' }}>
                          {ticket.qr_payload}
                        </code>
                      )}

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
            <h2>Nhập mã hoặc Quét QR bằng Camera</h2>
            <p style={{ color: '#7a5b50', fontSize: '13px', marginBottom: '20px' }}>
              Dùng camera để quét mã QR của người tham gia, hoặc nhập thủ công mã check-in.
            </p>

            {/* Camera QR Scanner */}
            <div style={{ marginBottom: '20px' }}>
              <div
                id="qr-reader"
                style={{
                  width: '100%',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: isScannerActive ? '2px solid #e98f73' : '2px dashed #ebdcd5',
                  minHeight: isScannerActive ? '300px' : '0',
                  transition: 'all 0.3s ease',
                  background: isScannerActive ? '#000' : 'transparent',
                }}
              />

              {scannerError && (
                <div className="alert-banner alert-banner--error" style={{ marginTop: '10px', fontSize: '13px' }}>
                  {scannerError}
                </div>
              )}

              {!isScannerActive ? (
                <button
                  type="button"
                  className="home-page__primary-button"
                  id="btn-start-qr-scanner"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
                  onClick={startQrScanner}
                  disabled={isProcessing}
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '18px', height: '18px', marginRight: '8px' }}>
                    <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="7" y="7" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.5"/>
                    <rect x="13" y="7" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.5"/>
                    <rect x="7" y="13" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M13 13h1M17 13v1M13 17h4v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Mở Camera Quét QR
                </button>
              ) : (
                <button
                  type="button"
                  id="btn-stop-qr-scanner"
                  style={{ width: '100%', padding: '10px', marginTop: '10px', borderRadius: '8px', border: '1px solid #ebdcd5', background: '#fdf7f4', color: '#7a5b50', cursor: 'pointer', fontWeight: '500' }}
                  onClick={stopQrScanner}
                >
                  Dừng Camera
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0' }}>
              <div style={{ flex: 1, height: '1px', background: '#ebdcd5' }} />
              <span style={{ fontSize: '12px', color: '#a08070', fontWeight: '500' }}>HOẶC NHẬP THỦ CÔNG</span>
              <div style={{ flex: 1, height: '1px', background: '#ebdcd5' }} />
            </div>

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
                  <th style={{ padding: '12px 16px' }}>Sự kiện</th>
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
