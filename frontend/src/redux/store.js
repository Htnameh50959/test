// src/redux/store.js
// Redux store — combines all slices, exposes typed hooks, and
// registers the cart-persistence middleware.

import { configureStore } from '@reduxjs/toolkit';

import authReducer        from './slices/authSlice';
import cartReducer        from './slices/cartSlice';
import ordersReducer      from './slices/ordersSlice';
import restaurantsReducer from './slices/restaurantsSlice';
import checkoutReducer   from './slices/checkoutSlice';
import reviewsReducer    from './slices/reviewsSlice';
import uiReducer       from './slices/uiSlice';
import cartPersistMiddleware from './middleware/cartPersistMiddleware';

const store = configureStore({
  reducer: {
    auth:        authReducer,
    cart:        cartReducer,
    orders:      ordersReducer,
    restaurants: restaurantsReducer,
    checkout:    checkoutReducer,
    reviews:     reviewsReducer,
    ui:          uiReducer,
  },

  // Redux DevTools is enabled automatically in development.
  devTools: import.meta.env.DEV,

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'cart/fetch/fulfilled',
          'orders/place/fulfilled',
        ],
      },
    }).concat(cartPersistMiddleware),
});

export default store;
