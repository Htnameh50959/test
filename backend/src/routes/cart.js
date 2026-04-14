// =============================================================================
// CART ROUTES  (backend/src/routes/cart.js)
// =============================================================================
// Base path (registered in server.js): /api/v1/cart
//
// ALL routes require authentication (protect applied globally below).
//
// GET    /api/v1/cart              — fetch current cart (with live validation)
// DELETE /api/v1/cart              — clear entire cart
//
// POST   /api/v1/cart/items        — add item
// PUT    /api/v1/cart/items/:id    — update quantity (id = menuItemId)
// DELETE /api/v1/cart/items/:id    — remove item
//
// Route ordering:
//   /items and /items/:id MUST be declared BEFORE the bare / routes to
//   prevent any ambiguity, even though Express should handle this correctly.
// =============================================================================

const express = require('express');

const router = express.Router();

// ── Controllers ───────────────────────────────────────────────────────────────
const {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
} = require('../controllers/cart');

// ── Middleware ────────────────────────────────────────────────────────────────
const { protect } = require('../middleware/auth');

// Apply JWT protection to every cart route.
// Anonymous users cannot have server-side carts (they have no userId).
router.use(protect);

// =============================================================================
// ITEM-LEVEL ROUTES  (declared first for clarity)
// =============================================================================

/**
 * POST /api/v1/cart/items
 * Add a menu item to the cart.
 *
 * Body (required):
 *   restaurantId {string}  — MongoDB ObjectId of the restaurant
 *   menuItemId   {string}  — MongoDB ObjectId of the menu item
 *   quantity     {number}  — default 1, max 50
 *
 * Body (optional):
 *   modifiers [{
 *     groupName  {string}  — modifier group name (e.g. "Size")
 *     optionName {string}  — selected option  (e.g. "Large")
 *   }]
 *
 * Errors:
 *   409 — cart contains items from a different restaurant
 *   400 — restaurant closed, item unavailable, invalid quantity
 *   404 — restaurant or menu item not found
 */
router.post('/items', addItem);

/**
 * PUT /api/v1/cart/items/:id
 * Update the quantity of a specific cart item.
 * :id is the menuItemId.
 *
 * Body:
 *   quantity {number}  — new quantity (must be ≥ 1; use DELETE to remove)
 *
 * Errors:
 *   400 — quantity < 1 or cart is empty
 *   404 — item not in cart
 */
router.put('/items/:id', updateItem);

/**
 * DELETE /api/v1/cart/items/:id
 * Remove a specific item from the cart.
 * :id is the menuItemId.
 *
 * If removing the last item the cart is reset to the empty state
 * (restaurantId and totals are zeroed).
 */
router.delete('/items/:id', removeItem);

// =============================================================================
// CART-LEVEL ROUTES
// =============================================================================

/**
 * GET /api/v1/cart
 * Returns the user's current cart.
 *
 * Enriched response includes:
 *   - Live availability check (warnings array for changed items)
 *   - Up-to-date delivery fee from the restaurant document
 *   - restaurantOpen flag so the UI can disable checkout
 */
router.get('/', getCart);

/**
 * DELETE /api/v1/cart
 * Clear the entire cart.
 * Returns an empty cart document so the client can reset its local state.
 */
router.delete('/', clearCart);

module.exports = router;
