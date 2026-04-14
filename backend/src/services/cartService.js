// =============================================================================
// CART SERVICE  (backend/src/services/cartService.js)
// =============================================================================
// All cart state lives in Redis under the key:  cart:{userId}
// TTL: 24 hours (reset on every write, so an active cart never expires mid-session)
//
// Cart shape stored as a JSON string:
// {
//   userId:       string,
//   restaurantId: string | null,
//   items: [{
//     menuItemId:  string,
//     name:        string,
//     description: string,
//     image:       string | null,
//     quantity:    number,
//     unitPrice:   number,
//     modifiers:   [{ name, priceAdjust }],
//     lineTotal:   number,
//   }],
//   totals: {
//     subtotal, deliveryFee, serviceFee, tax, total
//   },
//   createdAt:  ISO string,
//   updatedAt:  ISO string,
//   expiresAt:  ISO string (now + 24 h),
// }
//
// FALLBACK STRATEGY
// If Redis is unavailable every exported function returns a minimal safe value
// so controllers can still operate (reads return empty cart, writes are no-ops).
// A console.warn is emitted so the issue is visible in logs.
// =============================================================================

const { getClient, isReady } = require('../config/redis');

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------
const CART_TTL_SECONDS  = 24 * 60 * 60;   // 24 hours
const CART_KEY_PREFIX   = 'cart';

// Pricing rates (keep in sync with orders controller).
const SERVICE_FEE_RATE  = 0.05;   // 5% of subtotal
const TAX_RATE          = 0.08;   // 8% of (subtotal + deliveryFee + serviceFee)

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/** Canonical Redis key for a user's cart. */
const cartKey = (userId) => `${CART_KEY_PREFIX}:${userId}`;

/** Round to 2 decimal places (monetary precision). */
const r2 = (n) => Math.round(n * 100) / 100;

/**
 * Recalculate totals from the items array and the restaurant's delivery fee.
 * Returns a new `totals` object — never mutates the cart directly.
 */
const recalculateTotals = (items, deliveryFee = 0) => {
  const subtotal   = r2(items.reduce((s, i) => s + i.lineTotal, 0));
  const serviceFee = r2(subtotal * SERVICE_FEE_RATE);
  const taxBase    = subtotal + deliveryFee + serviceFee;
  const tax        = r2(taxBase * TAX_RATE);
  const total      = r2(subtotal + deliveryFee + serviceFee + tax);

  return { subtotal, deliveryFee: r2(deliveryFee), serviceFee, tax, total };
};

/**
 * Build the expiry timestamps for a cart (always 24 h from now).
 */
const buildTimestamps = (existingCreatedAt = null) => {
  const now       = new Date();
  const expiresAt = new Date(now.getTime() + CART_TTL_SECONDS * 1000);
  return {
    createdAt: existingCreatedAt || now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
};

/** Return an empty cart document (no items, no restaurant). */
const emptyCart = (userId) => ({
  userId,
  restaurantId:   null,
  restaurantName: null,
  items:          [],
  totals:         { subtotal: 0, deliveryFee: 0, serviceFee: 0, tax: 0, total: 0 },
  ...buildTimestamps(),
});

// ---------------------------------------------------------------------------
// EXPORTED SERVICE FUNCTIONS
// ---------------------------------------------------------------------------

/**
 * Get the current cart for a user.
 * Returns an empty cart object (not null) if no cart exists.
 *
 * @param {string} userId
 * @returns {Promise<object>}
 */
const getCart = async (userId) => {
  if (!isReady()) {
    console.warn('[CartService] Redis unavailable — returning empty cart.');
    return emptyCart(userId);
  }

  try {
    const client = getClient();
    const raw    = await client.get(cartKey(userId));
    if (!raw) return emptyCart(userId);
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[CartService] getCart error: ${err.message}`);
    return emptyCart(userId);
  }
};

/**
 * Persist the cart to Redis with a fresh TTL.
 * Stamped with updatedAt / expiresAt before writing.
 *
 * @param {string} userId
 * @param {object} cart
 * @returns {Promise<void>}
 */
const saveCart = async (userId, cart) => {
  if (!isReady()) {
    console.warn('[CartService] Redis unavailable — cart not saved.');
    return;
  }

  try {
    const client    = getClient();
    const stamps    = buildTimestamps(cart.createdAt);
    const toStore   = { ...cart, ...stamps };
    await client.set(cartKey(userId), JSON.stringify(toStore), 'EX', CART_TTL_SECONDS);
  } catch (err) {
    console.error(`[CartService] saveCart error: ${err.message}`);
  }
};

/**
 * Delete the cart from Redis.
 *
 * @param {string} userId
 * @returns {Promise<void>}
 */
const clearCart = async (userId) => {
  if (!isReady()) return;

  try {
    await getClient().del(cartKey(userId));
  } catch (err) {
    console.error(`[CartService] clearCart error: ${err.message}`);
  }
};

/**
 * Add a new item to the cart OR increment its quantity if it already exists.
 *
 * Single-restaurant constraint: if the cart already contains items from a
 * different restaurant, this function returns { conflict: true } and the
 * controller should surface this to the client (409 Conflict).
 *
 * @param {string} userId
 * @param {{
 *   menuItemId:   string,
 *   name:         string,
 *   description:  string,
 *   image:        string|null,
 *   quantity:     number,
 *   unitPrice:    number,
 *   modifiers:    Array<{ name:string, priceAdjust:number }>,
 * }} itemData
 * @param {{
 *   restaurantId:   string,
 *   restaurantName: string,
 *   deliveryFee:    number,
 * }} restaurantData
 * @returns {Promise<{ cart?: object, conflict?: boolean, conflictRestaurantId?: string }>}
 */
const addItem = async (userId, itemData, restaurantData) => {
  const cart = await getCart(userId);

  // ── Single-restaurant constraint ─────────────────────────────────────────
  if (cart.items.length > 0 && cart.restaurantId !== restaurantData.restaurantId) {
    return {
      conflict:              true,
      conflictRestaurantId:  cart.restaurantId,
      conflictRestaurantName:cart.restaurantName,
    };
  }

  // Set restaurant context if cart is empty.
  if (!cart.restaurantId) {
    cart.restaurantId   = restaurantData.restaurantId;
    cart.restaurantName = restaurantData.restaurantName;
  }

  // Compute line total for this item.
  const modifierDelta = (itemData.modifiers || []).reduce((s, m) => s + (m.priceAdjust || 0), 0);
  const effectivePrice = r2(itemData.unitPrice + modifierDelta);
  const lineTotal      = r2(effectivePrice * itemData.quantity);

  // Check if item with same menuItemId AND same modifiers already exists.
  const existingIdx = cart.items.findIndex(
    (i) =>
      i.menuItemId === itemData.menuItemId &&
      JSON.stringify(i.modifiers) === JSON.stringify(itemData.modifiers || [])
  );

  if (existingIdx > -1) {
    // Increment quantity and recalculate that line.
    const existing       = cart.items[existingIdx];
    existing.quantity   += itemData.quantity;
    existing.lineTotal   = r2(effectivePrice * existing.quantity);
  } else {
    // New line item.
    cart.items.push({
      menuItemId:   itemData.menuItemId,
      name:         itemData.name,
      description:  itemData.description || '',
      image:        itemData.image || null,
      quantity:     itemData.quantity,
      unitPrice:    itemData.unitPrice,
      modifiers:    itemData.modifiers || [],
      modifierDelta,
      lineTotal,
    });
  }

  cart.totals = recalculateTotals(cart.items, restaurantData.deliveryFee);
  await saveCart(userId, cart);
  return { cart };
};

/**
 * Update the quantity of a specific cart item (identified by menuItemId).
 * Setting quantity = 0 removes the item.
 *
 * @param {string} userId
 * @param {string} menuItemId
 * @param {number} newQuantity
 * @param {number} deliveryFee   — needed to recalculate totals
 * @returns {Promise<{ cart?: object, notFound?: boolean }>}
 */
const updateItemQuantity = async (userId, menuItemId, newQuantity, deliveryFee = 0) => {
  const cart = await getCart(userId);
  const idx  = cart.items.findIndex((i) => i.menuItemId === menuItemId);

  if (idx === -1) return { notFound: true };

  if (newQuantity <= 0) {
    // Remove the item entirely.
    cart.items.splice(idx, 1);
  } else {
    const item       = cart.items[idx];
    item.quantity    = newQuantity;
    item.lineTotal   = r2((item.unitPrice + (item.modifierDelta || 0)) * newQuantity);
  }

  // If no items remain, reset restaurant context.
  if (cart.items.length === 0) {
    cart.restaurantId   = null;
    cart.restaurantName = null;
  }

  cart.totals = recalculateTotals(cart.items, deliveryFee);
  await saveCart(userId, cart);
  return { cart };
};

/**
 * Remove a specific item from the cart.
 *
 * @param {string} userId
 * @param {string} menuItemId
 * @param {number} deliveryFee
 * @returns {Promise<{ cart?: object, notFound?: boolean }>}
 */
const removeItem = async (userId, menuItemId, deliveryFee = 0) => {
  return updateItemQuantity(userId, menuItemId, 0, deliveryFee);
};

/**
 * Validate the cart against live restaurant data:
 *   - Restaurant exists, is active, and is open
 *   - Each item still exists and is available in the current menu
 *   - Minimum order amount is met
 *
 * Returns a validation result object — never throws.
 *
 * @param {object} cart
 * @param {object} restaurant  — Mongoose restaurant document
 * @returns {{
 *   valid:           boolean,
 *   unavailableItems:string[],  // names of items no longer on the menu
 *   errors:          string[],
 * }}
 */
const validateCartAgainstRestaurant = (cart, restaurant) => {
  const errors          = [];
  const unavailableItems = [];

  if (!restaurant) {
    errors.push('Restaurant not found.');
    return { valid: false, unavailableItems, errors };
  }
  if (!restaurant.isActive) {
    errors.push(`${restaurant.name} is currently unavailable.`);
  }
  if (!restaurant.isOpen) {
    errors.push(`${restaurant.name} is currently closed.`);
  }

  // Validate each cart item against the live menu.
  for (const cartItem of cart.items) {
    const menuItem = restaurant.menu.id(cartItem.menuItemId);

    if (!menuItem || menuItem.isDeleted) {
      unavailableItems.push(cartItem.name);
      errors.push(`'${cartItem.name}' is no longer available.`);
      continue;
    }
    if (!menuItem.isAvailable) {
      unavailableItems.push(cartItem.name);
      errors.push(`'${cartItem.name}' is temporarily out of stock.`);
    }
    // Price drift warning (not a hard error, but surfaced to client).
    if (menuItem.price !== cartItem.unitPrice) {
      errors.push(
        `The price of '${cartItem.name}' has changed ` +
        `from ₹${cartItem.unitPrice} to ₹${menuItem.price}. ` +
        `Your cart has been updated.`
      );
    }
  }

  const minimumOrder = restaurant.minimumOrder || 0;
  if (cart.totals.subtotal < minimumOrder) {
    errors.push(
      `Minimum order amount is ₹${minimumOrder.toFixed(2)}. ` +
      `Your current subtotal is ₹${cart.totals.subtotal.toFixed(2)}.`
    );
  }

  return {
    valid:           errors.length === 0,
    unavailableItems,
    errors,
  };
};

// ---------------------------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------------------------
module.exports = {
  getCart,
  saveCart,
  clearCart,
  addItem,
  updateItemQuantity,
  removeItem,
  validateCartAgainstRestaurant,
  recalculateTotals,
  emptyCart,
  // Expose for testing / seeder use.
  CART_TTL_SECONDS,
};
