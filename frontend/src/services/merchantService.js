import api from './api';

export const merchantService = {
  // Menu Management
  getMenu:           (restaurantId) => api.get('/merchant/menu', { params: { restaurantId } }),
  addMenuItem:       (data)         => api.post('/merchant/menu', data),
  updateMenuItem:    (id, data)     => api.put(`/merchant/menu/${id}`, data),
  deleteMenuItem:    (id)           => api.delete(`/merchant/menu/${id}`),
  toggleAvailability: (id, isAvailable) => api.put(`/merchant/menu/${id}/availability`, { isAvailable }),
  
  // Dashboard & Analytics
  getDashboard:      (restaurantId) => api.get('/merchant/dashboard', { params: { restaurantId } }),
  getSalesAnalytics: (params)       => api.get('/merchant/analytics/sales', { params }),
  getPopularItems:   (params)       => api.get('/merchant/analytics/popular-items', { params }),
  getPeakHours:      (params)       => api.get('/merchant/analytics/peak-hours', { params }),
  getReviews:        (params)       => api.get('/merchant/reviews/sentiment', { params }),
  
  // Order Actions
  acceptOrder:       (id, data)     => api.put(`/merchant/orders/${id}/accept`, data),
  rejectOrder:       (id, reason)   => api.put(`/merchant/orders/${id}/reject`, { reason }),
  updateOrderStatus: (id, data)     => api.put(`/merchant/orders/${id}/status`, data),
};

export default merchantService;
