// src/constants/index.js
// Application-wide constants and enums.

// ── Order status ───────────────────────────────────────────────────────────────
export const ORDER_STATUS = {
  PENDING:          'PENDING',
  ACCEPTED:         'ACCEPTED',
  PREPARING:        'PREPARING',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  COURIER_ASSIGNED: 'COURIER_ASSIGNED',
  PICKED_UP:        'PICKED_UP',
  IN_TRANSIT:       'IN_TRANSIT',
  DELIVERED:        'DELIVERED',
  COMPLETED:        'COMPLETED',
  CANCELLED:        'CANCELLED',
};

export const ORDER_STATUS_LABELS = {
  PENDING:          'Order Placed',
  ACCEPTED:         'Accepted',
  PREPARING:        'Preparing',
  READY_FOR_PICKUP: 'Ready for Pickup',
  COURIER_ASSIGNED: 'Courier Assigned',
  PICKED_UP:        'Picked Up',
  IN_TRANSIT:       'On the Way',
  DELIVERED:        'Delivered',
  COMPLETED:        'Delivered',
  CANCELLED:        'Cancelled',
};

export const ACTIVE_ORDER_STATUSES = [
  'PENDING', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP',
  'COURIER_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT',
];

// ── Cuisine types ──────────────────────────────────────────────────────────────
export const CUISINE_TYPES = [
  'Indian', 'North Indian', 'South Indian', 'Chinese', 'Italian',
  'Mexican', 'Thai', 'Japanese', 'American', 'Mediterranean',
  'Biryani', 'Pizza', 'Burger', 'Desserts', 'Beverages',
];

// ── Price ranges ───────────────────────────────────────────────────────────────
export const PRICE_RANGES = [
  { value: '$',    label: 'Under ₹200',   icon: '₹' },
  { value: '$$',   label: '₹200 – ₹500',  icon: '₹₹' },
  { value: '$$$',  label: '₹500 – ₹1000', icon: '₹₹₹' },
  { value: '$$$$', label: 'Above ₹1000',  icon: '₹₹₹₹' },
];

// ── Sort options for restaurant search ─────────────────────────────────────────
export const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'rating',    label: 'Rating' },
  { value: 'distance',  label: 'Nearest First' },
  { value: 'delivery',  label: 'Fastest Delivery' },
];

// ── Payment methods ────────────────────────────────────────────────────────────
export const PAYMENT_METHODS = [
  { value: 'ONLINE', label: 'Pay Online',         icon: '💳' },
  { value: 'COD',    label: 'Cash on Delivery',   icon: '💵' },
  { value: 'UPI',    label: 'UPI',                icon: '📱' },
];

// ── Review sort ────────────────────────────────────────────────────────────────
export const REVIEW_SORT_OPTIONS = [
  { value: 'recent',      label: 'Most Recent' },
  { value: 'helpful',     label: 'Most Helpful' },
  { value: 'rating_high', label: 'Highest Rated' },
  { value: 'rating_low',  label: 'Lowest Rated' },
  { value: 'quality',     label: 'Best Quality' },
];

// ── Geolocation defaults ───────────────────────────────────────────────────────
export const DEFAULT_LOCATION = null;
export const DEFAULT_RADIUS_METERS = 5000;

// ── Pagination ─────────────────────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 20;

// ── Roles ──────────────────────────────────────────────────────────────────────
export const USER_ROLES = {
  CONSUMER: 'consumer',
  MERCHANT: 'merchant',
  COURIER:  'courier',
  ADMIN:    'admin',
};
