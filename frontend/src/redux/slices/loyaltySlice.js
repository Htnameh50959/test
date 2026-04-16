import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { loyaltyService } from '@/services/loyaltyService';

export const fetchLoyalty = createAsyncThunk('loyalty/fetch', async (_, { rejectWithValue }) => {
  try {
    const { data } = await loyaltyService.get();
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load loyalty data');
  }
});

export const redeemPoints = createAsyncThunk('loyalty/redeem', async (points, { rejectWithValue }) => {
  try {
    const { data } = await loyaltyService.redeem(points);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Redemption failed');
  }
});

const loyaltySlice = createSlice({
  name: 'loyalty',
  initialState: { data: null, loading: false, error: null, redeemSuccess: null },
  reducers: {
    clearRedeemSuccess: (state) => { state.redeemSuccess = null; },
    clearLoyaltyError:  (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLoyalty.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(fetchLoyalty.fulfilled, (s, a) => { s.loading = false; s.data = a.payload; })
      .addCase(fetchLoyalty.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })
      .addCase(redeemPoints.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(redeemPoints.fulfilled, (s, a) => {
        s.loading = false;
        s.redeemSuccess = a.payload;
        if (s.data) {
          s.data.points = a.payload.remainingPoints;
        }
      })
      .addCase(redeemPoints.rejected,  (s, a) => { s.loading = false; s.error = a.payload; });
  },
});

export const { clearRedeemSuccess, clearLoyaltyError } = loyaltySlice.actions;
export const selectLoyalty = (s) => s.loyalty.data;
export const selectLoyaltyLoading = (s) => s.loyalty.loading;
export const selectRedeemSuccess = (s) => s.loyalty.redeemSuccess;
export default loyaltySlice.reducer;
