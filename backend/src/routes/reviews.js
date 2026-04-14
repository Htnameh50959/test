// =============================================================================
// REVIEWS ROUTES  (backend/src/routes/reviews.js)
// =============================================================================
// Mounted at two points in server.js:
//   /api/v1/reviews                          — standalone CRUD + suggestions
//   /api/v1/restaurants/:restaurantId/reviews — legacy restaurant-scoped access
//
// `mergeParams: true` makes :restaurantId available when mounted under
// /restaurants/:restaurantId, while still working under /reviews.
//
// Public endpoints:
//   GET  /api/v1/reviews                   — browse reviews (restaurantId query)
//   GET  /api/v1/reviews/:id               — single review
//
// Consumer endpoints (protected, consumer role):
//   POST /api/v1/reviews                   — submit a review
//   POST /api/v1/reviews/suggestions       — keyword suggestions before writing
//   PUT  /api/v1/reviews/:id               — update own review
//   DELETE /api/v1/reviews/:id             — soft-delete own review
//   POST /api/v1/reviews/:id/helpful       — toggle helpful vote
//
// Merchant / admin endpoints:
//   POST /api/v1/reviews/:id/respond       — merchant public response
// =============================================================================

const express = require('express');

// mergeParams: true lets :restaurantId from the parent router flow through.
const router = express.Router({ mergeParams: true });

// ── Controllers ───────────────────────────────────────────────────────────────
const {
  submitReview,
  getReviews,
  getReview,
  updateReview,
  deleteReview,
  getKeywordSuggestions,
  markHelpful,
  addMerchantResponse,
  getAnalytics,
} = require('../controllers/reviews');

// ── Middleware ────────────────────────────────────────────────────────────────
const { protect, authorize, optionalAuth } = require('../middleware/auth');

// =============================================================================
// PUBLIC ROUTES
// =============================================================================

/**
 * GET /api/v1/reviews
 * Query params: restaurantId, sort, rating, limit, skip
 * Also works as: GET /api/v1/restaurants/:restaurantId/reviews
 */
router.get('/', optionalAuth, getReviews);

/**
 * GET /api/v1/reviews/:id
 * Single review with populated customer name and restaurant info.
 *
 * IMPORTANT: This must be declared AFTER all literal sub-paths like
 * /suggestions, otherwise Express would match "suggestions" as :id.
 * We handle this by declaring /suggestions BEFORE /:id below.
 */

// =============================================================================
// PROTECTED ROUTES — require login
// =============================================================================

/**
 * POST /api/v1/reviews/suggestions
 * Body: { orderId, rating }
 * Returns 8-10 context-aware keyword suggestions.
 *
 * Declared BEFORE /:id routes to prevent Express treating "suggestions" as :id.
 */
router.post('/suggestions', protect, getKeywordSuggestions);

/**
 * GET /api/v1/restaurants/:restaurantId/reviews/analytics
 * Rich analytics: sentiment dist, rating dist, categories, word cloud, trend.
 * Public — no auth needed (useful for restaurant discovery pages).
 *
 * Also works as: GET /api/v1/reviews/analytics?restaurantId=...
 * but the nested-router path (/restaurants/:id/reviews/analytics) is preferred
 * because it makes :restaurantId available via mergeParams.
 *
 * Declared BEFORE /:id to prevent Express treating "analytics" as a review ID.
 */
router.get('/analytics', optionalAuth, getAnalytics);

/**
 * POST /api/v1/reviews
 * Submit a new review. Consumer only.
 * Body: { orderId, rating, text, photos[], tags[], hasVideo? }
 */
router.post('/', protect, authorize('consumer'), submitReview);

// ── All /:id routes below ─────────────────────────────────────────────────────

/**
 * GET /api/v1/reviews/:id
 */
router.get('/:id', optionalAuth, getReview);

/**
 * PUT /api/v1/reviews/:id
 * Update own review. Anti-spam: 48h cooldown between edits.
 * Body: { rating?, text?, photos?, tags? }
 */
router.put('/:id', protect, authorize('consumer', 'admin'), updateReview);

/**
 * DELETE /api/v1/reviews/:id
 * Soft-delete. Owner or admin only. Reclaims loyalty points.
 */
router.delete('/:id', protect, deleteReview);

/**
 * POST /api/v1/reviews/:id/helpful
 * Toggle a "helpful" vote. Cannot vote on own review.
 */
router.post('/:id/helpful', protect, markHelpful);

/**
 * POST /api/v1/reviews/:id/respond
 * Merchant adds a public response. One response per review.
 * Body: { text }
 */
router.post('/:id/respond', protect, authorize('merchant', 'admin'), addMerchantResponse);

module.exports = router;
