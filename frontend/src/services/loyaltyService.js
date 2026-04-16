import api from './api';

export const loyaltyService = {
  get:    () => api.get('/users/loyalty'),
  redeem: (points) => api.post('/users/loyalty/redeem', { points }),
};
