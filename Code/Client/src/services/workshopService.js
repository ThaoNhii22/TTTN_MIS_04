import api from './api';

/**
 * Định dạng đối tượng Workshop từ API Backend thành cấu trúc chuẩn cho giao diện Frontend
 * @param {object} w
 * @returns {object}
 */
export function formatWorkshop(w) {
  if (!w) return null;

  const startDate = w.start_at ? new Date(w.start_at) : new Date();
  const endDate = w.end_at ? new Date(w.end_at) : new Date();

  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${pad(startDate.getDate())}/${pad(startDate.getMonth() + 1)}/${startDate.getFullYear()}`;
  const timeStr = `${pad(startDate.getHours())}:${pad(startDate.getMinutes())} - ${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`;

  // Phân loại danh mục theo tiêu đề
  let category = 'Công nghệ';
  const titleLower = (w.title || '').toLowerCase();
  if (titleLower.includes('design') || titleLower.includes('ui/ux') || titleLower.includes('thiết kế')) {
    category = 'Thiết kế';
  } else if (titleLower.includes('data') || titleLower.includes('python') || titleLower.includes('dữ liệu')) {
    category = 'Dữ liệu';
  } else if (titleLower.includes('kỹ năng') || titleLower.includes('career') || titleLower.includes('cv') || titleLower.includes('thuyết trình')) {
    category = 'Kỹ năng mềm';
  }

  const isFull = Boolean(w.is_full || (w.confirmed_count >= w.quota));
  const displayStatus = w.status === 'published' ? (isFull ? 'full' : 'open') : w.status;

  return {
    id: w.workshop_id,
    workshop_id: w.workshop_id,
    title: w.title,
    category,
    date: dateStr,
    time: timeStr,
    startAt: w.start_at,
    endAt: w.end_at,
    registrationOpenAt: w.registration_open_at,
    registrationCloseAt: w.registration_close_at,
    location: w.location || 'Phòng A203, Tòa nhà Trung tâm Công nghệ',
    organizer: w.organizer?.full_name || 'Ban Tổ chức Workshop & Khoa CNTT',
    speaker: {
      name: w.organizer?.full_name || 'Diễn giả Chuyên môn',
      title: 'Chuyên gia Khách mời / Giảng viên',
    },
    quota: w.quota || 0,
    registered: w.confirmed_count || 0,
    waitlistCount: w.waitlist_count || 0,
    attendedCount: w.attended_count || 0,
    status: displayStatus,
    rawStatus: w.status,
    cutoffHours: 24, // BR-11
    checkinCode: w.checkin_code,
    description: w.description || 'Workshop nâng cao kiến thức và kỹ năng thực hành.',
    objectives: [
      'Nắm vững quy trình nghiệp vụ và thực hành thực tế',
      'Tương tác trực tiếp và trao đổi cùng diễn giả chuyên môn',
      'Được cấp giấy chứng nhận sau khi hoàn thành khảo sát và điểm danh',
    ],
    agenda: [
      { time: '15 phút đầu', activity: 'Đón tiếp & Điểm danh mã QR tại sảnh' },
      { time: 'Phần 1', activity: 'Giới thiệu tổng quan và lý thuyết cốt lõi' },
      { time: 'Phần 2', activity: 'Thực hành tương tác trực tiếp theo nhóm' },
      { time: 'Phần 3', activity: 'Hỏi đáp Q&A và Khảo sát đánh giá nhận chứng nhận' },
    ],
    prerequisites: [
      'Mang theo Laptop cá nhân có kết nối Internet',
      'Có mặt trước giờ bắt đầu ít nhất 10 phút để điểm danh',
    ],
  };
}

/**
 * Định dạng đối tượng Registration từ API
 * @param {object} r
 * @returns {object}
 */
export function formatRegistration(r) {
  if (!r) return null;
  return {
    id: r.registration_id,
    registrationId: r.registration_id,
    registration_id: r.registration_id,
    workshopId: r.workshop_id,
    workshop_id: r.workshop_id,
    workshopTitle: r.workshop_title || `Workshop #${r.workshop_id}`,
    workshopLocation: r.workshop_location || 'Hội trường chính',
    workshopStartAt: r.workshop_start_at,
    status: r.status, // 'waitlist' | 'confirmed' | 'cancelled' | 'attended'
    waitlistPosition: r.waitlist_position,
    qrPayload: r.qr_payload,
    registeredAt: r.registered_at,
    confirmedAt: r.confirmed_at,
    cancelledAt: r.cancelled_at,
    cancelReason: r.cancel_reason,
    isCancellable: r.is_cancellable !== false,
    wasPromoted: Boolean(r.status === 'confirmed' && r.confirmed_at),
    ticketCode: `WS${r.workshop_id}-REG${r.registration_id}`,
  };
}

// ==========================================
// WORKSHOPS APIs (UC-08)
// ==========================================

/**
 * Lấy danh sách Workshop từ Backend (UC-08)
 * @param {object} params
 * @returns {Promise<Array>}
 */
export async function getWorkshops(params = {}) {
  try {
    const response = await api.get('/workshops', { params });
    return (response.data || []).map(formatWorkshop);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách Workshop:', error);
    throw error;
  }
}

/**
 * Lấy chi tiết một Workshop theo ID (UC-08)
 * @param {number|string} id
 * @returns {Promise<object>}
 */
export async function getWorkshopById(id) {
  try {
    const response = await api.get(`/workshops/${id}`);
    return formatWorkshop(response.data);
  } catch (error) {
    console.error(`Lỗi khi lấy chi tiết Workshop #${id}:`, error);
    throw error;
  }
}

// ==========================================
// REGISTRATIONS & WAITLIST APIs (UC-09, UC-10, UC-11)
// ==========================================

/**
 * Lấy danh sách đăng ký của người dùng hiện tại (UC-11)
 * @param {string} statusFilter
 * @returns {Promise<Array>}
 */
export async function getMyRegistrations(statusFilter = null) {
  try {
    const params = statusFilter ? { status: statusFilter } : {};
    const response = await api.get('/registrations/my', { params });
    return (response.data || []).map(formatRegistration);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách đăng ký của tôi:', error);
    throw error;
  }
}

/**
 * Lấy thông tin đăng ký của người dùng hiện tại cho 1 Workshop cụ thể
 * @param {number|string} workshopId
 * @returns {Promise<object|null>}
 */
export async function getUserRegistration(workshopId) {
  try {
    const registrations = await getMyRegistrations();
    const match = registrations.find(
      (r) => Number(r.workshopId) === Number(workshopId) && (r.status === 'confirmed' || r.status === 'waitlist' || r.status === 'attended')
    );
    return match || null;
  } catch (error) {
    console.error('Lỗi khi kiểm tra đăng ký:', error);
    return null;
  }
}

/**
 * Đăng ký tham gia Workshop hoặc Danh sách chờ (UC-09, BR-01, BR-02, BR-08, BR-15)
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function registerWorkshop({ workshopId, isWaitlistAccept = true }) {
  try {
    const response = await api.post('/registrations', {
      workshop_id: Number(workshopId),
      accept_waitlist: Boolean(isWaitlistAccept),
    });
    return formatRegistration(response.data);
  } catch (error) {
    console.error('Lỗi đăng ký Workshop:', error);
    throw error;
  }
}

/**
 * Hủy lượt đăng ký Workshop (UC-10, BR-11, BR-03)
 * @param {number|string} registrationId
 * @param {string} cancelReason
 * @returns {Promise<object>}
 */
export async function cancelRegistration(registrationId, cancelReason = '') {
  try {
    const response = await api.post(`/registrations/${registrationId}/cancel`, {
      cancel_reason: cancelReason || 'Người dùng tự hủy đăng ký',
    });
    return formatRegistration(response.data);
  } catch (error) {
    console.error('Lỗi hủy đăng ký:', error);
    throw error;
  }
}

/**
 * Lấy danh sách chờ (Waitlist) của người dùng hiện tại
 * @returns {Promise<Array>}
 */
export async function getUserWaitlistEntries() {
  try {
    const registrations = await getMyRegistrations();
    return registrations.filter((r) => r.status === 'waitlist' || (r.status === 'confirmed' && r.wasPromoted));
  } catch (error) {
    console.error('Lỗi lấy danh sách Waitlist:', error);
    throw error;
  }
}

/**
 * Rút khỏi danh sách chờ
 * @param {number|string} registrationId
 * @param {string} reason
 * @returns {Promise<object>}
 */
export async function leaveWaitlist(registrationId, reason = '') {
  return cancelRegistration(registrationId, reason || 'Rút khỏi danh sách chờ');
}

/**
 * Lấy danh sách các vé đã xác nhận (Confirmed) của người dùng
 * @returns {Promise<Array>}
 */
export async function getConfirmedRegistrations() {
  try {
    const registrations = await getMyRegistrations('confirmed');
    return registrations;
  } catch (error) {
    console.error('Lỗi lấy danh sách vé confirmed:', error);
    throw error;
  }
}

// ==========================================
// ATTENDANCE & CHECK-IN APIs (UC-12, UC-13)
// ==========================================

/**
 * Điểm danh người tham gia (UC-12, BR-04, BR-05, BR-14)
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function processCheckIn({
  workshopId,
  qrPayload,
  checkinCode,
  registrationId,
  checkinMethod = 'qr',
}) {
  try {
    // Nếu có QR payload dạng TTTN_MIS_04|{ws_id}|{reg_id}|{email} mà chưa có workshopId, tự động trích xuất
    let wsId = workshopId;
    if (!wsId && qrPayload && qrPayload.startsWith('TTTN_MIS_04|')) {
      const parts = qrPayload.split('|');
      if (parts.length >= 2) {
        wsId = Number(parts[1]);
      }
    }

    const payload = {
      workshop_id: Number(wsId || 1),
      qr_payload: qrPayload || null,
      checkin_code: checkinCode || null,
      registration_id: registrationId ? Number(registrationId) : null,
      checkin_method: checkinMethod,
    };

    const response = await api.post('/attendance/check-in', payload);
    return response.data;
  } catch (error) {
    console.error('Lỗi thực hiện điểm danh:', error);
    throw error;
  }
}

/**
 * Lấy lịch sử điểm danh của người dùng hiện tại (UC-13)
 * @returns {Promise<Array>}
 */
export async function getAttendanceHistory() {
  try {
    const response = await api.get('/attendance/my');
    return (response.data || []).map((att) => ({
      id: att.attendance_id,
      attendanceId: att.attendance_id,
      registrationId: att.registration_id,
      workshopId: att.workshop_id,
      workshopTitle: att.workshop_title || `Workshop #${att.workshop_id}`,
      checkinAt: att.checkin_at,
      checkinMethod: att.checkin_method,
      userName: att.user_name,
      userEmail: att.user_email,
      formattedTime: att.checkin_at ? new Date(att.checkin_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
      formattedDate: att.checkin_at ? new Date(att.checkin_at).toLocaleDateString('vi-VN') : '',
    }));
  } catch (error) {
    console.error('Lỗi lấy lịch sử điểm danh:', error);
    throw error;
  }
}
