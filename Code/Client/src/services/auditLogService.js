import api from './api';

export async function getAuditLogs(params = {}) {
  const response = await api.get('/audit-logs', { params });
  return response.data;
}
