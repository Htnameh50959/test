// src/redux/slices/ordersSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { ordersService } from '@/services/ordersService';

// ── Async thunks ─────────────────────────────────────────────────────────────

export const placeOrder = createAsyncThunk('orders/place', async (orderData, { rejectWithValue }) => {
  try {
    const { data } = await ordersService.create(orderData);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Order placement failed');
  }
});

export const fetchOrderHistory = createAsyncThunk('orders/fetchHistory', async (params, { rejectWithValue }) => {
  try {
    const { data } = await ordersService.getHistory(params);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load orders');
  }
});

export const fetchOrderById = createAsyncThunk('orders/fetchById', async (orderId, { rejectWithValue }) => {
  try {
    const { data } = await ordersService.getById(orderId);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load order');
  }
});

export const cancelOrder = createAsyncThunk('orders/cancel', async ({ orderId, reason }, { rejectWithValue }) => {
  try {
    const { data } = await ordersService.cancel(orderId, reason);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Cancellation failed');
  }
});

// ── Slice ──────────────────────────────────────────────────────────────────────

const ordersSlice = createSlice({
  name: 'orders',
  initialState: {
    activeOrders:   [],    // PENDING / ACCEPTED / PREPARING / etc.
    orderHistory:   [],    // COMPLETED / CANCELLED
    currentOrder:   null,  // order tracked on the tracking page
    pagination:     { total: 0, page: 1, pages: 1 },
    loading:        false,
    error:          null,
  },

  reducers: {
    // Called by the WebSocket handler when the server pushes a status update.
    updateOrderStatus(state, { payload }) {
      const { orderId, status, estimatedDeliveryAt } = payload;

      // Update in activeOrders list.
      const idx = state.activeOrders.findIndex((o) => o._id === orderId || o.id === orderId);
      if (idx !== -1) {
        state.activeOrders[idx].status = status;
        if (estimatedDeliveryAt) {
          state.activeOrders[idx].estimatedDeliveryAt = estimatedDeliveryAt;
        }
        // Move to history if terminal.
        if (['COMPLETED', 'CANCELLED'].includes(status)) {
          const [done] = state.activeOrders.splice(idx, 1);
          state.orderHistory.unshift(done);
        }
      }

      // Update currently tracked order.
      if (state.currentOrder && (state.currentOrder._id === orderId || state.currentOrder.id === orderId)) {
        state.currentOrder.status = status;
        if (estimatedDeliveryAt) state.currentOrder.estimatedDeliveryAt = estimatedDeliveryAt;
      }
    },
    clearOrderError(state) { state.error = null; },
    clearCurrentOrder(state) { state.currentOrder = null; },
  },

  extraReducers: (builder) => {
    builder
      // placeOrder
      .addCase(placeOrder.pending,    (state) => { state.loading = true;  state.error = null; })
      .addCase(placeOrder.fulfilled,  (state, { payload }) => {
        state.loading = false;
        state.activeOrders.unshift(payload);
        state.currentOrder = payload;
      })
      .addCase(placeOrder.rejected,   (state, { payload }) => { state.loading = false; state.error = payload; })

      // fetchOrderHistory
      .addCase(fetchOrderHistory.pending,  (state) => { state.loading = true; state.error = null; })
      .addCase(fetchOrderHistory.fulfilled, (state, { payload }) => {
        state.loading      = false;
        state.orderHistory = payload.data;
        state.pagination   = {
          total: payload.pagination?.total ?? 0,
          pages: payload.pagination?.pages ?? 1,
        };
      })
      .addCase(fetchOrderHistory.rejected, (state, { payload }) => { state.loading = false; state.error = payload; })

      // fetchOrderById
      .addCase(fetchOrderById.pending,  (state) => { state.loading = true; state.error = null; })
      .addCase(fetchOrderById.fulfilled, (state, { payload }) => {
        state.loading      = false;
        state.currentOrder = payload;
      })
      .addCase(fetchOrderById.rejected, (state, { payload }) => { state.loading = false; state.error = payload; })

      // cancelOrder
      .addCase(cancelOrder.fulfilled, (state, { payload }) => {
        const idx = state.activeOrders.findIndex((o) => o._id === payload._id);
        if (idx !== -1) {
          state.activeOrders[idx].status = 'CANCELLED';
        }
        if (state.currentOrder?._id === payload._id) {
          state.currentOrder.status = 'CANCELLED';
        }
      });
  },
});

export const { updateOrderStatus, clearOrderError, clearCurrentOrder } = ordersSlice.actions;

export const selectActiveOrders  = (s) => s.orders.activeOrders;
export const selectOrderHistory  = (s) => s.orders.orderHistory;
export const selectCurrentOrder  = (s) => s.orders.currentOrder;
export const selectOrdersLoading = (s) => s.orders.loading;
export const selectOrdersError   = (s) => s.orders.error;

export default ordersSlice.reducer;
