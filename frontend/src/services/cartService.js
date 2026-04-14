import api from './api';
export const cartService = {
  getCart:    ()       => api.get('/cart'),
  addItem:    (d)      => api.post('/cart/items', d),
  updateItem: (id,qty) => api.put('/cart/items/'+id, { quantity: qty }),
  removeItem: (id)     => api.delete('/cart/items/'+id),
  clearCart:  ()       => api.delete('/cart'),
};