/**
 * Utility chuẩn hóa thời gian và tính toán vòng đời Workshop thống nhất trên toàn bộ giao diện:
 * - Trang chủ (HomePage)
 * - Danh sách Workshop (WorkshopPage)
 * - Chi tiết Workshop (WorkshopDetailPage)
 */

/**
 * Chuẩn hóa chuỗi thời gian từ backend thành Date object chuẩn UTC.
 * Giải quyết triệt để lỗi chuỗi ISO không có 'Z' bị JavaScript hiểu nhầm thành giờ địa phương.
 *
 * @param {string|Date|null} dateInput
 * @returns {Date|null}
 */
export function parseUtcDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;

  let str = String(dateInput).trim();
  if (!str) return null;

  // Nếu dạng 'YYYY-MM-DD HH:mm:ss', thay khoảng trắng bằng 'T'
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(str)) {
    str = str.replace(' ', 'T');
  }

  // Nếu chuỗi datetime ISO không có timezone offset (+HH:mm / -HH:mm) và không có 'Z'
  // thì thêm 'Z' để biểu thị đây là thời điểm UTC
  if (!str.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(str)) {
    str += 'Z';
  }

  const date = new Date(str);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Định dạng hiển thị thời gian theo chuẩn tiếng Việt.
 * @param {string|Date|null} dateInput
 * @returns {string}
 */
export function formatDateTime(dateInput) {
  const d = parseUtcDate(dateInput);
  if (!d) return '--';
  return d.toLocaleString('vi-VN');
}

/**
 * Xác định trạng thái vòng đời Workshop theo quy tắc thống nhất:
 * - cancelled: Đã hủy
 * - draft: Bản nháp
 * - pending: Chờ duyệt
 * - completed: Đã kết thúc
 * - published:
 *     now < start_at: Sắp tới
 *     start_at <= now < end_at: Đang diễn ra
 *     now >= end_at: Đã kết thúc
 *
 * Không coi thiếu is_started/is_ended là bằng chứng workshop sắp tới.
 *
 * @param {Object} workshop
 * @param {Date|number} nowCurrent Thời điểm hiện tại cần đối chiếu (mặc định new Date())
 * @returns {Object} { phase, label, badgeClass, isEnded, isOngoing, isUpcoming }
 */
export function getWorkshopLifecycle(workshop, nowCurrent = new Date()) {
  if (!workshop) {
    return {
      phase: 'unknown',
      label: 'Không xác định',
      badgeClass: '',
      isEnded: false,
      isOngoing: false,
      isUpcoming: false,
    };
  }

  // 1. Các trạng thái rõ ràng theo database status
  if (workshop.status === 'cancelled') {
    return {
      phase: 'cancelled',
      label: 'Đã hủy',
      badgeClass: 'status-tag--cancelled',
      isEnded: true,
      isOngoing: false,
      isUpcoming: false,
    };
  }

  if (workshop.status === 'draft') {
    return {
      phase: 'draft',
      label: 'Bản nháp',
      badgeClass: 'status-tag--draft',
      isEnded: false,
      isOngoing: false,
      isUpcoming: false,
    };
  }

  if (workshop.status === 'pending') {
    return {
      phase: 'pending',
      label: 'Chờ duyệt',
      badgeClass: 'status-tag--pending',
      isEnded: false,
      isOngoing: false,
      isUpcoming: false,
    };
  }

  if (workshop.status === 'completed') {
    return {
      phase: 'completed',
      label: 'Đã kết thúc',
      badgeClass: 'status-tag--completed',
      isEnded: true,
      isOngoing: false,
      isUpcoming: false,
    };
  }

  // 2. Trạng thái published: Tính toán theo mốc thời gian thực tế
  const startDate = parseUtcDate(workshop.start_at);
  const endDate = parseUtcDate(workshop.end_at);
  const nowMs = nowCurrent instanceof Date ? nowCurrent.getTime() : new Date(nowCurrent).getTime();

  // Xác định ĐÃ KẾT THÚC:
  // - Nếu backend gắn cờ is_ended === true HOẶC effective_status === 'completed'
  // - HOẶC thời gian hiện tại đã qua end_at (now >= end_at)
  const isEnded =
    workshop.is_ended === true ||
    workshop.effective_status === 'completed' ||
    (endDate !== null && nowMs >= endDate.getTime());

  if (isEnded) {
    return {
      phase: 'completed',
      label: 'Đã kết thúc',
      badgeClass: 'status-tag--completed',
      isEnded: true,
      isOngoing: false,
      isUpcoming: false,
    };
  }

  // Xác định ĐANG DIỄN RA:
  // - Khi now >= start_at và now < end_at
  // - Hoặc backend gắn cờ is_started === true (và chưa isEnded)
  const isStarted =
    workshop.is_started === true ||
    (startDate !== null && nowMs >= startDate.getTime());

  if (isStarted) {
    return {
      phase: 'ongoing',
      label: 'Đang diễn ra',
      badgeClass: 'status-tag--ongoing',
      isEnded: false,
      isOngoing: true,
      isUpcoming: false,
    };
  }

  // Mặc định: SẮP TỚI (now < start_at)
  return {
    phase: 'upcoming',
    label: 'Sắp tới',
    badgeClass: 'status-tag--published',
    isEnded: false,
    isOngoing: false,
    isUpcoming: true,
  };
}
