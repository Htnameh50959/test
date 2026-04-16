import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { favoritesService } from '@/services/favoritesService';

export const fetchFavorites = createAsyncThunk('favorites/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const { data } = await favoritesService.getAll();
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load favorites');
  }
});

export const addFavorite = createAsyncThunk('favorites/add', async (restaurantId, { rejectWithValue }) => {
  try {
    await favoritesService.add(restaurantId);
    return restaurantId;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add favorite');
  }
});

export const removeFavorite = createAsyncThunk('favorites/remove', async (restaurantId, { rejectWithValue }) => {
  try {
    await favoritesService.remove(restaurantId);
    return restaurantId;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to remove favorite');
  }
});

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState: { items: [], ids: [], loading: false, error: null },
  reducers: {
    clearFavoritesError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFavorites.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(fetchFavorites.fulfilled, (s, a) => {
        s.loading = false;
        s.items = a.payload || [];
        s.ids   = (a.payload || []).map(r => String(r._id));
      })
      .addCase(fetchFavorites.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })
      .addCase(addFavorite.fulfilled, (s, a) => {
        if (!s.ids.includes(String(a.payload))) s.ids.push(String(a.payload));
      })
      .addCase(removeFavorite.fulfilled, (s, a) => {
        s.ids   = s.ids.filter(id => id !== String(a.payload));
        s.items = s.items.filter(r => String(r._id) !== String(a.payload));
      });
  },
});

export const { clearFavoritesError } = favoritesSlice.actions;
export const selectFavorites = (s) => s.favorites.items;
export const selectFavoriteIds = (s) => s.favorites.ids;
export const selectFavoritesLoading = (s) => s.favorites.loading;
export const isFavorite = (restaurantId) => (s) => s.favorites.ids.includes(String(restaurantId));
export default favoritesSlice.reducer;
