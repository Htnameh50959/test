// src/redux/slices/restaurantsSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { restaurantsService } from '@/services/restaurantsService';

// ── Async thunks ─────────────────────────────────────────────────────────────

export const searchRestaurants = createAsyncThunk(
  'restaurants/search',
  async (params, { getState, rejectWithValue }) => {
    try {
      const state = getState().restaurants;
      const { location } = getState().auth; // or use a specialized location state if available

      // Merge manual params with Redux filters
      const finalParams = {
        ...state.filters,
        sort: state.sort,
        ...params,
      };

      const { data } = await restaurantsService.search(finalParams);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Search failed');
    }
  }
);

export const fetchAllRestaurants = createAsyncThunk(
  'restaurants/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await restaurantsService.getAll(params);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load restaurants');
    }
  }
);

export const fetchRestaurantById = createAsyncThunk(
  'restaurants/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await restaurantsService.getById(id);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load restaurant');
    }
  }
);

export const fetchRestaurantReviews = createAsyncThunk(
  'restaurants/fetchReviews',
  async ({ restaurantId, params }, { rejectWithValue }) => {
    try {
      const { data } = await restaurantsService.getReviews(restaurantId, params);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load reviews');
    }
  }
);

/**
 * fetchRestaurantAnalytics
 * Returns rating distribution, category-wise scores, and sentiment summary.
 */
export const fetchRestaurantAnalytics = createAsyncThunk(
  'restaurants/fetchAnalytics',
  async (restaurantId, { rejectWithValue }) => {
    try {
      // Endpoint: /api/v1/restaurants/:id/reviews/analytics
      const { data } = await restaurantsService.getAnalytics(restaurantId);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load analytics');
    }
  }
);

// ── Slice ──────────────────────────────────────────────────────────────────────

const restaurantsSlice = createSlice({
  name: 'restaurants',
  initialState: {
    searchResults:       [],
    searchPagination:    { total: 0, pages: 1 },
    currentRestaurant:   null,
    reviews:             [],
    reviewsPagination:   { total: 0, pages: 1 },
    analytics:           null,
    menuByCategory:      {},
    filters: {
      cuisineTypes: [],
      priceRange:   [],
      minRating:    null,
      radius: 2500000, // 2500km default for global discovery
      features:     [],   // maps to backend 'features' or 'badges'
    },
    view: 'list', // 'list' or 'map'
    sort: 'relevance',
    loading:             false,
    detailLoading:       false,
    error:               null,
  },

  reducers: {
    setFilters(state, { payload }) {
      state.filters = { ...state.filters, ...payload };
    },
    clearFilters(state) {
      state.filters = {
        cuisineTypes: [],
        priceRange:   [],
        minRating:    null,
        radius: 2500000, // 2500km for wider discovery
        features:     [],
      };
    },
    setView(state, { payload }) {
      state.view = payload;
    },
    setSort(state, { payload }) {
      state.sort = payload;
    },
    clearRestaurantsError(state) {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      // searchRestaurants
      .addCase(searchRestaurants.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(searchRestaurants.fulfilled, (state, { payload }) => {
        state.loading = false;
        const results = Array.isArray(payload.data)
          ? payload.data
          : (payload.data?.[0]?.results ?? []);
        state.searchResults = results;
        state.searchPagination = {
          total: payload.pagination?.total ?? results.length,
          pages: payload.pagination?.pages ?? 1,
        };
      })
      .addCase(searchRestaurants.rejected, (state, { payload }) => { state.loading = false; state.error = payload; })

      .addCase(fetchAllRestaurants.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAllRestaurants.fulfilled, (state, { payload }) => {
        state.loading = false;
        const results = Array.isArray(payload.data) ? payload.data : [];
        state.searchResults = results;
        state.searchPagination = {
          total: payload.pagination?.total ?? results.length,
          pages: payload.pagination?.pages ?? 1,
        };
      })
      .addCase(fetchAllRestaurants.rejected, (state, { payload }) => { state.loading = false; state.error = payload; })

      // fetchRestaurantById
      .addCase(fetchRestaurantById.pending,  (state) => { state.detailLoading = true; state.error = null; })
      .addCase(fetchRestaurantById.fulfilled, (state, { payload }) => {
        state.detailLoading     = false;
        state.currentRestaurant = payload;
        state.menuByCategory    = payload.menuByCategory || {};
      })
      .addCase(fetchRestaurantById.rejected, (state, { payload }) => { state.detailLoading = false; state.error = payload; })

      // fetchRestaurantAnalytics
      .addCase(fetchRestaurantAnalytics.fulfilled, (state, { payload }) => {
        state.analytics = payload;
      })

      // fetchRestaurantReviews
      .addCase(fetchRestaurantReviews.pending,  (state) => { state.loading = true; })
      .addCase(fetchRestaurantReviews.fulfilled, (state, { payload }) => {
        state.loading          = false;
        state.reviews          = payload.data ?? [];
        state.reviewsPagination = {
          total: payload.pagination?.total ?? 0,
          pages: payload.pagination?.pages ?? 1,
        };
      })
      .addCase(fetchRestaurantReviews.rejected, (state, { payload }) => { state.loading = false; state.error = payload; });
  },
});

export const { 
  clearSearch, 
  clearCurrentRestaurant, 
  setFilters, 
  clearFilters, 
  setView, 
  setSort, 
  clearRestaurantsError 
} = restaurantsSlice.actions;

export const selectSearchResults    = (s) => s.restaurants.searchResults;
export const selectSearchFilters    = (s) => s.restaurants.filters;
export const selectSearchView       = (s) => s.restaurants.view;
export const selectSearchSort       = (s) => s.restaurants.sort;
export const selectSearchPagination = (s) => s.restaurants.searchPagination;
export const selectCurrentRestaurant = (s) => s.restaurants.currentRestaurant;
export const selectRestaurantMenuByCategory = (s) => s.restaurants.menuByCategory;
export const selectRestaurantAnalytics = (s) => s.restaurants.analytics;
export const selectRestaurantReviews = (s) => s.restaurants.reviews;
export const selectRestaurantsLoading = (s) => s.restaurants.loading;
export const selectRestaurantDetailLoading = (s) => s.restaurants.detailLoading;
export const selectRestaurantsError = (s) => s.restaurants.error;

export default restaurantsSlice.reducer;
