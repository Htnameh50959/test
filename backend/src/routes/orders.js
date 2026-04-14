// =============================================================================
// ORDERS ROUTES  (backend/src/routes/orders.js)
// =============================================================================
// Base path (registered in server.js): /api/v1/orders
//
// ALL routes require a valid JWT (protect applied globally below).
//
// Consumer routes:
//   POST /api/v1/orders               — place an order
//   GET  /api/v1/orders               — my order history
//   GET  /api/v1/orders/:id           — single order details
//   POST /api/v1/orders/:id/cancel    — cancel my order
//
// Merchant / courier / admin routes:
//   PUT  /api/v1/orders/:id/status    — advance state machine
//
// Role matrix for status updates:
//   merchant → ACCEPTED, PREPARING, READY_FOR_PICKUP, CANCELLED
//   courier  → COURIER_ASSIGNED, PICKED_UP, IN_TRANSIT, DELIVERED
//   admin    → any transition
// (enforced in the controller via TRANSITION_ACTORS — the route only
//  gates out consumers from touching status entirely)
// =============================================================================

const express = require('express');

const router = express.Router();

// ── Controllers ───────────────────────────────────────────────────────────────
const {
  createOrder,
  getOrders,
  getOrder,
  updateStatus,
  cancelOrder,
  acceptOrder,
  rejectOrder,
} = require('../controllers/orders');

// ── Middleware ────────────────────────────────────────────────────────────────
const { protect, authorize }    = require('../middleware/auth');
const { validate, schemas }     = require('../middleware/validate');

// =============================================================================
// All order routes require authentication
// =============================================================================
router.use(protect);

// =============================================================================
// CONSUMER ROUTES
// =============================================================================

/**
 * POST /api/v1/orders
 * Place a new order. Consumers only.
 *
 * Validated by the Joi schema in schemas.orders.create (already defined
 * in middleware/validate.js). The schema ensures:
 *   - restaurantId is a valid ObjectId
 *   - items array has at least one item
 *   - deliveryAddress has coordinates
 *   - paymentMethod is a valid enum value
 */
router.post(
  '/',
  authorize('consumer'),
  validate(schemas.orders.create),
  createOrder
);

/**
 * GET /api/v1/orders
 * Returns the caller's orders, role-aware:
 *   consumer → own orders
 *   merchant → orders for their restaurants
 *   courier  → assigned deliveries
 *   admin    → all orders
 *
 * Query params: status (filter), limit, skip
 */
router.get('/', getOrders);

/**
 * GET /api/v1/orders/:id
 * Full order detail. Authorization enforced in controller:
 *   consumer → own orders only
 *   merchant → orders from their restaurants
 *   courier  → orders assigned to them
 *   admin    → any order
 */
router.get('/:id', getOrder);

/**
 * POST /api/v1/orders/:id/cancel
 * Cancel an order. Body: { reason? }
 *
 * MUST be declared before /:id/status to avoid route shadowing.
 *
 * Consumer:        can cancel while PENDING only
 * Merchant/admin:  can cancel up to COURIER_ASSIGNED
 */
router.post('/:id/cancel', cancelOrder);

// =============================================================================
// MERCHANT / COURIER / ADMIN ROUTES
// =============================================================================

/**
 * PUT /api/v1/orders/:id/status
 * Advance the order state machine. Body: { status, note?, estimatedMinutes? }
 *
 * Consumers are explicitly excluded — they use /cancel for cancellation.
 * Fine-grained role checks (which role can set which status) happen in the
 * controller via the TRANSITION_ACTORS map.
 */
router.put(
  '/:id/status',
  authorize('merchant', 'courier', 'admin'),
  updateStatus
);

/**
 * POST /api/v1/orders/:id/accept
 * Merchant accepts the order and provides an estimated prep time.
 */
router.post(
  '/:id/accept',
  authorize('merchant', 'admin'),
  acceptOrder
);

/**
 * POST /api/v1/orders/:id/reject
 * Merchant rejects the order (e.g., out of stock, too busy).
 */
router.post(
  '/:id/reject',
  authorize('merchant', 'admin'),
  rejectOrder
);

module.exports = router;
