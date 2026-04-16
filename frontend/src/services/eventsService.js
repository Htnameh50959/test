import api from './api';

export const eventsService = {
  getAll:   (params) => api.get('/events', { params }),
  getById:  (id) => api.get(`/events/${id}`),
  book:     (id, tickets) => api.post(`/events/${id}/book`, { tickets }),
};
