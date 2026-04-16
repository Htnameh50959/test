// =============================================================================
// USER PROFILE ROUTES  (backend/src/routes/users.js)
// =============================================================================
// Base path (registered in server.js): /api/v1/users
//
// ALL routes here require authentication (protect applied globally below).
// Role restrictions are applied per-route where needed.
//
// Profile:
//   GET    /api/v1/users/profile                          — fetch own profile
//   PUT    /api/v1/users/profile                          — update profile fields
//
// Addresses:
//   GET    /api/v1/users/addresses                        — list all saved addresses
//   POST   /api/v1/users/addresses                        — add a new address
//   PUT    /api/v1/users/addresses/:addressId             — update an address
//   DELETE /api/v1/users/addresses/:addressId             — delete an address
//   PATCH  /api/v1/users/addresses/:addressId/default     — set as default
// =============================================================================

const express = require('express');

const router = express.Router();

// ── Controllers ───────────────────────────────────────────────────────────────
const {
  getProfile,
  updateProfile,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getFavorites,
  addFavorite,
  removeFavorite,
  getLoyalty,
  redeemLoyalty,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  addNotification,
} = require('../controllers/users');

// ── Middleware ────────────────────────────────────────────────────────────────
const { protect }  = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

// =============================================================================
// Apply protect to EVERY route in this file.
// No unauthenticated user can reach any endpoint below.
// =============================================================================
router.use(protect);

// =============================================================================
// PROFILE ROUTES
// =============================================================================

/**
 * GET /api/v1/users/profile
 * Returns the full profile of the currently authenticated user.
 */
router.get('/profile', getProfile);

/**
 * PUT /api/v1/users/profile
 * Body (all optional, min 1 field required — enforced by Joi):
 *   { firstName?, lastName?, phone?, dateOfBirth?, gender?, avatar? }
 *
 * Note: email changes are intentionally NOT allowed here because they
 * typically require re-verification. Implement a separate /change-email
 * flow with email confirmation if needed.
 */
router.put(
  '/profile',
  validate(schemas.users.updateProfile),
  updateProfile
);

// =============================================================================
// ADDRESS ROUTES
// =============================================================================

/**
 * GET /api/v1/users/addresses
 * Returns the user's complete saved address list.
 */
router.get('/addresses', getAddresses);

/**
 * POST /api/v1/users/addresses
 * Body: { label?, street, city, state, zipCode, country?,
 *         coordinates:[lng,lat], instructions?, isDefault? }
 *
 * Limits: max 10 addresses per account (enforced in controller).
 */
router.post(
  '/addresses',
  validate(schemas.users.addAddress),
  addAddress
);

/**
 * PATCH /api/v1/users/addresses/:addressId/default
 * Sets the specified address as the default delivery address.
 *
 * NOTE: This route MUST be defined before the generic /:addressId routes
 * to prevent Express matching "default" as an :addressId parameter.
 */
router.patch('/addresses/:addressId/default', setDefaultAddress);

/**
 * PUT /api/v1/users/addresses/:addressId
 * Body (all fields optional — partial updates supported):
 *   { label?, street?, city?, state?, zipCode?, country?,
 *     coordinates?:[lng,lat], instructions?, isDefault? }
 */
router.put(
  '/addresses/:addressId',
  validate(schemas.users.updateAddress),
  updateAddress
);

/**
 * DELETE /api/v1/users/addresses/:addressId
 * Removes the address. If it was the default, the next address is promoted.
 */
router.delete('/addresses/:addressId', deleteAddress);

// =============================================================================
// FAVORITES ROUTES
// =============================================================================
router.get('/favorites', getFavorites);
router.post('/favorites', addFavorite);
router.delete('/favorites/:restaurantId', removeFavorite);

// =============================================================================
// LOYALTY ROUTES
// =============================================================================
router.get('/loyalty', getLoyalty);
router.post('/loyalty/redeem', redeemLoyalty);

// =============================================================================
// NOTIFICATIONS ROUTES
// =============================================================================
router.get('/notifications', getNotifications);
router.patch('/notifications/read-all', markAllNotificationsRead);
router.patch('/notifications/:id/read', markNotificationRead);
router.post('/notifications', addNotification);

module.exports = router;
