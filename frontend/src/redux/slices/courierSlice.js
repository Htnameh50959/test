import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import courierService from '@/services/courierService';

export const fetchCourierEarnings = createAsyncThunk(
  'courier/fetchEarnings',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await courierService.getEarnings();
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch earnings');
    }
  }
);

export const fetchAvailableDeliveries = createAsyncThunk(
  'courier/fetchAvailable',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await courierService.getAvailableDeliveries();
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch available deliveries');
    }
  }
);

export const acceptDelivery = createAsyncThunk(
  'courier/accept',
  async (orderId, { rejectWithValue, dispatch }) => {
    try {
      const { data } = await courierService.acceptDelivery(orderId);
      dispatch(fetchAvailableDeliveries());
      return data.data; // The accepted order
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to accept delivery');
    }
  }
);

export const updateDeliveryStatus = createAsyncThunk(
  'courier/updateStatus',
  async ({ orderId, status }, { rejectWithValue }) => {
    try {
      const { data } = await courierService.updateStatus(orderId, status);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update delivery status');
    }
  }
);

const courierSlice = createSlice({
  name: 'courier',
  initialState: {
    isOnline: false,
    activeDelivery: null,
    availableDeliveries: [],
    earnings: { today: 0, week: 0, month: 0 },
    loading: false,
    error: null,
  },
  reducers: {
    setOnlineStatus: (state, { payload }) => {
      state.isOnline = payload;
    },
    addAvailableDelivery: (state, { payload }) => {
      // Add if not already present
      if (!state.availableDeliveries.find(d => d._id === payload._id)) {
        state.availableDeliveries.unshift(payload);
      }
    },
    removeAvailableDelivery: (state, { payload }) => {
      state.availableDeliveries = state.availableDeliveries.filter(d => d._id !== payload);
    },
    clearCourierError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Earnings
      .addCase(fetchCourierEarnings.fulfilled, (state, { payload }) => {
        state.earnings = payload;
      })
      // Available Deliveries
      .addCase(fetchAvailableDeliveries.pending, (state) => { state.loading = true; })
      .addCase(fetchAvailableDeliveries.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.availableDeliveries = payload;
      })
      .addCase(fetchAvailableDeliveries.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      // Accept Delivery
      .addCase(acceptDelivery.pending, (state) => { state.loading = true; })
      .addCase(acceptDelivery.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.activeDelivery = payload;
      })
      .addCase(acceptDelivery.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      // Update Status
      .addCase(updateDeliveryStatus.fulfilled, (state, { payload }) => {
        state.activeDelivery = payload;
        if (payload.status === 'DELIVERED') {
          state.activeDelivery = null;
        }
      });
  }
});

export const { setOnlineStatus, addAvailableDelivery, removeAvailableDelivery, clearCourierError } = courierSlice.actions;
export default courierSlice.reducer;
