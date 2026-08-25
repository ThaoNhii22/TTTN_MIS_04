import api from './api';

const TOKEN_KEY = 'accessToken';
const USER_KEY = 'authUser';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getUser() {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setUser(user) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function getUserRole() {
  const user = getUser();
  return user?.role || 'participant';
}

/**
 * Đăng nhập qua API FastAPI (UC-01)
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{access_token: string, user: object}>}
 */
export async function login(email, password) {
  const response = await api.post('/auth/login', {
    email: email.trim(),
    password,
  });

  const { access_token, user } = response.data;
  setToken(access_token);
  setUser(user);
  return { access_token, user };
}

/**
 * Đăng xuất qua API FastAPI (UC-02)
 */
export async function logout() {
  try {
    if (isAuthenticated()) {
      await api.post('/auth/logout');
    }
  } catch {
    // Bỏ qua lỗi nếu token đã hết hạn
  } finally {
    removeToken();
  }
}

/**
 * Lấy thông tin tài khoản hiện tại từ API (GET /auth/me)
 */
export async function getProfile() {
  const response = await api.get('/auth/me');
  const user = response.data;
  setUser(user);
  return user;
}