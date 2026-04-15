import api from './api';

// src/services/authService.js
export const authService = {
  login:         (credentials) => api.post('/auth/login', credentials),
  register:      (data)        => api.post('/auth/register', data),
  getProfile:    ()            => api.get('/users/profile'),
  updateProfile: (data)        => api.put('/users/profile', data),
  addAddress:    (address)     => api.post('/users/addresses', address),
  updateAddress: (id, addr)    => api.put(`/users/addresses/${id}`, addr),
  deleteAddress: (id)          => api.delete(`/users/addresses/${id}`),
};

// src/services/restaurantsService.js
export const restaurantsService = {
  search:     (params)              => api.get('/restaurants/search', { params }),
  getById:    (id)                  => api.get(`/restaurants/${id}`),
  getReviews: (id, params)          => api.get(`/restaurants/${id}/reviews`, { params }),
  getAnalytics: (id)                => api.get(`/restaurants/${id}/reviews/analytics`),
};

// src/services/cartService.js
export const cartService = {
  getCart:    ()                       => api.get('/cart'),
  addItem:    (data)                   => api.post('/cart/items', data),
  updateItem: (menuItemId, quantity)   => api.put(`/cart/items/${menuItemId}`, { quantity }),
  removeItem: (menuItemId)             => api.delete(`/cart/items/${menuItemId}`),
  clearCart:  ()                       => api.delete('/cart'),
};

// src/services/ordersService.js
export const ordersService = {
  create:     (data)          => api.post('/orders', data),
  getHistory: (params)        => api.get('/orders', { params }),
  getById:    (id)            => api.get(`/orders/${id}`),
  cancel:     (id, reason)    => api.post(`/orders/${id}/cancel`, { reason }),
  getActive:  ()              => api.get('/orders?status=PENDING,ACCEPTED,PREPARING,READY_FOR_PICKUP'),
};

// src/services/reviewsService.js
export const reviewsService = {
  submit:        (data)                 => api.post('/reviews', data),
  getForOrder:   (orderId)              => api.get(`/reviews?orderId=${orderId}`),
  getSuggestions:(data)                 => api.post('/reviews/suggestions', data),
  markHelpful:   (id)                   => api.post(`/reviews/${id}/helpful`),
  respond:       (id, text)             => api.post(`/reviews/${id}/respond`, { text }),
};

// src/services/merchantService.js
export const merchantService = {
  getMenu:           (restaurantId) => api.get('/merchant/menu', { params: { restaurantId } }),
  addMenuItem:       (data)         => api.post('/merchant/menu', data),
  updateMenuItem:    (id, data)     => api.put(`/merchant/menu/${id}`, data),
  deleteMenuItem:    (id)           => api.delete(`/merchant/menu/${id}`),
  toggleAvailability: (id, isAvail) => api.put(`/merchant/menu/${id}/availability`, { isAvailable: isAvail }),
  getDashboard:      (restaurantId) => api.get('/merchant/dashboard', { params: { restaurantId } }),
  acceptOrder:       (id, data)     => api.put(`/merchant/orders/${id}/accept`, data),
  rejectOrder:       (id, reason)   => api.put(`/merchant/orders/${id}/reject`, { reason }),
  updateOrderStatus: (id, data)     => api.put(`/merchant/orders/${id}/status`, data),
  getBookings:       (params)       => api.get('/merchant/bookings', { params }),
  updateBookingStatus:(id, status)  => api.put(`/merchant/bookings/${id}/status`, { status }),
};
