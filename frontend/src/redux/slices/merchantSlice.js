import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { merchantService } from '../../services';

export const fetchMerchantMenu = createAsyncThunk(
  'merchant/fetchMenu',
  async (restaurantId, { rejectWithValue }) => {
    try {
      const { data } = await merchantService.getMenu(restaurantId);
      return data.data; // { byCategory, items, totalItems, ... }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch menu');
    }
  }
);

export const addMenuItem = createAsyncThunk(
  'merchant/addMenuItem',
  async (itemData, { rejectWithValue }) => {
    try {
      const { data } = await merchantService.addMenuItem(itemData);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to add item');
    }
  }
);

export const updateMenuItem = createAsyncThunk(
  'merchant/updateMenuItem',
  async ({ id, data: itemData }, { rejectWithValue }) => {
    try {
      const { data } = await merchantService.updateMenuItem(id, itemData);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update item');
    }
  }
);

export const deleteMenuItem = createAsyncThunk(
  'merchant/deleteMenuItem',
  async (id, { rejectWithValue }) => {
    try {
      await merchantService.deleteMenuItem(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete item');
    }
  }
);

export const toggleItemAvailability = createAsyncThunk(
  'merchant/toggleAvailability',
  async ({ id, isAvailable }, { rejectWithValue }) => {
    try {
      const { data } = await merchantService.toggleAvailability(id, isAvailable);
      return data.data; // { itemId, isAvailable }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to toggle availability');
    }
  }
);

export const fetchMerchantBookings = createAsyncThunk(
  'merchant/fetchBookings',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await merchantService.getBookings(params);
      return data.data; // array of bookings
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch bookings');
    }
  }
);

export const updateMerchantBookingStatus = createAsyncThunk(
  'merchant/updateBookingStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const { data } = await merchantService.updateBookingStatus(id, status);
      return data.data; // updated booking object
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update booking status');
    }
  }
);

const merchantSlice = createSlice({
  name: 'merchant',
  initialState: {
    menu: {
      items: [],
      byCategory: {},
      loading: false,
      error: null,
    },
    dashboard: {
      data: null,
      loading: false,
      error: null,
    },
    bookings: {
      items: [],
      loading: false,
      error: null,
    }
  },
  reducers: {
    clearMerchantError: (state) => {
      state.menu.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Menu
      .addCase(fetchMerchantMenu.pending, (state) => {
        state.menu.loading = true;
      })
      .addCase(fetchMerchantMenu.fulfilled, (state, { payload }) => {
        state.menu.loading = false;
        state.menu.items = payload.items;
        state.menu.byCategory = payload.byCategory;
      })
      .addCase(fetchMerchantMenu.rejected, (state, { payload }) => {
        state.menu.loading = false;
        state.menu.error = payload;
      })
      
      // Add Item
      .addCase(addMenuItem.fulfilled, (state, { payload }) => {
        state.menu.items.push(payload);
        const cat = payload.category || 'Main';
        if (!state.menu.byCategory[cat]) state.menu.byCategory[cat] = [];
        state.menu.byCategory[cat].push(payload);
      })
      
      // Update Item
      .addCase(updateMenuItem.fulfilled, (state, { payload }) => {
        const index = state.menu.items.findIndex(i => i._id === payload._id);
        if (index !== -1) state.menu.items[index] = payload;
        
        // Refresh byCategory (simpler than surgical update)
        const newByCategory = {};
        state.menu.items.forEach(item => {
          const cat = item.category || 'Main';
          if (!newByCategory[cat]) newByCategory[cat] = [];
          newByCategory[cat].push(item);
        });
        state.menu.byCategory = newByCategory;
      })
      
      // Delete Item
      .addCase(deleteMenuItem.fulfilled, (state, { payload }) => {
        state.menu.items = state.menu.items.filter(i => i._id !== payload);
        // Refresh byCategory
        const newByCategory = {};
        state.menu.items.forEach(item => {
          const cat = item.category || 'Main';
          if (!newByCategory[cat]) newByCategory[cat] = [];
          newByCategory[cat].push(item);
        });
        state.menu.byCategory = newByCategory;
      })
      
      // Toggle Availability
      .addCase(toggleItemAvailability.fulfilled, (state, { payload }) => {
        const item = state.menu.items.find(i => i._id === payload.itemId);
        if (item) item.isAvailable = payload.isAvailable;
        
        // Also update in byCategory
        Object.values(state.menu.byCategory).forEach(catItems => {
          const found = catItems.find(i => i._id === payload.itemId);
          if (found) found.isAvailable = payload.isAvailable;
        });
      })
      
      // Fetch Bookings
      .addCase(fetchMerchantBookings.pending, (state) => {
        state.bookings.loading = true;
      })
      .addCase(fetchMerchantBookings.fulfilled, (state, { payload }) => {
        state.bookings.loading = false;
        state.bookings.items = payload;
      })
      .addCase(fetchMerchantBookings.rejected, (state, { payload }) => {
        state.bookings.loading = false;
        state.bookings.error = payload;
      })
      
      // Update Booking Status
      .addCase(updateMerchantBookingStatus.fulfilled, (state, { payload }) => {
        const index = state.bookings.items.findIndex(b => b._id === payload._id);
        if (index !== -1) {
          state.bookings.items[index] = payload;
        }
      });
  }
});

export const { clearMerchantError } = merchantSlice.actions;

export const selectMerchantMenu = (state) => state.merchant.menu;
export const selectMerchantMenuItems = (state) => state.merchant.menu.items;
export const selectMerchantMenuByCategory = (state) => state.merchant.menu.byCategory;
export const selectMerchantBookings = (state) => state.merchant.bookings;

export default merchantSlice.reducer;
