// src/redux/slices/cartSlice.js
//
// Source-of-truth architecture:
//   • For GUESTS : localStorage is the source of truth (no backend call needed).
//   • For LOGGED-IN users: backend Redis cart is authoritative; local state is a
//     mirror that updates optimistically so the UI feels instant.
//
// The slice exposes both synchronous reducers (for offline/guest cart) and
// async thunks (for authenticated server syncing).

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { cartService } from '@/services/cartService';
import {
  recalculateTotals,
  persistCart,
  loadPersistedCart,
  clearPersistedCart,
  loyaltyPointsToDiscount,
} from '@/utils/cartHelpers';

// ── Constants ─────────────────────────────────────────────────────────────────

const LOYALTY_POINT_VALUE = 0.25; // ₹0.25 per point

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Generate a lightweight stable ID for a local cart item */
const makeItemId = (menuItemId, modifiers = []) =>
  `${menuItemId}_${JSON.stringify(modifiers)}`;

/** Apply a full server cart response onto local state */
const applyCartResponse = (state, { payload }) => {
  const cart = payload?.data ?? payload;
  state.restaurantId    = cart.restaurantId    ?? null;
  state.restaurantName  = cart.restaurantName  ?? null;
  state.items           = cart.items           ?? [];
  state.totals          = cart.totals          ?? emptyTotals;
  state.warnings        = payload?.warnings    ?? [];
  state.loading         = false;
  state.error           = null;
  persistCart(state);
};

const emptyTotals = {
  subtotal: 0,
  deliveryFee: 0,
  serviceFee: 0,
  tax: 0,
  couponDiscount: 0,
  loyaltyDiscount: 0,
  total: 0,
};

// ── Initial state ─────────────────────────────────────────────────────────────

const persisted = loadPersistedCart();

const initialState = {
  // Cart data
  items:           persisted?.items           ?? [],
  restaurantId:    persisted?.restaurantId    ?? null,
  restaurantName:  persisted?.restaurantName  ?? null,
  deliveryAddress: persisted?.deliveryAddress ?? null,
  totals:          persisted?.totals          ?? emptyTotals,
  appliedCoupon:   persisted?.appliedCoupon   ?? null,
  loyaltyPointsUsed: persisted?.loyaltyPointsUsed ?? 0,

  // UI state
  pendingItem:     null,   // item buffered during conflict modal
  isDrawerOpen:    false,
  badgeAnimating:  false,  // triggers badge bounce CSS class
  warnings:        [],
  loading:         false,
  error:           null,
};

// ── Async thunks (server sync for authenticated users) ────────────────────────

export const fetchCart = createAsyncThunk('cart/fetch', async (_, { rejectWithValue }) => {
  try {
    const { data } = await cartService.getCart();
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message ?? 'Failed to load cart');
  }
});

export const addItemToCart = createAsyncThunk('cart/addItem', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await cartService.addItem(payload);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message ?? 'Failed to add item');
  }
});

export const updateCartItem = createAsyncThunk(
  'cart/updateItem',
  async ({ menuItemId, quantity }, { rejectWithValue }) => {
    try {
      const { data } = await cartService.updateItem(menuItemId, quantity);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to update item');
    }
  }
);

export const removeCartItem = createAsyncThunk('cart/removeItem', async (menuItemId, { rejectWithValue }) => {
  try {
    const { data } = await cartService.removeItem(menuItemId);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message ?? 'Failed to remove item');
  }
});

export const clearCartAsync = createAsyncThunk('cart/clearAsync', async (_, { rejectWithValue }) => {
  try {
    const { data } = await cartService.clearCart();
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message ?? 'Failed to clear cart');
  }
});

/**
 * clearCartAndAdd
 * Atomically clears the cart and adds a new item.
 * Used when the user confirms the restaurant-conflict modal.
 */
export const clearCartAndAdd = createAsyncThunk(
  'cart/clearAndAdd',
  async (payload, { rejectWithValue }) => {
    try {
      await cartService.clearCart();
      const { data } = await cartService.addItem(payload);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to add item after clearing');
    }
  }
);

// ── Slice ──────────────────────────────────────────────────────────────────────

const cartSlice = createSlice({
  name: 'cart',
  initialState,

  reducers: {
    // ── Drawer UI ───────────────────────────────────────────────────────────
    openCartDrawer(state)  { state.isDrawerOpen = true; },
    closeCartDrawer(state) { state.isDrawerOpen = false; },
    toggleCartDrawer(state) { state.isDrawerOpen = !state.isDrawerOpen; },

    // ── Badge animation ──────────────────────────────────────────────────────
    triggerBadgeAnimation(state) { state.badgeAnimating = true; },
    resetBadgeAnimation(state)   { state.badgeAnimating = false; },

    // ── Conflict modal ───────────────────────────────────────────────────────
    setPendingItem(state, { payload }) { state.pendingItem = payload; },
    clearPendingItem(state)            { state.pendingItem = null; },

    // ── LOCAL cart operations (work offline / guest users) ───────────────────

    /**
     * addItem
     * - Validates single-restaurant constraint.
     * - If conflict → stores item in pendingItem for the modal to pick up.
     * - Merges duplicate items (same menuItemId + modifiers).
     */
    addItem(state, { payload }) {
      // Restaurant conflict check
      if (state.restaurantId && state.restaurantId !== payload.restaurantId) {
        state.pendingItem = payload;
        return; // Component will detect pendingItem and open the conflict modal
      }

      const itemId = payload.id ?? makeItemId(payload.menuItemId, payload.modifiers);

      // Find exact duplicate (same id, OR same menuItemId + modifiers)
      const existing = state.items.find(
        (i) =>
          i.id === itemId ||
          (i.menuItemId === payload.menuItemId &&
            JSON.stringify(i.modifiers ?? []) === JSON.stringify(payload.modifiers ?? []))
      );

      if (existing) {
        existing.quantity = (existing.quantity || 1) + (payload.quantity || 1);
      } else {
        state.items.push({ ...payload, id: itemId, quantity: payload.quantity || 1 });
      }

      state.restaurantId   = payload.restaurantId;
      state.restaurantName = payload.restaurantName;

      // Recalculate
      state.totals = recalculateTotals({
        items: state.items,
        restaurantId: state.restaurantId,
        appliedCoupon: state.appliedCoupon,
        loyaltyPointsUsed: state.loyaltyPointsUsed,
      });

      state.badgeAnimating = true;
      persistCart(state);
    },

    /**
     * removeItem — remove by item `id`
     */
    removeItem(state, { payload }) {
      state.items = state.items.filter((item) => item.id !== payload);
      if (state.items.length === 0) {
        state.restaurantId   = null;
        state.restaurantName = null;
        state.appliedCoupon  = null;
        state.loyaltyPointsUsed = 0;
      }
      state.totals = recalculateTotals({
        items: state.items,
        restaurantId: state.restaurantId,
        appliedCoupon: state.appliedCoupon,
        loyaltyPointsUsed: state.loyaltyPointsUsed,
      });
      persistCart(state);
    },

    /**
     * updateQuantity — set exact quantity; removes item if quantity ≤ 0
     */
    updateQuantity(state, { payload: { id, quantity } }) {
      if (quantity <= 0) {
        state.items = state.items.filter((i) => i.id !== id);
        if (state.items.length === 0) {
          state.restaurantId   = null;
          state.restaurantName = null;
        }
      } else {
        const item = state.items.find((i) => i.id === id);
        if (item) item.quantity = quantity;
      }
      state.totals = recalculateTotals({
        items: state.items,
        restaurantId: state.restaurantId,
        appliedCoupon: state.appliedCoupon,
        loyaltyPointsUsed: state.loyaltyPointsUsed,
      });
      persistCart(state);
    },

    /**
     * clearCart — reset everything locally (guest/optimistic)
     */
    clearCart(state) {
      state.items             = [];
      state.restaurantId      = null;
      state.restaurantName    = null;
      state.deliveryAddress   = null;
      state.appliedCoupon     = null;
      state.loyaltyPointsUsed = 0;
      state.totals            = emptyTotals;
      state.pendingItem       = null;
      clearPersistedCart();
    },

    /**
     * clearCartAndAddLocal
     * Used when user confirms restaurant-conflict modal in guest mode.
     */
    clearCartAndAddLocal(state, { payload }) {
      state.items             = [];
      state.restaurantId      = null;
      state.restaurantName    = null;
      state.appliedCoupon     = null;
      state.loyaltyPointsUsed = 0;
      state.pendingItem       = null;

      const itemId = payload.id ?? makeItemId(payload.menuItemId, payload.modifiers);
      state.items.push({ ...payload, id: itemId, quantity: payload.quantity || 1 });
      state.restaurantId   = payload.restaurantId;
      state.restaurantName = payload.restaurantName;

      state.totals = recalculateTotals({
        items: state.items,
        restaurantId: state.restaurantId,
        appliedCoupon: null,
        loyaltyPointsUsed: 0,
      });
      state.badgeAnimating = true;
      persistCart(state);
    },

    // ── Address & discounts ──────────────────────────────────────────────────
    setDeliveryAddress(state, { payload }) {
      state.deliveryAddress = payload;
      persistCart(state);
    },

    applyCoupon(state, { payload }) {
      state.appliedCoupon = payload;
      state.totals = recalculateTotals({
        items: state.items,
        restaurantId: state.restaurantId,
        appliedCoupon: payload,
        loyaltyPointsUsed: state.loyaltyPointsUsed,
      });
      persistCart(state);
    },

    removeCoupon(state) {
      state.appliedCoupon = null;
      state.totals = recalculateTotals({
        items: state.items,
        restaurantId: state.restaurantId,
        appliedCoupon: null,
        loyaltyPointsUsed: state.loyaltyPointsUsed,
      });
      persistCart(state);
    },

    applyLoyaltyPoints(state, { payload }) {
      state.loyaltyPointsUsed = payload;
      state.totals = recalculateTotals({
        items: state.items,
        restaurantId: state.restaurantId,
        appliedCoupon: state.appliedCoupon,
        loyaltyPointsUsed: payload,
      });
      persistCart(state);
    },

    // ── Error handling ───────────────────────────────────────────────────────
    clearCartError(state) { state.error = null; },

    // ── Full reset (post-checkout) ───────────────────────────────────────────
    resetCart(state) {
      Object.assign(state, {
        items: [], restaurantId: null, restaurantName: null,
        deliveryAddress: null, appliedCoupon: null, loyaltyPointsUsed: 0,
        totals: emptyTotals, pendingItem: null, loading: false, error: null,
      });
      clearPersistedCart();
    },
  },

  // ── Async reducers ───────────────────────────────────────────────────────────
  extraReducers: (builder) => {
    const pending  = (state) => { state.loading = true;  state.error = null; };
    const rejected = (state, { payload }) => { state.loading = false; state.error = payload; };

    builder
      .addCase(fetchCart.pending,       pending)
      .addCase(fetchCart.fulfilled,     applyCartResponse)
      .addCase(fetchCart.rejected,      rejected)

      .addCase(addItemToCart.pending,   pending)
      .addCase(addItemToCart.fulfilled, (state, action) => {
        applyCartResponse(state, action);
        state.badgeAnimating = true;
      })
      .addCase(addItemToCart.rejected,  rejected)

      .addCase(updateCartItem.pending,  pending)
      .addCase(updateCartItem.fulfilled, applyCartResponse)
      .addCase(updateCartItem.rejected,  rejected)

      .addCase(removeCartItem.pending,  pending)
      .addCase(removeCartItem.fulfilled, applyCartResponse)
      .addCase(removeCartItem.rejected,  rejected)

      .addCase(clearCartAsync.pending,  pending)
      .addCase(clearCartAsync.fulfilled, (state) => {
        cartSlice.caseReducers.resetCart(state);
      })
      .addCase(clearCartAsync.rejected, rejected)

      .addCase(clearCartAndAdd.pending, pending)
      .addCase(clearCartAndAdd.fulfilled, (state, action) => {
        applyCartResponse(state, action);
        state.pendingItem    = null;
        state.badgeAnimating = true;
      })
      .addCase(clearCartAndAdd.rejected, rejected);
  },
});

// ── Action exports ────────────────────────────────────────────────────────────

export const {
  openCartDrawer,
  closeCartDrawer,
  toggleCartDrawer,
  triggerBadgeAnimation,
  resetBadgeAnimation,
  setPendingItem,
  clearPendingItem,
  addItem,
  removeItem,
  updateQuantity,
  clearCart,
  clearCartAndAddLocal,
  setDeliveryAddress,
  applyCoupon,
  removeCoupon,
  applyLoyaltyPoints,
  clearCartError,
  resetCart,
} = cartSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectCartItems        = (s) => s.cart.items;
export const selectCartTotals       = (s) => s.cart.totals;
export const selectCartRestaurant   = createSelector(
  [(s) => s.cart.restaurantId, (s) => s.cart.restaurantName],
  (id, name) => ({ id, name })
);
export const selectCartItemCount    = (s) => s.cart.items.reduce((n, i) => n + (i.quantity || 1), 0);
export const selectCartLoading      = (s) => s.cart.loading;
export const selectCartError        = (s) => s.cart.error;
export const selectCartWarnings     = (s) => s.cart.warnings;
export const selectIsDrawerOpen     = (s) => s.cart.isDrawerOpen;
export const selectPendingItem      = (s) => s.cart.pendingItem;
export const selectBadgeAnimating   = (s) => s.cart.badgeAnimating;
export const selectDeliveryAddress  = (s) => s.cart.deliveryAddress;
export const selectAppliedCoupon    = (s) => s.cart.appliedCoupon;
export const selectLoyaltyPoints    = (s) => s.cart.loyaltyPointsUsed;

export default cartSlice.reducer;
