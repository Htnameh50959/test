const fs   = require('fs');
const path = require('path');
const src  = path.join(process.cwd(), 'src');

// ── Service files ─────────────────────────────────────────────────────────────
const services = {
  'authService.js': [
    "import api from './api';",
    "export const authService = {",
    "  login:         (c)    => api.post('/auth/login', c),",
    "  register:      (d)    => api.post('/auth/register', d),",
    "  getProfile:    ()     => api.get('/users/profile'),",
    "  updateProfile: (d)    => api.put('/users/profile', d),",
    "  addAddress:    (a)    => api.post('/users/addresses', a),",
    "  updateAddress: (id,a) => api.put('/users/addresses/'+id, a),",
    "  deleteAddress: (id)   => api.delete('/users/addresses/'+id),",
    "};",
  ].join('\n'),

  'restaurantsService.js': [
    "import api from './api';",
    "export const restaurantsService = {",
    "  search:      (p)    => api.get('/restaurants/search', { params: p }),",
    "  getById:     (id)   => api.get('/restaurants/'+id),",
    "  getReviews:  (id,p) => api.get('/restaurants/'+id+'/reviews', { params: p }),",
    "  getAnalytics:(id)   => api.get('/restaurants/'+id+'/reviews/analytics'),",
    "};",
  ].join('\n'),

  'cartService.js': [
    "import api from './api';",
    "export const cartService = {",
    "  getCart:    ()       => api.get('/cart'),",
    "  addItem:    (d)      => api.post('/cart/items', d),",
    "  updateItem: (id,qty) => api.put('/cart/items/'+id, { quantity: qty }),",
    "  removeItem: (id)     => api.delete('/cart/items/'+id),",
    "  clearCart:  ()       => api.delete('/cart'),",
    "};",
  ].join('\n'),

  'ordersService.js': [
    "import api from './api';",
    "export const ordersService = {",
    "  create:     (d)    => api.post('/orders', d),",
    "  getHistory: (p)    => api.get('/orders', { params: p }),",
    "  getById:    (id)   => api.get('/orders/'+id),",
    "  cancel:     (id,r) => api.post('/orders/'+id+'/cancel', { reason: r }),",
    "};",
  ].join('\n'),

  'reviewsService.js': [
    "import api from './api';",
    "export const reviewsService = {",
    "  submit:         (d)   => api.post('/reviews', d),",
    "  getForOrder:    (oid) => api.get('/reviews?orderId='+oid),",
    "  getSuggestions: (d)   => api.post('/reviews/suggestions', d),",
    "  markHelpful:    (id)  => api.post('/reviews/'+id+'/helpful'),",
    "};",
  ].join('\n'),
};

for (const [name, content] of Object.entries(services)) {
  fs.writeFileSync(path.join(src, 'services', name), content, 'utf8');
  console.log('wrote services/' + name);
}

// ── Page files ────────────────────────────────────────────────────────────────
const pages = [
  ['HomePage',          'Home'],
  ['RestaurantPage',    'Restaurant Detail'],
  ['CheckoutPage',      'Checkout'],
  ['OrdersPage',        'My Orders'],
  ['OrderTrackingPage', 'Order Tracking'],
  ['LoginPage',         'Login'],
  ['RegisterPage',      'Register'],
  ['ProfilePage',       'My Profile'],
  ['NotFoundPage',      '404 Not Found'],
];

for (const [fnName, title] of pages) {
  const content = [
    "export default function " + fnName + "() {",
    "  return <div style={{ padding: 32 }}><h1>" + title + "</h1></div>;",
    "}",
    "",
  ].join('\n');
  fs.writeFileSync(path.join(src, 'pages', fnName + '.jsx'), content, 'utf8');
  console.log('wrote pages/' + fnName + '.jsx');
}

// ── tokenStorage (separate util) ──────────────────────────────────────────────
fs.writeFileSync(
  path.join(src, 'utils', 'tokenStorage.js'),
  [
    "const KEY = 'fh_auth_token';",
    "export const tokenStorage = {",
    "  get:   ()      => localStorage.getItem(KEY),",
    "  set:   (token) => localStorage.setItem(KEY, token),",
    "  clear: ()      => localStorage.removeItem(KEY),",
    "};",
    "",
  ].join('\n'),
  'utf8'
);
console.log('wrote utils/tokenStorage.js');

console.log('All files written OK');
