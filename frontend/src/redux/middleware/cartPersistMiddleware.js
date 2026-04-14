// src/redux/middleware/cartPersistMiddleware.js
//
// Redux middleware that persists the cart slice to localStorage
// after every action that mutates it. This ensures persistence
// even if the component-level persistCart() call is missed.

import { persistCart } from '@/utils/cartHelpers';

const CART_ACTIONS = new Set([
  'cart/addItem',
  'cart/removeItem',
  'cart/updateQuantity',
  'cart/clearCart',
  'cart/clearCartAndAddLocal',
  'cart/setDeliveryAddress',
  'cart/applyCoupon',
  'cart/removeCoupon',
  'cart/applyLoyaltyPoints',
  'cart/resetCart',
  // async fulfilled actions that modify cart via applyCartResponse
  'cart/addItem/fulfilled',
  'cart/removeItem/fulfilled',
  'cart/updateItem/fulfilled',
  'cart/fetch/fulfilled',
  'cart/clearAsync/fulfilled',
  'cart/clearAndAdd/fulfilled',
]);

const cartPersistMiddleware = (store) => (next) => (action) => {
  const result = next(action);

  if (CART_ACTIONS.has(action.type)) {
    const cartState = store.getState().cart;
    persistCart(cartState);
  }

  return result;
};

export default cartPersistMiddleware;
