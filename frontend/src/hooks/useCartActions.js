// src/hooks/useCartActions.js
//
// Centralised hook for all cart mutations.
// Provides a consistent API regardless of whether the user is a guest (local-only)
// or authenticated (optimistic local + async server sync).

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  // local synchronous actions
  addItem,
  removeItem,
  updateQuantity,
  clearCart,
  applyCoupon,
  removeCoupon,
  applyLoyaltyPoints,
  setDeliveryAddress,
  openCartDrawer,
  triggerBadgeAnimation,

  // async server thunks
  addItemToCart,
  removeCartItem,
  updateCartItem,
  clearCartAsync,

  // selectors
  selectCartItems,
  selectCartTotals,
  selectCartItemCount,
  selectCartRestaurant,
  selectPendingItem,
  selectIsDrawerOpen,
  selectCartLoading,
} from '@/redux/slices/cartSlice';

import { selectIsAuthenticated } from '@/redux/slices/authSlice';

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useCartActions
 *
 * Returns memoised action creators and cart state selectors.
 *
 * Strategy:
 *  - Guest users  → only local Redux + localStorage (no network call)
 *  - Logged-in    → optimistic local update first, then fire server thunk
 *                   so the UI responds instantly even on slow connections.
 */
export function useCartActions() {
  const dispatch        = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // ── Selectors exposed to consuming components ─────────────────────────────
  const items          = useSelector(selectCartItems);
  const totals         = useSelector(selectCartTotals);
  const itemCount      = useSelector(selectCartItemCount);
  const restaurant     = useSelector(selectCartRestaurant);
  const pendingItem    = useSelector(selectPendingItem);
  const isDrawerOpen   = useSelector(selectIsDrawerOpen);
  const isLoading      = useSelector(selectCartLoading);

  // ── Add item ──────────────────────────────────────────────────────────────
  /**
   * handleAddItem
   *
   * @param {object} item - Must include:
   *   menuItemId, name, price, restaurantId, restaurantName, quantity
   *   Optional: modifiers[], image, variant
   *
   * Returns false if a conflict was detected (drawer won't open automatically).
   */
  const handleAddItem = useCallback(
    (item) => {
      // Always apply locally first — gives instant feedback
      dispatch(addItem(item));
      dispatch(triggerBadgeAnimation());

      // If authenticated, sync to server in background
      if (isAuthenticated) {
        dispatch(addItemToCart(item)).catch(() => {
          // Server error: local state stays consistent; show toast via middleware
        });
      }

      // Open the drawer on add so user sees the cart
      dispatch(openCartDrawer());
    },
    [dispatch, isAuthenticated]
  );

  // ── Remove item ───────────────────────────────────────────────────────────
  const handleRemoveItem = useCallback(
    (itemId) => {
      dispatch(removeItem(itemId));

      if (isAuthenticated) {
        dispatch(removeCartItem(itemId));
      }
    },
    [dispatch, isAuthenticated]
  );

  // ── Update quantity ───────────────────────────────────────────────────────
  const handleUpdateQuantity = useCallback(
    (id, quantity) => {
      dispatch(updateQuantity({ id, quantity }));

      if (isAuthenticated) {
        // quantity = 0 means remove; handled server-side as well
        if (quantity <= 0) {
          dispatch(removeCartItem(id));
        } else {
          dispatch(updateCartItem({ menuItemId: id, quantity }));
        }
      }
    },
    [dispatch, isAuthenticated]
  );

  // ── Increment / Decrement wrappers ────────────────────────────────────────
  const handleIncrement = useCallback(
    (item) => handleUpdateQuantity(item.id, (item.quantity || 1) + 1),
    [handleUpdateQuantity]
  );

  const handleDecrement = useCallback(
    (item) => handleUpdateQuantity(item.id, (item.quantity || 1) - 1),
    [handleUpdateQuantity]
  );

  // ── Clear entire cart ─────────────────────────────────────────────────────
  const handleClearCart = useCallback(() => {
    dispatch(clearCart());
    if (isAuthenticated) {
      dispatch(clearCartAsync());
    }
  }, [dispatch, isAuthenticated]);

  // ── Coupon ────────────────────────────────────────────────────────────────
  const handleApplyCoupon   = useCallback((coupon) => dispatch(applyCoupon(coupon)),  [dispatch]);
  const handleRemoveCoupon  = useCallback(() => dispatch(removeCoupon()),              [dispatch]);

  // ── Loyalty points ────────────────────────────────────────────────────────
  const handleApplyLoyaltyPoints = useCallback(
    (points) => dispatch(applyLoyaltyPoints(points)),
    [dispatch]
  );

  // ── Address ───────────────────────────────────────────────────────────────
  const handleSetDeliveryAddress = useCallback(
    (address) => dispatch(setDeliveryAddress(address)),
    [dispatch]
  );

  // ── Drawer ────────────────────────────────────────────────────────────────
  const handleOpenDrawer = useCallback(() => dispatch(openCartDrawer()), [dispatch]);

  return {
    // State
    items,
    totals,
    itemCount,
    restaurant,
    pendingItem,
    isDrawerOpen,
    isLoading,

    // Actions
    addItem:             handleAddItem,
    removeItem:          handleRemoveItem,
    updateQuantity:      handleUpdateQuantity,
    increment:           handleIncrement,
    decrement:           handleDecrement,
    clearCart:           handleClearCart,
    applyCoupon:         handleApplyCoupon,
    removeCoupon:        handleRemoveCoupon,
    applyLoyaltyPoints:  handleApplyLoyaltyPoints,
    setDeliveryAddress:  handleSetDeliveryAddress,
    openDrawer:          handleOpenDrawer,
  };
}

export default useCartActions;
