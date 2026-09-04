import api from './api';

export async function getUsers(params = {}) {
  const response = await api.get('/users', { params });
  return response.data;
}

export async function createInternalUser(userData) {
  const response = await api.post('/users', userData);
  return response.data;
}

export async function updateUserRole(userId, role) {
  const response = await api.put(`/users/${userId}/role`, { role });
  return response.data;
}

export async function updateUserStatus(userId, status) {
  const response = await api.put(`/users/${userId}/status`, { status });
  return response.data;
}
