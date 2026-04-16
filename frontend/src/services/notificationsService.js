import api from './api';

export const notificationsService = {
  getAll:      () => api.get('/users/notifications'),
  markRead:    (id) => api.patch(`/users/notifications/${id}/read`),
  markAllRead: () => api.patch('/users/notifications/read-all'),
};
