// =============================================================================
// MERCHANT ROUTES  (backend/src/routes/merchant.js)
// =============================================================================
// Base path (registered in server.js): /api/v1/merchant
//
// ALL routes require: JWT auth (protect) + merchant OR admin role (authorize).
//
// Dashboard:
//   GET  /api/v1/merchant/dashboard
//
// Order management:
//   PUT  /api/v1/merchant/orders/:id/accept
//   PUT  /api/v1/merchant/orders/:id/reject
//   PUT  /api/v1/merchant/orders/:id/status
//
// Menu management:
//   GET    /api/v1/merchant/menu
//   POST   /api/v1/merchant/menu
//   PUT    /api/v1/merchant/menu/:itemId/availability  ← BEFORE /:itemId
//   PUT    /api/v1/merchant/menu/:itemId
//   DELETE /api/v1/merchant/menu/:itemId
//
// Analytics:
//   GET  /api/v1/merchant/analytics/sales
//   GET  /api/v1/merchant/analytics/popular-items
//   GET  /api/v1/merchant/analytics/peak-hours
//
// Review insights:
//   GET  /api/v1/merchant/reviews/sentiment
//
// Multi-restaurant support:
//   Merchants with more than one restaurant can pass ?restaurantId= on any
//   request to scope the response to a specific restaurant.
//   Without it, the first active restaurant owned by the merchant is used.
// =============================================================================

const express = require('express');
const router  = express.Router();

// ── Controllers ───────────────────────────────────────────────────────────────
const {
  getDashboard,
  acceptOrder,
  rejectOrder,
  updateOrderStatus,
  getMenu,
  addMenuItem,
  updateMenuItem,
  toggleAvailability,
  deleteMenuItem,
  getSalesAnalytics,
  getPopularItems,
  getPeakHours,
  getReviewSentiment,
  getBookings,
  updateBookingStatus,
} = require('../controllers/merchant');

// ── Middleware ────────────────────────────────────────────────────────────────
const { protect, authorize } = require('../middleware/auth');

// Apply auth globally — every merchant route requires login + merchant/admin role.
router.use(protect);
router.use(authorize('merchant', 'admin'));

// =============================================================================
// DASHBOARD
// =============================================================================

/**
 * GET /api/v1/merchant/dashboard
 * Today's stats, pending orders and active in-flight orders.
 * Optional query: ?restaurantId= to scope to one restaurant.
 */
router.get('/dashboard', getDashboard);

// =============================================================================
// ORDER MANAGEMENT
// =============================================================================

/**
 * PUT /api/v1/merchant/orders/:id/accept
 * Accept a PENDING order. Body: { estimatedMinutes? }
 * Broadcasts orderStatusUpdate via WebSocket.
 */
router.put('/orders/:id/accept', acceptOrder);

/**
 * PUT /api/v1/merchant/orders/:id/reject
 * Reject (cancel) a PENDING order. Body: { reason } (required).
 * Triggers refund if payment was captured. Notifies customer.
 */
router.put('/orders/:id/reject', rejectOrder);

/**
 * PUT /api/v1/merchant/orders/:id/status
 * Advance the order state machine.
 * Body: { status, note?, estimatedMinutes? }
 * Validates the transition and broadcasts to the customer.
 */
router.put('/orders/:id/status', updateOrderStatus);

// =============================================================================
// MENU MANAGEMENT
// Note: /menu/:itemId/availability MUST come before /menu/:itemId
//       to prevent Express treating "availability" as another itemId.
// =============================================================================

/**
 * GET /api/v1/merchant/menu
 * Full menu grouped by category + availability counts.
 */
router.get('/menu', getMenu);

/**
 * POST /api/v1/merchant/menu
 * Add a new menu item. Body: { name, price, category, description?, image?, modifiers? }
 */
router.post('/menu', addMenuItem);

/**
 * PUT /api/v1/merchant/menu/:itemId/availability
 * Toggle isAvailable. Body: { isAvailable: boolean }
 */
router.put('/menu/:itemId/availability', toggleAvailability);

/**
 * PUT /api/v1/merchant/menu/:itemId
 * Update item details (name, price, description, category, modifiers, etc.)
 */
router.put('/menu/:itemId', updateMenuItem);

/**
 * DELETE /api/v1/merchant/menu/:itemId
 * Soft-delete a menu item (sets isDeleted = true, isAvailable = false).
 * Historical order data is preserved.
 */
router.delete('/menu/:itemId', deleteMenuItem);

// =============================================================================
// ANALYTICS
// =============================================================================

/**
 * GET /api/v1/merchant/analytics/sales
 * Revenue + order count time series.
 * Query: period=daily|weekly|monthly, days=30 (max 365)
 */
router.get('/analytics/sales', getSalesAnalytics);

/**
 * GET /api/v1/merchant/analytics/popular-items
 * Top-selling items by revenue. Query: days=30, limit=10
 */
router.get('/analytics/popular-items', getPopularItems);

/**
 * GET /api/v1/merchant/analytics/peak-hours
 * Heatmap: hour (0-23) × weekday (Sun-Sat) → { orders, revenue }
 * Query: days=90 (max 365)
 */
router.get('/analytics/peak-hours', getPeakHours);

// =============================================================================
// REVIEW INSIGHTS
// =============================================================================

/**
 * GET /api/v1/merchant/reviews/sentiment
 * Sentiment overview + distribution + category averages + trend + word cloud
 * + 10 most recent reviews ready for merchant response.
 * Query: days=30 (max 365)
 */
router.get('/reviews/sentiment', getReviewSentiment);

// =============================================================================
// RESERVATIONS
// =============================================================================

/**
 * GET /api/v1/merchant/bookings
 * Fetch all table reservations for the restaurant.
 * Query: ?status=pending|confirmed|completed|cancelled|no-show & ?date=YYYY-MM-DD
 */
router.get('/bookings', getBookings);

/**
 * PUT /api/v1/merchant/bookings/:id/status
 * Update booking status (confirm, complete, cancel, etc.)
 * Body: { status, tableNumber? }
 */
router.put('/bookings/:id/status', updateBookingStatus);

module.exports = router;
