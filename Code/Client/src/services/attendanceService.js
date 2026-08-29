import api from './api';

export async function checkInParticipant({ qr_payload, checkin_code, workshop_id, checkin_method = 'qr' }) {
  const normalizedMethod = checkin_method.toLowerCase().includes('manual') ? 'manual' : 'qr';
  const response = await api.post('/attendance/check-in', {
    qr_payload: qr_payload || null,
    checkin_code: checkin_code || null,
    workshop_id: workshop_id ? Number(workshop_id) : null,
    checkin_method: normalizedMethod,
  });
  return response.data;
}

export async function getMyAttendanceHistory() {
  const response = await api.get('/attendance/my');
  return response.data;
}

export async function getWorkshopAttendanceList(workshopId) {
  const response = await api.get(`/workshops/${workshopId}/attendance`);
  return response.data;
}
