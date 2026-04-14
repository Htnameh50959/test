import api from './api';
export const ordersService = {
  create:     (d)    => api.post('/orders', d),
  getHistory: (p)    => api.get('/orders', { params: p }),
  getById:    (id)   => api.get('/orders/'+id),
  cancel:     (id,r) => api.post('/orders/'+id+'/cancel', { reason: r }),
};