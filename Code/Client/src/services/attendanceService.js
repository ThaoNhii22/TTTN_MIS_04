import api from './api';

export async function checkInParticipant({ qr_payload, checkin_code, workshop_id, checkin_method = 'QR_SCAN' }) {
  const response = await api.post('/attendance/check-in', {
    qr_payload: qr_payload || null,
    checkin_code: checkin_code || null,
    workshop_id: workshop_id || null,
    checkin_method,
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
