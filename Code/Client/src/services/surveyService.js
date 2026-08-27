import api from './api';

export async function submitSurvey({ registration_id, rating, feedback = '', answers = null }) {
  const response = await api.post('/surveys', {
    registration_id,
    rating,
    feedback,
    answers,
  });
  return response.data;
}

export async function getWorkshopSurveys(workshopId) {
  const response = await api.get(`/workshops/${workshopId}/surveys`);
  return response.data;
}
