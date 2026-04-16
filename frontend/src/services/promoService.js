import api from './api';

export const promoService = {
  getAll:    () => api.get('/promos'),
  validate:  (code, orderTotal) => api.post('/promos/validate', { code, orderTotal }),
};
