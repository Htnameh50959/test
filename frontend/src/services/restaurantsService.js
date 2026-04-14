import api from './api';

export const restaurantsService = {
  search:      (p)    => api.get('/restaurants/search', { params: p }),
  getAll:      (p)    => api.get('/restaurants', { params: p }),
  getById:     (id)   => api.get('/restaurants/'+id),
  getReviews:  (id,p) => api.get('/restaurants/'+id+'/reviews', { params: p }),
  getAnalytics:(id)   => api.get('/restaurants/'+id+'/reviews/analytics'),
};
