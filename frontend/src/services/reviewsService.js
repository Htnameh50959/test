// src/services/reviewsService.js
import api from './api';

export const reviewsService = {
  submit:         (d)    => api.post('/reviews', d),
  getForOrder:    (oid)  => api.get('/reviews?orderId='+oid),
  getSuggestions: (oid, r) => api.get(`/reviews/keyword-suggestions?orderId=${oid}&rating=${r}`),
  markHelpful:    (id)   => api.post('/reviews/'+id+'/helpful'),
  getRestaurantReviews: (rid, p) => api.get(`/restaurants/${rid}/reviews`, { params: p }),
  uploadPhoto: (file) => {
    const formData = new FormData();
    formData.append('photo', file);
    return api.post('/reviews/upload-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};