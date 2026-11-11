/**
 * Utility for parsing and formatting API error responses into clean,
 * user-friendly messages conforming to international UI/UX standards.
 */

const FIELD_LABELS = {
  title: 'Tiêu đề',
  description: 'Mô tả',
  location: 'Địa điểm',
  start_at: 'Thời gian bắt đầu sự kiện',
  end_at: 'Thời gian kết thúc sự kiện',
  registration_open_at: 'Thời điểm mở đăng ký',
  registration_close_at: 'Thời điểm đóng đăng ký',
  checkin_start_at: 'Thời điểm mở điểm danh',
  checkin_end_at: 'Thời điểm kết thúc điểm danh',
  quota: 'Số lượng giới hạn (Quota)',
  email: 'Địa chỉ email',
  password: 'Mật khẩu',
  full_name: 'Họ và tên',
  role: 'Vai trò',
  rating: 'Đánh giá số sao',
  feedback: 'Ý kiến đóng góp',
  rejection_reason: 'Lý do từ chối',
  cancellation_reason: 'Lý do hủy',
};

/**
 * Format Pydantic / FastAPI 422 validation errors into readable text.
 * @param {Array} details
 * @returns {string}
 */
function formatValidationErrors(details) {
  if (!Array.isArray(details) || details.length === 0) {
    return 'Dữ liệu gửi lên không đúng định dạng. Vui lòng kiểm tra lại.';
  }

  const messages = details.map((item) => {
    const rawField = item.loc ? item.loc[item.loc.length - 1] : null;
    const fieldName = rawField && FIELD_LABELS[rawField] ? FIELD_LABELS[rawField] : rawField || 'Thông tin';
    let msg = item.msg || 'không hợp lệ';

    if (msg.includes('Field required') || msg.includes('missing')) {
      return `Trường "${fieldName}" là bắt buộc.`;
    }
    if (msg.includes('greater than or equal to')) {
      return `Trường "${fieldName}" giá trị quá nhỏ.`;
    }
    if (msg.includes('valid email')) {
      return `"${fieldName}" không đúng định dạng email hợp lệ.`;
    }
    if (msg.includes('valid datetime') || msg.includes('date_parsing')) {
      return `Trường "${fieldName}" thời gian không đúng định dạng.`;
    }
    return `${fieldName}: ${msg}`;
  });

  return messages.join('\n');
}

/**
 * Extracts a concise, human-friendly error message from any caught error.
 * @param {any} err - Caught error object from Axios or elsewhere
 * @param {string} fallbackMessage - Default message if none can be extracted
 * @returns {string}
 */
export function formatErrorMessage(err, fallbackMessage = 'Đã có lỗi xảy ra. Vui lòng thử lại sau.') {
  if (!err) return fallbackMessage;

  // Case 1: String passed directly
  if (typeof err === 'string') return err;

  // Case 2: Axios Network Error
  if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng hoặc đảm bảo máy chủ đang hoạt động.';
  }

  // Case 3: Axios response error
  if (err.response) {
    const status = err.response.status;
    const data = err.response.data;

    // 422 Unprocessable Entity (FastAPI validation)
    if (status === 422 && data?.detail) {
      if (Array.isArray(data.detail)) {
        return formatValidationErrors(data.detail);
      }
      if (typeof data.detail === 'string') {
        return data.detail;
      }
    }

    // Detail string from FastAPI HTTPException
    if (data?.detail) {
      if (typeof data.detail === 'string') {
        return data.detail;
      }
      if (Array.isArray(data.detail)) {
        return formatValidationErrors(data.detail);
      }
    }

    if (data?.message && typeof data.message === 'string') {
      return data.message;
    }

    // Fallback by HTTP Status Code
    switch (status) {
      case 400:
        return 'Yêu cầu không hợp lệ. Vui lòng kiểm tra lại thông tin gửi đi.';
      case 401:
        return 'Phiên đăng nhập đã hết hạn hoặc thông tin xác thực không đúng. Vui lòng đăng nhập lại.';
      case 403:
        return 'Bạn không có quyền thực hiện chức năng này.';
      case 404:
        return 'Không tìm thấy dữ liệu yêu cầu trên hệ thống.';
      case 409:
        return 'Dữ liệu bị trùng lặp hoặc xung đột với trạng thái hiện tại.';
      case 429:
        return 'Bạn gửi yêu cầu quá nhanh. Vui lòng chờ giây lát và thử lại.';
      case 500:
      case 502:
      case 503:
      case 504:
        return 'Hệ thống máy chủ đang gặp sự cố tạm thời. Vui lòng thử lại sau.';
      default:
        return fallbackMessage;
    }
  }

  // Fallback to error message property if available
  if (err.message && typeof err.message === 'string' && !err.message.includes('object Object')) {
    return err.message;
  }

  return fallbackMessage;
}
