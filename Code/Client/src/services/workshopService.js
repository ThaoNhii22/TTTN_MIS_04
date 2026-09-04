import api from './api';

export async function getWorkshops(params = {}) {
  const response = await api.get('/workshops', { params });
  return response.data;
}

export async function getWorkshopById(workshopId) {
  const response = await api.get(`/workshops/${workshopId}`);
  return response.data;
}

export async function createWorkshop(workshopData) {
  const response = await api.post('/workshops', workshopData);
  return response.data;
}

export async function updateWorkshop(workshopId, workshopData) {
  const response = await api.put(`/workshops/${workshopId}`, workshopData);
  return response.data;
}

export async function submitWorkshopForApproval(workshopId) {
  const response = await api.post(`/workshops/${workshopId}/submit`);
  return response.data;
}

export async function reviewWorkshop(workshopId, { action, rejection_reason }) {
  const response = await api.post(`/workshops/${workshopId}/review`, {
    action,
    rejection_reason,
  });
  return response.data;
}

export async function cancelWorkshop(workshopId, cancel_reason) {
  const response = await api.post(`/workshops/${workshopId}/cancel`, {
    cancel_reason,
  });
  return response.data;
}
