import api from './api';

export const adminService = {
  // Stats
  getStats:        () => api.get('/admin/stats'),
  
  // User Management
  getUsers:        () => api.get('/admin/users'),
  updateUserStatus: (id, isActive) => api.put(`/admin/users/${id}/status`, { isActive }),

  // Merchant Management
  getMerchants:    () => api.get('/admin/merchants'),
  verifyMerchant:  (id, data) => api.put(`/admin/merchants/${id}/verify`, data),
  
  // Performance
  getPerformanceStats: () => api.get('/admin/performance/benchmark'),
};

export default adminService;
