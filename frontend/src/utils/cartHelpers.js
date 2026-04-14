// src/utils/cartHelpers.js
// Pure helper functions for cart calculations — no side effects, easy to test.

/**
 * calculateSubtotal
 * Sums (basePrice + modifiersPrice) × quantity for all items.
 */
export const calculateSubtotal = (items = []) => {
  return items.reduce((sum, item) => {
    const base       = item.price || 0;
    const modTotal   = (item.modifiers ?? []).reduce((ms, m) => ms + (m.price || 0), 0);
    const unitPrice  = base + modTotal;
    return sum + unitPrice * (item.quantity || 1);
  }, 0);
};

/**
 * calculateDeliveryFee
 * In production this comes from the restaurant/delivery-service API.
 * Here we use a tiered mock so UI looks realistic.
 */
export const calculateDeliveryFee = (restaurantId, subtotal = 0) => {
  if (subtotal >= 500) return 0;         // Free delivery above ₹500
  if (!restaurantId)   return 0;
  // Deterministic "random" fee based on restaurantId length so it varies
  const seed = (restaurantId?.length ?? 5) % 4;
  const fees = [29, 39, 49, 59];
  return fees[seed];
};

/**
 * calculateServiceFee
 * 5% of subtotal (platform convenience fee).
 */
export const calculateServiceFee = (subtotal = 0) => {
  return Math.round(subtotal * 0.05 * 100) / 100;
};

/**
 * calculateTax
 * 8% GST on (subtotal + serviceFee). Delivery fee is tax-exempt.
 */
export const calculateTax = (subtotal = 0, serviceFee = 0) => {
  return Math.round((subtotal + serviceFee) * 0.08 * 100) / 100;
};

/**
 * loyaltyPointsToDiscount
 * 1 loyalty point = ₹0.25 discount.
 */
export const loyaltyPointsToDiscount = (points = 0) => points * 0.25;

/**
 * calculateTotal
 * Grand total = subtotal + deliveryFee + serviceFee + tax - discounts.
 */
export const calculateTotal = (subtotal = 0, deliveryFee = 0, serviceFee = 0, tax = 0, discounts = 0) => {
  return Math.max(0, subtotal + deliveryFee + serviceFee + tax - discounts);
};

/**
 * recalculateTotals
 * Central helper — call this whenever cart items change.
 * Returns a totals object matching the slice shape.
 */
export const recalculateTotals = ({ items = [], restaurantId, appliedCoupon, loyaltyPointsUsed = 0 }) => {
  const subtotal    = calculateSubtotal(items);
  const deliveryFee = calculateDeliveryFee(restaurantId, subtotal);
  const serviceFee  = calculateServiceFee(subtotal);
  const tax         = calculateTax(subtotal, serviceFee);

  // Coupon discount
  let couponDiscount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percentage') {
      couponDiscount = Math.min(
        (subtotal * appliedCoupon.value) / 100,
        appliedCoupon.maxDiscount ?? Infinity
      );
    } else if (appliedCoupon.type === 'flat') {
      couponDiscount = appliedCoupon.value;
    }
  }

  const loyaltyDiscount = loyaltyPointsToDiscount(loyaltyPointsUsed);
  const totalDiscount   = couponDiscount + loyaltyDiscount;
  const total           = calculateTotal(subtotal, deliveryFee, serviceFee, tax, totalDiscount);

  return {
    subtotal:      Math.round(subtotal * 100) / 100,
    deliveryFee:   Math.round(deliveryFee * 100) / 100,
    serviceFee:    Math.round(serviceFee * 100) / 100,
    tax:           Math.round(tax * 100) / 100,
    couponDiscount: Math.round(couponDiscount * 100) / 100,
    loyaltyDiscount: Math.round(loyaltyDiscount * 100) / 100,
    total:         Math.round(total * 100) / 100,
  };
};

// ── LocalStorage helpers ──────────────────────────────────────────────────────

const CART_STORAGE_KEY = 'fh_cart_v1';

export const persistCart = (cartState) => {
  try {
    const serializable = {
      items:          cartState.items,
      restaurantId:   cartState.restaurantId,
      restaurantName: cartState.restaurantName,
      deliveryAddress: cartState.deliveryAddress,
      appliedCoupon:  cartState.appliedCoupon,
      loyaltyPointsUsed: cartState.loyaltyPointsUsed,
      totals:         cartState.totals,
    };
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // Storage quota exceeded — ignore silently
  }
};

export const loadPersistedCart = () => {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearPersistedCart = () => {
  try { localStorage.removeItem(CART_STORAGE_KEY); } catch { /* noop */ }
};
