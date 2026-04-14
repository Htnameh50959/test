// =============================================================================
// RESTAURANT ROUTES  (backend/src/routes/restaurants.js)
// =============================================================================
// Base path (registered in server.js): /api/v1/restaurants
//
// Public:
//   GET  /api/v1/restaurants               — browse all (text search, city filter)
//   GET  /api/v1/restaurants/search        — geospatial search (lat/lng required)
//   GET  /api/v1/restaurants/:id           — full restaurant details + menu
//
// Protected (merchant/admin only):
//   POST   /api/v1/restaurants             — create a new restaurant
//   PUT    /api/v1/restaurants/:id         — update a restaurant
//   DELETE /api/v1/restaurants/:id         — soft-delete a restaurant
//
// IMPORTANT: the /search route MUST be declared before /:id so Express
// does not treat "search" as a MongoDB ObjectId and pass it to getRestaurant.
// =============================================================================

const express = require('express');

const router = express.Router();

// ── Controllers ───────────────────────────────────────────────────────────────
const {
  searchRestaurants,
  getRestaurants,
  getRestaurant,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
} = require('../controllers/restaurants');

// ── Middleware ────────────────────────────────────────────────────────────────
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { validate, schemas }                = require('../middleware/validate');

// =============================================================================
// PUBLIC ROUTES
// =============================================================================

/**
 * GET /api/v1/restaurants/search
 *
 * Geospatial restaurant discovery endpoint.
 *
 * Required query params: lat, lng
 * Optional: radius, cuisineTypes, minRating, priceRange, features, isOpen, limit, skip
 *
 * Validates query params via Joi (not body), so we pass 'query' as the target.
 * optionalAuth: attaches req.user if a valid token is provided so the response
 * can include personalised data (favourites, etc.) without blocking anonymous users.
 *
 * MUST be declared before '/:id' — otherwise Express treats "search" as :id.
 */
router.get(
  '/search',
  optionalAuth,
  validate(schemas.restaurants.search, 'query'),
  searchRestaurants
);

/**
 * GET /api/v1/restaurants
 * Browse all restaurants with optional text search and city filter.
 */
router.get('/', optionalAuth, getRestaurants);

/**
 * GET /api/v1/restaurants/:id
 * Full restaurant details including the complete menu, grouped by category.
 */
router.get('/:id', optionalAuth, getRestaurant);

// =============================================================================
// PROTECTED ROUTES  (JWT required, merchant or admin role)
// =============================================================================

/**
 * POST /api/v1/restaurants
 * Create a new restaurant. merchantId is set automatically from req.user.
 */
router.post(
  '/',
  protect,
  authorize('merchant', 'admin'),
  createRestaurant
);

/**
 * PUT /api/v1/restaurants/:id
 * Update a restaurant. Only the owning merchant or an admin may update.
 */
router.put(
  '/:id',
  protect,
  authorize('merchant', 'admin'),
  updateRestaurant
);

/**
 * DELETE /api/v1/restaurants/:id
 * Soft-delete (sets isActive = false). Only owner or admin.
 */
router.delete(
  '/:id',
  protect,
  authorize('merchant', 'admin'),
  deleteRestaurant
);

module.exports = router;
