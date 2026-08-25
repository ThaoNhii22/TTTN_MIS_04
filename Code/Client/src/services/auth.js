import api from './api';

const TOKEN_KEY = 'accessToken';
const USER_KEY = 'currentUser';

export async function loginApi(email, password) {
  const response = await api.post('/auth/login', {
    email: email.trim().toLowerCase(),
    password,
  });
  const data = response.data;
  setToken(data.access_token);
  setStoredUser(data.user);
  return data;
}

export async function logoutApi() {
  try {
    await api.post('/auth/logout');
  } catch (err) {
    // Ignore network error on logout
    console.warn('Logout API error:', err);
  } finally {
    removeToken();
    removeStoredUser();
  }
}

export async function getMeApi() {
  const response = await api.get('/auth/me');
  setStoredUser(response.data);
  return response.data;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getStoredUser() {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function removeStoredUser() {
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function getUserRole() {
  const user = getStoredUser();
  return user ? user.role : null;
}