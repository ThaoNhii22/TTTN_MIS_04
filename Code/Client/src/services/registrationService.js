import api from './api';

export async function registerWorkshop({ workshop_id, accept_waitlist = false }) {
  const response = await api.post('/registrations', {
    workshop_id,
    accept_waitlist,
  });
  return response.data;
}

export async function cancelRegistration(registrationId, cancel_reason = 'Người tham gia tự hủy vé') {
  const response = await api.post(`/registrations/${registrationId}/cancel`, {
    cancel_reason,
  });
  return response.data;
}

export async function getMyRegistrations(params = {}) {
  const response = await api.get('/registrations/my', { params });
  return response.data;
}

export async function getWorkshopRegistrations(workshopId, params = {}) {
  const response = await api.get(`/workshops/${workshopId}/registrations`, { params });
  return response.data;
}
