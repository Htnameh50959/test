import API from './api';

const courierService = {
  /**
   * Get earnings summary (today, week, month)
   */
  getEarnings: () => API.get('/courier/earnings'),

  /**
   * Get deliveries available to be picked up
   */
  getAvailableDeliveries: () => API.get('/courier/available'),

  /**
   * Accept an available delivery
   */
  acceptDelivery: (orderId) => API.post(`/courier/accept/${orderId}`),

  /**
   * Update order status during the delivery process
   * @param {string} orderId 
   * @param {string} status - COURIER_ASSIGNED, PICKED_UP, IN_TRANSIT, DELIVERED
   */
  updateStatus: (orderId, status) => API.put(`/courier/status/${orderId}`, { status }),

  /**
   * Register device for push notifications (future)
   */
  updateDeviceToken: (token) => API.patch('/courier/device-token', { token }),
};

export default courierService;
