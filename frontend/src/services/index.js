// src/services/authService.js
import api from './api';

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
import api from './api';

export const restaurantsService = {
  search:     (params)              => api.get('/restaurants/search', { params }),
  getById:    (id)                  => api.get(`/restaurants/${id}`),
  getReviews: (id, params)          => api.get(`/restaurants/${id}/reviews`, { params }),
  getAnalytics: (id)                => api.get(`/restaurants/${id}/reviews/analytics`),
};

// src/services/cartService.js
import api from './api';

export const cartService = {
  getCart:    ()                       => api.get('/cart'),
  addItem:    (data)                   => api.post('/cart/items', data),
  updateItem: (menuItemId, quantity)   => api.put(`/cart/items/${menuItemId}`, { quantity }),
  removeItem: (menuItemId)             => api.delete(`/cart/items/${menuItemId}`),
  clearCart:  ()                       => api.delete('/cart'),
};

// src/services/ordersService.js
import api from './api';

export const ordersService = {
  create:     (data)          => api.post('/orders', data),
  getHistory: (params)        => api.get('/orders', { params }),
  getById:    (id)            => api.get(`/orders/${id}`),
  cancel:     (id, reason)    => api.post(`/orders/${id}/cancel`, { reason }),
  getActive:  ()              => api.get('/orders?status=PENDING,ACCEPTED,PREPARING,READY_FOR_PICKUP'),
};

// src/services/reviewsService.js
import api from './api';

export const reviewsService = {
  submit:        (data)                 => api.post('/reviews', data),
  getForOrder:   (orderId)              => api.get(`/reviews?orderId=${orderId}`),
  getSuggestions:(data)                 => api.post('/reviews/suggestions', data),
  markHelpful:   (id)                   => api.post(`/reviews/${id}/helpful`),
  respond:       (id, text)             => api.post(`/reviews/${id}/respond`, { text }),
};
