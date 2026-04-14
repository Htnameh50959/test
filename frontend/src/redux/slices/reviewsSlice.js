// src/redux/slices/reviewsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { reviewsService } from '@/services/reviewsService';

export const submitReview = createAsyncThunk(
  'reviews/submit',
  async (reviewData, { rejectWithValue }) => {
    try {
      const { data } = await reviewsService.submit(reviewData);
      return data; // Should include pointsAwarded
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to submit review');
    }
  }
);

export const fetchRestaurantReviews = createAsyncThunk(
  'reviews/fetchByRestaurant',
  async ({ restaurantId, params }, { rejectWithValue }) => {
    try {
      const { data } = await reviewsService.getRestaurantReviews(restaurantId, params);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch reviews');
    }
  }
);

const reviewsSlice = createSlice({
  name: 'reviews',
  initialState: {
    restaurantReviews: [],
    loading: false,
    submitting: false,
    error: null,
    suggestions: [],
  },
  reducers: {
    clearReviews: (state) => {
      state.restaurantReviews = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitReview.pending, (state) => {
        state.submitting = true;
      })
      .addCase(submitReview.fulfilled, (state) => {
        state.submitting = false;
        state.error = null;
      })
      .addCase(submitReview.rejected, (state, { payload }) => {
        state.submitting = false;
        state.error = payload;
      })
      .addCase(fetchRestaurantReviews.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchRestaurantReviews.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.restaurantReviews = payload.data || payload;
      })
      .addCase(fetchRestaurantReviews.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      });
  }
});

export const { clearReviews } = reviewsSlice.actions;
export default reviewsSlice.reducer;
