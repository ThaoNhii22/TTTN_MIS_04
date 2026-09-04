import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import QRCode from 'qrcode';
import { useAuth } from '../context/AuthContext';
import { checkInParticipant, getMyAttendanceHistory, getWorkshopAttendanceList } from '../services/attendanceService';
import { getWorkshops } from '../services/workshopService';

function CheckInPage() {
  const { role, user } = useAuth();
  const isOrganizerOrAdmin = role === 'organizer' || role === 'admin';

  // Organizer state
  const [organizedWorkshops, setOrganizedWorkshops] = useState([]);
  const [workshopQrCodes, setWorkshopQrCodes] = useState({});
  const [selectedWorkshopForProjection, setSelectedWorkshopForProjection] = useState(null);
  const [selectedWorkshopAttendance, setSelectedWorkshopAttendance] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);
  const [loadingAttendanceList, setLoadingAttendanceList] = useState(false);
  const [organizerMode, setOrganizerMode] = useState('display'); // 'display' | 'scanner'

  // Participant & Scanner Form state
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [manualCode, setManualCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // QR Camera Scanner state
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState(null);
  const html5QrCodeRef = useRef(null);

  // Feedback state
  const [checkInResult, setCheckInResult] = useState(null);
  const [checkInError, setCheckInError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  // Fetch data depending on role
  useEffect(() => {
    let ignore = false;
    async function fetchData() {
      setLoading(true);
      try {
        if (isOrganizerOrAdmin) {
          const params = role === 'organizer' ? { my_organized: true } : {};
          const workshops = await getWorkshops(params);
          if (!ignore) {
            const activeWs = workshops.filter((w) => w.status === 'published' || w.status === 'completed');
            setOrganizedWorkshops(activeWs);

            // Generate QR codes for each workshop's checkin_code
            const qrMap = {};
            for (const ws of activeWs) {
              if (ws.checkin_code) {
                try {
                  qrMap[ws.workshop_id] = await QRCode.toDataURL(ws.checkin_code, {
                    width: 260,
                    margin: 2,
                    color: { dark: '#4a3832', light: '#ffffff' },
                  });
                } catch (e) {
                  console.error('Error generating QR for workshop:', ws.workshop_id, e);
                }
              }
            }
            setWorkshopQrCodes(qrMap);
          }
        } else {
          const history = await getMyAttendanceHistory();
          if (!ignore) {
            setAttendanceLogs(history);
          }
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
  }, [role, isOrganizerOrAdmin, reloadKey]);

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
      setCheckInError('Vui lòng nhập hoặc quét Mã điểm danh Sự kiện.');
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
          html5QrCode.stop().then(() => {
            setIsScannerActive(false);
            html5QrCodeRef.current = null;
            handleExecuteCheckIn(decodedText);
          });
        },
        () => {}
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

  const openAttendanceModal = async (ws) => {
    setSelectedWorkshopAttendance(ws);
    setLoadingAttendanceList(true);
    try {
      const list = await getWorkshopAttendanceList(ws.workshop_id);
      setAttendanceList(list);
    } catch (err) {
      console.error('Error fetching workshop attendance list:', err);
    } finally {
      setLoadingAttendanceList(false);
    }
  };

  return (
    <div className="checkin-page">
      {/* ========================================================================= */}
      {/* 1. GIAO DIỆN DÀNH CHO BAN TỔ CHỨC / ADMIN                                */}
      {/* ========================================================================= */}
      {isOrganizerOrAdmin ? (
        <>
          <div className="checkin-page__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1>Mã QR Điểm danh Sự kiện (Ban Tổ Chức)</h1>
              <p className="checkin-page__subtitle">
                Trình chiếu mã QR hoặc cung cấp Mã check-in cho Người tham gia quét mã tại sự kiện (BR-04, BR-05).
              </p>
            </div>

            <div className="checkin-tabs-toggle">
              <button
                type="button"
                className={`checkin-toggle-btn ${organizerMode === 'display' ? 'active' : ''}`}
                onClick={() => {
                  stopQrScanner();
                  setOrganizerMode('display');
                }}
              >
                Mã QR Sự kiện
              </button>
              <button
                type="button"
                className={`checkin-toggle-btn ${organizerMode === 'scanner' ? 'active' : ''}`}
                onClick={() => setOrganizerMode('scanner')}
              >
                Máy quét hỗ trợ
              </button>
            </div>
          </div>

          {checkInResult && (
            <div className="alert-banner alert-banner--success" style={{ marginBottom: '20px' }}>
              <div>
                <strong>{checkInResult.message}</strong>
                <p style={{ margin: '4px 0 0', fontSize: '13px' }}>
                  Sự kiện: <strong>{checkInResult.workshop_title}</strong> - Người tham dự: <strong>{checkInResult.user_name}</strong> ({checkInResult.user_email})
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

          {organizerMode === 'display' ? (
            <div className="organizer-qr-section">
              {loading ? (
                <div className="state-card state-card--loading" style={{ margin: '60px auto', textAlign: 'center' }}>
                  <div className="state-card__spinner" />
                  <p style={{ marginTop: '12px' }}>Đang tải danh sách Workshop...</p>
                </div>
              ) : organizedWorkshops.length === 0 ? (
                <div className="workshop-empty">
                  <div className="workshop-empty__icon">W</div>
                  <h2>Chưa có Workshop đã công bố nào</h2>
                  <p>Khi Workshop của bạn được Quản trị viên duyệt và công bố, mã QR điểm danh sẽ xuất hiện tại đây.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px', marginTop: '20px' }}>
                  {organizedWorkshops.map((ws) => (
                    <div
                      key={ws.workshop_id}
                      style={{
                        background: '#fff',
                        borderRadius: '12px',
                        border: '1px solid #ebdcd5',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 2px 8px rgba(74, 56, 50, 0.04)',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span className={`status-tag status-tag--${ws.status}`}>
                            {ws.status === 'published' ? 'Đã công bố' : 'Đã kết thúc'}
                          </span>
                          <span style={{ fontSize: '12px', color: '#886255', fontWeight: '500' }}>
                            Đã điểm danh: <strong>{ws.attended_count || 0}</strong> / {ws.confirmed_count || 0}
                          </span>
                        </div>

                        <h3 style={{ fontSize: '16px', color: '#3d2b24', marginBottom: '8px', lineHeight: '1.4' }}>
                          {ws.title}
                        </h3>

                        <div style={{ fontSize: '12px', color: '#7a5b50', marginBottom: '14px', lineHeight: '1.6' }}>
                          <p>📍 <strong>Địa điểm:</strong> {ws.location || 'Chưa cập nhật'}</p>
                          <p>🕒 <strong>Thời gian sự kiện:</strong> {new Date(ws.start_at).toLocaleString('vi-VN')}</p>
                          <p>⏱️ <strong>Giờ mở check-in:</strong> {new Date(ws.checkin_start_at).toLocaleTimeString('vi-VN')} - {new Date(ws.checkin_end_at).toLocaleTimeString('vi-VN')}</p>
                        </div>

                        {/* QR Code display */}
                        <div
                          style={{
                            background: '#fdf7f4',
                            borderRadius: '10px',
                            border: '1px dashed #e4c4b6',
                            padding: '16px',
                            textAlign: 'center',
                            marginBottom: '16px',
                          }}
                        >
                          <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#886255', marginBottom: '8px', letterSpacing: '0.5px' }}>
                            MÃ QR ĐIỂM DANH SỰ KIỆN:
                          </p>

                          {workshopQrCodes[ws.workshop_id] ? (
                            <img
                              src={workshopQrCodes[ws.workshop_id]}
                              alt={`QR Code ${ws.title}`}
                              style={{ width: '180px', height: '180px', borderRadius: '8px', border: '1px solid #ebdcd5', margin: '0 auto', display: 'block' }}
                            />
                          ) : (
                            <div style={{ width: '180px', height: '180px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                              Đang tạo mã...
                            </div>
                          )}

                          <div style={{ marginTop: '10px', background: '#fff', padding: '6px 12px', borderRadius: '6px', border: '1px solid #ebdcd5', display: 'inline-block' }}>
                            <span style={{ fontSize: '11px', color: '#886255' }}>Mã check-in: </span>
                            <code style={{ fontSize: '13px', fontWeight: 'bold', color: '#e98f73' }}>
                              {ws.checkin_code}
                            </code>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button
                          type="button"
                          className="home-page__primary-button"
                          style={{ flex: 1, justifyContent: 'center', fontSize: '13px', padding: '8px 12px' }}
                          onClick={() => setSelectedWorkshopForProjection(ws)}
                        >
                          📺 Phóng to Trình chiếu QR
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: '13px', padding: '8px 12px' }}
                          onClick={() => openAttendanceModal(ws)}
                        >
                          📋 Lượt Check-in
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Chế độ Scanner hỗ trợ cho BTC */
            <div className="checkin-scanner-tab" style={{ maxWidth: '540px', margin: '20px auto 0' }}>
              <div className="scanner-card" style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #ebdcd5' }}>
                <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>Máy quét hỗ trợ điểm danh (Ban Tổ Chức)</h2>
                <p style={{ color: '#7a5b50', fontSize: '13px', marginBottom: '20px' }}>
                  Dùng camera để hỗ trợ quét mã hoặc nhập mã điểm danh thủ công giúp người tham gia.
                </p>

                <div style={{ marginBottom: '20px' }}>
                  <div
                    id="qr-reader"
                    style={{
                      width: '100%',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: isScannerActive ? '2px solid #e98f73' : '2px dashed #ebdcd5',
                      minHeight: isScannerActive ? '300px' : '0',
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
                      style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
                      onClick={startQrScanner}
                      disabled={isProcessing}
                    >
                      Mở Camera Quét mã
                    </button>
                  ) : (
                    <button
                      type="button"
                      style={{ width: '100%', padding: '10px', marginTop: '10px', borderRadius: '8px', border: '1px solid #ebdcd5', background: '#fdf7f4', color: '#7a5b50', cursor: 'pointer' }}
                      onClick={stopQrScanner}
                    >
                      Dừng Camera
                    </button>
                  )}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleExecuteCheckIn();
                  }}
                >
                  <div className="form-group">
                    <label>Mã điểm danh Sự kiện (checkin_code):</label>
                    <input
                      type="text"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="Ví dụ: WS-CHECKIN-ERP2026"
                      required
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #ebdcd5' }}
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

          {/* Modal Phóng to Trình Chiếu Mã QR (Dành cho Máy chiếu / Màn hình sự kiện) */}
          {selectedWorkshopForProjection && (
            <div className="modal-backdrop" style={{ background: 'rgba(26, 17, 13, 0.85)', zIndex: 9999 }}>
              <div
                className="modal-content"
                style={{
                  maxWidth: '560px',
                  textAlign: 'center',
                  padding: '32px 24px',
                  borderRadius: '16px',
                  background: '#fff',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                }}
              >
                <span className="status-tag status-tag--confirmed" style={{ fontSize: '13px', padding: '4px 12px' }}>
                  CỔNG ĐIỂM DANH SỰ KIỆN
                </span>

                <h2 style={{ fontSize: '22px', color: '#3d2b24', marginTop: '12px', marginBottom: '6px', lineHeight: '1.4' }}>
                  {selectedWorkshopForProjection.title}
                </h2>

                <p style={{ fontSize: '13px', color: '#7a5b50', marginBottom: '20px' }}>
                  📍 {selectedWorkshopForProjection.location} | 🕒 {new Date(selectedWorkshopForProjection.start_at).toLocaleString('vi-VN')}
                </p>

                <div
                  style={{
                    background: '#fff',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '2px solid #e98f73',
                    display: 'inline-block',
                    boxShadow: '0 4px 16px rgba(233, 143, 115, 0.15)',
                    margin: '0 auto',
                  }}
                >
                  {workshopQrCodes[selectedWorkshopForProjection.workshop_id] && (
                    <img
                      src={workshopQrCodes[selectedWorkshopForProjection.workshop_id]}
                      alt="QR Code Trình chiếu"
                      style={{ width: '280px', height: '280px', display: 'block', margin: '0 auto' }}
                    />
                  )}
                </div>

                <div style={{ marginTop: '20px' }}>
                  <p style={{ fontSize: '13px', color: '#886255', marginBottom: '4px' }}>Hoặc nhập Mã điểm danh trên ứng dụng:</p>
                  <div style={{ background: '#fdf7f4', padding: '10px 20px', borderRadius: '8px', border: '1px solid #ebdcd5', display: 'inline-block' }}>
                    <code style={{ fontSize: '22px', fontWeight: 'bold', color: '#e98f73', letterSpacing: '2px' }}>
                      {selectedWorkshopForProjection.checkin_code}
                    </code>
                  </div>
                </div>

                <div style={{ marginTop: '28px' }}>
                  <button
                    type="button"
                    className="home-page__primary-button"
                    style={{ minWidth: '160px', justifyContent: 'center' }}
                    onClick={() => setSelectedWorkshopForProjection(null)}
                  >
                    Đóng Màn hình
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Danh sách đã điểm danh của Workshop */}
          {selectedWorkshopAttendance && (
            <div className="modal-backdrop">
              <div className="modal-content" style={{ maxWidth: '680px' }}>
                <h2>Danh sách điểm danh: {selectedWorkshopAttendance.title}</h2>
                <p style={{ color: '#7a5b50', fontSize: '13px', marginBottom: '16px' }}>
                  Khung giờ check-in: {new Date(selectedWorkshopAttendance.checkin_start_at).toLocaleTimeString('vi-VN')} - {new Date(selectedWorkshopAttendance.checkin_end_at).toLocaleTimeString('vi-VN')}
                </p>

                {loadingAttendanceList ? (
                  <div style={{ padding: '30px', textAlign: 'center' }}>Đang tải danh sách...</div>
                ) : attendanceList.length === 0 ? (
                  <p style={{ padding: '20px', textAlign: 'center', color: '#886255' }}>Chưa có ai điểm danh cho sự kiện này.</p>
                ) : (
                  <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #ebdcd5', borderRadius: '8px' }}>
                    <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#fbf4f0', textAlign: 'left', borderBottom: '1px solid #ebdcd5' }}>
                          <th style={{ padding: '10px 12px' }}>Họ tên</th>
                          <th style={{ padding: '10px 12px' }}>Email</th>
                          <th style={{ padding: '10px 12px' }}>Thời điểm quét</th>
                          <th style={{ padding: '10px 12px' }}>Phương thức</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceList.map((item) => (
                          <tr key={item.attendance_id} style={{ borderBottom: '1px solid #f2e6e0' }}>
                            <td style={{ padding: '10px 12px' }}><strong>{item.user_name}</strong></td>
                            <td style={{ padding: '10px 12px', fontSize: '13px' }}>{item.user_email}</td>
                            <td style={{ padding: '10px 12px', fontSize: '13px' }}>{new Date(item.checkin_at).toLocaleString('vi-VN')}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span className="status-tag status-tag--draft">{item.checkin_method}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="modal-actions" style={{ marginTop: '20px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setSelectedWorkshopAttendance(null)}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* ========================================================================= */
        /* 2. GIAO DIỆN DÀNH CHO NGƯỜI THAM GIA (PARTICIPANT)                        */
        /* ========================================================================= */
        <>
          <div className="checkin-page__header">
            <div>
              <h1>Điểm danh Sự kiện</h1>
              <p className="checkin-page__subtitle">
                Quét mã QR do Ban Tổ Chức chiếu tại sự kiện hoặc nhập Mã điểm danh Workshop (BR-04, BR-05).
              </p>
            </div>
          </div>

          {checkInResult && (
            <div className="alert-banner alert-banner--success" style={{ marginBottom: '20px' }}>
              <div>
                <strong>{checkInResult.message}</strong>
                <p style={{ margin: '4px 0 0', fontSize: '13px' }}>
                  Sự kiện: <strong>{checkInResult.workshop_title}</strong> - Người tham dự: <strong>{checkInResult.user_name}</strong> ({checkInResult.user_email})
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

          {/* Camera Scanner & Manual Workshop Checkin Code Form */}
          <div className="checkin-scanner-tab" style={{ marginTop: '20px' }}>
            <div className="scanner-card" style={{ maxWidth: '540px', margin: '0 auto', background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #ebdcd5' }}>
              <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>Quét mã QR Sự kiện hoặc Nhập mã điểm danh</h2>
              <p style={{ color: '#7a5b50', fontSize: '13px', marginBottom: '20px' }}>
                Quét mã QR do Ban Tổ Chức chiếu tại sự kiện bằng Camera, hoặc nhập chuỗi Mã điểm danh của Sự kiện.
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
                    Mở Camera Quét mã QR Sự kiện
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
                  <label>Mã điểm danh Sự kiện (checkin_code):</label>
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Ví dụ: WS-CHECKIN-ERP2026"
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #ebdcd5' }}
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
        </>
      )}
    </div>
  );
}

export default CheckInPage;
