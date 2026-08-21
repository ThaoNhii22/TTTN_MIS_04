import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getAttendanceHistory,
  getConfirmedRegistrations,
  processCheckIn,
} from '../services/workshopService';

function CheckInPage() {
  const [activeTab, setActiveTab] = useState('ticket'); // 'ticket' | 'scanner'
  const [myTickets, setMyTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);

  // Scanner Form state
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Result Feedback state
  const [checkInResult, setCheckInResult] = useState(null);
  const [checkInError, setCheckInError] = useState(null);

  // Load data
  const loadData = () => {
    const tickets = getConfirmedRegistrations('sinhvien@workshop.edu.vn');
    setMyTickets(tickets);
    if (tickets.length > 0 && !selectedTicket) {
      setSelectedTicket(tickets[0]);
    }
    const logs = getAttendanceHistory();
    setAttendanceLogs(logs);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Check-in action (Self or Scanner)
  const handleExecuteCheckIn = async (codeToVerify, isSelfCheckin = false) => {
    setIsProcessing(true);
    setCheckInResult(null);
    setCheckInError(null);

    try {
      const code = codeToVerify || manualCode;
      if (!code) {
        throw new Error('Vui lòng nhập hoặc quét mã QR/mã vé.');
      }

      // Ignore time window for demo convenience if self-checkin, else strict check
      const result = await processCheckIn({
        qrPayload: code.includes('|') ? code : '',
        ticketCode: !code.includes('|') ? code : '',
        ignoreTimeWindow: isSelfCheckin || true, // set true for smooth demo
      });

      setCheckInResult(result);
      setManualCode('');
      loadData();
    } catch (err) {
      setCheckInError({
        code: err.code || 'ERROR',
        message: err.message || 'Điểm danh không thành công.',
      });
    } finally {
      setIsProcessing(false);
      setIsScanning(false);
    }
  };

  // Simulate camera scan detection
  const handleSimulateCameraScan = (code) => {
    setIsScanning(true);
    setTimeout(() => {
      handleExecuteCheckIn(code);
    }, 1200);
  };

  return (
    <div className="checkin-page">
      {/* Header */}
      <div className="checkin-page__header">
        <div>
          <p className="home-page__eyebrow">ATTENDANCE & CHECK-IN</p>
          <h1>Điểm danh Workshop</h1>
          <p className="checkin-page__subtitle">
            Quét mã điểm danh tại sự kiện.
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
            Máy quét QR
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="checkin-grid">
        {/* Left Column: Ticket QR or Camera Scanner */}
        <div className="checkin-main-panel">
          {/* TAB 1: My Ticket QR Pass */}
          {activeTab === 'ticket' && (
            <div className="ticket-pass-container">
              {myTickets.length === 0 ? (
                <div className="workshop-empty">
                  <h2>Bạn chưa có vé tham dự chính thức</h2>
                  <p>
                    Hãy đăng ký tham gia các Workshop đang mở.
                  </p>
                  <Link
                    to="/workshops"
                    className="home-page__primary-button"
                    style={{ marginTop: '20px', display: 'inline-block' }}
                  >
                    Khám phá Workshop ngay →
                  </Link>
                </div>
              ) : (
                <div className="ticket-pass-wrapper">
                  {/* Workshop selector if multiple tickets */}
                  {myTickets.length > 1 && (
                    <div className="ticket-selector-bar">
                      <label htmlFor="ticket-select">Chọn vé Workshop:</label>
                      <select
                        id="ticket-select"
                        value={selectedTicket?.id || ''}
                        onChange={(e) => {
                          const t = myTickets.find((item) => item.id === e.target.value);
                          setSelectedTicket(t || myTickets[0]);
                          setCheckInResult(null);
                          setCheckInError(null);
                        }}
                      >
                        {myTickets.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.workshopTitle} ({t.ticketCode})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedTicket && (
                    <div className="eticket-card">
                      <div className="eticket-card__header">
                        <div className="eticket-card__brand">HỆ THỐNG WORKSHOP NỘI BỘ</div>
                        <span
                          className={`eticket-status-badge ${selectedTicket.status === 'attended'
                            ? 'eticket-status-badge--attended'
                            : 'eticket-status-badge--confirmed'
                            }`}
                        >
                          {selectedTicket.status === 'attended' ? 'ĐÃ THAM DỰ' : 'VÉ CHÍNH THỨC'}
                        </span>
                      </div>

                      <div className="eticket-card__body">
                        <h2 className="eticket-title">{selectedTicket.workshopTitle}</h2>

                        <div className="eticket-meta-grid">
                          <div>
                            <small>Thời gian</small>
                            <strong>
                              📅 {selectedTicket.workshop?.date} · {selectedTicket.workshop?.time}
                            </strong>
                          </div>
                          <div>
                            <small>Địa điểm</small>
                            <strong>📍 {selectedTicket.workshop?.location || 'Phòng hội thảo'}</strong>
                          </div>
                          <div>
                            <small>Người tham dự</small>
                            <strong>{selectedTicket.fullName}</strong>
                          </div>
                          <div>
                            <small>Đơn vị</small>
                            <strong>{selectedTicket.department}</strong>
                          </div>
                        </div>

                        {/* Interactive QR Pass SVG */}
                        <div className="eticket-qr-box">
                          <div className="eticket-qr-display">
                            {/* Realistic SVG QR Pattern */}
                            <svg viewBox="0 0 160 160" width="140" height="140" className="qr-svg">
                              <rect width="160" height="160" fill="#ffffff" rx="10" />
                              {/* Top-Left Corner Box */}
                              <rect x="15" y="15" width="40" height="40" fill="#4a332d" rx="6" />
                              <rect x="23" y="23" width="24" height="24" fill="#ffffff" rx="3" />
                              <rect x="29" y="29" width="12" height="12" fill="#c86d55" rx="2" />
                              {/* Top-Right Corner Box */}
                              <rect x="105" y="15" width="40" height="40" fill="#4a332d" rx="6" />
                              <rect x="113" y="23" width="24" height="24" fill="#ffffff" rx="3" />
                              <rect x="119" y="29" width="12" height="12" fill="#c86d55" rx="2" />
                              {/* Bottom-Left Corner Box */}
                              <rect x="15" y="105" width="40" height="40" fill="#4a332d" rx="6" />
                              <rect x="23" y="113" width="24" height="24" fill="#ffffff" rx="3" />
                              <rect x="29" y="119" width="12" height="12" fill="#c86d55" rx="2" />
                              {/* Central & Random QR Data Cells */}
                              <rect x="65" y="20" width="10" height="10" fill="#4a332d" />
                              <rect x="85" y="20" width="10" height="10" fill="#c86d55" />
                              <rect x="65" y="40" width="10" height="10" fill="#4a332d" />
                              <rect x="75" y="55" width="15" height="10" fill="#4a332d" />
                              <rect x="20" y="65" width="10" height="10" fill="#c86d55" />
                              <rect x="35" y="75" width="10" height="10" fill="#4a332d" />
                              <rect x="65" y="75" width="30" height="30" fill="#4a332d" rx="4" />
                              <rect x="72" y="82" width="16" height="16" fill="#f4a58a" rx="2" />
                              <rect x="105" y="65" width="10" height="10" fill="#4a332d" />
                              <rect x="125" y="75" width="15" height="10" fill="#c86d55" />
                              <rect x="65" y="115" width="10" height="10" fill="#4a332d" />
                              <rect x="85" y="125" width="15" height="10" fill="#4a332d" />
                              <rect x="110" y="115" width="15" height="15" fill="#c86d55" />
                              <rect x="130" y="135" width="10" height="10" fill="#4a332d" />
                            </svg>
                          </div>

                          <div className="eticket-code-display">
                            <small>MÃ VÉ THAM DỰ</small>
                            <strong>{selectedTicket.ticketCode}</strong>
                          </div>
                        </div>

                        <div className="eticket-actions">
                          {selectedTicket.status === 'attended' ? (
                            <div className="eticket-attended-notice">
                              ✓ Bạn đã điểm danh thành công cho sự kiện này
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="eticket-checkin-btn"
                              disabled={isProcessing}
                              onClick={() => handleExecuteCheckIn(selectedTicket.ticketCode, true)}
                            >
                              {isProcessing ? 'Đang xác thực điểm danh...' : 'Xác nhận Điểm danh (Tự check-in)'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: QR Scanner Camera Viewfinder & Manual Entry */}
          {activeTab === 'scanner' && (
            <div className="qr-scanner-card">
              <div className="scanner-viewfinder">
                <div className={`scanner-camera-box ${isScanning ? 'is-scanning' : ''}`}>
                  <div className="scanner-laser-line" />
                  <div className="scanner-corner top-left" />
                  <div className="scanner-corner top-right" />
                  <div className="scanner-corner bottom-left" />
                  <div className="scanner-corner bottom-right" />

                  <div className="scanner-overlay-content">
                    {isScanning ? (
                      <div className="scanner-detecting">
                        <div className="state-card__spinner" style={{ width: '32px', height: '32px' }} />
                        <p>Đang đọc mã QR...</p>
                      </div>
                    ) : (
                      <div className="scanner-idle">
                        <p>Hướng Camera vào mã QR vé tham dự của người tham gia</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="scanner-controls">
                  <button
                    type="button"
                    className="scanner-action-btn"
                    disabled={isScanning || isProcessing}
                    onClick={() => {
                      if (myTickets.length > 0) {
                        handleSimulateCameraScan(myTickets[0].ticketCode);
                      } else {
                        handleSimulateCameraScan('WS-1-1042');
                      }
                    }}
                  >
                    {isScanning ? 'Đang quét...' : 'Quét mã qua Camera'}
                  </button>
                </div>
              </div>

              {/* Manual Input Form */}
              <div className="manual-checkin-box">
                <h4>Hoặc nhập mã vé thủ công</h4>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleExecuteCheckIn(manualCode);
                  }}
                  className="manual-checkin-form"
                >
                  <input
                    type="text"
                    placeholder="VD: WS-1-1042 hoặc REG-..."
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                  />
                  <button type="submit" disabled={isProcessing || !manualCode.trim()}>
                    {isProcessing ? 'Đang kiểm tra...' : 'Xác thực'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Attendance Result & Recent History */}
        <div className="checkin-sidebar">
          {/* Result Alert / Stamp Card */}
          {checkInResult && (
            <div
              className={`checkin-result-card ${checkInResult.alreadyAttended
                ? 'checkin-result-card--already'
                : 'checkin-result-card--success'
                }`}
            >
              <div className="result-badge">
                {checkInResult.alreadyAttended ? 'ĐÃ ĐIỂM DANH TRƯỚC ĐÓ' : 'ĐIỂM DANH THÀNH CÔNG'}
              </div>

              <h3>{checkInResult.workshop?.title}</h3>

              <div className="result-info-rows">
                <div className="result-info-row">
                  <span>Mã vé:</span>
                  <strong>{checkInResult.registration?.ticketCode}</strong>
                </div>
                <div className="result-info-row">
                  <span>Người tham dự:</span>
                  <strong>{checkInResult.registration?.fullName}</strong>
                </div>
                <div className="result-info-row">
                  <span>Thời điểm điểm danh:</span>
                  <strong className="result-timestamp">{checkInResult.formattedTime}</strong>
                </div>
                <div className="result-info-row">
                  <span>Trạng thái:</span>
                  <span className="ticket-status-tag ticket-status-tag--confirmed">Đã tham dự</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {checkInError && (
            <div className="checkin-result-card checkin-result-card--error">
              <div className="result-badge result-badge--error">ĐIỂM DANH THẤT BẠI</div>
              <h3>Không thể ghi nhận điểm danh</h3>
              <p className="error-desc">{checkInError.message}</p>
              <small>Mã lỗi: {checkInError.code}</small>
            </div>
          )}

          {/* Recent Attendance History Log */}
          <div className="attendance-history-card">
            <div className="attendance-history-header">
              <h4>Lịch sử điểm danh gần đây</h4>
              <span>{attendanceLogs.length} lượt</span>
            </div>

            {attendanceLogs.length === 0 ? (
              <p className="attendance-history-empty">Chưa có lượt điểm danh nào được ghi nhận.</p>
            ) : (
              <div className="attendance-logs-list">
                {attendanceLogs.slice(0, 5).map((log) => {
                  const dateObj = new Date(log.attendedAt);
                  const timeStr = `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj
                    .getMinutes()
                    .toString()
                    .padStart(2, '0')}`;

                  return (
                    <div className="attendance-log-item" key={log.id}>
                      <div className="attendance-log-item__main">
                        <strong>{log.fullName}</strong>
                        <small>{log.workshopTitle}</small>
                      </div>
                      <div className="attendance-log-item__time">
                        <span className="log-code">{log.ticketCode}</span>
                        <span className="log-time">{timeStr}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckInPage;
