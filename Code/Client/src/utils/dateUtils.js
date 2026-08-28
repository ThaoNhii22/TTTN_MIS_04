/**
 * Tiện ích chuyển đổi và định dạng thời gian chuẩn xác theo giờ Việt Nam (UTC+7)
 */

/**
 * Định dạng ngày giờ đầy đủ (HH:mm:ss dd/MM/yyyy hoặc HH:mm dd/MM/yyyy)
 * @param {string|Date|number} dateValue - Chuỗi datetime từ Backend
 * @param {boolean} includeSeconds - Có hiển thị giây hay không (mặc định: true)
 * @returns {string} Chuỗi hiển thị theo giờ Việt Nam
 */
export function formatDateTime(dateValue, includeSeconds = true) {
  if (!dateValue) return '—';
  let s = String(dateValue).trim();

  // Nếu chuỗi datetime từ SQLite/Server không có hậu tố múi giờ (Z hay offset), thêm 'Z' để hiểu là giờ UTC
  if (!s.endsWith('Z') && !s.includes('+') && !s.match(/-\d{2}:\d{2}$/)) {
    s += 'Z';
  }

  const d = new Date(s);
  if (isNaN(d.getTime())) return String(dateValue);

  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds ? { second: '2-digit' } : {}),
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Định dạng ngày (dd/MM/yyyy)
 * @param {string|Date|number} dateValue
 * @returns {string}
 */
export function formatDate(dateValue) {
  if (!dateValue) return '—';
  let s = String(dateValue).trim();
  if (!s.endsWith('Z') && !s.includes('+') && !s.match(/-\d{2}:\d{2}$/)) {
    s += 'Z';
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(dateValue);
  return d.toLocaleDateString('vi-VN');
}
