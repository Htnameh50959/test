import api from './api';

export const favoritesService = {
  getAll:  () => api.get('/users/favorites'),
  add:     (restaurantId) => api.post('/users/favorites', { restaurantId }),
  remove:  (restaurantId) => api.delete(`/users/favorites/${restaurantId}`),
};
