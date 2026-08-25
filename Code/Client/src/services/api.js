import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: Gắn JWT Token vào header Authorization
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: Chuẩn hóa phản hồi & Bắt các mã lỗi HTTP Status Code
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let errorMessage = 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
    const status = error.response?.status;
    const responseData = error.response?.data;

    // Trích xuất thông báo lỗi từ FastAPI backend (detail)
    if (responseData?.detail) {
      if (typeof responseData.detail === 'string') {
        errorMessage = responseData.detail;
      } else if (Array.isArray(responseData.detail)) {
        // FastAPI / Pydantic validation error array
        errorMessage = responseData.detail
          .map((item) => `${item.loc?.slice(-1)[0] || 'Trường'}: ${item.msg}`)
          .join('; ');
      }
    } else if (error.message === 'Network Error') {
      errorMessage = 'Không thể kết nối đến máy chủ Backend (FastAPI). Vui lòng kiểm tra lại server.';
    }

    // Xử lý theo từng HTTP Status Code
    if (status === 401) {
      // Token hết hạn hoặc không hợp lệ
      localStorage.removeItem('accessToken');
      localStorage.removeItem('authUser');

      // Chuyển hướng về login nếu không phải đang ở trang login
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    } else if (status === 403) {
      if (!responseData?.detail) {
        errorMessage = 'Bạn không có quyền thực hiện thao tác này hoặc tài khoản đã bị khóa.';
      }
    } else if (status === 404) {
      if (!responseData?.detail) {
        errorMessage = 'Không tìm thấy dữ liệu yêu cầu.';
      }
    }

    // Gắn thuộc tính message tùy chỉnh vào đối tượng error
    error.userMessage = errorMessage;
    return Promise.reject(error);
  },
);

export default api;